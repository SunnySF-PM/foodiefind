const express = require('express');
const router = express.Router();
const YouTubeService = require('../services/youtubeService');
const SupabaseService = require('../services/supabaseService');

const youtubeService = new YouTubeService();
const supabaseService = new SupabaseService();

// Get all influencers
router.get('/', async (req, res) => {
  try {
    console.log('📊 Fetching influencers with counts...');
    const influencers = await supabaseService.getAllInfluencers();
    console.log(`✅ Found ${influencers.length} influencers`);
    
    // Log first influencer for debugging
    if (influencers.length > 0) {
      const first = influencers[0];
      console.log(`   Sample: ${first.channel_name} - Videos: ${first.total_videos}, Restaurants: ${first.total_restaurants}`);
    }
    
    res.json(influencers);
  } catch (error) {
    console.error('Error fetching influencers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get influencer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: influencer, error } = await supabaseService.supabase
      .from('influencers')
      .select(`
        *,
        videos(count),
        videos!inner(
          restaurant_recommendations(count)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Influencer not found' });
    }

    res.json(influencer);
  } catch (error) {
    console.error('Error fetching influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new influencer by YouTube channel URL or ID
router.post('/', async (req, res) => {
  try {
    const { channelUrl, channelId } = req.body;
    
    if (!channelUrl && !channelId) {
      return res.status(400).json({ error: 'Channel URL or ID is required' });
    }

    let extractedChannelId = channelId;
    if (!extractedChannelId && channelUrl) {
      extractedChannelId = youtubeService.extractChannelId(channelUrl);
      if (!extractedChannelId) {
        return res.status(400).json({ error: 'Invalid YouTube channel URL' });
      }
    }

    // Check if influencer already exists
    const existingInfluencer = await supabaseService.getInfluencer(extractedChannelId);
    if (existingInfluencer) {
      return res.status(409).json({ error: 'Influencer already exists', influencer: existingInfluencer });
    }

    // Fetch channel info from YouTube
    const channelInfo = await youtubeService.getChannelInfo(extractedChannelId);
    
    // Create influencer in database
    const influencer = await supabaseService.createInfluencer(channelInfo);
    
    res.status(201).json(influencer);
  } catch (error) {
    console.error('Error adding influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get influencer's videos
router.get('/:id/videos', async (req, res) => {
  try {
    const { id } = req.params;
    const videos = await supabaseService.getVideosByInfluencer(id);
    res.json(videos);
  } catch (error) {
    console.error('Error fetching influencer videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all restaurants recommended by this influencer
router.get('/:id/restaurants', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: restaurants, error } = await supabaseService.supabase
      .from('restaurant_recommendations')
      .select(`
        *,
        restaurants(*),
        videos(
          video_id,
          title,
          thumbnail_url,
          published_at
        )
      `)
      .eq('videos.influencer_id', id)
      .order('confidence_score', { ascending: false });

    if (error) {
      console.error('Error fetching influencer restaurants:', error);
      return res.status(500).json({ error: error.message });
    }

    // Group by restaurant to avoid duplicates and include all video mentions
    const restaurantMap = new Map();
    
    restaurants.forEach(rec => {
      const restaurant = rec.restaurants;
      const restaurantId = restaurant.id;
      
      if (!restaurantMap.has(restaurantId)) {
        restaurantMap.set(restaurantId, {
          ...restaurant,
          recommendations: [],
          videos: new Set(),
          totalConfidence: 0,
          mentionCount: 0
        });
      }
      
      const entry = restaurantMap.get(restaurantId);
      entry.recommendations.push({
        confidence_score: rec.confidence_score,
        context: rec.context,
        dish_mentioned: rec.dish_mentioned,
        mentioned_at_timestamp: rec.mentioned_at_timestamp,
        video: rec.videos
      });
      
      entry.videos.add(JSON.stringify(rec.videos));
      entry.totalConfidence += rec.confidence_score || 0;
      entry.mentionCount += 1;
    });

    // Convert Map to array and process
    const result = Array.from(restaurantMap.values()).map(restaurant => ({
      ...restaurant,
      videos: Array.from(restaurant.videos).map(v => JSON.parse(v)),
      averageConfidence: restaurant.mentionCount > 0 ? (restaurant.totalConfidence / restaurant.mentionCount).toFixed(2) : 0
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching influencer restaurants:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync influencer's videos from YouTube
router.post('/:id/sync-videos', async (req, res) => {
  try {
    const { id } = req.params;
    const { maxResults = 50 } = req.body;

    // Get influencer info
    const { data: influencer, error: influencerError } = await supabaseService.supabase
      .from('influencers')
      .select('*')
      .eq('id', id)
      .single();

    if (influencerError) {
      return res.status(404).json({ error: 'Influencer not found' });
    }

    // Fetch videos from YouTube
    const youtubeVideos = await youtubeService.getChannelVideos(influencer.channel_id, maxResults);
    
    let syncedVideos = 0;
    let skippedVideos = 0;

    for (const videoData of youtubeVideos) {
      try {
        // Check if video already exists
        const existingVideo = await supabaseService.getVideo(videoData.videoId);
        if (existingVideo) {
          skippedVideos++;
          continue;
        }

        // Create video in database
        await supabaseService.createVideo({
          ...videoData,
          influencerId: influencer.id
        });
        syncedVideos++;
      } catch (videoError) {
        console.error(`Error syncing video ${videoData.videoId}:`, videoError);
      }
    }

    res.json({
      message: 'Video sync completed',
      synced: syncedVideos,
      skipped: skippedVideos,
      total: youtubeVideos.length
    });
  } catch (error) {
    console.error('Error syncing videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update influencer information
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: influencer, error } = await supabaseService.supabase
      .from('influencers')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(influencer);
  } catch (error) {
    console.error('Error updating influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete influencer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseService.supabase
      .from('influencers')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Influencer deleted successfully' });
  } catch (error) {
    console.error('Error deleting influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;