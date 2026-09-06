const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'internet_call_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()),
  stunServers: (process.env.STUN_SERVERS || 'stun:stun.l.google.com:19302').split(',').map((s) => s.trim()),
  turnServer: process.env.TURN_SERVER || '',
  turnUsername: process.env.TURN_USERNAME || '',
  turnPassword: process.env.TURN_PASSWORD || '',
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = env;
