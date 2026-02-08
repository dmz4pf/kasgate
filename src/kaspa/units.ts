/**
 * Kaspa Unit Conversion Utilities
 *
 * Handles conversion between KAS and sompi with proper precision.
 * 1 KAS = 100,000,000 sompi (8 decimal places)
 */

import { SOMPI_PER_KAS } from '../shared/constants.js';

/**
 * Convert KAS to sompi
 *
 * @param kas - Amount in KAS (as string to preserve precision)
 * @returns Amount in sompi as bigint
 *
 * @example
 * kasToSompi('1.5') // 150000000n
 * kasToSompi('0.00000001') // 1n
 */
export function kasToSompi(kas: string): bigint {
  // Validate input
  if (!/^\d+(\.\d{1,8})?$/.test(kas)) {
    throw new Error(`Invalid KAS amount: ${kas}`);
  }

  const [whole, decimal = ''] = kas.split('.');

  // Pad decimal to 8 places
  const paddedDecimal = decimal.padEnd(8, '0');

  // Combine whole and decimal parts
  const sompiStr = whole + paddedDecimal;

  // Remove leading zeros and convert to bigint
  return BigInt(sompiStr.replace(/^0+/, '') || '0');
}

/**
 * Convert sompi to KAS
 *
 * @param sompi - Amount in sompi
 * @returns Amount in KAS as string (with proper decimal places)
 *
 * @example
 * sompiToKas(150000000n) // '1.5'
 * sompiToKas(1n) // '0.00000001'
 */
export function sompiToKas(sompi: bigint): string {
  const sompiStr = sompi.toString().padStart(9, '0');

  const wholePartEnd = sompiStr.length - 8;
  const whole = sompiStr.slice(0, wholePartEnd) || '0';
  const decimal = sompiStr.slice(wholePartEnd);

  // Trim trailing zeros from decimal
  const trimmedDecimal = decimal.replace(/0+$/, '');

  return trimmedDecimal ? `${whole}.${trimmedDecimal}` : whole;
}

/**
 * Format sompi as a display string with KAS suffix
 *
 * @param sompi - Amount in sompi
 * @param options - Formatting options
 * @returns Formatted string like "1.5 KAS"
 */
export function formatKas(
  sompi: bigint,
  options: {
    /** Include KAS suffix (default: true) */
    suffix?: boolean;
    /** Maximum decimal places to show (default: 8) */
    maxDecimals?: number;
    /** Minimum decimal places to show (default: 0) */
    minDecimals?: number;
  } = {}
): string {
  const { suffix = true, maxDecimals = 8, minDecimals = 0 } = options;

  let kas = sompiToKas(sompi);

  // Handle decimal formatting
  const [whole, decimal = ''] = kas.split('.');

  if (decimal.length > maxDecimals) {
    kas = `${whole}.${decimal.slice(0, maxDecimals)}`;
  } else if (decimal.length < minDecimals) {
    kas = `${whole}.${decimal.padEnd(minDecimals, '0')}`;
  }

  return suffix ? `${kas} KAS` : kas;
}

/**
 * Parse a human-readable KAS amount (with optional suffix)
 *
 * @param input - Amount string like "1.5", "1.5 KAS", or "150000000 sompi"
 * @returns Amount in sompi
 */
export function parseAmount(input: string): bigint {
  const trimmed = input.trim().toLowerCase();

  // Check for sompi suffix
  if (trimmed.endsWith('sompi')) {
    const value = trimmed.replace(/\s*sompi$/, '').trim();
    if (!/^\d+$/.test(value)) {
      throw new Error(`Invalid sompi amount: ${input}`);
    }
    return BigInt(value);
  }

  // Remove KAS suffix if present
  const kasValue = trimmed.replace(/\s*kas$/, '').trim();

  return kasToSompi(kasValue);
}

/**
 * Check if an amount is valid (positive and above dust threshold)
 *
 * @param sompi - Amount in sompi
 * @param minAmount - Minimum amount (default: 100000 = 0.001 KAS)
 * @returns true if valid
 */
export function isValidAmount(sompi: bigint, minAmount: bigint = 100_000n): boolean {
  return sompi >= minAmount;
}

/**
 * Compare two amounts
 *
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareAmounts(a: bigint, b: bigint): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Add amounts safely
 */
export function addAmounts(...amounts: bigint[]): bigint {
  return amounts.reduce((sum, amount) => sum + amount, 0n);
}

/**
 * Calculate percentage of an amount
 *
 * @param amount - Base amount in sompi
 * @param percentage - Percentage (0-100)
 * @returns Calculated amount in sompi
 */
export function percentageOf(amount: bigint, percentage: number): bigint {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }

  // Use integer math: (amount * percentage * 100) / 10000
  return (amount * BigInt(Math.round(percentage * 100))) / 10000n;
}
