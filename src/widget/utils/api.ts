/**
 * Widget API Client
 */

export interface SessionResponse {
  id: string;
  address: string;
  amount: string;
  amountSompi: string;
  status: string;
  confirmations: number;
  requiredConfirmations: number;
  txId?: string;
  orderId?: string;
  qrCode: string;
  subscriptionToken: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  confirmedAt?: string;
  explorerUrl: string;
}

export interface CreateSessionRequest {
  amount: string;
  orderId?: string;
  metadata?: Record<string, string>;
  redirectUrl?: string;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(serverUrl: string, apiKey: string) {
    this.baseUrl = serverUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API error: ${response.status}`);
    }

    return data;
  }

  async createSession(request: CreateSessionRequest): Promise<SessionResponse> {
    return this.request<SessionResponse>('POST', '/api/v1/sessions', request);
  }

  async getSession(sessionId: string): Promise<SessionResponse> {
    return this.request<SessionResponse>('GET', `/api/v1/sessions/${sessionId}`);
  }

  async getSessionStatus(sessionId: string): Promise<{
    id: string;
    status: string;
    confirmations: number;
    requiredConfirmations: number;
    txId?: string;
  }> {
    return this.request('GET', `/api/v1/sessions/${sessionId}/status`);
  }
}
