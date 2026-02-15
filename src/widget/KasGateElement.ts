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
import { isKaswareInstalled, connectKasware, sendWithKasware } from './integrations/kasware.js';

// ============================================================
// TYPES
// ============================================================

export type WidgetState = 'idle' | 'loading' | 'ready' | 'waiting' | 'confirming' | 'confirmed' | 'expired' | 'error';
type PaymentMethod = 'select' | 'address' | 'qrcode' | 'wallet';

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
  private paymentMethod: PaymentMethod = 'select';
  private walletAddress: string = '';
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

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

  init(config: KasGateConfig): void {
    this.config = config;
    this.render();
    this.start();
  }

  getSession(): SessionResponse | null {
    return this.session;
  }

  getState(): WidgetState {
    return this.state;
  }

  reset(): void {
    this.cleanup();
    this.session = null;
    this.paymentMethod = 'select';
    this.walletAddress = '';
    this.setState('idle');
  }

  // ============================================================
  // PRIVATE — INIT & SESSION
  // ============================================================

  private initFromAttributes(): void {
    const merchantId = this.getAttribute('merchant-id') || '';
    const amount = this.getAttribute('amount') || '';
    const serverUrl = this.getAttribute('server-url') || window.location.origin;
    const apiKey = this.getAttribute('api-key') || '';
    const orderId = this.getAttribute('order-id') || undefined;
    const theme = (this.getAttribute('theme') as 'light' | 'dark') || 'light';

    this.config = { merchantId, amount, serverUrl, apiKey, orderId, theme };
  }

  private async start(): Promise<void> {
    if (!this.config?.merchantId || !this.config?.amount || !this.config?.apiKey) {
      this.setState('error');
      this.showError('Missing required configuration');
      return;
    }

    this.setState('loading');

    try {
      this.api = new ApiClient(this.config.serverUrl || '', this.config.apiKey);

      this.session = await this.api.createSession({
        amount: this.config.amount,
        orderId: this.config.orderId,
        metadata: this.config.metadata,
      });

      this.socket = new SocketClient(this.config.serverUrl || '');
      this.socket.setHandlers({
        onUpdate: (update) => this.handleStatusUpdate(update),
        onConnect: () => console.log('[KasGate Widget] Socket connected'),
        onDisconnect: () => console.log('[KasGate Widget] Socket disconnected'),
        onError: (error) => console.error('[KasGate Widget] Socket error:', error),
      });
      this.socket.connect();
      this.socket.subscribe(this.session.id);

      this.startTimer();
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
    this.dispatchEvent(new CustomEvent('statechange', {
      detail: { state, session: this.session },
    }));
  }

  private get isTestnet(): boolean {
    return this.session?.address?.startsWith('kaspatest:') ?? false;
  }

  // ============================================================
  // PRIVATE — STATUS & TIMERS
  // ============================================================

  private handleStatusUpdate(update: any): void {
    if (!this.session) return;

    if (update.status) this.session.status = update.status;
    if (update.confirmations !== undefined) this.session.confirmations = update.confirmations;
    if (update.requiredConfirmations !== undefined) this.session.requiredConfirmations = update.requiredConfirmations;
    if (update.txId) this.session.txId = update.txId;

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

      const remaining = new Date(this.session.expiresAt).getTime() - Date.now();

      if (remaining <= 0) {
        this.handleStatusUpdate({ status: 'expired' });
        return;
      }

      const timerEl = this.shadow.querySelector('.kg-timer-value');
      if (timerEl) {
        timerEl.textContent = formatTimeRemaining(remaining);
        const timerContainer = this.shadow.querySelector('.kg-timer');
        if (remaining < 120000) {
          timerContainer?.classList.add('kg-timer-warning');
        }
      }
    }, 1000);
  }

  private startPolling(): void {
    if (this.pollInterval || !this.api || !this.session) return;

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
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
  }

  private showError(message: string): void {
    const errorEl = this.shadow.querySelector('.kg-error-message');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('kg-hidden');
    }
  }

  // ============================================================
  // PRIVATE — USER ACTIONS
  // ============================================================

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

  private async handleConnectWallet(): Promise<void> {
    const button = this.shadow.querySelector('.kg-kasware-button') as HTMLButtonElement;
    if (!button) return;

    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `${icons.spinner} Connecting...`;

    try {
      const address = await connectKasware();
      if (address) {
        this.walletAddress = address;
        this.render();
      } else {
        button.disabled = false;
        button.innerHTML = originalText;
      }
    } catch (error) {
      console.error('[KasGate Widget] Wallet connect failed:', error);
      button.disabled = false;
      button.innerHTML = originalText;
      this.showError((error as Error).message || 'Failed to connect wallet');
    }
  }

  private async handleSendPayment(): Promise<void> {
    if (!this.session) return;

    const button = this.shadow.querySelector('.kg-kasware-button') as HTMLButtonElement;
    if (!button) return;

    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `${icons.spinner} Sending...`;

    try {
      const amountSompi = BigInt(this.session.amountSompi);
      const txId = await sendWithKasware(this.session.address, amountSompi);

      if (txId) {
        button.innerHTML = `${icons.check} Transaction Sent!`;
      } else {
        button.disabled = false;
        button.innerHTML = originalText;
      }
    } catch (error) {
      console.error('[KasGate Widget] Kasware payment failed:', error);
      button.disabled = false;
      button.innerHTML = originalText;
      this.showError((error as Error).message || 'Payment failed');
    }
  }

  // ============================================================
  // RENDER — MAIN
  // ============================================================

  private render(): void {
    const theme = this.config?.theme || 'light';

    this.shadow.innerHTML = `
      <style>
        :host { ${getCSSVariables(theme)} }
        ${BASE_STYLES}
      </style>
      ${this.renderContent()}
    `;

    this.attachEventListeners();
  }

  private renderContent(): string {
    switch (this.state) {
      case 'idle':       return this.renderIdle();
      case 'loading':    return this.renderLoading();
      case 'ready':
      case 'waiting':    return this.renderReadyOrWaiting();
      case 'confirming': return this.renderConfirming();
      case 'confirmed':  return this.renderConfirmed();
      case 'expired':    return this.renderExpired();
      case 'error':      return this.renderError();
      default:           return '';
    }
  }

  // ============================================================
  // RENDER — STATES
  // ============================================================

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
            <p class="kg-status-message" >Creating payment session...</p>
          </div>
        </div>
      </div>
    `;
  }

  private renderReadyOrWaiting(): string {
    if (!this.session) return '';

    switch (this.paymentMethod) {
      case 'select':  return this.renderMethodSelection();
      case 'address': return this.renderAddressView();
      case 'qrcode':  return this.renderQRView();
      case 'wallet':  return this.renderWalletView();
      default:        return this.renderMethodSelection();
    }
  }

  // ---- Method Selection ----

  private renderMethodSelection(): string {
    if (!this.session) return '';

    const remaining = new Date(this.session.expiresAt).getTime() - Date.now();
    const hasKasware = isKaswareInstalled();

    return `
      <div class="kg-container">
        <div class="kg-header">
          <div class="kg-header-title">Pay with Kaspa</div>
          <div class="kg-header-amount">${formatKasAmount(this.session.amountSompi)} KAS</div>
        </div>

        <div class="kg-method-grid">
          <button class="kg-method-card" data-method="address">
            <div class="kg-method-icon kg-method-icon-address">${icons.copy}</div>
            <div class="kg-method-info">
              <div class="kg-method-title">Wallet Address</div>
              <div class="kg-method-desc">Copy address and send manually</div>
            </div>
            <div class="kg-method-arrow">\u203A</div>
          </button>

          <button class="kg-method-card${this.isTestnet ? ' kg-disabled' : ''}" data-method="qrcode">
            <div class="kg-method-icon kg-method-icon-qr">${icons.qrcode}</div>
            <div class="kg-method-info">
              <div class="kg-method-title">Scan QR Code</div>
              <div class="kg-method-desc">${this.isTestnet ? 'Available on mainnet' : 'Scan with mobile wallet'}</div>
            </div>
            <div class="kg-method-arrow">\u203A</div>
          </button>

          <button class="kg-method-card" data-method="wallet">
            <div class="kg-method-icon kg-method-icon-wallet">${icons.wallet}</div>
            <div class="kg-method-info">
              <div class="kg-method-title">Connect Wallet</div>
              <div class="kg-method-desc">${hasKasware ? 'Pay with Kasware' : 'Browser wallet required'}</div>
            </div>
            <div class="kg-method-arrow">\u203A</div>
          </button>
        </div>

        <div style="padding: 0 24px 24px;">
          <div class="kg-timer">
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

  // ---- Address View ----

  private renderAddressView(): string {
    if (!this.session) return '';
    const remaining = new Date(this.session.expiresAt).getTime() - Date.now();
    const amount = formatKasAmount(this.session.amountSompi);

    return `
      <div class="kg-container">
        <div class="kg-topbar">
          <button class="kg-back-button" data-action="back">
            <span class="kg-back-arrow">\u2190</span> Back
          </button>
        </div>

        <div class="kg-header">
          <div class="kg-header-title">Send to Address</div>
          <div class="kg-header-amount">${amount} KAS</div>
        </div>

        <div class="kg-body">
          <div class="kg-error-message kg-hidden"></div>

          <div class="kg-address-container">
            <div class="kg-address-label">Destination Address</div>
            <div class="kg-address">${this.session.address}</div>
          </div>

          <button class="kg-copy-button">
            ${icons.copy} <span>Copy Address</span>
          </button>

          ${this.isTestnet ? `
            <div class="kg-testnet-notice">
              <span>Testnet</span> — Use Kaspa-NG or Kasware to send
            </div>
          ` : ''}

          <div class="kg-timer">
            ${icons.clock}
            <span>Expires in: <span class="kg-timer-value">${formatTimeRemaining(remaining)}</span></span>
          </div>
        </div>

        <div class="kg-footer">
          <div class="kg-powered-by">Powered by <a href="https://kaspa.org" target="_blank" rel="noopener">KasGate</a></div>
        </div>
      </div>
    `;
  }

  // ---- QR View ----

  private renderQRView(): string {
    if (!this.session) return '';
    const remaining = new Date(this.session.expiresAt).getTime() - Date.now();
    const amount = formatKasAmount(this.session.amountSompi);

    return `
      <div class="kg-container">
        <div class="kg-topbar">
          <button class="kg-back-button" data-action="back">
            <span class="kg-back-arrow">\u2190</span> Back
          </button>
        </div>

        <div class="kg-header">
          <div class="kg-header-title">Scan to Pay</div>
          <div class="kg-header-amount">${amount} KAS</div>
        </div>

        <div class="kg-body">
          ${this.isTestnet ? `
            <div class="kg-qr-disabled">
              <div class="kg-qr-placeholder">${icons.qrcode}</div>
              <p class="kg-text-secondary" style="margin-top: 0;">QR payment is available on mainnet only</p>
              <p class="kg-text-muted">Use Wallet Address or Connect Wallet instead</p>
            </div>
          ` : `
            <div class="kg-qr-container">
              <img class="kg-qr-code" src="${this.session.qrCode}" alt="Payment QR Code" />
            </div>
            <p class="kg-text-secondary">Scan with any Kaspa mobile wallet</p>
          `}

          <div class="kg-timer">
            ${icons.clock}
            <span>Expires in: <span class="kg-timer-value">${formatTimeRemaining(remaining)}</span></span>
          </div>
        </div>

        <div class="kg-footer">
          <div class="kg-powered-by">Powered by <a href="https://kaspa.org" target="_blank" rel="noopener">KasGate</a></div>
        </div>
      </div>
    `;
  }

  // ---- Wallet View ----

  private renderWalletView(): string {
    if (!this.session) return '';
    const remaining = new Date(this.session.expiresAt).getTime() - Date.now();
    const hasKasware = isKaswareInstalled();
    const amount = formatKasAmount(this.session.amountSompi);

    let walletContent: string;

    if (!hasKasware) {
      walletContent = `
        <div class="kg-wallet-notice">
          <p>No browser wallet detected</p>
          <a href="https://kasware.xyz" target="_blank" rel="noopener" class="kg-button">
            Install Kasware ${icons.externalLink}
          </a>
        </div>
      `;
    } else if (!this.walletAddress) {
      walletContent = `
        <div style="text-align: center;">
          <button class="kg-kasware-button" data-action="connect-wallet">
            ${icons.wallet} Connect Kasware
          </button>
          <p class="kg-text-secondary">Approve the connection in your wallet</p>
        </div>
      `;
    } else {
      walletContent = `
        <div style="text-align: center;">
          <p class="kg-wallet-connected">Connected: ${this.walletAddress.slice(0, 12)}...${this.walletAddress.slice(-8)}</p>
          <button class="kg-kasware-button" data-action="send-payment">
            Send ${amount} KAS
          </button>
        </div>
      `;
    }

    return `
      <div class="kg-container">
        <div class="kg-topbar">
          <button class="kg-back-button" data-action="back">
            <span class="kg-back-arrow">\u2190</span> Back
          </button>
        </div>

        <div class="kg-header">
          <div class="kg-header-title">Connect Wallet</div>
          <div class="kg-header-amount">${amount} KAS</div>
        </div>

        <div class="kg-body">
          <div class="kg-error-message kg-hidden"></div>
          ${walletContent}

          <div class="kg-timer">
            ${icons.clock}
            <span>Expires in: <span class="kg-timer-value">${formatTimeRemaining(remaining)}</span></span>
          </div>
        </div>

        <div class="kg-footer">
          <div class="kg-powered-by">Powered by <a href="https://kaspa.org" target="_blank" rel="noopener">KasGate</a></div>
        </div>
      </div>
    `;
  }

  // ---- Confirming / Confirmed / Expired / Error ----

  private renderConfirming(): string {
    if (!this.session) return '';
    const confirmations = this.session.confirmations || 0;
    const required = this.session.requiredConfirmations || 10;
    const progress = (confirmations / required) * 100;

    return `
      <div class="kg-container">
        <div class="kg-header">
          <div class="kg-header-title">Payment Received!</div>
          <div class="kg-header-amount">${formatKasAmount(this.session.amountSompi)} KAS</div>
        </div>

        <div class="kg-body">
          <div class="kg-status">
            ${icons.spinner}
            <p class="kg-status-title" >Confirming Payment</p>
            <p class="kg-status-message">
              ${confirmations} of ${required} confirmations
            </p>
          </div>

          <div class="kg-progress">
            <div class="kg-progress-bar" style="width: ${progress}%"></div>
          </div>

          ${this.session.txId ? `
            <a href="${this.session.explorerUrl}" target="_blank" rel="noopener" class="kg-button kg-button-secondary" >
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
            <p class="kg-status-title" >Thank You!</p>
            <p class="kg-status-message">
              Your payment of ${formatKasAmount(this.session.amountSompi)} KAS has been confirmed.
            </p>
          </div>

          ${this.session.txId ? `
            <a href="${this.session.explorerUrl}" target="_blank" rel="noopener" class="kg-button kg-button-secondary" >
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
          <div class="kg-header-title" style="color: var(--kg-gold);">Session Expired</div>
        </div>

        <div class="kg-body">
          <div class="kg-status">
            <div style="font-size: 48px; color: var(--kg-gold);">${icons.warning}</div>
            <p class="kg-status-title" >Payment Not Received</p>
            <p class="kg-status-message">
              This payment session has expired. Please start a new payment.
            </p>
          </div>

          <button class="kg-button kg-retry-button" >
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
            <p class="kg-status-title" >Something Went Wrong</p>
            <p class="kg-status-message kg-error-message">
              An error occurred while processing your payment.
            </p>
          </div>

          <button class="kg-button kg-retry-button" >
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

  // ============================================================
  // EVENT LISTENERS
  // ============================================================

  private attachEventListeners(): void {
    // Method selection cards
    this.shadow.querySelectorAll('[data-method]').forEach((card) => {
      card.addEventListener('click', () => {
        const method = card.getAttribute('data-method') as PaymentMethod;
        if (method) {
          this.paymentMethod = method;
          this.render();
        }
      });
    });

    // Back button
    this.shadow.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.paymentMethod = 'select';
      this.walletAddress = '';
      this.render();
    });

    // Copy button
    this.shadow.querySelector('.kg-copy-button')?.addEventListener('click', () => {
      this.handleCopyAddress();
    });

    // Connect wallet
    this.shadow.querySelector('[data-action="connect-wallet"]')?.addEventListener('click', () => {
      this.handleConnectWallet();
    });

    // Send payment
    this.shadow.querySelector('[data-action="send-payment"]')?.addEventListener('click', () => {
      this.handleSendPayment();
    });

    // Retry button
    this.shadow.querySelector('.kg-retry-button')?.addEventListener('click', () => {
      this.reset();
      this.start();
    });
  }
}

// Register the custom element
if (!customElements.get('kas-gate')) {
  customElements.define('kas-gate', KasGateElement);
}
