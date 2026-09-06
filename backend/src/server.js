const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Initialize Socket.io
const { initialize: initSocket } = require('./services/socketManager');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true,
}));

// Body parsing
app.use(express.json());

// Routes
const routes = require('./routes');
app.use('/api', routes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Create HTTP server with Socket.io (listening happens in index.js)
const server = http.createServer(app);
initSocket(server);

module.exports = { app, server };
