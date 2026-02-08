/**
 * KasGate Web Component
 *
 * A custom HTML element for accepting Kaspa payments.
 * Uses Shadow DOM for style isolation.
 */

import { getCSSVariables } from './styles/theme.js';
import { BASE_STYLES } from './styles/base.js';
import { ApiClient, SessionResponse } from './utils/api.js';
import { SocketClient } from './utils/socket.js';
import { formatTimeRemaining, formatKasAmount, copyToClipboard, icons } from './utils/formatters.js';

// ============================================================
// TYPES
// ============================================================

export type WidgetState = 'idle' | 'loading' | 'ready' | 'waiting' | 'confirming' | 'confirmed' | 'expired' | 'error';

export interface KasGateConfig {
  merchantId: string;
  amount: string;
  serverUrl?: string;
  apiKey?: string;
  orderId?: string;
  metadata?: Record<string, string>;
  theme?: 'light' | 'dark';
  onConfirmed?: (session: SessionResponse) => void;
  onExpired?: (session: SessionResponse) => void;
  onError?: (error: Error) => void;
}

// ============================================================
// WEB COMPONENT
// ============================================================

export class KasGateElement extends HTMLElement {
  private shadow: ShadowRoot;
  private config: KasGateConfig | null = null;
  private api: ApiClient | null = null;
  private socket: SocketClient | null = null;
  private session: SessionResponse | null = null;
  private state: WidgetState = 'idle';
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  // Observed attributes
  static get observedAttributes() {
    return ['merchant-id', 'amount', 'server-url', 'api-key', 'order-id', 'theme'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  connectedCallback() {
    this.initFromAttributes();
    this.render();

    if (this.config?.merchantId && this.config?.amount) {
      this.start();
    }
  }

  disconnectedCallback() {
    this.cleanup();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    this.initFromAttributes();
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Initialize the widget with configuration
   */
  init(config: KasGateConfig): void {
    this.config = config;
    this.render();
    this.start();
  }

  /**
   * Get current session
   */
  getSession(): SessionResponse | null {
    return this.session;
  }

  /**
   * Get current state
   */
  getState(): WidgetState {
    return this.state;
  }

  /**
   * Cancel and reset the widget
   */
  reset(): void {
    this.cleanup();
    this.session = null;
    this.setState('idle');
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private initFromAttributes(): void {
    const merchantId = this.getAttribute('merchant-id') || '';
    const amount = this.getAttribute('amount') || '';
    const serverUrl = this.getAttribute('server-url') || window.location.origin;
    const apiKey = this.getAttribute('api-key') || '';
    const orderId = this.getAttribute('order-id') || undefined;
    const theme = (this.getAttribute('theme') as 'light' | 'dark') || 'light';

    this.config = {
      merchantId,
      amount,
      serverUrl,
      apiKey,
      orderId,
      theme,
    };
  }

  private async start(): Promise<void> {
    if (!this.config?.merchantId || !this.config?.amount || !this.config?.apiKey) {
      this.setState('error');
      this.showError('Missing required configuration');
      return;
    }

    this.setState('loading');

    try {
      // Initialize API client
      this.api = new ApiClient(this.config.serverUrl || '', this.config.apiKey);

      // Create session
      this.session = await this.api.createSession({
        amount: this.config.amount,
        orderId: this.config.orderId,
        metadata: this.config.metadata,
      });

      // Connect WebSocket
      this.socket = new SocketClient(this.config.serverUrl || '');
      this.socket.setHandlers({
        onUpdate: (update) => this.handleStatusUpdate(update),
        onConnect: () => console.log('[KasGate Widget] Socket connected'),
        onDisconnect: () => console.log('[KasGate Widget] Socket disconnected'),
        onError: (error) => console.error('[KasGate Widget] Socket error:', error),
      });
      this.socket.connect();
      this.socket.subscribe(this.session.id);

      // Start timer
      this.startTimer();

      // Start polling as backup
      this.startPolling();

      this.setState('ready');
    } catch (error) {
      console.error('[KasGate Widget] Failed to create session:', error);
      this.setState('error');
      this.showError((error as Error).message);
      this.config?.onError?.(error as Error);
    }
  }

  private setState(state: WidgetState): void {
    this.state = state;
    this.render();

    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('statechange', {
      detail: { state, session: this.session },
    }));
  }

  private handleStatusUpdate(update: any): void {
    if (!this.session) return;

    if (update.status) {
      this.session.status = update.status;
    }

    if (update.confirmations !== undefined) {
      this.session.confirmations = update.confirmations;
    }

    if (update.txId) {
      this.session.txId = update.txId;
    }

    // Update state based on status
    switch (this.session.status) {
      case 'confirming':
        this.setState('confirming');
        break;

      case 'confirmed':
        this.setState('confirmed');
        this.config?.onConfirmed?.(this.session);
        this.cleanup();
        break;

      case 'expired':
        this.setState('expired');
        this.config?.onExpired?.(this.session);
        this.cleanup();
        break;
    }
  }

  private startTimer(): void {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(() => {
      if (!this.session) return;

      const now = Date.now();
      const expiresAt = new Date(this.session.expiresAt).getTime();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        this.handleStatusUpdate({ status: 'expired' });
        return;
      }

      // Update timer display
      const timerEl = this.shadow.querySelector('.kg-timer-value');
      if (timerEl) {
        timerEl.textContent = formatTimeRemaining(remaining);

        // Add warning class when < 2 minutes
        const timerContainer = this.shadow.querySelector('.kg-timer');
        if (remaining < 120000) {
          timerContainer?.classList.add('kg-timer-warning');
        }
      }
    }, 1000);
  }

  private startPolling(): void {
    if (this.pollInterval || !this.api || !this.session) return;

    // Poll every 3 seconds as backup for WebSocket
    this.pollInterval = setInterval(async () => {
      if (!this.session || !this.api) return;

      try {
        const status = await this.api.getSessionStatus(this.session.id);
        this.handleStatusUpdate(status);
      } catch (error) {
        console.error('[KasGate Widget] Poll error:', error);
      }
    }, 3000);
  }

  private cleanup(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private showError(message: string): void {
    const errorEl = this.shadow.querySelector('.kg-error-message');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('kg-hidden');
    }
  }

  private async handleCopyAddress(): Promise<void> {
    if (!this.session) return;

    const button = this.shadow.querySelector('.kg-copy-button');
    if (!button) return;

    const success = await copyToClipboard(this.session.address);

    if (success) {
      button.classList.add('copied');
      button.innerHTML = `${icons.check} <span>Copied!</span>`;

      setTimeout(() => {
        button.classList.remove('copied');
        button.innerHTML = `${icons.copy} <span>Copy Address</span>`;
      }, 2000);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  private render(): void {
    const theme = this.config?.theme || 'light';

    this.shadow.innerHTML = `
      <style>
        :host {
          ${getCSSVariables(theme)}
        }
        ${BASE_STYLES}
      </style>
      ${this.renderContent()}
    `;

    // Attach event listeners
    this.attachEventListeners();
  }

  private renderContent(): string {
    switch (this.state) {
      case 'idle':
        return this.renderIdle();
      case 'loading':
        return this.renderLoading();
      case 'ready':
      case 'waiting':
        return this.renderReady();
      case 'confirming':
        return this.renderConfirming();
      case 'confirmed':
        return this.renderConfirmed();
      case 'expired':
        return this.renderExpired();
      case 'error':
        return this.renderError();
      default:
        return '';
    }
  }

  private renderIdle(): string {
    return `
      <div class="kg-container">
        <div class="kg-body">
          <div class="kg-status">
            <p class="kg-status-message">Initializing payment...</p>
          </div>
        </div>
      </div>
    `;
  }

  private renderLoading(): string {
    return `
      <div class="kg-container">
        <div class="kg-body">
          <div class="kg-status">
            ${icons.spinner}
            <p class="kg-status-message" style="margin-top: 16px;">Creating payment session...</p>
          </div>
        </div>
      </div>
    `;
  }

  private renderReady(): string {
    if (!this.session) return '';

    const remaining = new Date(this.session.expiresAt).getTime() - Date.now();

    return `
      <div class="kg-container">
        <div class="kg-header">
          <div class="kg-header-title">Pay with Kaspa</div>
          <div class="kg-header-amount">${formatKasAmount(this.session.amount)} KAS</div>
        </div>

        <div class="kg-body">
          <div class="kg-error-message kg-hidden"></div>

          <div class="kg-qr-container">
            <img class="kg-qr-code" src="${this.session.qrCode}" alt="Payment QR Code" />
          </div>

          <div class="kg-address-container">
            <div class="kg-address-label">Send exactly ${formatKasAmount(this.session.amount)} KAS to:</div>
            <div class="kg-address">${this.session.address}</div>
          </div>

          <button class="kg-copy-button">
            ${icons.copy} <span>Copy Address</span>
          </button>

          <div class="kg-timer" style="margin-top: 16px;">
            ${icons.clock}
            <span>Expires in: <span class="kg-timer-value">${formatTimeRemaining(remaining)}</span></span>
          </div>
        </div>

        <div class="kg-footer">
          <div class="kg-powered-by">
            Powered by <a href="https://kaspa.org" target="_blank" rel="noopener">KasGate</a>
          </div>
        </div>
      </div>
    `;
  }

  private renderConfirming(): string {
    if (!this.session) return '';

    const progress = (this.session.confirmations / this.session.requiredConfirmations) * 100;

    return `
      <div class="kg-container">
        <div class="kg-header">
          <div class="kg-header-title">Payment Received!</div>
          <div class="kg-header-amount">${formatKasAmount(this.session.amount)} KAS</div>
        </div>

        <div class="kg-body">
          <div class="kg-status">
            ${icons.spinner}
            <p class="kg-status-title" style="margin-top: 16px;">Confirming Payment</p>
            <p class="kg-status-message">
              ${this.session.confirmations} of ${this.session.requiredConfirmations} confirmations
            </p>
          </div>

          <div class="kg-progress">
            <div class="kg-progress-bar" style="width: ${progress}%"></div>
          </div>

          ${this.session.txId ? `
            <a href="${this.session.explorerUrl}" target="_blank" rel="noopener" class="kg-button kg-button-secondary" style="margin-top: 16px;">
              ${icons.externalLink} View Transaction
            </a>
          ` : ''}
        </div>

        <div class="kg-footer">
          <div class="kg-powered-by">
            Powered by <a href="https://kaspa.org" target="_blank" rel="noopener">KasGate</a>
          </div>
        </div>
      </div>
    `;
  }

  private renderConfirmed(): string {
    if (!this.session) return '';

    return `
      <div class="kg-container">
        <div class="kg-header" style="border-bottom: none;">
          <div class="kg-header-title" style="color: var(--kg-success);">Payment Complete!</div>
        </div>

        <div class="kg-body">
          <div class="kg-status">
            ${icons.checkCircle}
            <p class="kg-status-title" style="margin-top: 16px;">Thank You!</p>
            <p class="kg-status-message">
              Your payment of ${formatKasAmount(this.session.amount)} KAS has been confirmed.
            </p>
          </div>

          ${this.session.txId ? `
            <a href="${this.session.explorerUrl}" target="_blank" rel="noopener" class="kg-button kg-button-secondary" style="margin-top: 16px;">
              ${icons.externalLink} View Transaction
            </a>
          ` : ''}
        </div>

        <div class="kg-footer">
          <div class="kg-powered-by">
            Powered by <a href="https://kaspa.org" target="_blank" rel="noopener">KasGate</a>
          </div>
        </div>
      </div>
    `;
  }

  private renderExpired(): string {
    return `
      <div class="kg-container">
        <div class="kg-header" style="border-bottom: none;">
          <div class="kg-header-title" style="color: var(--kg-warning);">Session Expired</div>
        </div>

        <div class="kg-body">
          <div class="kg-status">
            <div style="font-size: 48px; color: var(--kg-warning);">${icons.warning}</div>
            <p class="kg-status-title" style="margin-top: 16px;">Payment Not Received</p>
            <p class="kg-status-message">
              This payment session has expired. Please start a new payment.
            </p>
          </div>

          <button class="kg-button kg-retry-button" style="margin-top: 16px;">
            Try Again
          </button>
        </div>

        <div class="kg-footer">
          <div class="kg-powered-by">
            Powered by <a href="https://kaspa.org" target="_blank" rel="noopener">KasGate</a>
          </div>
        </div>
      </div>
    `;
  }

  private renderError(): string {
    return `
      <div class="kg-container">
        <div class="kg-header" style="border-bottom: none;">
          <div class="kg-header-title" style="color: var(--kg-error);">Error</div>
        </div>

        <div class="kg-body">
          <div class="kg-status">
            <div style="font-size: 48px; color: var(--kg-error);">${icons.error}</div>
            <p class="kg-status-title" style="margin-top: 16px;">Something Went Wrong</p>
            <p class="kg-status-message kg-error-message">
              An error occurred while processing your payment.
            </p>
          </div>

          <button class="kg-button kg-retry-button" style="margin-top: 16px;">
            Try Again
          </button>
        </div>

        <div class="kg-footer">
          <div class="kg-powered-by">
            Powered by <a href="https://kaspa.org" target="_blank" rel="noopener">KasGate</a>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Copy button
    const copyButton = this.shadow.querySelector('.kg-copy-button');
    copyButton?.addEventListener('click', () => this.handleCopyAddress());

    // Retry button
    const retryButton = this.shadow.querySelector('.kg-retry-button');
    retryButton?.addEventListener('click', () => {
      this.reset();
      this.start();
    });
  }
}

// Register the custom element
if (!customElements.get('kas-gate')) {
  customElements.define('kas-gate', KasGateElement);
}
