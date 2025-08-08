const express = require('express');
const router = express.Router();
const YouTubeService = require('../services/youtubeService');
const AIService = require('../services/aiService');
const SupabaseService = require('../services/supabaseService');
const TimestampService = require('../services/timestampService');

const youtubeService = new YouTubeService();
const aiService = new AIService();
const supabaseService = new SupabaseService();
const timestampService = new TimestampService();

// Process a single video for restaurant recommendations
router.post('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Get video from database
    const video = await supabaseService.getVideo(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.processed) {
      return res.status(400).json({ error: 'Video already processed' });
    }

    // Start processing
    const processingResult = await processVideoRecommendations(video);
    
    res.json({
      message: 'Video processed successfully',
      videoId: videoId,
      recommendations: processingResult.recommendations.length,
      ...processingResult
    });
  } catch (error) {
    console.error('Error processing video:', error);
    
    // Mark video as failed
    try {
      await supabaseService.updateVideo(req.params.videoId, {
        processing_error: error.message,
        processed: false
      });
    } catch (updateError) {
      console.error('Error updating video status:', updateError);
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Process all unprocessed videos
router.post('/videos/batch', async (req, res) => {
  try {
    const { limit = 5 } = req.body; // Process limited number to avoid timeouts
    
    console.log(`🔄 Starting batch processing (limit: ${limit})...`);
    
    const unprocessedVideos = await supabaseService.getUnprocessedVideos(limit);
    
    console.log(`📊 Found ${unprocessedVideos.length} unprocessed videos`);
    
    if (unprocessedVideos.length === 0) {
      return res.json({ 
        message: 'No unprocessed videos found',
        processed: 0,
        failed: 0,
        total: 0,
        suggestion: 'Add some influencers first or run database migration'
      });
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [],
      videos_processed: []
    };

    console.log(`🎬 Processing ${unprocessedVideos.length} videos...`);

    for (const video of unprocessedVideos) {
      try {
        console.log(`📹 Processing: ${video.title?.substring(0, 50)}...`);
        const processingResult = await processVideoRecommendations(video);
        results.processed++;
        results.videos_processed.push({
          videoId: video.video_id,
          title: video.title?.substring(0, 50) + '...',
          recommendations: processingResult.recommendations?.length || 0
        });
        console.log(`✅ Success: Found ${processingResult.recommendations?.length || 0} restaurants`);
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        results.failed++;
        results.errors.push({
          videoId: video.video_id,
          title: video.title?.substring(0, 50) + '...',
          error: error.message
        });
        
        // Mark as failed
        await supabaseService.updateVideo(video.video_id, {
          processing_error: error.message,
          processed: false
        });
      }
    }

    console.log(`🏁 Batch processing completed: ${results.processed} success, ${results.failed} failed`);

    res.json({
      message: 'Batch processing completed',
      total: unprocessedVideos.length,
      ...results
    });
  } catch (error) {
    console.error('Error in batch processing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get processing status
router.get('/status', async (req, res) => {
  try {
    const { data: stats, error } = await supabaseService.supabase
      .from('videos')
      .select('processed, processing_error')
      .not('processing_error', 'is', null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const processed = stats.filter(v => v.processed).length;
    const failed = stats.filter(v => !v.processed && v.processing_error).length;
    const pending = stats.filter(v => !v.processed && !v.processing_error).length;

    const { data: totalVideos, error: countError } = await supabaseService.supabase
      .from('videos')
      .select('id', { count: 'exact' });

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    res.json({
      total: totalVideos.length,
      processed,
      failed,
      pending,
      processing_rate: totalVideos.length > 0 ? (processed / totalVideos.length * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Error fetching processing status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reprocess failed videos
router.post('/reprocess-failed', async (req, res) => {
  try {
    const { limit = 3 } = req.body;
    
    const { data: failedVideos, error } = await supabaseService.supabase
      .from('videos')
      .select('*')
      .eq('processed', false)
      .not('processing_error', 'is', null)
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (failedVideos.length === 0) {
      return res.json({ message: 'No failed videos to reprocess' });
    }

    const results = {
      reprocessed: 0,
      failed: 0,
      errors: []
    };

    for (const video of failedVideos) {
      try {
        // Clear previous error
        await supabaseService.updateVideo(video.video_id, {
          processing_error: null
        });
        
        await processVideoRecommendations(video);
        results.reprocessed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          videoId: video.video_id,
          error: error.message
        });
        
        await supabaseService.updateVideo(video.video_id, {
          processing_error: error.message
        });
      }
    }

    res.json({
      message: 'Reprocessing completed',
      total: failedVideos.length,
      ...results
    });
  } catch (error) {
    console.error('Error reprocessing failed videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add video by URL and process it
router.post('/add-and-process', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const videoId = youtubeService.extractVideoId(videoUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube video URL' });
    }

    // Check if video already exists
    const existingVideo = await supabaseService.getVideo(videoId);
    if (existingVideo) {
      return res.status(409).json({ error: 'Video already exists', video: existingVideo });
    }

    // Fetch video details
    const videoDetails = await youtubeService.getVideoDetails(videoId);
    
    // Get or create influencer
    let influencer = await supabaseService.getInfluencer(videoDetails.channelId);
    if (!influencer) {
      const channelInfo = await youtubeService.getChannelInfo(videoDetails.channelId);
      influencer = await supabaseService.createInfluencer(channelInfo);
    }

    // Create video
    const video = await supabaseService.createVideo({
      ...videoDetails,
      influencerId: influencer.id
    });

    // Process for recommendations
    const processingResult = await processVideoRecommendations(video);

    res.status(201).json({
      message: 'Video added and processed successfully',
      video,
      influencer,
      recommendations: processingResult.recommendations.length,
      ...processingResult
    });
  } catch (error) {
    console.error('Error adding and processing video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to process video recommendations
async function processVideoRecommendations(video) {
  let transcript = video.transcript;
  
  // Get transcript if not already available
  if (!transcript) {
    try {
      transcript = await youtubeService.getVideoTranscript(video.video_id);
      await supabaseService.updateVideo(video.video_id, { transcript });
    } catch (transcriptError) {
      console.log(`Transcript not available for ${video.video_id}, using description instead`);
      // If transcript is not available, use the video description
      transcript = video.description || '';
    }
  }

  // If transcript is still empty, use description
  if (!transcript || transcript.trim().length === 0) {
    transcript = video.description || '';
    console.log(`Using video description for AI processing (length: ${transcript.length})`);
  }

  if (!transcript || transcript.trim().length === 0) {
    throw new Error('No transcript or description available for processing');
  }

  // Extract recommendations using AI
  let recommendations = await aiService.extractRestaurantRecommendations(transcript, video.title);

  // Enhance recommendations with timestamps if transcript has timing data
  recommendations = await timestampService.enhanceRecommendationsWithTimestamps(video.video_id, recommendations);
  
  const processedRecommendations = [];

  for (const recommendation of recommendations) {
    try {
      // Try to find existing restaurant
      let restaurants = await supabaseService.findRestaurantByName(
        recommendation.name, 
        recommendation.location
      );
      
      let restaurant;
      if (restaurants.length > 0) {
        restaurant = restaurants[0]; // Use first match
      } else {
        // Create new restaurant
        restaurant = await supabaseService.createRestaurant({
          name: recommendation.name,
          address: recommendation.address,
          city: recommendation.location,
          cuisine_type: recommendation.cuisineType,
          price_range: recommendation.priceRange
        });
      }

      // Create recommendation link
      const recommendationRecord = await supabaseService.createRecommendation({
        video_id: video.id,
        restaurant_id: restaurant.id,
        confidence_score: recommendation.confidenceScore,
        context: recommendation.context,
        dish_mentioned: recommendation.dishMentioned,
        mentioned_at_timestamp: recommendation.mentionedAt
      });

      processedRecommendations.push({
        restaurant,
        recommendation: recommendationRecord
      });
    } catch (error) {
      console.error(`Error processing recommendation for ${recommendation.name}:`, error);
      // Continue with other recommendations
    }
  }

  // Mark video as processed
  await supabaseService.updateVideo(video.video_id, {
    processed: true,
    processing_error: null
  });

  return {
    recommendations: processedRecommendations,
    extracted_count: recommendations.length,
    processed_count: processedRecommendations.length
  };
}

module.exports = router;