const express = require('express');
const router = express.Router();
const SupabaseService = require('../services/supabaseService');

const supabaseService = new SupabaseService();

// Debug endpoint to check videos status
router.get('/videos-status', async (req, res) => {
  try {
    // Get all videos with basic info
    const { data: allVideos, error } = await supabaseService.supabase
      .from('videos')
      .select('video_id, title, processed, processing_error, duration, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Parse durations and count by status
    let suitable_count = 0;
    allVideos.forEach(video => {
      if (video.duration) {
        try {
          const durationSeconds = supabaseService.parseDuration(video.duration);
          if (durationSeconds > 120) suitable_count++;
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });

    const stats = {
      total: allVideos.length,
      processed: allVideos.filter(v => v.processed).length,
      unprocessed: allVideos.filter(v => !v.processed && !v.processing_error).length,
      failed: allVideos.filter(v => v.processing_error).length,
      has_duration_info: allVideos.filter(v => v.duration).length,
      suitable_for_processing: suitable_count
    };

    // Sample videos
    const samples = {
      unprocessed: allVideos.filter(v => !v.processed && !v.processing_error).slice(0, 3),
      processed: allVideos.filter(v => v.processed).slice(0, 3),
      failed: allVideos.filter(v => v.processing_error).slice(0, 3)
    };

    res.json({
      stats,
      samples,
      latest_videos: allVideos.slice(0, 5).map(v => ({
        video_id: v.video_id,
        title: v.title?.substring(0, 50) + '...',
        processed: v.processed,
        duration: v.duration,
        has_error: !!v.processing_error
      }))
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to test unprocessed videos query
router.get('/unprocessed-videos', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    console.log('🔍 Testing unprocessed videos query...');
    
    // Test different queries to see what's available
    const queries = {
      // All videos
      all_videos: await supabaseService.supabase
        .from('videos')
        .select('count')
        .single(),
        
      // Videos with processed = false
      unprocessed_basic: await supabaseService.supabase
        .from('videos')
        .select('count')
        .eq('processed', false)
        .single(),
        
      // Videos without processing errors
      no_errors: await supabaseService.supabase
        .from('videos')
        .select('count')
        .eq('processed', false)
        .is('processing_error', null)
        .single(),
        
      // Videos with duration > 120 (calculated on-the-fly)
      suitable_duration: { data: { count: 'calculated_below' } }
    };

    // Get actual unprocessed videos
    const unprocessedVideos = await supabaseService.getUnprocessedVideos(parseInt(limit));

    res.json({
      query_counts: {
        all_videos: queries.all_videos.data?.count || 0,
        unprocessed_basic: queries.unprocessed_basic.data?.count || 0,
        no_errors: queries.no_errors.data?.count || 0,
        suitable_duration: unprocessedVideos.length
      },
      unprocessed_videos: unprocessedVideos.length,
      sample_videos: unprocessedVideos.slice(0, 3).map(v => ({
        video_id: v.video_id,
        title: v.title?.substring(0, 50) + '...',
        duration: v.duration,
        channel: v.influencer?.channel_name || 'Unknown'
      }))
    });

  } catch (error) {
    console.error('Debug unprocessed videos error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Make sure to run database migration: npm run migrate'
    });
  }
});

// Test processing a single video
router.post('/test-process/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    console.log(`🧪 Testing processing for video: ${videoId}`);
    
    // Get video details
    const video = await supabaseService.getVideo(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    console.log(`📹 Video: ${video.title?.substring(0, 50)}`);
    console.log(`⏱️ Duration: ${video.duration_seconds}s`);
    console.log(`✅ Processed: ${video.processed}`);

    if (video.processed) {
      return res.json({ 
        message: 'Video already processed',
        video: {
          title: video.title,
          processed: true,
          duration_seconds: video.duration_seconds
        }
      });
    }

    // Test if we can get transcript
    const YouTubeService = require('../services/youtubeService');
    const youtubeService = new YouTubeService();
    
    try {
      const transcript = await youtubeService.getVideoTranscript(videoId);
      res.json({
        message: 'Video is ready for processing',
        video: {
          title: video.title,
          duration: video.duration,
          transcript_length: transcript?.length || 0
        },
        next_step: `POST /api/processing/video/${videoId} to actually process it`
      });
    } catch (transcriptError) {
      res.json({
        message: 'Video found but transcript not available',
        video: {
          title: video.title,
          duration: video.duration
        },
        transcript_error: transcriptError.message,
        note: 'Will try to use video description instead'
      });
    }

  } catch (error) {
    console.error('Test process error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;