const axios = require('axios');

class MapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  /**
   * Search for restaurant details using Google Places API
   * @param {string} restaurantName - Name of the restaurant
   * @param {string} city - City where restaurant is located
   * @returns {Object} Restaurant details from Google Places
   */
  async getRestaurantDetails(restaurantName, city) {
    if (!this.apiKey) {
      console.log('Google Maps API key not configured');
      return null;
    }

    try {
      const query = `${restaurantName} ${city}`;
      
      // First, search for the place
      const searchResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: {
          query: query,
          key: this.apiKey,
          type: 'restaurant'
        }
      });

      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        console.log(`No results found for: ${query}`);
        return null;
      }

      const place = searchResponse.data.results[0];
      
      // Get detailed information using Place Details API
      const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          place_id: place.place_id,
          fields: 'name,formatted_address,formatted_phone_number,rating,price_level,website,geometry,photos',
          key: this.apiKey
        }
      });

      const details = detailsResponse.data.result;
      
      return {
        name: details.name,
        address: details.formatted_address,
        phone: details.formatted_phone_number,
        website: details.website,
        rating: details.rating,
        price_level: this.formatPriceLevel(details.price_level),
        latitude: details.geometry?.location?.lat,
        longitude: details.geometry?.location?.lng,
        google_maps_url: `https://maps.google.com/?place_id=${place.place_id}`,
        photos: details.photos ? details.photos.slice(0, 3).map(photo => ({
          reference: photo.photo_reference,
          url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.apiKey}`
        })) : []
      };

    } catch (error) {
      console.error(`Error fetching details for ${restaurantName}:`, error.message);
      return null;
    }
  }

  /**
   * Convert Google's price_level to our format
   * @param {number} priceLevel - Google's 0-4 price level
   * @returns {string} Our $ to $$$$ format
   */
  formatPriceLevel(priceLevel) {
    const mapping = {
      0: '$',
      1: '$',
      2: '$$',
      3: '$$$',
      4: '$$$$'
    };
    return mapping[priceLevel] || null;
  }

  /**
   * Enhance all restaurants in database with Google Maps data
   */
  async enhanceAllRestaurants() {
    const SupabaseService = require('./supabaseService');
    const supabaseService = new SupabaseService();

    try {
      // Get all restaurants that need enhancement
      const restaurants = await supabaseService.getAllRestaurants();
      
      console.log(`🔍 Enhancing ${restaurants.length} restaurants with Google Maps data...`);
      
      let enhanced = 0;
      let failed = 0;

      for (const restaurant of restaurants) {
        try {
          console.log(`📍 Processing: ${restaurant.name} in ${restaurant.city}`);
          
          const details = await this.getRestaurantDetails(restaurant.name, restaurant.city);
          
          if (details) {
            // Update restaurant with Google Maps data
            await supabaseService.supabase
              .from('restaurants')
              .update({
                address: details.address,
                phone: details.phone,
                website: details.website,
                rating: details.rating,
                price_range: details.price_level || restaurant.price_range,
                latitude: details.latitude,
                longitude: details.longitude,
                google_maps_url: details.google_maps_url,
                updated_at: new Date().toISOString()
              })
              .eq('id', restaurant.id);
            
            console.log(`✅ Enhanced: ${restaurant.name}`);
            enhanced++;
          } else {
            console.log(`❌ No data found: ${restaurant.name}`);
            failed++;
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Error enhancing ${restaurant.name}:`, error.message);
          failed++;
        }
      }

      console.log(`\n📊 Enhancement complete: ${enhanced} enhanced, ${failed} failed`);
      return { enhanced, failed, total: restaurants.length };

    } catch (error) {
      console.error('Error enhancing restaurants:', error);
      throw error;
    }
  }
}

module.exports = MapsService;