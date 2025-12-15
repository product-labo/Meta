#!/usr/bin/env node

/**
 * Payment Checker - Monitor invoice payment status
 * Usage: node check-payment.js <invoice_id>
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';

const invoiceId = process.argv[2];

if (!invoiceId) {
  console.error('Usage: node check-payment.js <invoice_id>');
  process.exit(1);
}

async function checkPayment(invoiceId) {
  try {
    console.log(`🔍 Checking payment for invoice ${invoiceId}...`);
    
    const response = await fetch(`${BASE_URL}/api/invoice/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({ invoice_id: parseInt(invoiceId) })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`);
    }

    if (data.paid) {
      console.log('✅ Payment received!');
      console.log(`   Amount: ${data.invoice.paid_amount_zec} ZEC`);
      console.log(`   Transaction: ${data.invoice.paid_txid}`);
      console.log(`   Paid at: ${data.invoice.paid_at}`);
    } else {
      console.log('⏳ Payment not yet received');
      console.log(`   Expected: ${data.invoice.amount_zec} ZEC`);
      console.log(`   Address: ${data.invoice.z_address}`);
      console.log(`   Received so far: ${data.invoice.received_amount || 0} ZEC`);
    }

    return data.paid;
  } catch (error) {
    console.error('❌ Error checking payment:', error.message);
    return false;
  }
}

// Monitor payment with polling
async function monitorPayment(invoiceId, maxAttempts = 20, interval = 10000) {
  console.log(`🔄 Monitoring payment for invoice ${invoiceId}`);
  console.log(`   Max attempts: ${maxAttempts}`);
  console.log(`   Check interval: ${interval/1000} seconds`);
  console.log('');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`📡 Attempt ${attempt}/${maxAttempts}`);
    
    const paid = await checkPayment(invoiceId);
    
    if (paid) {
      console.log('\n🎉 Payment confirmed!');
      return true;
    }

    if (attempt < maxAttempts) {
      console.log(`   Waiting ${interval/1000} seconds...\n`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  console.log('\n⏰ Monitoring timeout reached');
  return false;
}

// Check if user wants to monitor or just check once
const monitor = process.argv.includes('--monitor') || process.argv.includes('-m');

if (monitor) {
  monitorPayment(invoiceId).catch(console.error);
} else {
  checkPayment(invoiceId).catch(console.error);
}