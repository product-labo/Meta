/**
 * Fee calculation utilities for Lisk transactions
 */

// Lisk fee constants (in Beddows, 1 LSK = 100,000,000 Beddows)
const LISK_FEE_CONSTANTS = {
  BASE_FEE: 1000000, // 0.01 LSK in Beddows
  TRANSFER_FEE: 1000000, // 0.01 LSK
  DATA_FEE_PER_BYTE: 1000, // 0.00001 LSK per byte
  MIN_FEE: 1000000, // 0.01 LSK minimum
  MAX_FEE: 100000000 // 1 LSK maximum
};

/**
 * Calculate fee for a Lisk transaction
 */
export function calculateFee(transactionSize = 0, transactionType = 'transfer') {
  let baseFee = LISK_FEE_CONSTANTS.BASE_FEE;
  
  switch (transactionType) {
    case 'transfer':
      baseFee = LISK_FEE_CONSTANTS.TRANSFER_FEE;
      break;
    case 'data':
      baseFee = LISK_FEE_CONSTANTS.BASE_FEE + (transactionSize * LISK_FEE_CONSTANTS.DATA_FEE_PER_BYTE);
      break;
    default:
      baseFee = LISK_FEE_CONSTANTS.BASE_FEE;
  }

  // Ensure fee is within bounds
  return Math.max(LISK_FEE_CONSTANTS.MIN_FEE, Math.min(baseFee, LISK_FEE_CONSTANTS.MAX_FEE));
}

/**
 * Get fee estimate for transaction
 */
export function getFeeEstimate(transactionData) {
  const size = JSON.stringify(transactionData).length;
  const type = transactionData.moduleID === 2 ? 'transfer' : 'data';
  
  return {
    fee: calculateFee(size, type),
    size,
    type,
    feeInLSK: calculateFee(size, type) / 100000000
  };
}

/**
 * Validate withdrawal amount against fees
 */
export function isValidWithdrawalAmount(amount, availableBalance) {
  const amountInBeddows = Math.floor(amount * 100000000);
  const fee = calculateFee();
  const totalRequired = amountInBeddows + fee;
  
  return {
    isValid: totalRequired <= availableBalance,
    fee,
    feeInLSK: fee / 100000000,
    totalRequired,
    totalRequiredInLSK: totalRequired / 100000000
  };
}