// API Types - mirrors backend types

export type SessionStatus = 'pending' | 'confirming' | 'confirmed' | 'expired' | 'failed';

export interface Session {
  id: string;
  merchantId: string;
  orderId: string;
  amount: string;
  currency: string;
  kaspaAmount: string;
  kaspaAddress: string;
  status: SessionStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  txHash?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionsResponse {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
}

export interface Merchant {
  id: string;
  email: string;
  businessName: string;
  webhookUrl?: string;
  apiKeyLastFour: string;
  createdAt: string;
}

export interface Stats {
  totalSessions: number;
  pendingSessions: number;
  confirmedSessions: number;
  totalKasReceived: string;
  last24hSessions: number;
  last24hConfirmed: number;
  last24hKasReceived: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface RegenerateKeyResponse {
  apiKey: string;
  message: string;
}

export interface RegenerateSecretResponse {
  webhookSecret: string;
  message: string;
}

// Webhook Log types
export type WebhookEvent = 'payment.pending' | 'payment.confirming' | 'payment.confirmed' | 'payment.expired';

export interface WebhookLog {
  id: string;
  sessionId: string;
  event: WebhookEvent;
  statusCode: number | null;
  attempts: number;
  deliveryId: string | null;
  createdAt: string;
  deliveredAt: string | null;
  nextRetryAt: string | null;
  payload: Record<string, unknown> | null;
  response: string | null;
}

export interface WebhookLogsResponse {
  logs: WebhookLog[];
  total: number;
  limit: number;
  offset: number;
}

// WebSocket event types
export interface SessionUpdateEvent {
  type: 'session.update';
  session: Session;
}

export interface StatsUpdateEvent {
  type: 'stats.update';
  stats: Stats;
}

export type WSEvent = SessionUpdateEvent | StatsUpdateEvent;
