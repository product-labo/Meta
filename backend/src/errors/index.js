/**
 * Custom error classes for Lisk integration
 */

export class LiskNetworkError extends Error {
  constructor(message, code = 'LISK_NETWORK_ERROR') {
    super(message);
    this.name = 'LiskNetworkError';
    this.code = code;
  }
}

export class LiskAddressValidationError extends Error {
  constructor(message, address = null) {
    super(message);
    this.name = 'LiskAddressValidationError';
    this.code = 'LISK_ADDRESS_INVALID';
    this.address = address;
  }
}

export class LiskTransactionError extends Error {
  constructor(message, transactionId = null) {
    super(message);
    this.name = 'LiskTransactionError';
    this.code = 'LISK_TRANSACTION_ERROR';
    this.transactionId = transactionId;
  }
}

export class LiskConfigurationError extends Error {
  constructor(message, configKey = null) {
    super(message);
    this.name = 'LiskConfigurationError';
    this.code = 'LISK_CONFIG_ERROR';
    this.configKey = configKey;
  }
}

export class LiskAPIError extends Error {
  constructor(message, statusCode = null, endpoint = null) {
    super(message);
    this.name = 'LiskAPIError';
    this.code = 'LISK_API_ERROR';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}