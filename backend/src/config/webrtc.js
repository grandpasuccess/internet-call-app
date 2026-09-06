const env = require('../config/environment');

const iceServers = [
  ...env.stunServers.map((url) => ({ urls: url })),
];

if (env.turnServer && env.turnUsername && env.turnPassword) {
  iceServers.push({
    urls: `turn:${env.turnServer}`,
    username: env.turnUsername,
    credential: env.turnPassword,
  });
}

module.exports = {
  iceServers,
  iceTransportPolicy: 'all',
};
