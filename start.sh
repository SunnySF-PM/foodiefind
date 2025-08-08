#!/bin/bash

# FoodieFind Startup Script for Replit
echo "🍽️ Starting FoodieFind - AI Restaurant Discovery"
echo "==============================================="

# Check if environment variables are set
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ Missing environment variables!"
    echo "Please configure these in Replit Secrets:"
    echo "- SUPABASE_URL"
    echo "- SUPABASE_ANON_KEY" 
    echo "- SUPABASE_SERVICE_ROLE_KEY"
    echo "- YOUTUBE_API_KEY"
    echo "- OPENAI_API_KEY"
    echo "- GOOGLE_MAPS_API_KEY"
    echo ""
    echo "See DEPLOYMENT.md for detailed instructions"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd backend && npm install

# Run database migration (if needed)
echo "🗄️ Setting up database..."
npm run migrate 2>/dev/null || echo "⚠️ Database migration skipped (might already be done)"

# Add sample data (if needed)
echo "👥 Adding sample influencers..."
npm run bulk-add 2>/dev/null || echo "⚠️ Sample data skipped (might already exist)"

# Start the server
echo "🚀 Starting FoodieFind server..."
echo "API will be available at your Repl URL"
echo "Admin panel at: /admin/index.html"
echo ""
npm start