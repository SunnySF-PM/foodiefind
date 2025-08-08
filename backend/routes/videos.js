const express = require('express');
const router = express.Router();
const YouTubeService = require('../services/youtubeService');
const SupabaseService = require('../services/supabaseService');

const youtubeService = new YouTubeService();
const supabaseService = new SupabaseService();

// Get all videos with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, processed } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseService.supabase
      .from('videos')
      .select(`
        *,
        influencer:influencers(channel_name, profile_image_url),
        recommendations:restaurant_recommendations(count)
      `)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (processed !== undefined) {
      query = query.eq('processed', processed === 'true');
    }

    const { data: videos, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get video by ID
router.get('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await supabaseService.getVideo(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add video by YouTube URL
router.post('/', async (req, res) => {
  try {
    const { videoUrl, videoId, influencerId } = req.body;
    
    if (!videoUrl && !videoId) {
      return res.status(400).json({ error: 'Video URL or ID is required' });
    }

    let extractedVideoId = videoId;
    if (!extractedVideoId && videoUrl) {
      extractedVideoId = youtubeService.extractVideoId(videoUrl);
      if (!extractedVideoId) {
        return res.status(400).json({ error: 'Invalid YouTube video URL' });
      }
    }

    // Check if video already exists
    const existingVideo = await supabaseService.getVideo(extractedVideoId);
    if (existingVideo) {
      return res.status(409).json({ error: 'Video already exists', video: existingVideo });
    }

    // Fetch video details from YouTube
    const videoDetails = await youtubeService.getVideoDetails(extractedVideoId);
    
    // If no influencerId provided, try to find or create the influencer
    let finalInfluencerId = influencerId;
    if (!finalInfluencerId) {
      let influencer = await supabaseService.getInfluencer(videoDetails.channelId);
      
      if (!influencer) {
        // Create new influencer
        const channelInfo = await youtubeService.getChannelInfo(videoDetails.channelId);
        influencer = await supabaseService.createInfluencer(channelInfo);
      }
      
      finalInfluencerId = influencer.id;
    }

    // Create video in database
    const video = await supabaseService.createVideo({
      ...videoDetails,
      influencerId: finalInfluencerId
    });
    
    res.status(201).json(video);
  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get video recommendations
router.get('/:videoId/recommendations', async (req, res) => {
  try {
    const { videoId } = req.params;
    const recommendations = await supabaseService.getRecommendationsByVideo(videoId);
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching video recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update video processing status
router.patch('/:videoId/status', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { processed, processing_error, transcript } = req.body;
    
    const updates = {};
    if (processed !== undefined) updates.processed = processed;
    if (processing_error !== undefined) updates.processing_error = processing_error;
    if (transcript !== undefined) updates.transcript = transcript;
    updates.updated_at = new Date().toISOString();

    const video = await supabaseService.updateVideo(videoId, updates);
    res.json(video);
  } catch (error) {
    console.error('Error updating video status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unprocessed videos
router.get('/status/unprocessed', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const videos = await supabaseService.getUnprocessedVideos(parseInt(limit));
    res.json(videos);
  } catch (error) {
    console.error('Error fetching unprocessed videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search videos
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { maxResults = 25 } = req.query;
    
    const videos = await youtubeService.searchVideos(query, parseInt(maxResults));
    res.json(videos);
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete video
router.delete('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const { error } = await supabaseService.supabase
      .from('videos')
      .delete()
      .eq('video_id', videoId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;