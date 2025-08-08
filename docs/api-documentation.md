# API Documentation

## Base URL
- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

## Authentication
Some endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Health Check
```
GET /health
```
Returns server health status.

### Influencers

#### Get all influencers
```
GET /api/influencers
```
Returns list of all influencers with stats.

#### Get influencer by ID
```
GET /api/influencers/:id
```
Returns detailed influencer information.

#### Add new influencer
```
POST /api/influencers
```
Body:
```json
{
  "channelUrl": "https://youtube.com/@markwiens",
  "channelId": "UCyEd6QBSgat5kkC6svyjudA"
}
```

#### Sync influencer videos
```
POST /api/influencers/:id/sync-videos
```
Body:
```json
{
  "maxResults": 50
}
```

### Videos

#### Get all videos
```
GET /api/videos?page=1&limit=20&processed=true
```
Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `processed`: Filter by processing status (optional)

#### Get video by ID
```
GET /api/videos/:videoId
```

#### Add video
```
POST /api/videos
```
Body:
```json
{
  "videoUrl": "https://youtube.com/watch?v=xyz",
  "videoId": "xyz",
  "influencerId": "uuid"
}
```

#### Get video recommendations
```
GET /api/videos/:videoId/recommendations
```

### Restaurants

#### Get all restaurants
```
GET /api/restaurants
```

#### Get restaurant by ID
```
GET /api/restaurants/:id
```

#### Get restaurants by cuisine
```
GET /api/restaurants/cuisine/:cuisineType
```

#### Get restaurants by city
```
GET /api/restaurants/city/:city
```

#### Get top restaurants
```
GET /api/restaurants/top/:limit
```

### Search

#### Search restaurants
```
GET /api/search/restaurants?q=thai&cuisine=Thai&city=Bangkok&price=$$&limit=50
```
Query parameters:
- `q`: Search query
- `cuisine`: Filter by cuisine type
- `city`: Filter by city
- `price`: Filter by price range ($, $$, $$$, $$$$)
- `limit`: Maximum results (default: 50)

#### Search influencers
```
GET /api/search/influencers?q=mark&limit=20
```

#### Search videos
```
GET /api/search/videos?q=thai food&influencer=Mark Wiens&limit=30
```

#### Global search
```
GET /api/search/all?q=thai&limit=10
```

#### Get search filters
```
GET /api/search/filters
```
Returns available filter options for cuisines, cities, price ranges, and top influencers.

### Users (Authentication Required)

#### Get user profile
```
GET /api/users/profile
```

#### Update user profile
```
PUT /api/users/profile
```
Body:
```json
{
  "username": "foodlover123",
  "full_name": "John Doe",
  "preferred_cuisines": ["Thai", "Italian"],
  "preferred_cities": ["Bangkok", "New York"]
}
```

#### Get user favorites
```
GET /api/users/favorites
```

#### Add restaurant to favorites
```
POST /api/users/favorites/:restaurantId
```

#### Remove restaurant from favorites
```
DELETE /api/users/favorites/:restaurantId
```

#### Follow influencer
```
POST /api/users/follow/:influencerId
```

#### Unfollow influencer
```
DELETE /api/users/follow/:influencerId
```

#### Get followed influencers
```
GET /api/users/following
```

#### Get personalized recommendations
```
GET /api/users/recommendations
```

### Processing

#### Process single video
```
POST /api/processing/video/:videoId
```

#### Process multiple videos
```
POST /api/processing/videos/batch
```
Body:
```json
{
  "limit": 5
}
```

#### Get processing status
```
GET /api/processing/status
```

#### Reprocess failed videos
```
POST /api/processing/reprocess-failed
```
Body:
```json
{
  "limit": 3
}
```

#### Add and process video
```
POST /api/processing/add-and-process
```
Body:
```json
{
  "videoUrl": "https://youtube.com/watch?v=xyz"
}
```

## Response Format

### Success Response
```json
{
  "data": [...],
  "message": "Success message",
  "count": 25
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `409`: Conflict (resource already exists)
- `500`: Internal Server Error

## Rate Limiting
- YouTube API calls are limited by Google's quota
- OpenAI API calls are limited by your usage plan
- No specific rate limiting on the API endpoints currently

## Examples

### Complete workflow example:

1. **Add an influencer:**
```bash
curl -X POST http://localhost:3001/api/influencers \
  -H "Content-Type: application/json" \
  -d '{"channelUrl": "https://youtube.com/@markwiens"}'
```

2. **Sync their videos:**
```bash
curl -X POST http://localhost:3001/api/influencers/{influencer_id}/sync-videos \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 20}'
```

3. **Process videos for recommendations:**
```bash
curl -X POST http://localhost:3001/api/processing/videos/batch \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

4. **Search restaurants:**
```bash
curl "http://localhost:3001/api/search/restaurants?q=thai&cuisine=Thai"
```

5. **Get restaurant details:**
```bash
curl http://localhost:3001/api/restaurants/{restaurant_id}
```

## Error Handling

Common error scenarios:
- **YouTube API quota exceeded**: Wait 24 hours or request additional quota
- **Video transcript unavailable**: Some videos don't have transcripts
- **AI processing failure**: Retry or check OpenAI API status
- **Authentication required**: Include valid JWT token in header
- **Resource not found**: Check if IDs are correct