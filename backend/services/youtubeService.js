const { google } = require('googleapis');
const { YoutubeTranscript } = require('youtube-transcript');
const axios = require('axios');

class YouTubeService {
  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
  }

  /**
   * Get channel information by channel ID or username
   * @param {string} channelId - YouTube channel ID or username
   * @returns {Object} Channel information
   */
  async getChannelInfo(channelId) {
    try {
      const response = await this.youtube.channels.list({
        part: 'snippet,statistics',
        id: channelId.startsWith('@') ? undefined : channelId,
        forUsername: channelId.startsWith('@') ? channelId.slice(1) : undefined
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const channel = response.data.items[0];
      return {
        channelId: channel.id,
        name: channel.snippet.title,
        description: channel.snippet.description,
        profileImageUrl: channel.snippet.thumbnails.default?.url,
        subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
        videoCount: parseInt(channel.statistics.videoCount) || 0,
        channelUrl: `https://youtube.com/channel/${channel.id}`
      };
    } catch (error) {
      console.error('Error fetching channel info:', error);
      throw new Error(`Failed to fetch channel info: ${error.message}`);
    }
  }

  /**
   * Parse YouTube duration format (PT1H2M10S) to seconds
   * @param {string} duration - YouTube duration in ISO 8601 format
   * @returns {number} Duration in seconds
   */
  parseDuration(duration) {
    if (!duration) return 0;
    
    // YouTube duration format: PT1H2M10S (1 hour, 2 minutes, 10 seconds)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Check if video is likely to contain meaningful restaurant content
   * @param {Object} video - Video object with duration and title
   * @returns {boolean} True if video should be processed
   */
  isVideoSuitableForProcessing(video) {
    const durationSeconds = this.parseDuration(video.duration);
    const title = video.title.toLowerCase();

    // Filter out YouTube Shorts (typically 60 seconds or less)
    if (durationSeconds <= 60) {
      console.log(`⏭️ Skipping short video (${durationSeconds}s): ${video.title.substring(0, 50)}...`);
      return false;
    }

    // Filter out very short videos that are unlikely to have restaurant content
    if (durationSeconds < 120) { // Less than 2 minutes
      console.log(`⏭️ Skipping very short video (${durationSeconds}s): ${video.title.substring(0, 50)}...`);
      return false;
    }

    // Filter out videos that are clearly not food-related (optional - be conservative)
    const nonFoodKeywords = ['music', 'live stream', 'shorts', 'compilation', 'trailer', 'announcement'];
    const hasNonFoodKeyword = nonFoodKeywords.some(keyword => title.includes(keyword));
    
    if (hasNonFoodKeyword) {
      console.log(`⏭️ Skipping non-food video: ${video.title.substring(0, 50)}...`);
      return false;
    }

    return true;
  }

  /**
   * Get videos from a channel
   * @param {string} channelId - YouTube channel ID
   * @param {number} maxResults - Maximum number of videos to fetch
   * @param {number} minDurationSeconds - Minimum video duration in seconds (default: 120)
   * @returns {Array} Array of video information
   */
  async getChannelVideos(channelId, maxResults = 50, minDurationSeconds = 120) {
    try {
      // Fetch more videos initially since we'll filter many out
      const fetchCount = Math.min(maxResults * 2, 50); // Fetch up to 2x to account for filtering
      
      const response = await this.youtube.search.list({
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        order: 'date',
        maxResults: fetchCount
      });

      const videos = [];
      
      if (response.data.items && response.data.items.length > 0) {
        // Get detailed video information
        const videoIds = response.data.items.map(item => item.id.videoId);
        const detailResponse = await this.youtube.videos.list({
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(',')
        });

        console.log(`🎬 Processing ${detailResponse.data.items.length} videos from channel...`);
        let skippedCount = 0;

        for (const video of detailResponse.data.items) {
          const videoData = {
            videoId: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            thumbnailUrl: video.snippet.thumbnails.medium?.url,
            publishedAt: video.snippet.publishedAt,
            viewCount: parseInt(video.statistics.viewCount) || 0,
            likeCount: parseInt(video.statistics.likeCount) || 0,
            duration: video.contentDetails.duration,
            durationSeconds: this.parseDuration(video.contentDetails.duration)
          };

          // Filter out shorts and unsuitable videos
          if (this.isVideoSuitableForProcessing(videoData)) {
            videos.push(videoData);
            
            // Stop when we have enough suitable videos
            if (videos.length >= maxResults) {
              break;
            }
          } else {
            skippedCount++;
          }
        }

        console.log(`✅ Selected ${videos.length} suitable videos, skipped ${skippedCount} shorts/unsuitable videos`);
      }

      return videos;
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      throw new Error(`Failed to fetch channel videos: ${error.message}`);
    }
  }

  /**
   * Get video details by video ID
   * @param {string} videoId - YouTube video ID
   * @returns {Object} Video information
   */
  async getVideoDetails(videoId) {
    try {
      const response = await this.youtube.videos.list({
        part: 'snippet,statistics,contentDetails',
        id: videoId
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = response.data.items[0];
      return {
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails.medium?.url,
        publishedAt: video.snippet.publishedAt,
        viewCount: parseInt(video.statistics.viewCount) || 0,
        likeCount: parseInt(video.statistics.likeCount) || 0,
        duration: video.contentDetails.duration,
        channelId: video.snippet.channelId
      };
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw new Error(`Failed to fetch video details: ${error.message}`);
    }
  }

  /**
   * Get video transcript using RapidAPI as fallback
   * @param {string} videoId - YouTube video ID
   * @returns {string} Video transcript
   */
  async getVideoTranscript(videoId) {
    // Try YouTube Transcript first
    try {
      console.log(`Attempting YouTube transcript for video: ${videoId}`);
      const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
      const transcript = transcriptArray.map(entry => entry.text).join(' ');
      
      // Check if transcript has meaningful content (more than 50 characters)
      if (transcript.trim().length > 50) {
        console.log(`✅ YouTube transcript successful (length: ${transcript.length})`);
        return transcript;
      } else {
        console.log(`⚠️ YouTube transcript too short (${transcript.length} chars), trying RapidAPI`);
        throw new Error('YouTube transcript too short');
      }
    } catch (error) {
      console.log(`❌ YouTube transcript failed: ${error.message}`);
      console.log(`🔄 Trying RapidAPI fallback for video: ${videoId}`);
      
      // Fallback to RapidAPI
      try {
        const transcript = await this.getRapidApiTranscript(videoId);
        console.log(`✅ RapidAPI transcript successful (length: ${transcript.length})`);
        return transcript;
      } catch (rapidApiError) {
        console.error(`❌ RapidAPI transcript also failed: ${rapidApiError.message}`);
        throw new Error(`Failed to fetch video transcript from both sources: YouTube (${error.message}) and RapidAPI (${rapidApiError.message})`);
      }
    }
  }

  /**
   * Get transcript using RapidAPI
   * @param {string} videoId - YouTube video ID
   * @returns {string} Video transcript
   */
  async getRapidApiTranscript(videoId) {
    try {
      const response = await axios.get(`https://${process.env.RAPIDAPI_HOST}/api/transcript`, {
        params: {
          videoId: videoId
        },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data && response.data.transcript) {
        // Handle different response formats
        if (Array.isArray(response.data.transcript)) {
          return response.data.transcript.map(entry => entry.text || entry).join(' ');
        } else if (typeof response.data.transcript === 'string') {
          return response.data.transcript;
        }
      }

      throw new Error('No transcript data in RapidAPI response');
    } catch (error) {
      if (error.response) {
        throw new Error(`RapidAPI error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      }
      throw new Error(`RapidAPI request failed: ${error.message}`);
    }
  }

  /**
   * Search for videos by keyword
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results
   * @returns {Array} Array of video information
   */
  async searchVideos(query, maxResults = 25) {
    try {
      const response = await this.youtube.search.list({
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'relevance',
        maxResults: maxResults
      });

      const videos = [];
      
      if (response.data.items && response.data.items.length > 0) {
        // Get detailed video information
        const videoIds = response.data.items.map(item => item.id.videoId);
        const detailResponse = await this.youtube.videos.list({
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(',')
        });

        for (const video of detailResponse.data.items) {
          videos.push({
            videoId: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            thumbnailUrl: video.snippet.thumbnails.medium?.url,
            publishedAt: video.snippet.publishedAt,
            viewCount: parseInt(video.statistics.viewCount) || 0,
            likeCount: parseInt(video.statistics.likeCount) || 0,
            duration: video.contentDetails.duration,
            channelId: video.snippet.channelId,
            channelTitle: video.snippet.channelTitle
          });
        }
      }

      return videos;
    } catch (error) {
      console.error('Error searching videos:', error);
      throw new Error(`Failed to search videos: ${error.message}`);
    }
  }

  /**
   * Extract video ID from YouTube URL
   * @param {string} url - YouTube URL
   * @returns {string} Video ID
   */
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Extract channel ID from YouTube URL
   * @param {string} url - YouTube URL
   * @returns {string} Channel ID or username
   */
  extractChannelId(url) {
    const patterns = [
      /youtube\.com\/channel\/([^\/\?\&]+)/,
      /youtube\.com\/c\/([^\/\?\&]+)/,
      /youtube\.com\/user\/([^\/\?\&]+)/,
      /youtube\.com\/@([^\/\?\&]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return pattern === patterns[3] ? `@${match[1]}` : match[1]; // Add @ for handle format
      }
    }

    return null;
  }
}

module.exports = YouTubeService;