const { describe, it, expect, beforeEach } = require('@jest/globals');
const request = require('supertest');
const bcrypt = require('bcryptjs');

// Mock Redis before requiring anything else
jest.mock('../../src/services/redis', () => {
  return {
    on: jest.fn(),
    connect: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  };
});

// Mock pg Pool
jest.mock('../../src/db', () => {
  const mockQuery = jest.fn();
  return {
    query: mockQuery,
    on: jest.fn(),
    connect: jest.fn(() => ({
      query: mockQuery,
      release: jest.fn(),
    })),
  };
});

// Now require after mocks are set up
const app = require('../../src/server');

describe('Auth Endpoints', () => {
  let mockedPool, mockedRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPool = require('../../src/db');
    mockedRedis = require('../../src/services/redis');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [] })  // no existing email
        .mockResolvedValueOnce({ rows: [] })  // no existing username
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            username: 'newuser',
            email: 'new@example.com',
            password_hash: '$2a$10$mockhash',
            created_at: new Date(),
            updated_at: new Date(),
          }],
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'SecurePass123',
        })
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body.userId).toBe(1);
      expect(res.body.username).toBe('newuser');
      expect(res.body.email).toBe('new@example.com');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 409 for duplicate email', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'existing@example.com' }],
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'existing@example.com',
          password: 'SecurePass123',
        })
        .expect(409);

      expect(res.body.code).toBe('DUPLICATE_EMAIL');
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'invalid-email',
          password: 'SecurePass123',
        })
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123', 10);
      const testUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: hashedPassword,
      };

      mockedPool.query.mockResolvedValueOnce({ rows: [testUser] });
      // Use global jest.spyOn
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123',
        })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.userId).toBe(1);
      expect(res.body.username).toBe('testuser');
    });

    it('should return 401 for non-existent user', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123',
        })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123', 10);
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'testuser', email: 'test@example.com', password_hash: hashedPassword }],
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const { generateToken } = require('../../src/utils/tokenUtils');
      const token = generateToken(1);

      mockedPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: '$2a$10$mockhash',
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', 1);
      expect(res.body.username).toBe('testuser');
      expect(res.body.email).toBe('test@example.com');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const { generateToken } = require('../../src/utils/tokenUtils');
      const token = generateToken(1);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ token })
        .expect(200);

      expect(res.body.message).toBe('Logged out successfully');
    });

    it('should return 401 without token', async () => {
      await request(app)
        .post('/api/auth/logout')
        .expect(401);
    });
  });
});
