const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

module.exports = {
  logError(error, context = {}) {
    const timestamp = new Date().toISOString();
    const log = {
      timestamp,
      error: error.message,
      stack: error.stack,
      context,
    };
    console.error('ERROR:', error.message);
    fs.appendFileSync(
      path.join(logDir, 'errors.log'),
      JSON.stringify(log) + '\n'
    );
  },

  logWebRTCEvent(event, data) {
    const timestamp = new Date().toISOString();
    const log = { timestamp, event, data };
    fs.appendFileSync(
      path.join(logDir, 'webrtc.log'),
      JSON.stringify(log) + '\n'
    );
  },
};
