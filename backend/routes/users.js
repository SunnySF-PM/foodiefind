const express = require('express');
const router = express.Router();
const SupabaseService = require('../services/supabaseService');
const { createClient } = require('@supabase/supabase-js');

const supabaseService = new SupabaseService();

// Middleware to verify JWT token and get user
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Create client with anon key for user operations
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Get user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    let profile = await supabaseService.getUserProfile(req.user.id);
    
    // If profile doesn't exist, create it
    if (!profile) {
      profile = await supabaseService.createUserProfile(req.user.id, {
        username: req.user.email?.split('@')[0] || 'user',
        full_name: req.user.user_metadata?.full_name || '',
        avatar_url: req.user.user_metadata?.avatar_url || ''
      });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { username, full_name, avatar_url, preferred_cuisines, preferred_cities } = req.body;
    
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (preferred_cuisines !== undefined) updates.preferred_cuisines = preferred_cuisines;
    if (preferred_cities !== undefined) updates.preferred_cities = preferred_cities;
    updates.updated_at = new Date().toISOString();

    const { data: profile, error } = await supabaseService.supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user favorites
router.get('/favorites', authenticateUser, async (req, res) => {
  try {
    const favorites = await supabaseService.getUserFavorites(req.user.id);
    res.json(favorites);
  } catch (error) {
    console.error('Error fetching user favorites:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add restaurant to favorites
router.post('/favorites/:restaurantId', authenticateUser, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    // Check if restaurant exists
    const { data: restaurant, error: restaurantError } = await supabaseService.supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const favorite = await supabaseService.addUserFavorite(req.user.id, restaurantId);
    res.status(201).json({ ...favorite, restaurant });
  } catch (error) {
    console.error('Error adding favorite:', error);
    if (error.message.includes('duplicate')) {
      return res.status(409).json({ error: 'Restaurant already in favorites' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Remove restaurant from favorites
router.delete('/favorites/:restaurantId', authenticateUser, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    await supabaseService.removeUserFavorite(req.user.id, restaurantId);
    res.json({ message: 'Restaurant removed from favorites' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: error.message });
  }
});

// Follow an influencer
router.post('/follow/:influencerId', authenticateUser, async (req, res) => {
  try {
    const { influencerId } = req.params;
    
    // Check if influencer exists
    const { data: influencer, error: influencerError } = await supabaseService.supabase
      .from('influencers')
      .select('id, channel_name')
      .eq('id', influencerId)
      .single();

    if (influencerError) {
      return res.status(404).json({ error: 'Influencer not found' });
    }

    const { data: follow, error } = await supabaseService.supabase
      .from('user_follows')
      .insert([{
        user_id: req.user.id,
        influencer_id: influencerId
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Already following this influencer' });
      }
      throw error;
    }

    res.status(201).json({ ...follow, influencer });
  } catch (error) {
    console.error('Error following influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unfollow an influencer
router.delete('/follow/:influencerId', authenticateUser, async (req, res) => {
  try {
    const { influencerId } = req.params;
    
    const { error } = await supabaseService.supabase
      .from('user_follows')
      .delete()
      .eq('user_id', req.user.id)
      .eq('influencer_id', influencerId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Unfollowed influencer' });
  } catch (error) {
    console.error('Error unfollowing influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get followed influencers
router.get('/following', authenticateUser, async (req, res) => {
  try {
    const { data: follows, error } = await supabaseService.supabase
      .from('user_follows')
      .select(`
        *,
        influencer:influencers(
          id,
          channel_name,
          profile_image_url,
          subscriber_count
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(follows);
  } catch (error) {
    console.error('Error fetching followed influencers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get personalized recommendations based on user preferences and follows
router.get('/recommendations', authenticateUser, async (req, res) => {
  try {
    const profile = await supabaseService.getUserProfile(req.user.id);
    
    let query = supabaseService.supabase
      .from('restaurant_recommendations')
      .select(`
        *,
        restaurant:restaurants(*),
        video:videos(
          title,
          video_id,
          influencer:influencers(
            channel_name,
            profile_image_url
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    // If user has preferred cuisines, filter by them
    if (profile?.preferred_cuisines && profile.preferred_cuisines.length > 0) {
      query = query.in('restaurant.cuisine_type', profile.preferred_cuisines);
    }

    // If user has preferred cities, filter by them
    if (profile?.preferred_cities && profile.preferred_cities.length > 0) {
      query = query.in('restaurant.city', profile.preferred_cities);
    }

    const { data: recommendations, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      recommendations,
      based_on: {
        preferred_cuisines: profile?.preferred_cuisines || [],
        preferred_cities: profile?.preferred_cities || []
      }
    });
  } catch (error) {
    console.error('Error fetching personalized recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;