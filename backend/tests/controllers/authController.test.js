const { describe, it, expect, beforeEach, jest: jestGlobal } = require('@jest/globals');
const bcrypt = require('bcryptjs');

// Mock external dependencies before requiring controller
jest.mock('../../src/db', () => ({
  query: jestGlobal.fn(),
  on: jestGlobal.fn(),
}));

jest.mock('../../src/services/redis', () => ({
  on: jestGlobal.fn(),
  set: jestGlobal.fn().mockResolvedValue('OK'),
  get: jestGlobal.fn(),
  del: jestGlobal.fn().mockResolvedValue(1),
  keys: jestGlobal.fn().mockResolvedValue([]),
}));

const User = require('../../src/models/User');
const authController = require('../../src/controllers/authController');
const { generateToken } = require('../../src/utils/tokenUtils');

describe('Auth Controller Unit Tests', () => {
  let req, res, mockPool;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = require('../../src/db');
    req = {};
    res = {
      status: jestGlobal.fn().mockReturnThis(),
      json: jestGlobal.fn(),
    };
  });

  describe('register', () => {
    it('should create a new user and return token', async () => {
      req.body = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass123',
      };

      // Mock: no existing user
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })  // findByEmail returns nothing
        .mockResolvedValueOnce({ rows: [] })  // findByUsername returns nothing
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            username: 'newuser',
            email: 'new@example.com',
            password_hash: '$2a$10$mockhash',
            created_at: new Date(),
            updated_at: new Date(),
          }],
        }); // User.create succeeds

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          userId: 1,
          username: 'newuser',
          email: 'new@example.com',
        })
      );
      // Verify password is not in response
      const responseJson = res.json.mock.calls[0][0];
      expect(responseJson).not.toHaveProperty('password');
    });

    it('should return 409 for duplicate email', async () => {
      req.body = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'SecurePass123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'existing@example.com' }],
      });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'DUPLICATE_EMAIL' })
      );
    });

    it('should return 400 for invalid input', async () => {
      req.body = {
        username: 'ab', // too short
        email: 'invalid',
        password: 'weak',
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'VALIDATION_ERROR' })
      );
    });
  });

  describe('login', () => {
    const hashedPassword = bcrypt.hashSync('SecurePass123', 10);

    it('should login successfully with valid credentials', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: hashedPassword,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      // Mock compare password
      const compareSpy = jestGlobal.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          userId: 1,
          username: 'testuser',
        })
      );

      compareSpy.mockRestore();
    });

    it('should return 401 for non-existent user', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_CREDENTIALS' })
      );
    });

    it('should return 401 for wrong password', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: hashedPassword,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      const compareSpy = jestGlobal.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_CREDENTIALS' })
      );

      compareSpy.mockRestore();
    });
  });

  describe('getProfile', () => {
    it('should return user profile with valid userId', async () => {
      req.userId = 1;

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: '$2a$10$mockhash',
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      await authController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
        })
      );
      // Verify password hash is not in response
      const responseJson = res.json.mock.calls[0][0];
      expect(responseJson).not.toHaveProperty('passwordHash');
    });

    it('should return 404 for non-existent user', async () => {
      req.userId = 999;

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await authController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'USER_NOT_FOUND' })
      );
    });
  });

  describe('logout', () => {
    it('should delete session and return success', async () => {
      const token = generateToken(1);
      req.headers = {
        authorization: `Bearer ${token}`,
      };
      req.body = { token };

      await authController.logout(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
        status: 200,
      });
    });
  });
});
