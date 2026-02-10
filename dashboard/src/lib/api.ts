import type {
  Merchant,
  Session,
  SessionsResponse,
  Stats,
  ApiError,
  RegenerateKeyResponse,
  RegenerateSecretResponse,
  WebhookLogsResponse,
} from '@/types';
import { useAuthStore } from '@/stores/authStore';

const API_BASE = '/api/v1';

class ApiClient {
  private getHeaders(): HeadersInit {
    const apiKey = useAuthStore.getState().apiKey;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
        message: 'An unexpected error occurred',
        statusCode: response.status,
      }));

      if (response.status === 401) {
        useAuthStore.getState().logout();
      }

      throw new Error(error.message || error.error);
    }

    return response.json();
  }

  // Auth / Merchant
  async getMe(): Promise<Merchant> {
    return this.request<Merchant>('/merchants/me');
  }

  async updateMe(data: Partial<Merchant>): Promise<Merchant> {
    return this.request<Merchant>('/merchants/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async regenerateApiKey(): Promise<RegenerateKeyResponse> {
    return this.request<RegenerateKeyResponse>('/merchants/me/regenerate-api-key', {
      method: 'POST',
    });
  }

  async regenerateWebhookSecret(): Promise<RegenerateSecretResponse> {
    return this.request<RegenerateSecretResponse>('/merchants/me/regenerate-webhook-secret', {
      method: 'POST',
    });
  }

  // Sessions
  async getSessions(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<SessionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return this.request<SessionsResponse>(
      `/merchants/me/sessions${query ? `?${query}` : ''}`
    );
  }

  async getSession(id: string): Promise<Session> {
    return this.request<Session>(`/sessions/${id}`);
  }

  async cancelSession(id: string): Promise<Session> {
    return this.request<Session>(`/sessions/${id}/cancel`, {
      method: 'POST',
    });
  }

  // Stats
  async getStats(): Promise<Stats> {
    return this.request<Stats>('/merchants/me/stats');
  }

  // Verify API key (login)
  async verifyApiKey(apiKey: string): Promise<Merchant> {
    const response = await fetch(`${API_BASE}/merchants/me`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid API key');
    }

    return response.json();
  }

  // Webhook Logs
  async getWebhookLogs(params?: {
    limit?: number;
    offset?: number;
    event?: string;
  }): Promise<WebhookLogsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.event) searchParams.set('event', params.event);

    const query = searchParams.toString();
    return this.request<WebhookLogsResponse>(
      `/merchants/me/webhook-logs${query ? `?${query}` : ''}`
    );
  }

  async retryWebhook(logId: string): Promise<{ message: string; logId: string }> {
    return this.request(`/merchants/me/webhook-logs/${logId}/retry`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
