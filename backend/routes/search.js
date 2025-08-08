const express = require('express');
const router = express.Router();
const SupabaseService = require('../services/supabaseService');

const supabaseService = new SupabaseService();

// Search restaurants
router.get('/restaurants', async (req, res) => {
  try {
    const { q, cuisine, city, price, limit = 50 } = req.query;
    
    const filters = {};
    if (cuisine) filters.cuisineType = cuisine;
    if (city) filters.city = city;
    if (price) filters.priceRange = price;

    const restaurants = await supabaseService.searchRestaurants(q, filters);
    
    // Limit results
    const limitedResults = restaurants.slice(0, parseInt(limit));
    
    res.json({
      query: q,
      filters,
      results: limitedResults,
      count: limitedResults.length,
      total: restaurants.length
    });
  } catch (error) {
    console.error('Error searching restaurants:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search influencers
router.get('/influencers', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    let query = supabaseService.supabase
      .from('influencers')
      .select(`
        *,
        video_count:videos(count),
        restaurant_count:videos!inner(
          restaurant_recommendations(count)
        )
      `);

    if (q) {
      query = query.ilike('channel_name', `%${q}%`);
    }

    const { data: influencers, error } = await query
      .order('subscriber_count', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      query: q,
      results: influencers,
      count: influencers.length
    });
  } catch (error) {
    console.error('Error searching influencers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search videos
router.get('/videos', async (req, res) => {
  try {
    const { q, influencer, limit = 30 } = req.query;
    
    let query = supabaseService.supabase
      .from('videos')
      .select(`
        *,
        influencer:influencers(channel_name, profile_image_url),
        recommendation_count:restaurant_recommendations(count)
      `);

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    if (influencer) {
      query = query.eq('influencer.channel_name', influencer);
    }

    const { data: videos, error } = await query
      .order('published_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      query: q,
      filters: { influencer },
      results: videos,
      count: videos.length
    });
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Global search (searches across restaurants, influencers, and videos)
router.get('/all', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchPromises = [
      // Search restaurants
      supabaseService.supabase
        .from('restaurants')
        .select(`
          id,
          name,
          cuisine_type,
          city,
          'restaurant' as type
        `)
        .or(`name.ilike.%${q}%,cuisine_type.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(parseInt(limit)),

      // Search influencers
      supabaseService.supabase
        .from('influencers')
        .select(`
          id,
          channel_name as name,
          subscriber_count,
          'influencer' as type
        `)
        .ilike('channel_name', `%${q}%`)
        .limit(parseInt(limit)),

      // Search videos
      supabaseService.supabase
        .from('videos')
        .select(`
          id,
          title as name,
          published_at,
          'video' as type,
          influencer:influencers(channel_name)
        `)
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(parseInt(limit))
    ];

    const [restaurantResults, influencerResults, videoResults] = await Promise.all(searchPromises);

    const results = [
      ...(restaurantResults.data || []),
      ...(influencerResults.data || []),
      ...(videoResults.data || [])
    ];

    res.json({
      query: q,
      results: results,
      count: results.length,
      breakdown: {
        restaurants: restaurantResults.data?.length || 0,
        influencers: influencerResults.data?.length || 0,
        videos: videoResults.data?.length || 0
      }
    });
  } catch (error) {
    console.error('Error performing global search:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get search filters/facets
router.get('/filters', async (req, res) => {
  try {
    const filtersPromises = [
      // Get unique cuisine types
      supabaseService.supabase
        .from('restaurants')
        .select('cuisine_type')
        .not('cuisine_type', 'is', null)
        .order('cuisine_type'),

      // Get unique cities
      supabaseService.supabase
        .from('restaurants')
        .select('city')
        .not('city', 'is', null)
        .order('city'),

      // Get price ranges
      supabaseService.supabase
        .from('restaurants')
        .select('price_range')
        .not('price_range', 'is', null)
        .order('price_range'),

      // Get top influencers
      supabaseService.supabase
        .from('influencers')
        .select('channel_name')
        .order('subscriber_count', { ascending: false })
        .limit(20)
    ];

    const [cuisineResults, cityResults, priceResults, influencerResults] = await Promise.all(filtersPromises);

    const filters = {
      cuisines: [...new Set(cuisineResults.data?.map(r => r.cuisine_type).filter(Boolean))] || [],
      cities: [...new Set(cityResults.data?.map(r => r.city).filter(Boolean))] || [],
      priceRanges: [...new Set(priceResults.data?.map(r => r.price_range).filter(Boolean))] || [],
      topInfluencers: influencerResults.data?.map(r => r.channel_name) || []
    };

    res.json(filters);
  } catch (error) {
    console.error('Error fetching search filters:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;