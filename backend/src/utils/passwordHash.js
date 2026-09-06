const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hash a plain password using bcrypt
 */
async function hash(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plain password with a bcrypt hash
 */
async function compare(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

module.exports = { hash, compare };
