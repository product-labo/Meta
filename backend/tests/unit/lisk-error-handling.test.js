/**
 * Unit tests for Lisk-specific error handling
 * Validates that Lisk services properly throw and handle custom error types
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  LiskNetworkError,
  LiskAddressValidationError,
  LiskTransactionError,
  LiskInsufficientBalanceError
} from '../../src/errors/index.js';

describe('Lisk Error Classes', () => {
  describe('LiskNetworkError', () => {
    it('should create error with correct properties', () => {
      const error = new LiskNetworkError('Network connection failed', {
        endpoint: 'https://service.lisk.com',
        retryAfter: 5000
      });

      expect(error.message).toBe('Network connection failed');
      expect(error.statusCode).toBe(503);
      expect(error.errorCode).toBe('LISK_NETWORK_ERROR');
      expect(error.details.endpoint).toBe('https://service.lisk.com');
      expect(error.details.retryAfter).toBe(5000);
    });

    it('should have default retry time', () => {
      const error = new LiskNetworkError();
      expect(error.details.retryAfter).toBe(30000);
    });
  });

  describe('LiskAddressValidationError', () => {
    it('should create error with correct properties', () => {
      const error = new LiskAddressValidationError('Invalid address format', {
        address: 'invalid_address_123'
      });

      expect(error.message).toBe('Invalid address format');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('LISK_ADDRESS_INVALID');
      expect(error.details.address).toBe('invalid_address_123');
      expect(error.details.expectedFormat).toContain('40-character hexadecimal');
    });
  });

  describe('LiskTransactionError', () => {
    it('should create error with correct properties', () => {
      const error = new LiskTransactionError('Transaction failed', {
        transactionId: 'tx123',
        reason: 'Insufficient fee',
        recoveryAction: 'Increase transaction fee'
      });

      expect(error.message).toBe('Transaction failed');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('LISK_TRANSACTION_ERROR');
      expect(error.details.transactionId).toBe('tx123');
      expect(error.details.reason).toBe('Insufficient fee');
      expect(error.details.recoveryAction).toBe('Increase transaction fee');
    });
  });

  describe('LiskInsufficientBalanceError', () => {
    it('should create error with correct properties', () => {
      const error = new LiskInsufficientBalanceError('Not enough LSK', {
        address: 'lsk123',
        currentBalance: '1.5',
        requiredAmount: '10.0'
      });

      expect(error.message).toBe('Not enough LSK');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('LISK_INSUFFICIENT_BALANCE');
      expect(error.details.address).toBe('lsk123');
      expect(error.details.currentBalance).toBe('1.5');
      expect(error.details.requiredAmount).toBe('10.0');
      expect(error.details.currency).toBe('LSK');
    });
  });
});

describe('Error Handling Integration', () => {
  it('should properly extend CustomAPIError', () => {
    const errors = [
      new LiskNetworkError(),
      new LiskAddressValidationError(),
      new LiskTransactionError(),
      new LiskInsufficientBalanceError()
    ];

    errors.forEach(error => {
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBeDefined();
      expect(error.errorCode).toBeDefined();
      expect(error.details).toBeDefined();
    });
  });

  it('should have unique error codes', () => {
    const errorCodes = [
      new LiskNetworkError().errorCode,
      new LiskAddressValidationError().errorCode,
      new LiskTransactionError().errorCode,
      new LiskInsufficientBalanceError().errorCode
    ];

    const uniqueCodes = new Set(errorCodes);
    expect(uniqueCodes.size).toBe(errorCodes.length);
  });

  it('should have appropriate HTTP status codes', () => {
    expect(new LiskNetworkError().statusCode).toBe(503); // Service Unavailable
    expect(new LiskAddressValidationError().statusCode).toBe(400); // Bad Request
    expect(new LiskTransactionError().statusCode).toBe(400); // Bad Request
    expect(new LiskInsufficientBalanceError().statusCode).toBe(400); // Bad Request
  });
});
