// Run database migration to add duration_seconds column
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class MigrationRunner {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    async runMigration() {
        console.log('🔄 Running database migration: add duration_seconds column');
        console.log('=' .repeat(60));

        try {
            // Read the migration SQL file
            const migrationPath = path.join(__dirname, '../../database/migrations/add-duration-seconds.sql');
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

            console.log('📄 Migration file loaded successfully');

            // Execute the migration
            console.log('⏳ Executing migration...');
            const { data, error } = await this.supabase.rpc('exec_sql', { 
                sql: migrationSQL 
            });

            if (error) {
                // If exec_sql doesn't exist, try direct SQL execution
                console.log('📝 Trying alternative migration approach...');
                await this.executeMigrationSteps(migrationSQL);
            } else {
                console.log('✅ Migration executed successfully');
            }

            // Verify the migration
            await this.verifyMigration();

        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            process.exit(1);
        }
    }

    async executeMigrationSteps(migrationSQL) {
        // Split the migration into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📋 Executing ${statements.length} migration statements...`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            if (statement.includes('ALTER TABLE')) {
                console.log(`   ${i + 1}. Adding duration_seconds column...`);
                const { error } = await this.supabase.rpc('exec_sql', { 
                    sql: statement 
                });
                if (error && !error.message.includes('already exists')) {
                    throw error;
                }
            }
        }

        // Update existing videos with duration_seconds
        await this.updateExistingVideos();
    }

    async updateExistingVideos() {
        console.log('🔄 Updating existing videos with duration_seconds...');

        // Get all videos that need duration_seconds calculated
        const { data: videos, error: fetchError } = await this.supabase
            .from('videos')
            .select('id, video_id, duration, duration_seconds')
            .or('duration_seconds.is.null,duration_seconds.eq.0')
            .not('duration', 'is', null);

        if (fetchError) {
            throw fetchError;
        }

        console.log(`📊 Found ${videos.length} videos to update`);

        let updated = 0;
        let failed = 0;

        for (const video of videos) {
            try {
                const durationSeconds = this.parseDuration(video.duration);
                
                const { error: updateError } = await this.supabase
                    .from('videos')
                    .update({ duration_seconds: durationSeconds })
                    .eq('id', video.id);

                if (updateError) {
                    console.log(`   ⚠️ Failed to update ${video.video_id}: ${updateError.message}`);
                    failed++;
                } else {
                    updated++;
                    if (updated % 10 === 0) {
                        console.log(`   📈 Updated ${updated}/${videos.length} videos...`);
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Failed to parse duration for ${video.video_id}: ${error.message}`);
                failed++;
            }
        }

        console.log(`✅ Updated ${updated} videos, ${failed} failed`);
    }

    parseDuration(duration) {
        if (!duration) return 0;
        
        // YouTube duration format: PT1H2M10S
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;

        return hours * 3600 + minutes * 60 + seconds;
    }

    async verifyMigration() {
        console.log('\n🔍 Verifying migration results...');

        // Check if column exists and has data
        const { data: videos, error } = await this.supabase
            .from('videos')
            .select('duration_seconds')
            .not('duration_seconds', 'is', null)
            .limit(5);

        if (error) {
            throw new Error(`Verification failed: ${error.message}`);
        }

        // Get statistics
        const { data: stats, error: statsError } = await this.supabase
            .from('videos')
            .select('duration_seconds')
            .not('duration_seconds', 'is', null);

        if (statsError) {
            throw new Error(`Stats query failed: ${statsError.message}`);
        }

        const totalVideos = stats.length;
        const shortVideos = stats.filter(v => v.duration_seconds <= 60).length;
        const suitableVideos = stats.filter(v => v.duration_seconds > 120).length;

        console.log('📊 Migration Results:');
        console.log(`   - Total videos: ${totalVideos}`);
        console.log(`   - Short videos (≤60s): ${shortVideos} (${((shortVideos / totalVideos) * 100).toFixed(1)}%)`);
        console.log(`   - Suitable videos (>2min): ${suitableVideos} (${((suitableVideos / totalVideos) * 100).toFixed(1)}%)`);
        console.log(`   - Medium videos (1-2min): ${totalVideos - shortVideos - suitableVideos}`);

        console.log('\n✅ Migration verification completed successfully!');
        console.log('💡 YouTube Shorts filtering is now enabled');
    }
}

async function main() {
    const migrationRunner = new MigrationRunner();
    await migrationRunner.runMigration();
}

if (require.main === module) {
    main().catch(error => {
        console.error('💥 Migration failed:', error.message);
        process.exit(1);
    });
}

module.exports = MigrationRunner;