import { errorHandlerMiddleware } from '../../src/middleware/errorHandler.js';
import {
  CustomAPIError,
  UnauthenticatedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
  PaymentRequiredError,
  ValidationError,
  SubscriptionExpiredError,
  BlockchainError,
  PrivacyRestrictedError,
  InsufficientBalanceError,
  RateLimitExceededError,
} from '../../src/errors/index.js';

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1',
      user: { id: 'test-user-id' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    
    // Suppress console output during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('CustomAPIError handling', () => {
    it('should handle UnauthenticatedError with structured response', () => {
      const error = new UnauthenticatedError('Invalid credentials');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_INVALID',
          message: 'Invalid credentials',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle NotFoundError with structured response', () => {
      const error = new NotFoundError('Resource not found');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'NOT_FOUND',
          message: 'Resource not found',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle BadRequestError with structured response', () => {
      const error = new BadRequestError('Invalid input');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'BAD_REQUEST',
          message: 'Invalid input',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle ForbiddenError with structured response', () => {
      const error = new ForbiddenError('Access denied');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'PERMISSION_DENIED',
          message: 'Access denied',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle ConflictError with structured response', () => {
      const error = new ConflictError('Resource already exists');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'ALREADY_EXISTS',
          message: 'Resource already exists',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle PaymentRequiredError with structured response', () => {
      const error = new PaymentRequiredError('Payment required');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'PAYMENT_REQUIRED',
          message: 'Payment required',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle ValidationError with details', () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];
      const error = new ValidationError('Validation failed', details);
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: details,
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle SubscriptionExpiredError with structured response', () => {
      const error = new SubscriptionExpiredError();
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'SUBSCRIPTION_EXPIRED',
          message: 'Your subscription has expired',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle BlockchainError with structured response', () => {
      const error = new BlockchainError('Failed to connect to Zcash node');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'BLOCKCHAIN_ERROR',
          message: 'Failed to connect to Zcash node',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle PrivacyRestrictedError with structured response', () => {
      const error = new PrivacyRestrictedError();
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'PRIVACY_RESTRICTED',
          message: 'Data access restricted by privacy settings',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle InsufficientBalanceError with structured response', () => {
      const error = new InsufficientBalanceError('Balance too low for withdrawal');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INSUFFICIENT_BALANCE',
          message: 'Balance too low for withdrawal',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle RateLimitExceededError with structured response', () => {
      const error = new RateLimitExceededError();
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('JWT error handling', () => {
    it('should handle JsonWebTokenError', () => {
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_INVALID',
          message: 'Authentication failed',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_EXPIRED',
          message: 'Authentication failed',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Database error handling', () => {
    it('should handle unique constraint violation (23505)', () => {
      const error = new Error('duplicate key value');
      error.code = '23505';
      error.constraint = 'users_email_unique';
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'ALREADY_EXISTS',
          message: 'Resource already exists',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle foreign key violation (23503)', () => {
      const error = new Error('foreign key constraint');
      error.code = '23503';
      error.constraint = 'projects_user_id_fkey';
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'NOT_FOUND',
          message: 'Referenced resource not found',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle not null violation (23502)', () => {
      const error = new Error('null value in column');
      error.code = '23502';
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Validation constraint violated',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Generic error handling', () => {
    it('should handle unknown errors with 500 status', () => {
      const error = new Error('Something went wrong');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
          errorId: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });

    it('should include errorId for server errors', () => {
      const error = new Error('Internal error');
      
      errorHandlerMiddleware(error, req, res, next);
      
      const response = res.json.mock.calls[0][0];
      expect(response.errorId).toBeDefined();
      expect(response.errorId).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should log critical errors with stack trace', () => {
      const error = new Error('Critical error');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should log client errors without stack trace', () => {
      const error = new BadRequestError('Client error');
      
      errorHandlerMiddleware(error, req, res, next);
      
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('Error response structure', () => {
    it('should always include error code', () => {
      const error = new NotFoundError('Not found');
      
      errorHandlerMiddleware(error, req, res, next);
      
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBeDefined();
      expect(typeof response.error).toBe('string');
    });

    it('should always include message', () => {
      const error = new BadRequestError('Bad request');
      
      errorHandlerMiddleware(error, req, res, next);
      
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBeDefined();
      expect(typeof response.message).toBe('string');
    });

    it('should always include timestamp', () => {
      const error = new NotFoundError('Not found');
      
      errorHandlerMiddleware(error, req, res, next);
      
      const response = res.json.mock.calls[0][0];
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should not include errorId for client errors', () => {
      const error = new BadRequestError('Bad request');
      
      errorHandlerMiddleware(error, req, res, next);
      
      const response = res.json.mock.calls[0][0];
      expect(response.errorId).toBeUndefined();
    });
  });
});
