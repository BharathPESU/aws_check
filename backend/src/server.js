const express = require('express');
const cors = require('cors');
const path = require('path');

// Ensure .env is loaded whether run from root or backend/ folder
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const telemetryRoutes = require('./routes/telemetryRoutes');
const imageRoutes = require('./routes/imageRoutes');
const healthRoutes = require('./routes/healthRoutes');
const logRoutes = require('./routes/logRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads folder when S3 is in local emulation mode
const localUploadsDir = path.resolve(__dirname, '../../public/uploads');
app.use('/uploads', express.static(localUploadsDir));

// Mount REST API Endpoints
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/logs', logRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Maya Monitor IoT Backend API',
    endpoints: {
      health: 'GET /api/health',
      telemetry_post: 'POST /api/telemetry',
      telemetry_get: 'GET /api/telemetry',
      images_latest: 'GET /api/images/latest',
      images_all: 'GET /api/images',
    },
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('[Backend Error Handler]:', err.message);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================');
    console.log(`[Maya Backend] Server running on port ${PORT}`);
    console.log(`[Maya Backend] Health Check : http://localhost:${PORT}/api/health`);
    console.log(`[Maya Backend] Telemetry API: http://localhost:${PORT}/api/telemetry`);
    console.log('==================================================');
  });
}

module.exports = app;
