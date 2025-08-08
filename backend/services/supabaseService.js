const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // Influencer operations
  async createInfluencer(influencerData) {
    const { data, error } = await this.supabase
      .from('influencers')
      .insert([{
        channel_id: influencerData.channelId,
        channel_name: influencerData.name,
        channel_url: influencerData.channelUrl,
        subscriber_count: influencerData.subscriberCount,
        video_count: influencerData.videoCount,
        description: influencerData.description,
        profile_image_url: influencerData.profileImageUrl
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create influencer: ${error.message}`);
    return data;
  }

  async getInfluencer(channelId) {
    const { data, error } = await this.supabase
      .from('influencers')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Failed to get influencer: ${error.message}`);
    }
    return data;
  }

  async updateInfluencer(channelId, updates) {
    const { data, error } = await this.supabase
      .from('influencers')
      .update(updates)
      .eq('channel_id', channelId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update influencer: ${error.message}`);
    return data;
  }

  async getAllInfluencers() {
    // Get basic influencer data
    const { data: influencers, error } = await this.supabase
      .from('influencers')
      .select('*')
      .order('subscriber_count', { ascending: false });

    if (error) throw new Error(`Failed to get influencers: ${error.message}`);
    
    // Add counts for each influencer
    const enrichedInfluencers = await Promise.all(
      (influencers || []).map(async (influencer) => {
        // Get video count
        const { count: videoCount } = await this.supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('influencer_id', influencer.id);

        // Get restaurant count (through videos)
        const { data: videoIds } = await this.supabase
          .from('videos')
          .select('id')
          .eq('influencer_id', influencer.id);

        let restaurantCount = 0;
        if (videoIds && videoIds.length > 0) {
          const { count } = await this.supabase
            .from('restaurant_recommendations')
            .select('*', { count: 'exact', head: true })
            .in('video_id', videoIds.map(v => v.id));
          restaurantCount = count || 0;
        }

        return {
          ...influencer,
          total_videos: videoCount || 0,
          total_restaurants: restaurantCount
        };
      })
    );

    return enrichedInfluencers;
  }

  // Video operations
  async createVideo(videoData) {
    const { data, error } = await this.supabase
      .from('videos')
      .insert([{
        video_id: videoData.videoId,
        influencer_id: videoData.influencerId,
        title: videoData.title,
        description: videoData.description,
        thumbnail_url: videoData.thumbnailUrl,
        published_at: videoData.publishedAt,
        view_count: videoData.viewCount,
        like_count: videoData.likeCount,
        duration: videoData.duration,
        duration_seconds: videoData.durationSeconds || 0,
        transcript: videoData.transcript
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create video: ${error.message}`);
    return data;
  }

  async getVideo(videoId) {
    const { data, error } = await this.supabase
      .from('videos')
      .select(`
        *,
        influencer:influencers(*)
      `)
      .eq('video_id', videoId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get video: ${error.message}`);
    }
    return data;
  }

  async updateVideo(videoId, updates) {
    const { data, error } = await this.supabase
      .from('videos')
      .update(updates)
      .eq('video_id', videoId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update video: ${error.message}`);
    return data;
  }

  async getVideosByInfluencer(influencerId) {
    const { data, error } = await this.supabase
      .from('videos')
      .select('*')
      .eq('influencer_id', influencerId)
      .order('published_at', { ascending: false });

    if (error) throw new Error(`Failed to get videos: ${error.message}`);
    return data;
  }

  async getUnprocessedVideos(limit = 10) {
    const { data, error } = await this.supabase
      .from('videos')
      .select(`
        *,
        influencer:influencers(channel_name)
      `)
      .eq('processed', false)
      .is('processing_error', null)
      .order('created_at', { ascending: false }) // Process newest first
      .limit(limit);

    if (error) throw new Error(`Failed to get unprocessed videos: ${error.message}`);
    
    // Filter by duration using JavaScript (temporary fix until duration_seconds column is added)
    const filteredData = (data || []).filter(video => {
      if (!video.duration) return true; // Include videos without duration info
      
      try {
        const durationSeconds = this.parseDuration(video.duration);
        return durationSeconds > 120; // Only videos longer than 2 minutes
      } catch (error) {
        console.log(`⚠️ Could not parse duration for ${video.video_id}: ${video.duration}`);
        return true; // Include videos with parsing errors
      }
    });
    
    console.log(`📊 Found ${data?.length || 0} unprocessed videos, ${filteredData.length} suitable after filtering`);
    
    return filteredData;
  }

  parseDuration(duration) {
    if (!duration) return 0;
    
    // YouTube duration format: PT1H2M10S
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  // Restaurant operations
  async createRestaurant(restaurantData) {
    const { data, error } = await this.supabase
      .from('restaurants')
      .insert([restaurantData])
      .select()
      .single();

    if (error) throw new Error(`Failed to create restaurant: ${error.message}`);
    return data;
  }

  async findRestaurantByName(name, city = null) {
    let query = this.supabase
      .from('restaurants')
      .select('*')
      .ilike('name', `%${name}%`);

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    const { data, error } = await query.limit(5);

    if (error) throw new Error(`Failed to find restaurant: ${error.message}`);
    return data;
  }

  async getAllRestaurants() {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select(`
        *,
        recommendations:restaurant_recommendations(
          video:videos(
            title,
            video_id,
            influencer:influencers(channel_name)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get restaurants: ${error.message}`);
    return data;
  }

  // Restaurant recommendation operations
  async createRecommendation(recommendationData) {
    const { data, error } = await this.supabase
      .from('restaurant_recommendations')
      .insert([recommendationData])
      .select()
      .single();

    if (error) throw new Error(`Failed to create recommendation: ${error.message}`);
    return data;
  }

  async getRecommendationsByVideo(videoId) {
    const { data, error } = await this.supabase
      .from('restaurant_recommendations')
      .select(`
        *,
        restaurant:restaurants(*),
        video:videos(title, influencer:influencers(channel_name))
      `)
      .eq('video_id', videoId);

    if (error) throw new Error(`Failed to get recommendations: ${error.message}`);
    return data;
  }

  async getRecommendationsByRestaurant(restaurantId) {
    const { data, error } = await this.supabase
      .from('restaurant_recommendations')
      .select(`
        *,
        video:videos(
          title,
          video_id,
          influencer:influencers(channel_name, profile_image_url)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get recommendations: ${error.message}`);
    return data;
  }

  // Search operations
  async searchRestaurants(query, filters = {}) {
    let supabaseQuery = this.supabase
      .from('restaurants')
      .select(`
        *,
        recommendation_count:restaurant_recommendations(count)
      `);

    if (query) {
      // Improved multi-word search
      const searchTerms = query.trim().toLowerCase().split(/\s+/);
      
      if (searchTerms.length === 1) {
        // Single term - search in name, cuisine, and city
        supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,cuisine_type.ilike.%${query}%,city.ilike.%${query}%`);
      } else {
        // Multiple terms - find restaurants that match ANY of the terms
        const orConditions = [];
        
        searchTerms.forEach(term => {
          if (term.length >= 2) { // Only search terms with 2+ characters
            orConditions.push(`name.ilike.%${term}%`);
            orConditions.push(`cuisine_type.ilike.%${term}%`);
            orConditions.push(`city.ilike.%${term}%`);
          }
        });
        
        if (orConditions.length > 0) {
          supabaseQuery = supabaseQuery.or(orConditions.join(','));
        }
      }
    }

    if (filters.cuisineType) {
      supabaseQuery = supabaseQuery.eq('cuisine_type', filters.cuisineType);
    }

    if (filters.city) {
      supabaseQuery = supabaseQuery.ilike('city', `%${filters.city}%`);
    }

    if (filters.priceRange) {
      supabaseQuery = supabaseQuery.eq('price_range', filters.priceRange);
    }

    const { data, error } = await supabaseQuery
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to search restaurants: ${error.message}`);
    return data;
  }

  // User operations
  async createUserProfile(userId, profileData) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .insert([{
        id: userId,
        ...profileData
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create user profile: ${error.message}`);
    return data;
  }

  async getUserProfile(userId) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
    return data;
  }

  async addUserFavorite(userId, restaurantId) {
    const { data, error } = await this.supabase
      .from('user_favorites')
      .insert([{
        user_id: userId,
        restaurant_id: restaurantId
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to add favorite: ${error.message}`);
    return data;
  }

  async removeUserFavorite(userId, restaurantId) {
    const { data, error } = await this.supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);

    if (error) throw new Error(`Failed to remove favorite: ${error.message}`);
    return data;
  }

  async getUserFavorites(userId) {
    const { data, error } = await this.supabase
      .from('user_favorites')
      .select(`
        *,
        restaurant:restaurants(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get user favorites: ${error.message}`);
    return data;
  }

  // Analytics
  async getTopRestaurants(limit = 20) {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select(`
        *,
        recommendation_count:restaurant_recommendations(count)
      `)
      .order('recommendation_count', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get top restaurants: ${error.message}`);
    return data;
  }

  async getRecentRecommendations(limit = 50) {
    const { data, error } = await this.supabase
      .from('restaurant_recommendations')
      .select(`
        *,
        restaurant:restaurants(*),
        video:videos(
          title,
          video_id,
          influencer:influencers(channel_name, profile_image_url)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get recent recommendations: ${error.message}`);
    return data;
  }
}

module.exports = SupabaseService;