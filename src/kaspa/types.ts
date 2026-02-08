/**
 * Kaspa SDK Type Definitions
 *
 * These types provide a TypeScript interface to the kaspa WASM package.
 * The actual types come from the kaspa package, but we define interfaces
 * here for better IDE support and documentation.
 */

// ============================================================
// UTXO TYPES
// ============================================================

/**
 * Represents a single UTXO (Unspent Transaction Output)
 */
export interface Utxo {
  /** Transaction ID that created this UTXO */
  transactionId: string;
  /** Output index within the transaction */
  index: number;
  /** Amount in sompi */
  amount: bigint;
  /** Script public key */
  scriptPublicKey: string;
  /** Block DAA score when this UTXO was created */
  blockDaaScore: bigint;
  /** Whether this is a coinbase transaction */
  isCoinbase: boolean;
}

/**
 * UTXO entry from REST API (slightly different format)
 */
export interface RestUtxoEntry {
  address: string;
  outpoint: {
    transactionId: string;
    index: number;
  };
  utxoEntry: {
    amount: string; // String in REST API
    scriptPublicKey: {
      scriptPublicKey: string;
    };
    blockDaaScore: string; // String in REST API
    isCoinbase: boolean;
  };
}

// ============================================================
// TRANSACTION TYPES
// ============================================================

/**
 * Transaction input
 */
export interface TransactionInput {
  previousOutpoint: {
    transactionId: string;
    index: number;
  };
  signatureScript: string;
  sequence: bigint;
  sigOpCount: number;
}

/**
 * Transaction output
 */
export interface TransactionOutput {
  value: bigint;
  scriptPublicKey: {
    version: number;
    script: string;
  };
}

/**
 * Full transaction data
 */
export interface Transaction {
  id: string;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  lockTime: bigint;
  subnetworkId: string;
  gas: bigint;
  payload: string;
  mass: bigint;
}

// ============================================================
// RPC TYPES
// ============================================================

/**
 * RPC notification for UTXO changes
 */
export interface UtxoChangedNotification {
  added: Utxo[];
  removed: Utxo[];
}

/**
 * Blue score info from RPC
 */
export interface BlueScoreInfo {
  blueScore: bigint;
}

/**
 * DAG info from RPC
 */
export interface DagInfo {
  networkName: string;
  blockCount: bigint;
  headerCount: bigint;
  tipHashes: string[];
  difficulty: number;
  pastMedianTime: bigint;
  virtualParentHashes: string[];
  pruningPointHash: string;
  virtualDaaScore: bigint;
}

// ============================================================
// ADDRESS TYPES
// ============================================================

/**
 * Address derivation result
 */
export interface DerivedAddress {
  /** The derived Kaspa address */
  address: string;
  /** Derivation index used */
  index: number;
  /** Full derivation path */
  path: string;
}

// ============================================================
// PAYMENT TYPES
// ============================================================

/**
 * Payment status
 */
export type PaymentStatus =
  | 'pending'      // Waiting for payment
  | 'confirming'   // Payment received, waiting for confirmations
  | 'confirmed'    // Payment confirmed
  | 'expired'      // Session expired without payment
  | 'failed';      // Payment failed

/**
 * Payment session
 */
export interface PaymentSession {
  /** Unique session ID */
  id: string;
  /** Merchant ID */
  merchantId: string;
  /** Payment address (derived from merchant's xPub) */
  address: string;
  /** Amount in sompi */
  amount: bigint;
  /** Current status */
  status: PaymentStatus;
  /** Number of confirmations (if confirming/confirmed) */
  confirmations: number;
  /** Transaction ID (if payment received) */
  txId?: string;
  /** Merchant's order ID */
  orderId?: string;
  /** Additional metadata */
  metadata?: Record<string, string>;
  /** When the session was created */
  createdAt: Date;
  /** When the session expires */
  expiresAt: Date;
  /** When the payment was detected */
  paidAt?: Date;
  /** When the payment was confirmed */
  confirmedAt?: Date;
}

// ============================================================
// WIDGET TYPES
// ============================================================

/**
 * Widget state machine states
 */
export type WidgetState =
  | 'idle'        // Initial state, no session
  | 'loading'    // Creating session
  | 'ready'      // Session created, showing QR
  | 'waiting'    // Waiting for payment
  | 'confirming' // Payment detected, waiting for confirmations
  | 'confirmed'  // Payment confirmed
  | 'expired'    // Session expired
  | 'error';     // Error state

/**
 * Widget configuration options
 */
export interface WidgetConfig {
  /** Merchant ID */
  merchantId: string;
  /** Amount in KAS */
  amount: string;
  /** Server URL */
  serverUrl?: string;
  /** Merchant's order ID */
  orderId?: string;
  /** Additional metadata */
  metadata?: Record<string, string>;
  /** Callback when payment is confirmed */
  onConfirmed?: (session: PaymentSession) => void;
  /** Callback when payment expires */
  onExpired?: (session: PaymentSession) => void;
  /** Callback on any error */
  onError?: (error: Error) => void;
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
}
