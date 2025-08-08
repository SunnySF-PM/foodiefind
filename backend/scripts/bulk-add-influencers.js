// Bulk add popular food influencers
require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';

// Popular food influencers to add (you can expand this list)
const POPULAR_FOOD_INFLUENCERS = [
    {
        name: 'Mark Wiens',
        channelId: 'UCyEd6QBSgat5kkC6svyjudA',
        url: 'https://youtube.com/@markwiens'
    },
    {
        name: 'Best Ever Food Review Show',
        channelId: 'UCcAd5Np7fO8SeejB1FVKcyw',
        url: 'https://youtube.com/@BestEverFoodReviewShow'
    },
    {
        name: 'Strictly Dumpling',
        channelId: 'UCh30P3E_8aUlRILDZx3KFgg', 
        url: 'https://youtube.com/@StrictlyDumpling'
    },
    {
        name: 'Food Ranger',
        channelId: 'UCiAq_SU0ED1C6vWFMnw8Dkg',
        url: 'https://youtube.com/@TheFoodRanger'
    },
    {
        name: 'Luke Martin',
        channelId: 'UCe_vXdMrHHseZ_esYUskSBw',
        url: 'https://youtube.com/@lukemartin'
    }
];

class BulkInfluencerAdder {
    constructor() {
        this.processedCount = 0;
        this.failedCount = 0;
        this.errors = [];
    }

    async run() {
        console.log('🚀 Starting bulk influencer addition process...\n');
        console.log(`📊 Planning to add ${POPULAR_FOOD_INFLUENCERS.length} influencers`);
        console.log('='  .repeat(60));

        for (const influencer of POPULAR_FOOD_INFLUENCERS) {
            await this.addInfluencerWithVideos(influencer);
            
            // Wait 2 seconds between each influencer to avoid rate limits
            if (POPULAR_FOOD_INFLUENCERS.indexOf(influencer) < POPULAR_FOOD_INFLUENCERS.length - 1) {
                console.log('⏳ Waiting 2 seconds before next influencer...\n');
                await this.sleep(2000);
            }
        }

        this.printSummary();
    }

    async addInfluencerWithVideos(influencerData) {
        console.log(`\n👤 Processing: ${influencerData.name}`);
        console.log(`🔗 Channel URL: ${influencerData.url}`);

        try {
            // Step 1: Add influencer
            console.log('   📝 Adding influencer to database...');
            const influencer = await this.apiRequest('/influencers', {
                method: 'POST',
                data: { channelUrl: influencerData.url }
            });

            console.log(`   ✅ Added influencer: ${influencer.channel_name}`);
            console.log(`   📊 Subscriber count: ${influencer.subscriber_count?.toLocaleString() || 'N/A'}`);

            // Step 2: Sync videos
            console.log('   🔄 Syncing videos from YouTube...');
            const syncResult = await this.apiRequest(`/influencers/${influencer.id}/sync-videos`, {
                method: 'POST',
                data: { maxResults: 30 } // Limit to 30 most recent videos
            });

            console.log(`   📹 Synced ${syncResult.synced} new videos, skipped ${syncResult.skipped} existing`);

            // Step 3: Process videos for restaurant recommendations
            console.log('   🤖 Processing videos for restaurant recommendations...');
            const processResult = await this.apiRequest('/processing/videos/batch', {
                method: 'POST',
                data: { limit: 5 } // Process 5 videos at a time to avoid timeouts
            });

            console.log(`   🍽️ Processed ${processResult.processed} videos, ${processResult.failed} failed`);

            if (processResult.errors && processResult.errors.length > 0) {
                console.log(`   ⚠️ Processing errors:`);
                processResult.errors.forEach(error => {
                    console.log(`      - ${error.videoId}: ${error.error}`);
                });
            }

            this.processedCount++;
            console.log(`   ✅ Successfully completed ${influencerData.name}`);

        } catch (error) {
            this.failedCount++;
            this.errors.push({ influencer: influencerData.name, error: error.message });
            
            if (error.message.includes('already exists')) {
                console.log(`   ℹ️ Influencer already exists, skipping...`);
            } else {
                console.log(`   ❌ Failed to process ${influencerData.name}: ${error.message}`);
            }
        }
    }

    async apiRequest(endpoint, options = {}) {
        try {
            const response = await axios({
                url: `${API_BASE}${endpoint}`,
                method: options.method || 'GET',
                data: options.data,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            if (error.response?.data?.error) {
                throw new Error(error.response.data.error);
            }
            throw new Error(error.message);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    printSummary() {
        console.log('\n' + '='  .repeat(60));
        console.log('📋 BULK ADDITION SUMMARY');
        console.log('='  .repeat(60));
        console.log(`✅ Successfully processed: ${this.processedCount} influencers`);
        console.log(`❌ Failed: ${this.failedCount} influencers`);
        console.log(`📊 Total attempted: ${POPULAR_FOOD_INFLUENCERS.length} influencers`);

        if (this.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            this.errors.forEach(error => {
                console.log(`   - ${error.influencer}: ${error.error}`);
            });
        }

        console.log('\n🎉 Bulk addition process completed!');
        console.log('💡 You can now use the admin panel to manage and process more content.');
    }
}

// Run the script
async function main() {
    const bulkAdder = new BulkInfluencerAdder();
    
    try {
        await bulkAdder.run();
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = BulkInfluencerAdder;