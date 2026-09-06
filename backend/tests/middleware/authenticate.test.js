const { describe, it, expect, beforeEach } = require('@jest/globals');
const authenticate = require('../../src/middleware/authenticate');

// Mock response object
function createMockRes() {
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe('Authenticate Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = createMockRes();
    // Use global jest.fn() - do NOT import jest from @jest/globals
    next = jest.fn();
  });

  it('should return 401 when no authorization header', () => {
    authenticate(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(res.body.code).toBe('MISSING_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when authorization header is not Bearer', () => {
    req.headers.authorization = 'Basic dXNlcjpwYXNz';
    authenticate(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('MISSING_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    req.headers.authorization = 'Bearer invalid-token-12345';
    authenticate(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is expired', () => {
    req.headers.authorization = 'Bearer expired-token';
    authenticate(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next with userId when token is valid', () => {
    const { generateToken } = require('../../src/utils/tokenUtils');
    const validToken = generateToken('user-123');
    req.headers.authorization = `Bearer ${validToken}`;
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('user-123');
  });
});
