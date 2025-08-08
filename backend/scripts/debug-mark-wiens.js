// Debug Mark Wiens restaurant count issue
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function debugMarkWiens() {
    console.log('🔍 Debugging Mark Wiens restaurant count...');
    console.log('=' .repeat(50));

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Find Mark Wiens influencer
        const { data: influencers, error: influencerError } = await supabase
            .from('influencers')
            .select('id, channel_name, channel_id, subscriber_count')
            .ilike('channel_name', '%mark%');
            
        if (influencerError) throw influencerError;
        
        console.log('📊 Found influencers with "mark" in name:');
        influencers?.forEach(inf => {
            console.log(`   - ${inf.channel_name} (ID: ${inf.id})`);
        });

        const markWiens = influencers?.find(inf => 
            inf.channel_name?.toLowerCase().includes('wiens') ||
            inf.channel_name?.toLowerCase().includes('mark')
        );

        if (!markWiens) {
            console.log('❌ Mark Wiens not found in database');
            return;
        }

        console.log(`\n✅ Found Mark Wiens: ${markWiens.channel_name}`);

        // 2. Check his videos
        const { data: videos, error: videoError } = await supabase
            .from('videos')
            .select('id, video_id, title, processed')
            .eq('influencer_id', markWiens.id);
            
        if (videoError) throw videoError;
        
        console.log(`📹 Mark Wiens videos: ${videos?.length || 0}`);
        if (videos?.length) {
            videos.slice(0, 3).forEach(v => {
                console.log(`   - ${v.title?.substring(0, 50)}... (${v.processed ? 'processed' : 'unprocessed'})`);
            });
        }

        // 3. Check restaurant recommendations
        const videoIds = (videos || []).map(v => v.id);
        
        if (videoIds.length > 0) {
            const { data: recommendations, error: recError } = await supabase
                .from('restaurant_recommendations')
                .select(`
                    id,
                    video_id,
                    restaurant:restaurants(name, cuisine_type),
                    video:videos(title)
                `)
                .in('video_id', videoIds);
                
            if (recError) throw recError;
            
            console.log(`🍽️ Restaurant recommendations: ${recommendations?.length || 0}`);
            if (recommendations?.length) {
                recommendations.slice(0, 5).forEach(rec => {
                    console.log(`   - ${rec.restaurant?.name} (${rec.restaurant?.cuisine_type})`);
                });
                if (recommendations.length > 5) {
                    console.log(`   ... and ${recommendations.length - 5} more`);
                }
            }
        }

        // 4. Check what admin panel query should return
        console.log('\n🖥️ Testing admin panel query...');
        
        const { data: adminQuery, error: adminError } = await supabase
            .from('influencers')
            .select(`
                id,
                channel_name,
                subscriber_count,
                total_videos:videos(count),
                total_restaurants:restaurant_recommendations(count)
            `)
            .eq('id', markWiens.id)
            .single();
            
        if (adminError) {
            console.log('❌ Admin query error:', adminError.message);
            
            // Try alternative approach
            console.log('🔄 Trying alternative count method...');
            
            const { count: videoCount } = await supabase
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .eq('influencer_id', markWiens.id);
                
            const { count: restaurantCount } = await supabase
                .from('restaurant_recommendations')
                .select('*', { count: 'exact', head: true })
                .in('video_id', videoIds);
                
            console.log(`📊 Manual count - Videos: ${videoCount}, Restaurants: ${restaurantCount}`);
        } else {
            console.log('✅ Admin panel query result:');
            console.log(`   - Channel: ${adminQuery.channel_name}`);
            console.log(`   - Videos: ${adminQuery.total_videos?.[0]?.count || 0}`);
            console.log(`   - Restaurants: ${adminQuery.total_restaurants?.[0]?.count || 0}`);
        }

        // 5. Check the actual admin endpoint
        console.log('\n🌐 Testing actual admin endpoint...');
        const response = await fetch('http://localhost:3002/api/influencers');
        
        if (response.ok) {
            const apiData = await response.json();
            const markWiensApi = apiData.find(inf => 
                inf.channel_name?.toLowerCase().includes('mark')
            );
            
            if (markWiensApi) {
                console.log('✅ API endpoint result:');
                console.log(`   - Channel: ${markWiensApi.channel_name}`);
                console.log(`   - Videos: ${markWiensApi.total_videos}`);
                console.log(`   - Restaurants: ${markWiensApi.total_restaurants}`);
            } else {
                console.log('❌ Mark Wiens not found in API response');
            }
        } else {
            console.log('❌ API endpoint error:', response.status, response.statusText);
        }

    } catch (error) {
        console.error('💥 Debug failed:', error.message);
    }
}

debugMarkWiens();