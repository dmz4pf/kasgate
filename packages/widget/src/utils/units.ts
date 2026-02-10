/**
 * Kaspa Unit Conversion Utilities
 *
 * Handles conversion between KAS and sompi with proper precision.
 * 1 KAS = 100,000,000 sompi (8 decimal places)
 */

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
