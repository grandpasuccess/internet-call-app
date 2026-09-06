// User model unit tests
// Mocking pool at module level before User is imported
const mockQueryFn = jest.fn();

jest.mock('../../src/db', () => ({
  query: mockQueryFn,
  on: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');

describe('User Model (Unit Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$10$mock');
      mockQueryFn.mockResolvedValue({
        rows: [{
          id: 1, username: 'testuser', email: 'test@example.com',
          password_hash: '$2a$10$mock', created_at: new Date(), updated_at: new Date(),
        }],
      });

      const user = await User.create('testuser', 'test@example.com', 'SecurePass123');

      expect(hashSpy).toHaveBeenCalledWith('SecurePass123', 10);
      expect(mockQueryFn).toHaveBeenCalled();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      hashSpy.mockRestore();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockQueryFn.mockResolvedValue({
        rows: [{ id: 1, username: 'testuser', email: 'test@example.com',
          password_hash: '$2a$10$mock', created_at: new Date(), updated_at: new Date() }],
      });

      const user = await User.findByEmail('test@example.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      mockQueryFn.mockResolvedValue({ rows: [] });
      const user = await User.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      mockQueryFn.mockResolvedValue({
        rows: [{ id: 1, username: 'testuser', email: 'test@example.com',
          password_hash: '$2a$10$mock', created_at: new Date(), updated_at: new Date() }],
      });

      const user = await User.findByUsername('testuser');
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      mockQueryFn.mockResolvedValue({
        rows: [{ id: 1, username: 'testuser', email: 'test@example.com',
          password_hash: '$2a$10$mock', created_at: new Date(), updated_at: new Date() }],
      });

      const user = await User.findById(1);
      expect(user).toBeDefined();
      expect(user.id).toBe(1);
    });
  });

  describe('toJSON', () => {
    it('should exclude passwordHash from output', () => {
      const user = {
        id: 1, username: 'testuser', email: 'test@example.com',
        passwordHash: '$2a$10$mock', createdAt: new Date(), updatedAt: new Date(),
        toJSON: User.prototype.toJSON,
      };
      const json = user.toJSON();
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('username');
      expect(json).not.toHaveProperty('passwordHash');
    });
  });
});
