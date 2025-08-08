// Simple migration script to add duration_seconds column
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
    console.log('🔄 Running simple database migration');
    console.log('=' .repeat(50));

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        console.log('1️⃣ Adding duration_seconds column...');
        
        // First try to add the column
        const { error: alterError } = await supabase
            .rpc('exec_sql', { 
                sql: 'ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;'
            });

        if (alterError) {
            // If RPC doesn't work, we need to add the column through Supabase dashboard
            console.log('⚠️ Cannot add column via API. Column may already exist or needs manual addition.');
            console.log('   Please add this column manually in Supabase dashboard:');
            console.log('   Column name: duration_seconds');
            console.log('   Type: int8 (integer)'); 
            console.log('   Default value: 0');
        } else {
            console.log('✅ Column added successfully');
        }

        console.log('\n2️⃣ Checking existing data...');
        
        // Check if we can query the column now
        const { data: testQuery, error: testError } = await supabase
            .from('videos')
            .select('id, video_id, duration, duration_seconds')
            .limit(1);

        if (testError) {
            console.log('❌ Column does not exist yet. Please add it manually in Supabase dashboard.');
            console.log('   Go to your Supabase project > Table Editor > videos table');
            console.log('   Add column: duration_seconds (integer, default 0)');
            return;
        }

        console.log('✅ Column exists, proceeding with data migration...');

        // Get videos that need duration_seconds calculated
        const { data: videos, error: fetchError } = await supabase
            .from('videos')
            .select('id, video_id, duration, duration_seconds')
            .or('duration_seconds.is.null,duration_seconds.eq.0')
            .not('duration', 'is', null);

        if (fetchError) {
            throw fetchError;
        }

        console.log(`📊 Found ${videos.length} videos to update`);

        if (videos.length === 0) {
            console.log('✅ No videos need updating');
            await showStats(supabase);
            return;
        }

        console.log('\n3️⃣ Updating video durations...');
        let updated = 0;
        let failed = 0;

        for (const video of videos) {
            try {
                const durationSeconds = parseDuration(video.duration);
                
                const { error: updateError } = await supabase
                    .from('videos')
                    .update({ duration_seconds: durationSeconds })
                    .eq('id', video.id);

                if (updateError) {
                    console.log(`   ⚠️ Failed ${video.video_id}: ${updateError.message}`);
                    failed++;
                } else {
                    updated++;
                    if (updated % 5 === 0) {
                        console.log(`   📈 Updated ${updated}/${videos.length}...`);
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Parse error ${video.video_id}: ${error.message}`);
                failed++;
            }
        }

        console.log(`\n✅ Migration completed: ${updated} updated, ${failed} failed`);
        await showStats(supabase);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

function parseDuration(duration) {
    if (!duration) return 0;
    
    // YouTube duration format: PT1H2M10S
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
}

async function showStats(supabase) {
    console.log('\n📊 Final Statistics:');
    
    const { data: all } = await supabase.from('videos').select('duration_seconds');
    const total = all?.length || 0;
    
    if (total === 0) {
        console.log('   No videos found');
        return;
    }

    const short = all.filter(v => v.duration_seconds <= 60).length;
    const suitable = all.filter(v => v.duration_seconds > 120).length;
    const medium = total - short - suitable;

    console.log(`   - Total videos: ${total}`);
    console.log(`   - Short (≤1min): ${short} (${(short/total*100).toFixed(1)}%)`);
    console.log(`   - Medium (1-2min): ${medium} (${(medium/total*100).toFixed(1)}%)`);
    console.log(`   - Suitable (>2min): ${suitable} (${(suitable/total*100).toFixed(1)}%)`);
    console.log('\n🎉 YouTube Shorts filtering is now enabled!');
}

runMigration().catch(console.error);