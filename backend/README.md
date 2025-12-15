# Lisk Paywall SDK

A production-ready Node.js SDK for implementing Lisk-based paywall systems with subscription and one-time payment support.

## Features

- **Lisk Integration**: Full integration with Lisk blockchain for LSK token transactions
- **Payment Processing**: Create invoices and process LSK payments
- **Wallet Management**: Manage Lisk wallets and track balances
- **Analytics**: Track user behavior and LSK payment metrics
- **Subscription Support**: Handle recurring LSK payments
- **API Key Management**: Secure API access control

## Installation

```bash
npm install lisk-paywall-sdk
```

## Quick Start

```javascript
import { LiskPaywall } from 'lisk-paywall-sdk';

// Initialize the SDK
const paywall = new LiskPaywall({
  baseURL: 'https://api.yourdomain.com',
  apiKey: 'your-api-key'
});

// Create a user
const user = await paywall.users.create({
  email: 'user@example.com',
  name: 'John Doe'
});

// Create an invoice for LSK payment
const invoice = await paywall.invoices.create({
  user_id: user.id,
  type: 'one-time',
  amount_lsk: 10.5,
  item_id: 'premium-feature'
});

// Check payment status
const status = await paywall.invoices.checkPayment(invoice.id);
```

## Configuration

### Environment Variables

```bash
# Lisk Service Configuration
LISK_SERVICE_URL=https://service.lisk.com
LISK_NETWORK=mainnet

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=liskpaywall

# Platform Treasury Address
PLATFORM_TREASURY_ADDRESS=lsk1234567890abcdef1234567890abcdef12345
```

## API Reference

### Users API

```javascript
// Create a user
await paywall.users.create({ email, name });

// Get user by ID
await paywall.users.getById(userId);

// Get user balance
await paywall.users.getBalance(userId);
```

### Invoices API

```javascript
// Create an invoice
await paywall.invoices.create({
  user_id,
  type: 'one-time',
  amount_lsk: 10.5
});

// Check payment status
await paywall.invoices.checkPayment(invoiceId);

// Get QR code
await paywall.invoices.getQRCode(invoiceId);
```

### Withdrawals API

```javascript
// Create withdrawal request
await paywall.withdrawals.create({
  user_id,
  to_address: 'lsk1234567890abcdef1234567890abcdef12345',
  amount_lsk: 5.0
});

// Get fee estimate
await paywall.withdrawals.getFeeEstimate(amount_lsk);
```

## Testing

The SDK includes comprehensive testing utilities:

```javascript
import { MockLiskPaywall } from 'lisk-paywall-sdk/testing';

// Use mock SDK for testing
const paywall = new MockLiskPaywall();
```

## Lisk Network

This SDK works with the Lisk blockchain:

- **Mainnet**: Production Lisk network
- **Testnet**: Testing environment for development

## License

MIT

## Support

For issues and questions, please visit our [GitHub repository](https://github.com/limitlxx/lisk-paywall-sdk).
