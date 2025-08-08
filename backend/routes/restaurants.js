const express = require('express');
const router = express.Router();
const SupabaseService = require('../services/supabaseService');

const supabaseService = new SupabaseService();

// Get all restaurants with their recommendations
router.get('/', async (req, res) => {
  try {
    const restaurants = await supabaseService.getAllRestaurants();
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get restaurant by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: restaurant, error } = await supabaseService.supabase
      .from('restaurants')
      .select(`
        *,
        recommendations:restaurant_recommendations(
          *,
          video:videos(
            title,
            video_id,
            published_at,
            influencer:influencers(
              channel_name,
              profile_image_url
            )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json(restaurant);
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get restaurants by cuisine type
router.get('/cuisine/:cuisineType', async (req, res) => {
  try {
    const { cuisineType } = req.params;
    
    const { data: restaurants, error } = await supabaseService.supabase
      .from('restaurants')
      .select(`
        *,
        recommendations:restaurant_recommendations(count)
      `)
      .eq('cuisine_type', cuisineType)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants by cuisine:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get restaurants by city
router.get('/city/:city', async (req, res) => {
  try {
    const { city } = req.params;
    
    const { data: restaurants, error } = await supabaseService.supabase
      .from('restaurants')
      .select(`
        *,
        recommendations:restaurant_recommendations(count)
      `)
      .ilike('city', `%${city}%`)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants by city:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get top restaurants (most recommended)
router.get('/top/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 20;
    
    const { data: restaurants, error } = await supabaseService.supabase
      .rpc('get_top_restaurants', { limit_count: limit });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching top restaurants:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new restaurant (used internally by processing)
router.post('/', async (req, res) => {
  try {
    const restaurant = await supabaseService.createRestaurant(req.body);
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update restaurant
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: restaurant, error } = await supabaseService.supabase
      .from('restaurants')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(restaurant);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get restaurant recommendations (all mentions of this restaurant)
router.get('/:id/recommendations', async (req, res) => {
  try {
    const { id } = req.params;
    const recommendations = await supabaseService.getRecommendationsByRestaurant(id);
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching restaurant recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;