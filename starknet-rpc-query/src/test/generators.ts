/**
 * Property-based test generators for Starknet-specific data types
 */
import * as fc from 'fast-check';

/**
 * Generate valid Starknet addresses
 */
export const starknetAddressArbitrary = (): fc.Arbitrary<string> => {
  return fc.hexaString({ minLength: 2, maxLength: 64 }).map(hex => {
    // Ensure it starts with 0x and is properly formatted
    const paddedHex = hex.padStart(64, '0');
    return `0x${paddedHex}`;
  });
};

/**
 * Generate valid Starknet hashes (32 bytes)
 */
export const starknetHashArbitrary = (): fc.Arbitrary<string> => {
  return fc.hexaString({ minLength: 64, maxLength: 64 }).map(hex => `0x${hex}`);
};

/**
 * Generate valid block numbers
 */
export const blockNumberArbitrary = (): fc.Arbitrary<bigint> => {
  return fc.bigUintN(64).filter(n => n >= 0n);
};

/**
 * Generate valid hex strings
 */
export const hexStringArbitrary = (): fc.Arbitrary<string> => {
  return fc.hexaString({ minLength: 2, maxLength: 128 }).map(hex => `0x${hex}`);
};

/**
 * Generate valid RPC endpoint URLs
 */
export const rpcEndpointArbitrary = (): fc.Arbitrary<string> => {
  return fc.oneof(
    fc.constant('https://starknet-mainnet.public.blastapi.io'),
    fc.constant('https://starknet-testnet.public.blastapi.io'),
    fc.webUrl({ validSchemes: ['https', 'http'] })
  );
};

/**
 * Generate valid transaction types
 */
export const transactionTypeArbitrary = (): fc.Arbitrary<string> => {
  return fc.oneof(
    fc.constant('INVOKE'),
    fc.constant('DECLARE'),
    fc.constant('DEPLOY'),
    fc.constant('DEPLOY_ACCOUNT'),
    fc.constant('L1_HANDLER')
  );
};

/**
 * Generate valid transaction statuses
 */
export const transactionStatusArbitrary = (): fc.Arbitrary<'pending' | 'accepted_on_l2' | 'accepted_on_l1' | 'rejected'> => {
  return fc.oneof(
    fc.constant('pending' as const),
    fc.constant('accepted_on_l2' as const),
    fc.constant('accepted_on_l1' as const),
    fc.constant('rejected' as const)
  );
};

/**
 * Generate valid finality statuses
 */
export const finalityStatusArbitrary = (): fc.Arbitrary<'pending' | 'accepted_on_l2' | 'accepted_on_l1'> => {
  return fc.oneof(
    fc.constant('pending' as const),
    fc.constant('accepted_on_l2' as const),
    fc.constant('accepted_on_l1' as const)
  );
};

/**
 * Generate valid timestamps
 */
export const timestampArbitrary = (): fc.Arbitrary<Date> => {
  return fc.date({ min: new Date('2021-01-01'), max: new Date() });
};

/**
 * Generate valid fee amounts
 */
export const feeArbitrary = (): fc.Arbitrary<bigint> => {
  return fc.bigUintN(64);
};

/**
 * Generate valid nonce values
 */
export const nonceArbitrary = (): fc.Arbitrary<bigint> => {
  return fc.bigUintN(32);
};

/**
 * Generate valid entry point selectors
 */
export const entryPointSelectorArbitrary = (): fc.Arbitrary<string> => {
  return starknetHashArbitrary();
};

/**
 * Generate valid calldata
 */
export const calldataArbitrary = (): fc.Arbitrary<string[]> => {
  return fc.array(hexStringArbitrary(), { minLength: 0, maxLength: 10 });
};

/**
 * Generate valid event keys
 */
export const eventKeysArbitrary = (): fc.Arbitrary<string[]> => {
  return fc.array(starknetHashArbitrary(), { minLength: 1, maxLength: 4 });
};

/**
 * Generate valid event data
 */
export const eventDataArbitrary = (): fc.Arbitrary<string[]> => {
  return fc.array(hexStringArbitrary(), { minLength: 0, maxLength: 10 });
};