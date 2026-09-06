const User = require('../models/User');
const { generateToken } = require('../utils/tokenUtils');
const sessionManager = require('../services/sessionManager');

/**
 * Validation utilities for user input
 */
const validation = {
  /**
   * Validate email format
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   * Requirements: min 8 chars, 1 uppercase, 1 number
   */
  validatePassword(password) {
    const errors = [];
    if (!password || typeof password !== 'string') {
      return { valid: false, errors: ['Password is required'] };
    }
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate username format
   */
  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return false;
    }
    // Alphanumeric, 3-50 chars, underscores allowed
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,49}$/;
    return usernameRegex.test(username);
  },

  /**
   * Validate registration input
   */
  validateRegistration(input) {
    const errors = [];

    if (!this.validateUsername(input.username)) {
      errors.push('Username must be 3-50 characters, alphanumeric, starting with a letter');
    }
    if (!this.validateEmail(input.email)) {
      errors.push('Please provide a valid email address');
    }
    const passwordValidation = this.validatePassword(input.password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate login input
   */
  validateLogin(input) {
    const errors = [];
    if (!input.email || typeof input.email !== 'string') {
      errors.push('Email is required');
    }
    if (!input.password || typeof input.password !== 'string') {
      errors.push('Password is required');
    }
    return { valid: errors.length === 0, errors };
  },
};

module.exports = validation;
