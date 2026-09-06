const { describe, it, expect } = require('@jest/globals');
const validation = require('../../src/utils/validation');

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should return true for valid emails', () => {
      expect(validation.validateEmail('test@example.com')).toBe(true);
      expect(validation.validateEmail('user.name@domain.org')).toBe(true);
      expect(validation.validateEmail('test+tag@example.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(validation.validateEmail('')).toBe(false);
      expect(validation.validateEmail('notanemail')).toBe(false);
      expect(validation.validateEmail('@example.com')).toBe(false);
      expect(validation.validateEmail('test@')).toBe(false);
      expect(validation.validateEmail(null)).toBe(false);
      expect(validation.validateEmail(undefined)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should return valid for strong password', () => {
      const result = validation.validatePassword('SecurePass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 chars', () => {
      const result = validation.validatePassword('Abc123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validation.validatePassword('securepass123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const result = validation.validatePassword('SecurePassword');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return error for empty password', () => {
      const result = validation.validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });

  describe('validateUsername', () => {
    it('should return true for valid usernames', () => {
      expect(validation.validateUsername('john_doe')).toBe(true);
      expect(validation.validateUsername('testuser123')).toBe(true);
      expect(validation.validateUsername('Alice')).toBe(true);
    });

    it('should return false for invalid usernames', () => {
      expect(validation.validateUsername('ab')).toBe(false); // too short
      expect(validation.validateUsername('1user')).toBe(false); // starts with number
      expect(validation.validateUsername('')).toBe(false);
      expect(validation.validateUsername(null)).toBe(false);
    });
  });

  describe('validateRegistration', () => {
    it('should pass with valid input', () => {
      const result = validation.validateRegistration({
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with invalid input', () => {
      const result = validation.validateRegistration({
        username: '12',
        email: 'invalid',
        password: 'weak',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateLogin', () => {
    it('should pass with valid email and password', () => {
      const result = validation.validateLogin({
        email: 'test@example.com',
        password: 'SecurePass123',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with missing email', () => {
      const result = validation.validateLogin({
        email: '',
        password: 'SecurePass123',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should fail with missing password', () => {
      const result = validation.validateLogin({
        email: 'test@example.com',
        password: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });
});
