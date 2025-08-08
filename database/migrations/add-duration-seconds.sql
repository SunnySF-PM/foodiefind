-- Migration: Add duration_seconds column to videos table
-- This helps us filter out YouTube Shorts and unsuitable videos

-- Add the duration_seconds column
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- Create a function to parse YouTube duration format (PT1H2M10S) to seconds
CREATE OR REPLACE FUNCTION parse_youtube_duration(duration_str TEXT)
RETURNS INTEGER AS $$
DECLARE
    result INTEGER := 0;
    hours INTEGER := 0;
    minutes INTEGER := 0;
    seconds INTEGER := 0;
BEGIN
    -- Handle null or empty input
    IF duration_str IS NULL OR duration_str = '' THEN
        RETURN 0;
    END IF;
    
    -- Extract hours (H)
    IF position('H' in duration_str) > 0 THEN
        hours := CAST(substring(duration_str from 'PT(\d+)H') AS INTEGER);
    END IF;
    
    -- Extract minutes (M)  
    IF position('M' in duration_str) > 0 THEN
        minutes := CAST(substring(duration_str from '(\d+)M') AS INTEGER);
    END IF;
    
    -- Extract seconds (S)
    IF position('S' in duration_str) > 0 THEN
        seconds := CAST(substring(duration_str from '(\d+)S') AS INTEGER);
    END IF;
    
    -- Calculate total seconds
    result := COALESCE(hours, 0) * 3600 + COALESCE(minutes, 0) * 60 + COALESCE(seconds, 0);
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- If parsing fails, return 0
        RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Update existing videos to populate duration_seconds
UPDATE videos 
SET duration_seconds = parse_youtube_duration(duration) 
WHERE duration_seconds = 0 AND duration IS NOT NULL;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_videos_duration_seconds ON videos(duration_seconds);

-- Create index for filtering by duration and processing status
CREATE INDEX IF NOT EXISTS idx_videos_duration_processed ON videos(duration_seconds, processed) WHERE duration_seconds > 120;

-- Show migration results
DO $$
DECLARE
    total_videos INTEGER;
    short_videos INTEGER;
    suitable_videos INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_videos FROM videos;
    SELECT COUNT(*) INTO short_videos FROM videos WHERE duration_seconds <= 60;
    SELECT COUNT(*) INTO suitable_videos FROM videos WHERE duration_seconds > 120;
    
    RAISE NOTICE 'Migration completed:';
    RAISE NOTICE '- Total videos: %', total_videos;
    RAISE NOTICE '- Short videos (≤60s): % (%.1f%%)', short_videos, 
        CASE WHEN total_videos > 0 THEN (short_videos::FLOAT / total_videos * 100) ELSE 0 END;
    RAISE NOTICE '- Suitable videos (>2min): % (%.1f%%)', suitable_videos,
        CASE WHEN total_videos > 0 THEN (suitable_videos::FLOAT / total_videos * 100) ELSE 0 END;
END $$;