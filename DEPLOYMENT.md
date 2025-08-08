# 🚀 FoodieFind Deployment Guide

## GitHub MCP → GitHub Repository → Replit Workflow

This guide walks you through deploying FoodieFind from local development to production using GitHub and Replit.

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ GitHub account
- ✅ Replit account  
- ✅ GitHub MCP installed and configured
- ✅ All API keys ready (Supabase, YouTube, OpenAI, Google Maps)

## 🔄 Development Workflow

### 1. GitHub Repository Setup (Using GitHub MCP)

```bash
# Create repository using GitHub MCP
# This will be done through your GitHub MCP interface
```

**Repository Details:**
- **Name**: `foodiefind` or `influencer-restaurants`
- **Description**: "AI-powered restaurant discovery from YouTube food influencer videos"
- **Visibility**: Public or Private (your choice)
- **Include**: README, .gitignore, LICENSE (MIT)

### 2. Prepare Codebase for GitHub

All files are already prepared with:
- ✅ `.replit` - Replit configuration
- ✅ `replit.nix` - Dependencies specification  
- ✅ `.env.example` - Environment template
- ✅ `.gitignore` - Excluded sensitive files
- ✅ `README.md` - Comprehensive documentation
- ✅ `DEPLOYMENT.md` - This deployment guide

### 3. Push to GitHub

```bash
# Initialize git (if not already done)
cd influencer-restaurants
git init

# Add files
git add .

# Commit
git commit -m "Initial commit: FoodieFind AI restaurant discovery app

- Complete Node.js/Express backend with YouTube API integration
- OpenAI GPT-4 powered restaurant extraction  
- Supabase database with full schema
- Admin panel for content management
- YouTube Shorts filtering and bulk processing
- Comprehensive API with search and user management"

# Add remote origin (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/foodiefind.git

# Push to GitHub
git push -u origin main
```

### 4. Deploy to Replit

#### Option A: Import from GitHub (Recommended)

1. **Go to Replit**: https://replit.com
2. **Create New Repl**: Click "Create Repl"
3. **Import from GitHub**: 
   - Select "Import from GitHub"
   - Enter repository URL: `https://github.com/YOUR_USERNAME/foodiefind`
   - Repl name: `foodiefind`
   - Make private/public as desired
4. **Import**: Click "Import from GitHub"

#### Option B: Manual Upload

1. Create new Node.js Repl
2. Delete default files
3. Upload all project files
4. Configure as below

### 5. Configure Environment Variables in Replit

1. **Open Secrets**: In your Repl, click the lock icon (🔒) in sidebar
2. **Add Environment Variables**:

```env
SUPABASE_URL=your_actual_supabase_url
SUPABASE_ANON_KEY=your_actual_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
YOUTUBE_API_KEY=your_actual_youtube_api_key
OPENAI_API_KEY=your_actual_openai_api_key
GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key
NODE_ENV=production
PORT=3000
```

**Optional (for fallback transcript service):**
```env
RAPIDAPI_KEY=your_rapidapi_key
```

### 6. Test Deployment

1. **Click Run**: Replit will automatically install dependencies and start the server
2. **Check Console**: Look for:
   ```
   Server running on port 3000
   Environment: production
   ```
3. **Test API**: Click the web view to see your API running
4. **Admin Panel**: Add `/admin/index.html` to URL for admin panel

## 🔧 Post-Deployment Setup

### Initialize Database
```bash
# In Replit console
cd backend
npm run migrate        # Add duration_seconds column
npm run bulk-add      # Add sample influencers
```

### Test Core Functionality
```bash
# Test API endpoints
curl https://your-repl-name.your-username.repl.co/api/influencers
curl https://your-repl-name.your-username.repl.co/api/restaurants

# Run diagnostics
node backend/diagnose.js
```

## 🔄 Ongoing Development Workflow

### Making Changes

**Method 1: Local → GitHub → Replit (Recommended)**
```bash
# Work locally
# Make changes to code

# Commit and push
git add .
git commit -m "Description of changes"
git push origin main

# Replit auto-syncs from GitHub
```

**Method 2: Direct Replit Editing**
- Edit files directly in Replit IDE
- Changes are live immediately
- Commit back to GitHub when ready

### Syncing Changes

If auto-sync doesn't work:
1. In Replit, open Console
2. Run: `git pull origin main`
3. Restart: Click Stop → Run

## 🚨 Troubleshooting

### Common Issues

**1. "Module not found" errors**
```bash
# In Replit console
npm install
```

**2. Environment variables not working**
- Check Secrets tab for typos
- Restart the Repl
- Ensure no extra spaces in values

**3. Database connection issues**
- Verify Supabase URLs and keys
- Check if database is accessible from Replit IP
- Test connection: `node -e "require('./backend/services/supabaseService')"`

**4. API keys invalid**
- Regenerate keys in respective platforms
- Update in Replit Secrets
- Restart application

**5. Port issues**
- Replit uses PORT environment variable
- Ensure server.js uses `process.env.PORT`
- Default should be 3000 for Replit

### Debug Commands

```bash
# Check environment
node -e "console.log(process.env)"

# Test database connection
node -e "const service = require('./backend/services/supabaseService'); new service().getAllInfluencers().then(console.log)"

# Run diagnostics
node backend/diagnose.js

# Monitor logs
npm run monitor
```

## 📊 Monitoring in Production

### Built-in Analytics
- Visit: `https://your-repl.repl.co/api/processing/status`
- Admin panel: `https://your-repl.repl.co/admin/index.html`

### Replit Monitoring
- Check Repl activity in Replit dashboard  
- Monitor resource usage
- Set up uptime monitoring if needed

## 🔐 Security Considerations

### API Keys
- ✅ Never commit .env files
- ✅ Use Replit Secrets for sensitive data
- ✅ Regenerate keys periodically
- ✅ Monitor API usage and quotas

### Database Security
- ✅ Use Row Level Security in Supabase
- ✅ Limit service role key usage
- ✅ Regular database backups

## 📈 Scaling Considerations

### Performance
- Monitor API response times
- Implement rate limiting if needed
- Consider caching for frequent queries

### Cost Management
- Monitor API usage (YouTube, OpenAI, Google Maps)
- Set up usage alerts
- Optimize batch processing frequency

## 🎯 Next Steps After Deployment

1. **Add Custom Domain**: Configure custom domain in Replit
2. **Set up Monitoring**: Implement uptime monitoring
3. **Performance Optimization**: Add caching and rate limiting
4. **User Analytics**: Implement user behavior tracking
5. **Content Scaling**: Add more influencers and content

---

🎉 **Congratulations!** Your FoodieFind application is now live and ready to discover amazing restaurants from YouTube food influencers!

**Live URLs:**
- **API**: `https://your-repl-name.your-username.repl.co`
- **Admin Panel**: `https://your-repl-name.your-username.repl.co/admin/index.html`