const express = require('express');
const router = express.Router();
const SupabaseService = require('../services/supabaseService');

const supabaseService = new SupabaseService();

// Get video statistics by duration
router.get('/video-stats', async (req, res) => {
  try {
    // Get video duration statistics
    const { data: allVideos, error } = await supabaseService.supabase
      .from('videos')
      .select('duration_seconds, processed, processing_error')
      .not('duration_seconds', 'is', null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Categorize videos by duration
    const stats = {
      total: allVideos.length,
      shorts: allVideos.filter(v => v.duration_seconds <= 60).length,
      short_medium: allVideos.filter(v => v.duration_seconds > 60 && v.duration_seconds <= 120).length,
      suitable: allVideos.filter(v => v.duration_seconds > 120).length,
      long: allVideos.filter(v => v.duration_seconds > 600).length, // >10 minutes
      processed: allVideos.filter(v => v.processed).length,
      failed: allVideos.filter(v => v.processing_error).length
    };

    // Calculate processing rates by category
    const suitableVideos = allVideos.filter(v => v.duration_seconds > 120);
    const processedSuitable = suitableVideos.filter(v => v.processed).length;

    stats.suitable_processed = processedSuitable;
    stats.suitable_processing_rate = suitableVideos.length > 0 ? 
      Math.round((processedSuitable / suitableVideos.length) * 100) : 0;

    // Duration distribution
    stats.distribution = {
      'Shorts (≤1min)': stats.shorts,
      'Short (1-2min)': stats.short_medium,
      'Medium (2-10min)': stats.suitable - stats.long,
      'Long (>10min)': stats.long
    };

    // Processing effectiveness
    stats.processing_effectiveness = {
      shorts_filtered_out: stats.shorts,
      suitable_for_processing: stats.suitable,
      actually_processed: stats.suitable_processed,
      processing_success_rate: stats.suitable > 0 ? 
        Math.round((stats.suitable_processed / stats.suitable) * 100) : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching video stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get top influencers by content type
router.get('/influencers-by-content', async (req, res) => {
  try {
    const { data: influencers, error } = await supabaseService.supabase
      .from('influencers')
      .select(`
        *,
        videos!inner(
          duration_seconds,
          processed
        )
      `);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Process influencer data
    const influencerStats = influencers.map(influencer => {
      const videos = influencer.videos;
      const totalVideos = videos.length;
      const suitableVideos = videos.filter(v => v.duration_seconds > 120).length;
      const processedVideos = videos.filter(v => v.processed).length;
      const shorts = videos.filter(v => v.duration_seconds <= 60).length;

      return {
        ...influencer,
        video_stats: {
          total: totalVideos,
          suitable: suitableVideos,
          processed: processedVideos,
          shorts: shorts,
          suitable_percentage: totalVideos > 0 ? Math.round((suitableVideos / totalVideos) * 100) : 0,
          processing_rate: suitableVideos > 0 ? Math.round((processedVideos / suitableVideos) * 100) : 0
        }
      };
    });

    // Sort by suitable content percentage
    influencerStats.sort((a, b) => b.video_stats.suitable_percentage - a.video_stats.suitable_percentage);

    res.json(influencerStats);
  } catch (error) {
    console.error('Error fetching influencer content stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get filtering effectiveness report
router.get('/filtering-report', async (req, res) => {
  try {
    const { data: videos, error } = await supabaseService.supabase
      .from('videos')
      .select(`
        duration_seconds,
        processed,
        title,
        view_count,
        influencers(channel_name)
      `)
      .not('duration_seconds', 'is', null)
      .order('duration_seconds', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Create filtering report
    const report = {
      summary: {
        total_videos: videos.length,
        shorts_filtered: videos.filter(v => v.duration_seconds <= 60).length,
        suitable_videos: videos.filter(v => v.duration_seconds > 120).length,
        processing_rate: 0
      },
      examples: {
        filtered_shorts: videos
          .filter(v => v.duration_seconds <= 60)
          .slice(0, 5)
          .map(v => ({
            title: v.title.substring(0, 60) + '...',
            duration: v.duration_seconds,
            channel: v.influencers?.channel_name,
            views: v.view_count
          })),
        suitable_videos: videos
          .filter(v => v.duration_seconds > 120)
          .slice(0, 5)
          .map(v => ({
            title: v.title.substring(0, 60) + '...',
            duration: Math.round(v.duration_seconds / 60) + ' min',
            channel: v.influencers?.channel_name,
            processed: v.processed
          }))
      },
      duration_histogram: {}
    };

    // Calculate processing rate
    const suitableVideos = videos.filter(v => v.duration_seconds > 120);
    const processedSuitable = suitableVideos.filter(v => v.processed);
    report.summary.processing_rate = suitableVideos.length > 0 ? 
      Math.round((processedSuitable.length / suitableVideos.length) * 100) : 0;

    // Create duration histogram
    const buckets = [
      { name: '0-30s', min: 0, max: 30 },
      { name: '30-60s', min: 30, max: 60 },
      { name: '1-2min', min: 60, max: 120 },
      { name: '2-5min', min: 120, max: 300 },
      { name: '5-10min', min: 300, max: 600 },
      { name: '10-20min', min: 600, max: 1200 },
      { name: '20min+', min: 1200, max: 999999 }
    ];

    buckets.forEach(bucket => {
      const count = videos.filter(v => 
        v.duration_seconds > bucket.min && v.duration_seconds <= bucket.max
      ).length;
      report.duration_histogram[bucket.name] = count;
    });

    res.json(report);
  } catch (error) {
    console.error('Error generating filtering report:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;