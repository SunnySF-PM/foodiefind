// Monitor processing status and queue management
require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';

class ProcessingMonitor {
    constructor() {
        this.lastStats = null;
    }

    async run() {
        console.log('🖥️  FoodieFind Processing Monitor');
        console.log('=====================================\n');

        // Run monitoring loop
        while (true) {
            await this.displayStatus();
            await this.sleep(5000); // Update every 5 seconds
            console.clear();
            console.log('🖥️  FoodieFind Processing Monitor (Updates every 5s)');
            console.log('=====================================\n');
        }
    }

    async displayStatus() {
        try {
            const [stats, influencers, restaurants] = await Promise.all([
                this.getProcessingStatus(),
                this.getInfluencers(),
                this.getRestaurants()
            ]);

            // Display overall stats
            console.log('📊 SYSTEM OVERVIEW');
            console.log('------------------');
            console.log(`👥 Influencers: ${influencers.length}`);
            console.log(`📹 Total Videos: ${stats.total}`);
            console.log(`🍽️  Restaurants: ${restaurants.length}`);
            console.log(`⭐ Recommendations: ${this.getTotalRecommendations(restaurants)}`);

            console.log('\n🔄 PROCESSING STATUS');
            console.log('-------------------');
            console.log(`✅ Processed Videos: ${stats.processed} (${stats.processing_rate}%)`);
            console.log(`❌ Failed Videos: ${stats.failed}`);
            console.log(`⏳ Pending Videos: ${stats.pending}`);

            // Show processing progress bar
            const progressBar = this.createProgressBar(stats.processed, stats.total);
            console.log(`📈 Progress: ${progressBar} ${stats.processing_rate}%`);

            // Show recent changes
            if (this.lastStats) {
                const processedDiff = stats.processed - this.lastStats.processed;
                const failedDiff = stats.failed - this.lastStats.failed;
                
                if (processedDiff > 0 || failedDiff > 0) {
                    console.log(`\n📈 RECENT CHANGES (last 5s)`);
                    console.log(`   +${processedDiff} processed, +${failedDiff} failed`);
                }
            }

            // Show top influencers by content
            console.log('\n🏆 TOP INFLUENCERS BY CONTENT');
            console.log('----------------------------');
            const topInfluencers = influencers
                .sort((a, b) => (b.video_count || 0) - (a.video_count || 0))
                .slice(0, 5);

            topInfluencers.forEach((inf, idx) => {
                console.log(`${idx + 1}. ${inf.channel_name}`);
                console.log(`   📹 ${inf.video_count || 0} videos | 👥 ${(inf.subscriber_count || 0).toLocaleString()} subs`);
            });

            // Show processing recommendations
            console.log('\n💡 RECOMMENDATIONS');
            console.log('------------------');
            if (stats.pending > 0) {
                console.log(`🚀 You have ${stats.pending} videos ready to process!`);
                console.log('   Run: npm run process-batch');
            }

            if (stats.failed > 10) {
                console.log(`⚠️  High failure rate (${stats.failed} failures)`);
                console.log('   Consider checking error logs');
            }

            if (stats.processing_rate < 50) {
                console.log(`📊 Processing rate is low (${stats.processing_rate}%)`);
                console.log('   Consider running bulk processing');
            }

            this.lastStats = stats;

        } catch (error) {
            console.log(`❌ Error fetching status: ${error.message}`);
        }
    }

    async getProcessingStatus() {
        const response = await axios.get(`${API_BASE}/processing/status`);
        return response.data;
    }

    async getInfluencers() {
        const response = await axios.get(`${API_BASE}/influencers`);
        return response.data;
    }

    async getRestaurants() {
        const response = await axios.get(`${API_BASE}/restaurants`);
        return response.data;
    }

    getTotalRecommendations(restaurants) {
        return restaurants.reduce((sum, r) => sum + (r.recommendation_count || 0), 0);
    }

    createProgressBar(current, total, width = 30) {
        if (total === 0) return '▱'.repeat(width);
        
        const percentage = current / total;
        const filledWidth = Math.round(percentage * width);
        const emptyWidth = width - filledWidth;
        
        return '▰'.repeat(filledWidth) + '▱'.repeat(emptyWidth);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Quick status check (non-monitoring mode)
async function quickStatus() {
    const monitor = new ProcessingMonitor();
    await monitor.displayStatus();
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--quick') || args.includes('-q')) {
        await quickStatus();
    } else {
        console.log('Starting continuous monitoring...');
        console.log('Press Ctrl+C to exit\n');
        
        const monitor = new ProcessingMonitor();
        await monitor.run();
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('💥 Monitor error:', error.message);
        process.exit(1);
    });
}

module.exports = ProcessingMonitor;