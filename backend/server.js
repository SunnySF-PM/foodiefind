require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001', // Admin panel
    'http://127.0.0.1:3001',
    'null' // For file:// protocol
  ],
  credentials: true
}));
app.use(express.json());

// Serve static files from admin directory
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Import routes
const influencerRoutes = require('./routes/influencers');
const videoRoutes = require('./routes/videos');
const restaurantRoutes = require('./routes/restaurants');
const searchRoutes = require('./routes/search');
const userRoutes = require('./routes/users');
const processingRoutes = require('./routes/processing');
const analyticsRoutes = require('./routes/analytics');
const debugRoutes = require('./routes/debug');

// Use routes
app.use('/api/influencers', influencerRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/processing', processingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/debug', debugRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'FoodieFind - AI Restaurant Discovery API',
    version: '1.0.0',
    endpoints: [
      '/api/influencers',
      '/api/videos', 
      '/api/restaurants',
      '/api/search',
      '/api/users',
      '/api/processing',
      '/admin/index.html - Admin Panel'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Admin Panel: http://localhost:${PORT}/admin/index.html`);
});