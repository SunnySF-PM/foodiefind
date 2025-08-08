// Verify restaurant and video counts are working
require('dotenv').config();

async function verifyAllCounts() {
    console.log('🔍 Verifying Restaurant & Video Counts');
    console.log('=' .repeat(50));

    // Test 1: Direct service method
    console.log('\n1️⃣ Testing SupabaseService.getAllInfluencers()...');
    try {
        const SupabaseService = require('../services/supabaseService');
        const service = new SupabaseService();
        
        const influencers = await service.getAllInfluencers();
        console.log(`✅ Service returned ${influencers.length} influencers`);
        
        influencers.forEach(inf => {
            console.log(`   - ${inf.channel_name}: ${inf.total_videos || 0} videos, ${inf.total_restaurants || 0} restaurants`);
        });
        
    } catch (error) {
        console.log('❌ Service error:', error.message);
    }

    // Test 2: API endpoint
    console.log('\n2️⃣ Testing API endpoint...');
    try {
        const response = await fetch('http://localhost:3002/api/influencers');
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const apiData = await response.json();
        console.log(`✅ API returned ${apiData.length} influencers`);
        
        apiData.forEach(inf => {
            const videos = inf.total_videos !== undefined ? inf.total_videos : 'missing';
            const restaurants = inf.total_restaurants !== undefined ? inf.total_restaurants : 'missing';
            console.log(`   - ${inf.channel_name}: ${videos} videos, ${restaurants} restaurants`);
        });
        
        // Compare with service results
        console.log('\n📊 Comparison:');
        const markFromService = influencers?.find(i => i.channel_name?.includes('Mark'));
        const markFromAPI = apiData.find(i => i.channel_name?.includes('Mark'));
        
        if (markFromService && markFromAPI) {
            console.log('Mark Wiens comparison:');
            console.log(`   Service: ${markFromService.total_videos} videos, ${markFromService.total_restaurants} restaurants`);
            console.log(`   API: ${markFromAPI.total_videos || 'missing'} videos, ${markFromAPI.total_restaurants || 'missing'} restaurants`);
            
            if (markFromService.total_restaurants === markFromAPI.total_restaurants) {
                console.log('✅ Counts match - Fix is working!');
            } else {
                console.log('❌ Counts don\'t match - API issue');
            }
        }
        
    } catch (error) {
        console.log('❌ API error:', error.message);
    }

    // Test 3: Admin panel simulation
    console.log('\n3️⃣ Testing admin panel data format...');
    
    const response = await fetch('http://localhost:3002/api/influencers');
    const influencers = await response.json();
    
    console.log('Admin panel would see:');
    influencers.forEach(inf => {
        const videos = inf.total_videos || 0;
        const restaurants = inf.total_restaurants || 0;
        console.log(`📋 ${inf.channel_name}`);
        console.log(`   📹 Videos: ${videos}`);
        console.log(`   🍽️ Restaurants: ${restaurants}`);
        console.log('');
    });
}

verifyAllCounts().catch(console.error);