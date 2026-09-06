const pool = require('../db');
const env = require('../config/environment');

/**
 * Database schema for Internet Call App
 * Run this script to initialize/create tables
 */

const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (for tracking active sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls table (tracks call history)
CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  caller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  callee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  status VARCHAR(20) DEFAULT 'initiated' CHECK (status IN ('initiated', 'connected', 'ended', 'rejected', 'missed'))
);

-- Call logs table (WebRTC events)
CREATE TABLE IF NOT EXISTS call_logs (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_callee_id ON calls(callee_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);
`;

/**
 * Run migrations - create all tables
 */
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running database migrations...');
    
    // Split SQL by semicolons and execute each statement
    const statements = createTablesSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    
    for (const statement of statements) {
      await client.query(statement);
    }
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Rollback - drop all tables
 */
async function rollback() {
  const client = await pool.connect();
  try {
    console.log('Rolling back database...');
    
    // Drop in reverse order of creation (due to foreign keys)
    await client.query('DROP TABLE IF EXISTS call_logs CASCADE');
    await client.query('DROP TABLE IF EXISTS calls CASCADE');
    await client.query('DROP TABLE IF EXISTS sessions CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    
    console.log('Database rollback completed');
  } catch (error) {
    console.error('Rollback error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// CLI entry point
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
    case undefined:
      migrate()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'down':
    case 'rollback':
      rollback()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Usage: node migrate.js [up|down]');
      process.exit(1);
  }
}

module.exports = { migrate, rollback };
