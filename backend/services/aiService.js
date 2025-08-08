const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Extract restaurant recommendations from video transcript
   * @param {string} transcript - Video transcript text
   * @param {string} videoTitle - Video title for context
   * @returns {Array} Array of restaurant recommendations
   */
  async extractRestaurantRecommendations(transcript, videoTitle = '') {
    try {
      const prompt = this.createExtractionPrompt(transcript, videoTitle);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting restaurant recommendations from food influencer video transcripts. 
            Extract restaurant names, locations, cuisine types, and specific dishes mentioned. 
            Be precise and only include restaurants that are clearly recommended or positively mentioned.
            Return results in valid JSON format only.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      
      // Parse the JSON response
      let recommendations;
      try {
        recommendations = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Try to extract JSON from the response if it's wrapped in text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('AI response is not valid JSON');
        }
      }

      // Validate and format the recommendations
      return this.validateAndFormatRecommendations(recommendations);

    } catch (error) {
      console.error('Error extracting restaurant recommendations:', error);
      throw new Error(`Failed to extract recommendations: ${error.message}`);
    }
  }

  /**
   * Create a prompt for restaurant extraction
   * @param {string} transcript - Video transcript
   * @param {string} videoTitle - Video title
   * @returns {string} Formatted prompt
   */
  createExtractionPrompt(transcript, videoTitle) {
    return `
Please analyze this food video transcript and extract restaurant recommendations. 

Video Title: "${videoTitle}"

Transcript: "${transcript}"

Extract and return a JSON object with the following structure:
{
  "restaurants": [
    {
      "name": "Restaurant Name",
      "location": "City, State/Country (if mentioned)",
      "address": "Full address if mentioned",
      "cuisineType": "Type of cuisine",
      "dishMentioned": "Specific dish or food item mentioned",
      "context": "Brief quote or context about why it's recommended",
      "confidenceScore": 0.9,
      "priceRange": "$$ (if mentioned or can be inferred)",
      "mentionedAt": 450
    }
  ]
}

Guidelines:
1. Only include restaurants that are clearly recommended or spoken about positively
2. Don't include restaurants that are just mentioned in passing without recommendation
3. Extract specific dishes or menu items mentioned
4. Include location details if mentioned (city, neighborhood, address)
5. Set confidence score between 0.6-1.0 based on how clearly the restaurant is recommended
6. Price range: $, $$, $$$, $$$$ (if mentioned or can be inferred from context)
7. For mentionedAt: If transcript has timestamps, extract the approximate time in seconds. If no timestamps, return null.
8. If no restaurants are recommended, return: {"restaurants": []}
9. Be conservative - better to miss a recommendation than include a false positive

Return only the JSON object, no additional text.
    `;
  }

  /**
   * Validate and format AI recommendations
   * @param {Object} recommendations - Raw AI recommendations
   * @returns {Array} Validated recommendations
   */
  validateAndFormatRecommendations(recommendations) {
    if (!recommendations || !recommendations.restaurants || !Array.isArray(recommendations.restaurants)) {
      return [];
    }

    return recommendations.restaurants
      .filter(restaurant => {
        // Basic validation - must have name and reasonable confidence
        return restaurant.name && 
               restaurant.name.trim().length > 0 &&
               (restaurant.confidenceScore >= 0.6 || !restaurant.confidenceScore);
      })
      .map(restaurant => ({
        name: restaurant.name.trim(),
        location: restaurant.location || null,
        address: restaurant.address || null,
        cuisineType: restaurant.cuisineType || null,
        dishMentioned: restaurant.dishMentioned || null,
        context: restaurant.context || null,
        confidenceScore: restaurant.confidenceScore || 0.8,
        priceRange: this.validatePriceRange(restaurant.priceRange),
        mentionedAt: restaurant.mentionedAt || null
      }));
  }

  /**
   * Validate price range format
   * @param {string} priceRange - Price range string
   * @returns {string} Validated price range
   */
  validatePriceRange(priceRange) {
    const validRanges = ['$', '$$', '$$$', '$$$$'];
    return validRanges.includes(priceRange) ? priceRange : null;
  }

  /**
   * Generate restaurant summary from multiple mentions
   * @param {Array} mentions - Array of restaurant mentions
   * @returns {Object} Restaurant summary
   */
  async generateRestaurantSummary(mentions) {
    try {
      const prompt = `
Based on these multiple mentions of a restaurant across different videos, create a comprehensive summary:

${JSON.stringify(mentions, null, 2)}

Generate a JSON response with:
{
  "summary": "Brief summary of what makes this restaurant notable",
  "popularDishes": ["dish1", "dish2"],
  "overallRating": "Overall sentiment (positive/mixed/negative)",
  "bestKnownFor": "What the restaurant is best known for"
}
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a food expert creating restaurant summaries from influencer mentions. Be concise and accurate."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      });

      return JSON.parse(response.choices[0].message.content);

    } catch (error) {
      console.error('Error generating restaurant summary:', error);
      return {
        summary: "Multiple mentions across food videos",
        popularDishes: [],
        overallRating: "positive",
        bestKnownFor: "Featured in food influencer videos"
      };
    }
  }

  /**
   * Classify video content type
   * @param {string} title - Video title
   * @param {string} description - Video description
   * @returns {string} Content type classification
   */
  async classifyVideoContent(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    // Simple keyword-based classification
    if (text.includes('review') || text.includes('trying') || text.includes('taste test')) {
      return 'review';
    } else if (text.includes('tour') || text.includes('guide') || text.includes('best')) {
      return 'guide';
    } else if (text.includes('recipe') || text.includes('cooking') || text.includes('make')) {
      return 'recipe';
    } else if (text.includes('challenge') || text.includes('vs') || text.includes('competition')) {
      return 'challenge';
    } else {
      return 'general';
    }
  }
}

module.exports = AIService;