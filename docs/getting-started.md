# Getting Started with Influencer Recommended Restaurants

## Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- YouTube Data API v3 key
- OpenAI API key

### 1. Backend Setup

1. **Clone and install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and Supabase credentials
   ```

3. **Create Supabase project**
   - Follow `docs/supabase-setup.md`
   - Run the SQL schema from `database/schema.sql`

4. **Start the backend server**
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:3001`

### 2. Frontend Setup

1. **Create Lovable project**
   - Follow `docs/lovable-setup.md`
   - Set up the component structure and pages

2. **Configure API connection**
   - Point to backend at `http://localhost:3001/api`
   - Set up Supabase client for authentication

### 3. API Keys Setup

#### YouTube Data API v3
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Restrict the key to YouTube Data API v3

#### OpenAI API
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create account and add billing
3. Generate API key
4. Set usage limits to control costs

#### Supabase
1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Get Project URL and API keys from Settings > API

### 4. First Steps

#### Add Your First Influencer
```bash
# Using the API
curl -X POST http://localhost:3001/api/influencers \
  -H "Content-Type: application/json" \
  -d '{"channelUrl": "https://youtube.com/@markwiens"}'
```

#### Sync Videos
```bash
# Sync recent videos for an influencer
curl -X POST http://localhost:3001/api/influencers/{influencer_id}/sync-videos \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 20}'
```

#### Process Videos
```bash
# Process videos to extract restaurant recommendations
curl -X POST http://localhost:3001/api/processing/videos/batch \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

### 5. Testing the System

#### Health Check
```bash
curl http://localhost:3001/health
```

#### Get Restaurants
```bash
curl http://localhost:3001/api/restaurants
```

#### Search
```bash
curl "http://localhost:3001/api/search/restaurants?q=thai&cuisine=Thai"
```

### 6. Development Workflow

1. **Add influencers**: Start with popular food YouTubers
2. **Sync videos**: Pull their recent videos
3. **Process videos**: Extract restaurant recommendations
4. **Test frontend**: Browse restaurants and influencers
5. **Add authentication**: Enable user features

### 7. Production Deployment

#### Backend
- Deploy to Railway, Render, or AWS
- Set production environment variables
- Configure CORS for frontend domain

#### Frontend
- Build and deploy Lovable project
- Update API endpoints to production URL
- Configure Supabase for production domain

### 8. Recommended Food Influencers to Start With

Popular channels that mention specific restaurants:
- Mark Wiens (@markwiens) - International food travel
- Best Ever Food Review Show (@BestEverFoodReviewShow)
- Strictly Dumpling (@StrictlyDumpling) 
- The Food Ranger (@TheFoodRanger)
- Bon Appétit (@bonappetit)
- Joshua Weissman (@JoshuaWeissman)

### 9. Cost Considerations

- **YouTube API**: 10,000 free quota units/day
- **OpenAI**: ~$0.01-0.03 per video transcript
- **Supabase**: Free tier supports 500MB database
- Monitor usage and set limits accordingly

### 10. Troubleshooting

#### Common Issues
- **YouTube quota exceeded**: Wait 24 hours or get additional quota
- **No transcript available**: Some videos don't have transcripts
- **AI extraction errors**: Adjust prompt or confidence thresholds
- **CORS errors**: Update backend CORS settings

#### Debug Endpoints
- `GET /health` - Backend health check  
- `GET /api/processing/status` - Processing statistics
- `GET /api/videos/status/unprocessed` - Unprocessed videos

### Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check backend logs for errors
4. Verify all API keys are correct