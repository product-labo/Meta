/**
 * Custom error classes for the Starknet RPC Query System
 */

export class StarknetRPCError extends Error {
  constructor(
    message: string,
    public code: number,
    public type: 'connection' | 'protocol' | 'data' | 'rate_limit' | 'system',
    public context?: any
  ) {
    super(message);
    this.name = 'StarknetRPCError';
  }
}

export class ConnectionError extends StarknetRPCError {
  constructor(message: string, context?: any) {
    super(message, 1001, 'connection', context);
    this.name = 'ConnectionError';
  }
}

export class ProtocolError extends StarknetRPCError {
  constructor(message: string, context?: any) {
    super(message, 1002, 'protocol', context);
    this.name = 'ProtocolError';
  }
}

export class DataError extends StarknetRPCError {
  constructor(message: string, context?: any) {
    super(message, 1003, 'data', context);
    this.name = 'DataError';
  }
}

export class RateLimitError extends StarknetRPCError {
  constructor(message: string, context?: any) {
    super(message, 1004, 'rate_limit', context);
    this.name = 'RateLimitError';
  }
}

export class SystemError extends StarknetRPCError {
  constructor(message: string, context?: any) {
    super(message, 1005, 'system', context);
    this.name = 'SystemError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class IngestionError extends Error {
  constructor(
    message: string,
    public blockNumber?: bigint,
    public txHash?: string,
    public retryCount: number = 0
  ) {
    super(message);
    this.name = 'IngestionError';
  }
}