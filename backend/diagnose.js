// Quick diagnostic script for bulk processing issues
require('dotenv').config();

async function diagnose() {
    console.log('🔧 FoodieFind Bulk Processing Diagnostic');
    console.log('==========================================\n');

    try {
        // Test API endpoints
        const fetch = (await import('node-fetch')).default;
        
        console.log('1️⃣ Testing server connectivity...');
        const healthCheck = await fetch('http://localhost:3002/health');
        if (healthCheck.ok) {
            console.log('✅ Server is running on port 3002\n');
        } else {
            console.log('❌ Server not responding. Run: cd backend && npm start\n');
            return;
        }

        console.log('2️⃣ Testing debug endpoints...');
        
        // Test videos status
        const videosStatus = await fetch('http://localhost:3002/api/debug/videos-status');
        if (videosStatus.ok) {
            const data = await videosStatus.json();
            console.log(`✅ Database connected`);
            console.log(`   📊 Total videos: ${data.stats.total}`);
            console.log(`   ✅ Processed: ${data.stats.processed}`);
            console.log(`   ⏳ Unprocessed: ${data.stats.unprocessed}`);
            console.log(`   ❌ Failed: ${data.stats.failed}`);
            console.log(`   ⏱️ Has duration_seconds: ${data.stats.has_duration_seconds}`);
            console.log(`   🎯 Suitable for processing: ${data.stats.suitable_for_processing}\n`);
            
            if (data.stats.total === 0) {
                console.log('💡 No videos found. Add an influencer first:');
                console.log('   1. Use admin panel: Add New Food Influencer');
                console.log('   2. Or run: npm run bulk-add\n');
                return;
            }

            if (data.stats.has_duration_seconds === 0) {
                console.log('⚠️ Videos missing duration_seconds. Run migration:');
                console.log('   npm run migrate\n');
            }

            if (data.stats.suitable_for_processing === 0) {
                console.log('⚠️ No videos suitable for processing (need >2min duration)');
                console.log('   This could mean all videos are shorts or migration needed\n');
            }

        } else {
            console.log('❌ Debug endpoint failed\n');
        }

        console.log('3️⃣ Testing unprocessed videos query...');
        
        // Test unprocessed videos
        const unprocessedTest = await fetch('http://localhost:3002/api/debug/unprocessed-videos?limit=5');
        if (unprocessedTest.ok) {
            const data = await unprocessedTest.json();
            console.log(`✅ Unprocessed videos query works`);
            console.log(`   📋 Query counts:`);
            console.log(`      All videos: ${data.query_counts.all_videos}`);
            console.log(`      Unprocessed basic: ${data.query_counts.unprocessed_basic}`);
            console.log(`      No errors: ${data.query_counts.no_errors}`);
            console.log(`      Suitable duration: ${data.query_counts.suitable_duration}`);
            console.log(`   🎬 Available for processing: ${data.unprocessed_videos}\n`);

            if (data.unprocessed_videos === 0) {
                if (data.query_counts.all_videos === 0) {
                    console.log('💡 Solution: Add influencers first');
                    console.log('   Run: npm run bulk-add');
                } else if (data.query_counts.suitable_duration === 0) {
                    console.log('💡 Solution: Run database migration');
                    console.log('   Run: npm run migrate');
                } else {
                    console.log('💡 All suitable videos already processed!');
                    console.log('   Add more influencers or reprocess failed videos');
                }
            } else {
                console.log('🎯 Ready for bulk processing!');
                console.log(`   ${data.unprocessed_videos} videos ready to process`);
            }

        } else {
            const errorText = await unprocessedTest.text();
            console.log(`❌ Unprocessed videos test failed: ${errorText}\n`);
        }

        console.log('4️⃣ Testing bulk processing endpoint...');
        
        // Test bulk processing (dry run with limit 1)
        const bulkTest = await fetch('http://localhost:3002/api/processing/videos/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 1 })
        });

        if (bulkTest.ok) {
            const data = await bulkTest.json();
            console.log('✅ Bulk processing endpoint works');
            console.log(`   📊 Result: ${data.processed} processed, ${data.failed} failed`);
            console.log(`   💬 Message: ${data.message}\n`);

            if (data.total === 0) {
                console.log('💡 No videos to process. See solutions above.\n');
            }
        } else {
            const errorText = await bulkTest.text();
            console.log(`❌ Bulk processing test failed: ${errorText}\n`);
        }

        console.log('🎉 Diagnostic completed!');
        console.log('\n📋 Next steps:');
        console.log('1. If no videos: Run "npm run bulk-add" to add popular influencers');
        console.log('2. If no duration_seconds: Run "npm run migrate" to update database');  
        console.log('3. If ready: Use admin panel "Start Bulk Processing" button');
        console.log('4. Monitor progress in admin panel logs');

    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        console.log('\n💡 Make sure:');
        console.log('1. Backend server is running: cd backend && npm start');
        console.log('2. Environment variables are set (.env file)');
        console.log('3. Database is accessible (Supabase)');
    }
}

diagnose();