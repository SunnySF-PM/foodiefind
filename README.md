# 🍽️ FoodieFind - AI-Powered Restaurant Discovery

**Extract restaurant recommendations from YouTube food influencer videos using AI**

FoodieFind analyzes YouTube food influencer content to automatically extract restaurant recommendations, complete with timestamps, locations, and detailed information. Built with Node.js, Supabase, and OpenAI GPT-4.

## 🌟 Features

- **🤖 AI-Powered Extraction**: Uses OpenAI GPT-4 to extract restaurant recommendations from video transcripts
- **📍 Location Data**: Integrates with Google Maps Places API for restaurant details and geocoding  
- **⏰ Timestamp Accuracy**: Shows exactly when restaurants are mentioned in videos
- **🎬 YouTube Shorts Filtering**: Automatically filters out short videos for better content quality
- **👥 User Authentication**: Supabase Auth for user accounts and favorites
- **🔍 Advanced Search**: Multi-word search with filtering by cuisine, location, and influencer
- **📊 Admin Panel**: Comprehensive dashboard for managing influencers and content scaling

## 🏗️ Architecture

### Backend (Node.js/Express)
- **YouTube Data API v3**: Video metadata and transcript extraction
- **OpenAI GPT-4**: Restaurant recommendation analysis
- **Supabase**: PostgreSQL database with Row Level Security
- **Google Maps Places API**: Restaurant enrichment and geocoding
- **RapidAPI**: Fallback transcript extraction

### Database Schema
- `influencers`: YouTube channel information
- `videos`: Video metadata and processing status
- `restaurants`: Restaurant details and locations
- `restaurant_recommendations`: AI-extracted recommendations with timestamps
- `user_profiles`, `user_favorites`, `user_follows`: User management

### Frontend (Lovable)
- Modern React-based interface
- Real-time search and filtering
- User authentication and favorites
- Responsive design for all devices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- YouTube Data API key
- OpenAI API key
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SunnySF-PM/foodiefind.git
   cd foodiefind
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env` and configure:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # YouTube Data API
   YOUTUBE_API_KEY=your_youtube_api_key

   # OpenAI API
   OPENAI_API_KEY=your_openai_api_key

   # Google Maps API
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key

   # RapidAPI (Optional fallback)
   RAPIDAPI_KEY=your_rapidapi_key
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   npm run migrate
   
   # Add sample influencers
   npm run bulk-add
   ```

5. **Start the application**
   ```bash
   # Backend server (port 3002)
   npm start
   
   # Admin panel (port 3001)
   npm run admin
   ```

## 🌐 Replit Deployment

### Option 1: Import from GitHub (Recommended)
1. Go to [Replit](https://replit.com)
2. Click "Create Repl" → "Import from GitHub"
3. Enter repository URL: `https://github.com/SunnySF-PM/foodiefind`
4. Configure environment variables in Secrets
5. Run will automatically start the backend

### Environment Variables for Replit
Configure these in Replit Secrets:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
YOUTUBE_API_KEY=your_youtube_api_key
OPENAI_API_KEY=your_openai_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NODE_ENV=production
PORT=3000
```

## 📊 API Endpoints

### Core Endpoints
- `GET /api/influencers` - List all influencers with stats
- `GET /api/videos` - List videos with filtering
- `GET /api/restaurants` - Restaurant recommendations
- `GET /api/search` - Advanced search functionality

### Processing Endpoints
- `POST /api/processing/videos/batch` - Bulk process videos
- `GET /api/processing/status` - Processing statistics
- `POST /api/processing/influencer/:id` - Process specific influencer

### User Endpoints
- `POST /api/users/favorites` - Manage user favorites
- `GET /api/users/profile` - User profile management

## 🧪 Testing & Development

### Built-in Diagnostics
```bash
npm run stats           # Overall statistics
npm run filter-report   # YouTube Shorts filtering report
npm run diagnose        # Run comprehensive diagnostics
```

### Debug Endpoints
- `/api/debug/videos-status` - Video processing status
- `/api/debug/unprocessed-videos` - Unprocessed video queue
- `/api/debug/test-processing/:videoId` - Test video processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- YouTube Data API for video metadata
- OpenAI for GPT-4 language model
- Supabase for backend infrastructure
- Google Maps for location data
- Lovable for frontend framework

---

Built with ❤️ using AI-powered food discovery technology