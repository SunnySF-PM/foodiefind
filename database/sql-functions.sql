-- SQL functions and views for better performance and analytics

-- Function to get top restaurants by recommendation count
CREATE OR REPLACE FUNCTION get_top_restaurants(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  cuisine_type VARCHAR,
  city VARCHAR,
  country VARCHAR,
  price_range VARCHAR,
  rating DECIMAL,
  recommendation_count BIGINT,
  latest_mention TIMESTAMP WITH TIME ZONE
) 
LANGUAGE SQL
AS $$
  SELECT 
    r.id,
    r.name,
    r.cuisine_type,
    r.city,
    r.country,
    r.price_range,
    r.rating,
    COUNT(rr.id) as recommendation_count,
    MAX(rr.created_at) as latest_mention
  FROM restaurants r
  LEFT JOIN restaurant_recommendations rr ON r.id = rr.restaurant_id
  GROUP BY r.id, r.name, r.cuisine_type, r.city, r.country, r.price_range, r.rating
  ORDER BY recommendation_count DESC, latest_mention DESC
  LIMIT limit_count;
$$;

-- Function to get influencer stats
CREATE OR REPLACE FUNCTION get_influencer_stats(influencer_uuid UUID)
RETURNS TABLE (
  id UUID,
  channel_name VARCHAR,
  subscriber_count BIGINT,
  video_count BIGINT,
  processed_videos BIGINT,
  total_recommendations BIGINT,
  unique_restaurants BIGINT
) 
LANGUAGE SQL
AS $$
  SELECT 
    i.id,
    i.channel_name,
    i.subscriber_count,
    COUNT(DISTINCT v.id) as video_count,
    COUNT(DISTINCT CASE WHEN v.processed = true THEN v.id END) as processed_videos,
    COUNT(rr.id) as total_recommendations,
    COUNT(DISTINCT rr.restaurant_id) as unique_restaurants
  FROM influencers i
  LEFT JOIN videos v ON i.id = v.influencer_id
  LEFT JOIN restaurant_recommendations rr ON v.id = rr.video_id
  WHERE i.id = influencer_uuid
  GROUP BY i.id, i.channel_name, i.subscriber_count;
$$;

-- View for recent recommendations with full context
CREATE OR REPLACE VIEW recent_recommendations_view AS
SELECT 
  rr.id,
  rr.confidence_score,
  rr.context,
  rr.dish_mentioned,
  rr.created_at,
  r.name as restaurant_name,
  r.cuisine_type,
  r.city,
  r.price_range,
  v.title as video_title,
  v.video_id,
  v.published_at as video_published,
  i.channel_name as influencer_name,
  i.profile_image_url as influencer_image
FROM restaurant_recommendations rr
JOIN restaurants r ON rr.restaurant_id = r.id
JOIN videos v ON rr.video_id = v.id
JOIN influencers i ON v.influencer_id = i.id
ORDER BY rr.created_at DESC;

-- View for restaurant details with recommendation summary
CREATE OR REPLACE VIEW restaurant_details_view AS
SELECT 
  r.*,
  COUNT(rr.id) as total_mentions,
  COUNT(DISTINCT v.influencer_id) as mentioned_by_count,
  AVG(rr.confidence_score) as avg_confidence,
  MAX(rr.created_at) as latest_mention,
  array_agg(DISTINCT rr.dish_mentioned) FILTER (WHERE rr.dish_mentioned IS NOT NULL) as popular_dishes,
  array_agg(DISTINCT i.channel_name) as mentioned_by_influencers
FROM restaurants r
LEFT JOIN restaurant_recommendations rr ON r.id = rr.restaurant_id
LEFT JOIN videos v ON rr.video_id = v.id
LEFT JOIN influencers i ON v.influencer_id = i.id
GROUP BY r.id;

-- Function to search restaurants with full-text search
CREATE OR REPLACE FUNCTION search_restaurants_fulltext(
  search_query TEXT,
  cuisine_filter VARCHAR DEFAULT NULL,
  city_filter VARCHAR DEFAULT NULL,
  price_filter VARCHAR DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  cuisine_type VARCHAR,
  city VARCHAR,
  country VARCHAR,
  price_range VARCHAR,
  rating DECIMAL,
  total_mentions BIGINT,
  mentioned_by_count BIGINT,
  latest_mention TIMESTAMP WITH TIME ZONE,
  search_rank REAL
) 
LANGUAGE SQL
AS $$
  SELECT 
    r.id,
    r.name,
    r.cuisine_type,
    r.city,
    r.country,
    r.price_range,
    r.rating,
    rdv.total_mentions,
    rdv.mentioned_by_count,
    rdv.latest_mention,
    ts_rank(
      to_tsvector('english', r.name || ' ' || COALESCE(r.cuisine_type, '') || ' ' || COALESCE(r.city, '')),
      plainto_tsquery('english', search_query)
    ) as search_rank
  FROM restaurants r
  JOIN restaurant_details_view rdv ON r.id = rdv.id
  WHERE 
    (search_query IS NULL OR 
     to_tsvector('english', r.name || ' ' || COALESCE(r.cuisine_type, '') || ' ' || COALESCE(r.city, '')) 
     @@ plainto_tsquery('english', search_query))
    AND (cuisine_filter IS NULL OR r.cuisine_type = cuisine_filter)
    AND (city_filter IS NULL OR r.city ILIKE '%' || city_filter || '%')
    AND (price_filter IS NULL OR r.price_range = price_filter)
  ORDER BY search_rank DESC, rdv.total_mentions DESC
  LIMIT limit_count;
