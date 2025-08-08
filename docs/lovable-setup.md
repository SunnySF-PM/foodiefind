# Lovable Frontend Setup Guide

## Overview
Lovable is a React-based frontend builder that will create our restaurant recommendations interface. This guide explains how to set up the frontend to work with our backend API.

## Step 1: Create Lovable Project

1. Go to [lovable.dev](https://lovable.dev) and sign in
2. Create a new project called "Influencer Restaurants"
3. Choose the React template

## Step 2: Project Structure

The frontend should have these main components and pages:

### Pages
- **Home**: Landing page with featured restaurants and recent recommendations
- **Restaurants**: Browse all restaurants with filters
- **Influencers**: Browse food influencers
- **Restaurant Detail**: Individual restaurant page with all mentions
- **Influencer Detail**: Individual influencer page with their recommendations
- **Search**: Global search results
- **Profile**: User profile and favorites (auth required)

### Components
- **RestaurantCard**: Display restaurant with basic info
- **InfluencerCard**: Display influencer with stats
- **VideoRecommendation**: Show video recommendation with context
- **SearchFilters**: Cuisine, location, price filters
- **Header/Navigation**: Main navigation with search
- **AuthButtons**: Login/logout buttons

## Step 3: API Integration

Configure the backend API endpoint in your Lovable project:

```javascript
const API_BASE_URL = 'http://localhost:3001/api';

// or for production
const API_BASE_URL = 'https://your-backend-url.com/api';
```

## Step 4: Key Features to Implement

### Restaurant Browsing
- Grid view of restaurants with filters
- Search by name, cuisine, location
- Sort by popularity, recent mentions
- Infinite scroll or pagination

### Restaurant Details
- Restaurant info and photos
- All video mentions with timestamps
- Related restaurants (same cuisine/area)
- Add to favorites button (auth required)

### Influencer Profiles
- Channel info and stats
- Recent restaurant recommendations
- Follow/unfollow functionality (auth required)

### Search Functionality
- Global search across restaurants and influencers
- Filter sidebar with faceted search
- Recent searches and suggestions

### User Features (Auth Required)
- User profile management
- Favorite restaurants
- Followed influencers
- Personalized recommendations

## Step 5: Supabase Auth Integration

Add Supabase authentication:

1. Install Supabase client: `npm install @supabase/supabase-js`
2. Configure Supabase client with your project credentials
3. Implement authentication context
4. Add login/signup forms
5. Protect authenticated routes

## Step 6: UI/UX Guidelines

### Design System
- Use a food-focused color palette (warm colors)
- Card-based layout for restaurants and influencers
- Responsive design for mobile and desktop
- Loading states and error handling

### User Experience
- Fast search with debouncing
- Optimistic updates for favorites
- Clear indication of video sources
- Easy navigation between related content

## Step 7: Sample Components

Here are the key components you should create in Lovable:

### RestaurantCard Component
```javascript
// Display restaurant with image, name, cuisine, location, and influencer count
```

### InfluencerCard Component
```javascript
// Display channel info, subscriber count, and recent recommendations
```

### VideoMention Component
```javascript
// Show video thumbnail, title, timestamp, and quote about restaurant
```

## Step 8: API Endpoints to Use

Your frontend should integrate with these backend endpoints:

- `GET /api/restaurants` - All restaurants
- `GET /api/restaurants/:id` - Restaurant details
- `GET /api/influencers` - All influencers
- `GET /api/influencers/:id` - Influencer details
- `GET /api/search/restaurants?q=query` - Search restaurants
- `GET /api/search/all?q=query` - Global search
- `POST /api/users/favorites/:restaurantId` - Add favorite
- `GET /api/users/favorites` - User favorites

## Step 9: Deployment

1. Build your Lovable project
2. Deploy to your preferred hosting platform (Vercel, Netlify, etc.)
3. Update CORS settings in backend to allow your frontend domain
4. Configure environment variables for production

## Next Steps

After setting up the basic structure:

1. Implement the core browsing experience
2. Add search and filtering
3. Integrate Supabase authentication
4. Add user-specific features
5. Optimize performance and loading states