/**
 * Shared Constants - Values used across the entire application
 */

// ============================================================
// KASPA CONSTANTS
// ============================================================

/**
 * Number of sompi per KAS (1 KAS = 100,000,000 sompi)
 */
export const SOMPI_PER_KAS = 100_000_000n;

/**
 * Minimum amount in sompi (prevent dust transactions)
 */
export const MIN_AMOUNT_SOMPI = 100_000n; // 0.001 KAS

/**
 * Default number of confirmations required
 */
export const DEFAULT_CONFIRMATIONS = 10;

// ============================================================
// SESSION CONSTANTS
// ============================================================

/**
 * How long a payment session remains valid (in minutes)
 */
export const SESSION_EXPIRY_MINUTES = 15;

/**
 * How long a payment session remains valid (in milliseconds)
 */
export const SESSION_EXPIRY_MS = SESSION_EXPIRY_MINUTES * 60 * 1000;

// ============================================================
// POLLING & TIMING CONSTANTS
// ============================================================

/**
 * REST API polling interval (fallback when RPC unavailable)
 */
export const REST_POLL_INTERVAL_MS = 2000;

/**
 * RPC reconnection base delay
 */
export const RPC_RECONNECT_BASE_MS = 1000;

/**
 * Maximum RPC reconnection delay (30 seconds)
 */
export const RPC_RECONNECT_MAX_MS = 30000;

/**
 * WebSocket heartbeat interval
 */
export const WS_HEARTBEAT_INTERVAL_MS = 30000;

// ============================================================
// WEBHOOK CONSTANTS
// ============================================================

/**
 * Maximum webhook retry attempts
 */
export const WEBHOOK_MAX_RETRIES = 5;

/**
 * Webhook timeout in milliseconds
 */
export const WEBHOOK_TIMEOUT_MS = 10000;

/**
 * Delay between webhook retries (exponential backoff base)
 */
export const WEBHOOK_RETRY_BASE_MS = 1000;

// ============================================================
// HD DERIVATION CONSTANTS
// ============================================================

/**
 * BIP-44 coin type for Kaspa
 * See: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 */
export const KASPA_COIN_TYPE = 111111;

/**
 * Default derivation path template
 * m / purpose' / coin_type' / account' / change / address_index
 */
export const DERIVATION_PATH_TEMPLATE = `m/44'/${KASPA_COIN_TYPE}'/0'/0`;

// ============================================================
// WIDGET CONSTANTS
// ============================================================

/**
 * Widget default dimensions
 */
export const WIDGET_DEFAULT_WIDTH = 400;
export const WIDGET_MIN_WIDTH = 320;
export const WIDGET_MAX_WIDTH = 600;

/**
 * Widget animation duration in ms
 */
export const WIDGET_ANIMATION_DURATION_MS = 300;

// ============================================================
// API CONSTANTS
// ============================================================

/**
 * Maximum items per page for paginated endpoints
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Default page size
 */
export const DEFAULT_PAGE_SIZE = 20;