$$;

-- Function to get personalized recommendations for a user
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  user_uuid UUID,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  restaurant_name VARCHAR,
  cuisine_type VARCHAR,
  city VARCHAR,
  confidence_score DECIMAL,
  context TEXT,
  video_title VARCHAR,
  video_id VARCHAR,
  influencer_name VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  relevance_score DECIMAL
) 
LANGUAGE SQL
AS $$
  WITH user_prefs AS (
    SELECT preferred_cuisines, preferred_cities
    FROM user_profiles 
    WHERE id = user_uuid
  ),
  user_follows AS (
    SELECT influencer_id
    FROM user_follows
    WHERE user_id = user_uuid
  )
  SELECT 
    rr.id,
    r.name as restaurant_name,
    r.cuisine_type,
    r.city,
    rr.confidence_score,
    rr.context,
    v.title as video_title,
    v.video_id,
    i.channel_name as influencer_name,
    rr.created_at,
    -- Relevance scoring
    CASE 
      WHEN uf.influencer_id IS NOT NULL THEN 1.0 -- From followed influencer
      WHEN up.preferred_cuisines IS NOT NULL AND r.cuisine_type = ANY(up.preferred_cuisines) THEN 0.8
      WHEN up.preferred_cities IS NOT NULL AND r.city = ANY(up.preferred_cities) THEN 0.6
      ELSE 0.4
    END as relevance_score
  FROM restaurant_recommendations rr
  JOIN restaurants r ON rr.restaurant_id = r.id
  JOIN videos v ON rr.video_id = v.id
  JOIN influencers i ON v.influencer_id = i.id
  LEFT JOIN user_prefs up ON true
  LEFT JOIN user_follows uf ON i.id = uf.influencer_id
  WHERE rr.created_at >= NOW() - INTERVAL '30 days' -- Recent recommendations only
  ORDER BY relevance_score DESC, rr.created_at DESC
  LIMIT limit_count;
$$;

-- Function to get trending restaurants (gaining popularity)
CREATE OR REPLACE FUNCTION get_trending_restaurants(
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  cuisine_type VARCHAR,
  city VARCHAR,
  recent_mentions BIGINT,
  total_mentions BIGINT,
  trend_score DECIMAL,
  latest_mention TIMESTAMP WITH TIME ZONE
) 
LANGUAGE SQL
AS $$
  WITH recent_stats AS (
    SELECT 
      r.id,
      r.name,
      r.cuisine_type,
      r.city,
      COUNT(rr.id) FILTER (WHERE rr.created_at >= NOW() - INTERVAL '1 day' * days_back) as recent_mentions,
      COUNT(rr.id) as total_mentions,
      MAX(rr.created_at) as latest_mention
    FROM restaurants r
    LEFT JOIN restaurant_recommendations rr ON r.id = rr.restaurant_id
    GROUP BY r.id, r.name, r.cuisine_type, r.city
  )
  SELECT 
    id,
    name,
    cuisine_type,
    city,
    recent_mentions,
    total_mentions,
    CASE 
      WHEN total_mentions > 0 THEN (recent_mentions::DECIMAL / total_mentions) * recent_mentions
      ELSE 0
    END as trend_score,
    latest_mention
  FROM recent_stats
  WHERE recent_mentions > 0
  ORDER BY trend_score DESC, recent_mentions DESC
  LIMIT limit_count;
$$;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restaurant_recommendations_created_at ON restaurant_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_search ON restaurants USING GIN(to_tsvector('english', name || ' ' || COALESCE(cuisine_type, '') || ' ' || COALESCE(city, '')));

-- Update function for maintaining statistics
CREATE OR REPLACE FUNCTION update_influencer_stats() 
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update video count when videos are added/removed
  IF TG_TABLE_NAME = 'videos' THEN
    UPDATE influencers 
    SET 
      video_count = (
        SELECT COUNT(*) 
        FROM videos 
        WHERE influencer_id = COALESCE(NEW.influencer_id, OLD.influencer_id)
      ),
      updated_at = NOW()
    WHERE id = COALESCE(NEW.influencer_id, OLD.influencer_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to automatically update influencer stats
DROP TRIGGER IF EXISTS trigger_update_influencer_stats ON videos;
CREATE TRIGGER trigger_update_influencer_stats
  AFTER INSERT OR DELETE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_influencer_stats();