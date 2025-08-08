// FoodieFind Admin Panel JavaScript

const API_BASE = 'http://localhost:3002/api';

class AdminPanel {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
    }

    setupEventListeners() {
        // Add influencer form
        document.getElementById('addInfluencerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addInfluencer();
        });

        // Bulk process button
        document.getElementById('bulkProcessBtn').addEventListener('click', () => {
            this.bulkProcessVideos();
        });

        // Refresh influencers button
        document.getElementById('refreshInfluencersBtn').addEventListener('click', () => {
            this.loadInfluencers();
        });

        // Clear logs button
        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            this.clearLogs();
        });
    }

    // Utility methods
    showStatus(elementId, message, type = 'success') {
        const element = document.getElementById(elementId);
        element.className = `status-box status-${type}`;
        element.textContent = message;
        element.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }

    log(message) {
        const logArea = document.getElementById('logArea');
        const timestamp = new Date().toLocaleTimeString();
        logArea.textContent += `[${timestamp}] ${message}\n`;
        logArea.scrollTop = logArea.scrollHeight;
    }

    clearLogs() {
        document.getElementById('logArea').textContent = 'Logs cleared...\n';
    }

    // API methods
    async apiRequest(endpoint, options = {}) {
        try {
            this.log(`🌐 Making API request to: ${API_BASE}${endpoint}`);
            
            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText };
                }
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.log(`✅ API request successful`);
            return data;
            
        } catch (error) {
            console.error('API Error:', error);
            
            // Provide helpful error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.log(`❌ Connection failed: Cannot reach backend server`);
                this.log(`💡 Make sure backend is running: cd backend && npm start`);
                throw new Error('Backend server not reachable. Is it running on port 3002?');
            }
            
            if (error.message.includes('CORS')) {
                this.log(`❌ CORS error: Cross-origin request blocked`);
                throw new Error('CORS error - check backend server CORS configuration');
            }
            
            this.log(`❌ API Error: ${error.message}`);
            throw error;
        }
    }

    // Add new influencer
    async addInfluencer() {
        const channelUrl = document.getElementById('channelUrl').value.trim();

        if (!channelUrl) {
            this.showStatus('addInfluencerStatus', 'Please enter a channel URL', 'error');
            return;
        }

        try {
            this.showStatus('addInfluencerStatus', 'Adding influencer...', 'loading');
            this.log(`Adding new influencer: ${channelUrl}`);

            // Add the influencer
            const result = await this.apiRequest('/influencers', {
                method: 'POST',
                body: JSON.stringify({ channelUrl })
            });

            this.log(`✅ Influencer added: ${result.channel_name}`);

            // Automatically sync their videos
            this.log(`🔄 Syncing videos for ${result.channel_name}...`);
            const syncResult = await this.apiRequest(`/influencers/${result.id}/sync-videos`, {
                method: 'POST',
                body: JSON.stringify({ maxResults: 50 })
            });

            this.log(`✅ Synced ${syncResult.synced} videos, skipped ${syncResult.skipped} existing`);

            this.showStatus('addInfluencerStatus', 
                `Successfully added ${result.channel_name} and synced ${syncResult.synced} videos!`, 
                'success');

            // Clear form and refresh lists
            document.getElementById('channelUrl').value = '';
            this.loadInfluencers();
            this.loadStats();

        } catch (error) {
            this.log(`❌ Error adding influencer: ${error.message}`);
            this.showStatus('addInfluencerStatus', `Error: ${error.message}`, 'error');
        }
    }

    // Bulk process videos
    async bulkProcessVideos() {
        const limit = parseInt(document.getElementById('batchLimit').value);
        
        try {
            this.showStatus('bulkProcessStatus', 'Processing videos...', 'loading');
            this.log(`🚀 Starting bulk processing of ${limit} videos...`);

            const result = await this.apiRequest('/processing/videos/batch', {
                method: 'POST',
                body: JSON.stringify({ limit })
            });

            this.log(`✅ Processing completed:`);
            this.log(`   - Processed: ${result.processed} videos`);
            this.log(`   - Failed: ${result.failed} videos`);

            if (result.errors && result.errors.length > 0) {
                this.log(`❌ Errors encountered:`);
                result.errors.forEach(error => {
                    this.log(`   - ${error.videoId}: ${error.error}`);
                });
            }

            this.showStatus('bulkProcessStatus', 
                `Processed ${result.processed} videos successfully! ${result.failed} failed.`, 
                result.failed === 0 ? 'success' : 'error');

            this.loadStats();

        } catch (error) {
            this.log(`❌ Bulk processing error: ${error.message}`);
            this.showStatus('bulkProcessStatus', `Error: ${error.message}`, 'error');
        }
    }

    // Load dashboard data
    async loadDashboard() {
        this.loadInfluencers();
        this.loadStats();
        this.log('Admin panel loaded successfully');
    }

    // Load influencers list
    async loadInfluencers() {
        try {
            const influencers = await this.apiRequest('/influencers');
            const container = document.getElementById('influencersList');
            
            if (influencers.length === 0) {
                container.innerHTML = '<p>No influencers found. Add some using the form above!</p>';
                return;
            }

            container.innerHTML = influencers.map(influencer => `
                <div class="influencer-card">
                    <h3>${influencer.channel_name}</h3>
                    <p><strong>Subscribers:</strong> ${(influencer.subscriber_count || 0).toLocaleString()}</p>
                    <p><strong>Channel ID:</strong> ${influencer.channel_id}</p>
                    
                    <div class="stats">
                        <div class="stat">
                            <div class="stat-number">${influencer.video_count || 0}</div>
                            <div class="stat-label">Videos</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">${influencer.restaurant_count || 0}</div>
                            <div class="stat-label">Restaurants</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <button class="btn" onclick="adminPanel.syncVideos('${influencer.id}', '${influencer.channel_name}')" 
                                style="margin-right: 10px; font-size: 14px; padding: 8px 16px;">
                            🔄 Sync Videos
                        </button>
                        <button class="btn btn-success" onclick="adminPanel.processInfluencerVideos('${influencer.id}', '${influencer.channel_name}')" 
                                style="font-size: 14px; padding: 8px 16px;">
                            🤖 Process Videos
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            this.log(`❌ Error loading influencers: ${error.message}`);
        }
    }

    // Sync videos for specific influencer
    async syncVideos(influencerId, channelName) {
        try {
            this.log(`🔄 Syncing videos for ${channelName}...`);
            this.log(`   📋 Filtering: Only videos >2 minutes (excludes Shorts)`);
            
            const result = await this.apiRequest(`/influencers/${influencerId}/sync-videos`, {
                method: 'POST',
                body: JSON.stringify({ maxResults: 50 })
            });

            this.log(`✅ ${channelName}: Synced ${result.synced} new videos, skipped ${result.skipped} existing`);
            
            // Show additional info about filtering if available
            if (result.filtered) {
                this.log(`   ⏭️ Filtered out ${result.filtered} shorts/unsuitable videos`);
            }
            
            this.loadInfluencers();
            this.loadStats();

        } catch (error) {
            this.log(`❌ Error syncing videos for ${channelName}: ${error.message}`);
        }
    }

    // Process videos for specific influencer
    async processInfluencerVideos(influencerId, channelName) {
        try {
            this.log(`🤖 Processing videos for ${channelName}...`);
            
            // Get unprocessed videos for this influencer first
            const videos = await this.apiRequest(`/influencers/${influencerId}/videos`);
            const unprocessedVideos = videos.filter(video => !video.processed);

            if (unprocessedVideos.length === 0) {
                this.log(`ℹ️ ${channelName}: No unprocessed videos found`);
                return;
            }

            this.log(`📝 Found ${unprocessedVideos.length} unprocessed videos for ${channelName}`);

            // Process each video
            let processed = 0;
            let failed = 0;

            for (const video of unprocessedVideos.slice(0, 5)) { // Limit to 5 videos at a time
                try {
                    this.log(`   Processing: ${video.title.substring(0, 50)}...`);
                    
                    await this.apiRequest(`/processing/video/${video.video_id}`, {
                        method: 'POST'
                    });
                    
                    processed++;
                    this.log(`   ✅ Successfully processed video`);
                    
                } catch (videoError) {
                    failed++;
                    this.log(`   ❌ Failed to process video: ${videoError.message}`);
                }
            }

            this.log(`✅ ${channelName}: Processed ${processed} videos, ${failed} failed`);
            this.loadStats();

        } catch (error) {
            this.log(`❌ Error processing videos for ${channelName}: ${error.message}`);
        }
    }

    // Load database stats
    async loadStats() {
        try {
            // Get stats from different endpoints
            const [influencers, restaurants] = await Promise.all([
                this.apiRequest('/influencers'),
                this.apiRequest('/restaurants')
            ]);

            // Get processing status
            const processingStatus = await this.apiRequest('/processing/status');

            document.getElementById('totalInfluencers').textContent = influencers.length;
            document.getElementById('totalVideos').textContent = processingStatus.total || 0;
            document.getElementById('totalRestaurants').textContent = restaurants.length;
            
            // Calculate total recommendations
            const totalRecommendations = restaurants.reduce((sum, restaurant) => 
                sum + (restaurant.recommendation_count || 0), 0);
            document.getElementById('totalRecommendations').textContent = totalRecommendations;

        } catch (error) {
            this.log(`❌ Error loading stats: ${error.message}`);
        }
    }
}

// Initialize admin panel when page loads
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});