-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables for influencer restaurants app

-- Influencers table (YouTube channels)
CREATE TABLE influencers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id VARCHAR(255) UNIQUE NOT NULL,
  channel_name VARCHAR(255) NOT NULL,
  channel_url VARCHAR(500) NOT NULL,
  subscriber_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  description TEXT,
  profile_image_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos table
CREATE TABLE videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id VARCHAR(255) UNIQUE NOT NULL,
  influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  published_at TIMESTAMP WITH TIME ZONE,
  view_count BIGINT DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  duration VARCHAR(50),
  duration_seconds INTEGER DEFAULT 0,
  transcript TEXT,
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurants table
CREATE TABLE restaurants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  cuisine_type VARCHAR(100),
  phone VARCHAR(50),
  website VARCHAR(500),
  google_maps_url VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price_range VARCHAR(50), -- $, $$, $$$, $$$$
  rating DECIMAL(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurant recommendations (many-to-many between videos and restaurants)
CREATE TABLE restaurant_recommendations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  mentioned_at_timestamp INTEGER, -- seconds into video
  confidence_score DECIMAL(3, 2) DEFAULT 0.8, -- AI confidence in recommendation
  context TEXT, -- what was said about the restaurant
  dish_mentioned VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, restaurant_id)
);

-- Users table (handled by Supabase Auth, but we can extend with custom fields)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  full_name VARCHAR(255),
  avatar_url VARCHAR(500),
  preferred_cuisines TEXT[], -- array of cuisine types
  preferred_cities TEXT[], -- array of cities
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User favorites
CREATE TABLE user_favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- User following influencers
CREATE TABLE user_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, influencer_id)
);

-- Create indexes for better performance
CREATE INDEX idx_videos_influencer_id ON videos(influencer_id);
CREATE INDEX idx_videos_processed ON videos(processed);
CREATE INDEX idx_restaurant_recommendations_video_id ON restaurant_recommendations(video_id);
CREATE INDEX idx_restaurant_recommendations_restaurant_id ON restaurant_recommendations(restaurant_id);
CREATE INDEX idx_restaurants_cuisine_type ON restaurants(cuisine_type);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_follows_user_id ON user_follows(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Public read access for core data
CREATE POLICY "Public read access for influencers" ON influencers FOR SELECT USING (true);
CREATE POLICY "Public read access for videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Public read access for restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Public read access for restaurant_recommendations" ON restaurant_recommendations FOR SELECT USING (true);

-- User profile policies
CREATE POLICY "Users can read all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User favorites policies
CREATE POLICY "Users can read own favorites" ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON user_favorites FOR DELETE USING (auth.uid() = user_id);

-- User follows policies
CREATE POLICY "Users can read own follows" ON user_follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own follows" ON user_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own follows" ON user_follows FOR DELETE USING (auth.uid() = user_id);