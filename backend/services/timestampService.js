const { YoutubeTranscript } = require('youtube-transcript');

class TimestampService {
  constructor() {}

  /**
   * Get transcript with timestamps from YouTube
   * @param {string} videoId - YouTube video ID
   * @returns {Array} Transcript array with timestamps
   */
  async getTranscriptWithTimestamps(videoId) {
    try {
      const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
      return transcriptArray; // Returns [{text: "...", offset: 1234}, ...]
    } catch (error) {
      console.error('Error fetching timestamped transcript:', error);
      return [];
    }
  }

  /**
   * Find approximate timestamp when restaurant is mentioned
   * @param {Array} transcriptArray - Transcript with timestamps
   * @param {string} restaurantName - Restaurant name to search for
   * @param {string} context - Context quote about the restaurant
   * @returns {number|null} Timestamp in seconds or null
   */
  findRestaurantTimestamp(transcriptArray, restaurantName, context) {
    if (!transcriptArray || transcriptArray.length === 0) {
      return null;
    }

    // Convert transcript to searchable text with timestamps
    const timestampedText = transcriptArray.map(entry => ({
      text: entry.text.toLowerCase(),
      timestamp: Math.floor(entry.offset / 1000), // Convert ms to seconds
      offset: entry.offset
    }));

    const searchTerms = [
      restaurantName.toLowerCase(),
      ...restaurantName.toLowerCase().split(' '),
      ...(context || '').toLowerCase().split(' ').filter(word => word.length > 3)
    ].filter(term => term.length > 2);

    // Find best matching timestamp
    let bestMatch = null;
    let bestScore = 0;

    for (let i = 0; i < timestampedText.length; i++) {
      const entry = timestampedText[i];
      let score = 0;

      // Check current entry and surrounding context (±2 entries)
      const contextWindow = timestampedText.slice(
        Math.max(0, i - 2),
        Math.min(timestampedText.length, i + 3)
      );
      
      const windowText = contextWindow.map(e => e.text).join(' ');

      // Score based on how many search terms match
      searchTerms.forEach(term => {
        if (windowText.includes(term)) {
          score += 1;
          // Bonus points for exact restaurant name match
          if (term === restaurantName.toLowerCase()) {
            score += 2;
          }
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry.timestamp;
      }
    }

    // Only return timestamp if we have a decent confidence match
    return bestScore >= 2 ? bestMatch : null;
  }

  /**
   * Enhanced AI processing with timestamp extraction
   * @param {string} videoId - YouTube video ID
   * @param {Array} aiRecommendations - Recommendations from AI
   * @returns {Array} Recommendations enhanced with timestamps
   */
  async enhanceRecommendationsWithTimestamps(videoId, aiRecommendations) {
    try {
      const transcriptArray = await this.getTranscriptWithTimestamps(videoId);
      
      if (transcriptArray.length === 0) {
        console.log(`No timestamped transcript available for ${videoId}`);
        return aiRecommendations;
      }

      console.log(`🕒 Enhancing ${aiRecommendations.length} recommendations with timestamps`);

      const enhancedRecommendations = aiRecommendations.map(rec => {
        const timestamp = this.findRestaurantTimestamp(
          transcriptArray,
          rec.name,
          rec.context
        );

        if (timestamp) {
          console.log(`⏰ Found timestamp for ${rec.name}: ${this.formatTimestamp(timestamp)}`);
        }

        return {
          ...rec,
          mentionedAt: timestamp
        };
      });

      return enhancedRecommendations;
      
    } catch (error) {
      console.error('Error enhancing recommendations with timestamps:', error);
      return aiRecommendations; // Return original if timestamp enhancement fails
    }
  }

  /**
   * Format seconds to MM:SS format
   * @param {number} seconds - Timestamp in seconds
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(seconds) {
    if (!seconds) return null;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Generate YouTube URL with timestamp
   * @param {string} videoId - YouTube video ID
   * @param {number} timestamp - Timestamp in seconds
   * @returns {string} YouTube URL with timestamp
   */
  getYouTubeUrlWithTimestamp(videoId, timestamp) {
    if (!timestamp) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return `https://www.youtube.com/watch?v=${videoId}&t=${timestamp}s`;
  }
}

module.exports = TimestampService;