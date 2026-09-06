const User = require('../models/User');
const sessionManager = require('../services/sessionManager');
const { generateToken } = require('../utils/tokenUtils');
const validation = require('../utils/validation');

/**
 * Auth Controller - handles registration, login, profile, logout
 */
const authController = {
  /**
   * Register a new user
   * POST /auth/register
   */
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Validate input
      const validationResult = validation.validateRegistration({ username, email, password });
      if (!validationResult.valid) {
        return res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: validationResult.errors,
        });
      }

      // Check for duplicate email or username
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          error: 'Email already registered',
          code: 'DUPLICATE_EMAIL',
          status: 409,
        });
      }

      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({
          error: 'Username already taken',
          code: 'DUPLICATE_USERNAME',
          status: 409,
        });
      }

      // Create user
      const user = await User.create(username, email, password);

      // Create session token
      const sessionToken = await sessionManager.createSession(user.id);
      const jwtToken = generateToken(user.id);

      return res.status(201).json({
        token: jwtToken,
        sessionToken,
        userId: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({
        error: 'Registration failed',
        code: 'SERVER_ERROR',
        status: 500,
      });
    }
  },

  /**
   * Login user
   * POST /auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      const validationResult = validation.validateLogin({ email, password });
      if (!validationResult.valid) {
        return res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: validationResult.errors,
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          status: 401,
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          status: 401,
        });
      }

      // Create session token
      const sessionToken = await sessionManager.createSession(user.id);
      const jwtToken = generateToken(user.id);

      return res.status(200).json({
        token: jwtToken,
        sessionToken,
        userId: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({
        error: 'Login failed',
        code: 'SERVER_ERROR',
        status: 500,
      });
    }
  },

  /**
   * Get authenticated user profile
   * GET /auth/me
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          status: 404,
        });
      }

      return res.status(200).json(user.toJSON());
    } catch (err) {
      console.error('Get profile error:', err);
      return res.status(500).json({
        error: 'Failed to get profile',
        code: 'SERVER_ERROR',
        status: 500,
      });
    }
  },

  /**
   * Logout user - invalidate session
   * POST /auth/logout
   */
  async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      let sessionToken = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionToken = authHeader.slice(7);
      }

      // Delete session from Redis
      if (sessionToken) {
        await sessionManager.deleteSession(sessionToken);
      }

      // Also try to get token from body if provided
      const { token } = req.body;
      if (token) {
        await sessionManager.deleteSession(token);
      }

      return res.status(200).json({
        message: 'Logged out successfully',
        status: 200,
      });
    } catch (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        error: 'Logout failed',
        code: 'SERVER_ERROR',
        status: 500,
      });
    }
  },
};

module.exports = authController;
