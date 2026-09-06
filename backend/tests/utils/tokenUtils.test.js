const { describe, it, expect, beforeEach } = require('@jest/globals');
const { generateToken, validateToken } = require('../../src/utils/tokenUtils');
const jwt = require('jsonwebtoken');

describe('Token Utils', () => {
  const validUserId = 'test-user-123';

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(validUserId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include userId in token payload', () => {
      const token = generateToken(validUserId);
      const decoded = validateToken(token);
      expect(decoded.userId).toBe(validUserId);
    });
  });

  describe('validateToken', () => {
    it('should throw on missing token', () => {
      expect(() => validateToken(null)).toThrow();
      expect(() => validateToken(undefined)).toThrow();
      expect(() => validateToken('')).toThrow();
    });

    it('should throw on invalid token', () => {
      expect(() => validateToken('not-a-valid-token')).toThrow();
    });

    it('should throw on expired token', () => {
      const expiredToken = jwt.sign(
        { userId: validUserId, iat: Math.floor(Date.now() / 1000) - 100 },
        process.env.JWT_SECRET || 'dev-secret-change-in-production',
        { expiresIn: '-1s', issuer: 'internet-call-app' }
      );
      expect(() => validateToken(expiredToken)).toThrow();
    });

    it('should return payload with userId on valid token', () => {
      const token = generateToken(validUserId);
      const payload = validateToken(token);
      expect(payload.userId).toBe(validUserId);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });
  });
});
