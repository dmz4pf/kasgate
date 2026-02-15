/**
 * Widget Base Styles — Luxe Navy/Teal Design
 */

export const BASE_STYLES = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :host {
    display: block;
    font-family: var(--kg-font-family);
    font-size: var(--kg-font-size-base);
    color: var(--kg-text);
    line-height: 1.5;
  }

  /* ============ Container ============ */

  .kg-container {
    background: var(--kg-bg);
    border: 1px solid var(--kg-glass-border);
    border-radius: var(--kg-radius-xl);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(73, 234, 203, 0.04) inset;
    overflow: hidden;
    width: 100%;
    max-width: 400px;
  }

  /* ============ Top Bar (back + nav) ============ */

  .kg-topbar {
    display: flex;
    align-items: center;
    padding: 14px 20px 0;
  }

  .kg-back-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--kg-bg-secondary);
    border: 1px solid var(--kg-border);
    border-radius: 8px;
    color: var(--kg-text-secondary);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.01em;
  }

  .kg-back-button:hover {
    color: var(--kg-text);
    border-color: var(--kg-primary);
    background: var(--kg-bg-tertiary);
  }

  .kg-back-arrow {
    font-size: 14px;
    line-height: 1;
  }

  /* ============ Header ============ */

  .kg-header {
    padding: 20px 24px 16px;
    text-align: center;
    border-bottom: 1px solid var(--kg-border);
  }

  .kg-header-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--kg-text-secondary);
    margin-bottom: 4px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .kg-header-amount {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, var(--kg-primary), var(--kg-purple));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ============ Body ============ */

  .kg-body {
    padding: 20px 24px 24px;
  }

  /* ============ Method Selection ============ */

  .kg-method-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 8px 24px 20px;
  }

  .kg-method-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--kg-bg-secondary);
    border: 1px solid var(--kg-border);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    font-family: inherit;
    color: inherit;
    position: relative;
    overflow: hidden;
  }

  .kg-method-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(73,234,203,0.03), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .kg-method-card:hover {
    border-color: var(--kg-primary);
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(73, 234, 203, 0.08);
  }

  .kg-method-card:hover::before {
    opacity: 1;
  }

  .kg-method-card.kg-disabled {
    opacity: 0.35;
    cursor: not-allowed;
    pointer-events: none;
  }

  .kg-method-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .kg-method-icon svg {
    width: 20px;
    height: 20px;
  }

  .kg-method-icon-address {
    background: linear-gradient(135deg, rgba(73,234,203,0.15), rgba(73,234,203,0.05));
    color: var(--kg-primary);
  }

  .kg-method-icon-qr {
    background: linear-gradient(135deg, rgba(167,139,250,0.15), rgba(167,139,250,0.05));
    color: var(--kg-purple);
  }

  .kg-method-icon-wallet {
    background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05));
    color: var(--kg-gold);
  }

  .kg-method-info {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }

  .kg-method-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--kg-text);
    margin-bottom: 1px;
  }

  .kg-method-desc {
    font-size: 12px;
    color: var(--kg-text-secondary);
  }

  .kg-method-arrow {
    color: var(--kg-text-muted);
    font-size: 16px;
    flex-shrink: 0;
    transition: transform 0.2s, color 0.2s;
    position: relative;
    z-index: 1;
  }

  .kg-method-card:hover .kg-method-arrow {
    transform: translateX(2px);
    color: var(--kg-primary);
  }

  /* ============ Section Card (reusable inner panel) ============ */

  .kg-section {
    background: var(--kg-bg-secondary);
    border: 1px solid var(--kg-border);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .kg-section-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--kg-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 8px;
  }

  /* ============ Address ============ */

  .kg-address-container {
    background: var(--kg-bg-secondary);
    border: 1px solid var(--kg-border);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .kg-address-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--kg-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 10px;
  }

  .kg-address {
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 13px;
    word-break: break-all;
    color: var(--kg-text);
    line-height: 1.6;
    padding: 10px 12px;
    background: var(--kg-bg-tertiary);
    border-radius: 8px;
    border: 1px solid var(--kg-border);
  }

  /* ============ Copy Button ============ */

  .kg-copy-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(73,234,203,0.1), rgba(73,234,203,0.05));
    border: 1px solid rgba(73,234,203,0.2);
    border-radius: 10px;
    color: var(--kg-primary);
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 12px;
  }

  .kg-copy-button:hover {
    background: linear-gradient(135deg, rgba(73,234,203,0.15), rgba(73,234,203,0.08));
    border-color: rgba(73,234,203,0.4);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(73, 234, 203, 0.1);
  }

  .kg-copy-button.copied {
    background: var(--kg-success);
    color: white;
    border-color: var(--kg-success);
  }

  /* ============ QR Code ============ */

  .kg-qr-container {
    display: flex;
    justify-content: center;
    padding: 20px;
    background: white;
    border-radius: 12px;
    margin-bottom: 12px;
  }

  .kg-qr-code {
    width: 200px;
    height: 200px;
    border-radius: 4px;
  }

  .kg-qr-disabled {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px 16px;
    text-align: center;
  }

  .kg-qr-placeholder {
    opacity: 0.2;
  }

  .kg-qr-placeholder svg {
    width: 48px;
    height: 48px;
  }

  /* ============ Status ============ */

  .kg-status {
    text-align: center;
    padding: var(--kg-spacing-md);
  }

  .kg-status-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto var(--kg-spacing-md);
  }

  .kg-status-title {
    font-size: var(--kg-font-size-lg);
    font-weight: 600;
    margin-bottom: var(--kg-spacing-xs);
  }

  .kg-status-message {
    font-size: var(--kg-font-size-sm);
    color: var(--kg-text-secondary);
  }

  /* ============ Progress Bar ============ */

  .kg-progress {
    height: 6px;
    background: var(--kg-bg-tertiary);
    border-radius: 3px;
    overflow: hidden;
    margin: var(--kg-spacing-md) 0;
  }

  .kg-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--kg-primary), var(--kg-purple));
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  /* ============ Timer ============ */

  .kg-timer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--kg-bg-secondary);
    border: 1px solid var(--kg-border);
    border-radius: 10px;
    font-size: 13px;
    color: var(--kg-text-muted);
  }

  .kg-timer svg {
    width: 14px;
    height: 14px;
    opacity: 0.6;
  }

  .kg-timer-warning {
    color: var(--kg-gold);
    border-color: rgba(251, 191, 36, 0.2);
    background: rgba(251, 191, 36, 0.05);
  }

  .kg-timer-warning svg {
    opacity: 1;
  }

  /* ============ Footer ============ */

  .kg-footer {
    padding: 12px 24px;
    border-top: 1px solid var(--kg-border);
    text-align: center;
  }

  .kg-powered-by {
    font-size: 11px;
    color: var(--kg-text-muted);
    letter-spacing: 0.02em;
  }

  .kg-powered-by a {
    color: var(--kg-primary);
    text-decoration: none;
    font-weight: 500;
  }

  /* ============ Buttons ============ */

  .kg-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--kg-primary);
    color: #0f1419;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    text-decoration: none;
  }

  .kg-button:hover {
    background: var(--kg-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(73, 234, 203, 0.2);
  }

  .kg-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .kg-button-secondary {
    background: transparent;
    border: 1px solid var(--kg-border);
    color: var(--kg-text);
  }

  .kg-button-secondary:hover {
    background: var(--kg-bg-secondary);
    border-color: var(--kg-primary);
    box-shadow: none;
  }

  /* ============ Kasware / Wallet Button ============ */

  .kg-kasware-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #49EACB, #a78bfa);
    border: none;
    border-radius: 10px;
    color: #0f1419;
    font-size: 15px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: -0.01em;
  }

  .kg-kasware-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(73, 234, 203, 0.25);
  }

  .kg-kasware-button:active {
    transform: translateY(0);
  }

  .kg-kasware-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  /* ============ Wallet Notice ============ */

  .kg-wallet-notice {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px 16px;
    text-align: center;
  }

  .kg-wallet-notice p {
    color: var(--kg-text-secondary);
    font-size: 14px;
  }

  .kg-wallet-connected {
    text-align: center;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--kg-text-secondary);
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  /* ============ Utility ============ */

  .kg-text-secondary {
    color: var(--kg-text-secondary);
    font-size: 13px;
    text-align: center;
    margin-top: 8px;
  }

  .kg-text-muted {
    color: var(--kg-text-muted);
    font-size: 12px;
  }

  .kg-hidden {
    display: none !important;
  }

  /* ============ Divider ============ */

  .kg-divider {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 16px 0;
    color: var(--kg-text-muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .kg-divider::before,
  .kg-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--kg-border);
  }

  /* ============ Error ============ */

  .kg-error-message {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    padding: 12px 16px;
    color: var(--kg-error);
    font-size: 13px;
    margin-bottom: 12px;
  }

  /* ============ Testnet Notice ============ */

  .kg-testnet-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(251, 191, 36, 0.06);
    border: 1px solid rgba(251, 191, 36, 0.15);
    border-radius: 10px;
    color: var(--kg-gold);
    font-size: 13px;
    margin-bottom: 12px;
  }

  .kg-testnet-notice span {
    font-weight: 600;
  }

  /* ============ Spinner ============ */

  .kg-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--kg-bg-tertiary);
    border-top-color: var(--kg-primary);
    border-radius: 50%;
    animation: kg-spin 1s linear infinite;
    margin: 0 auto;
  }

  @keyframes kg-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes kg-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .kg-pulse {
    animation: kg-pulse 2s ease-in-out infinite;
  }

  /* ============ Checkmark Animation ============ */

  .kg-checkmark {
    width: 64px;
    height: 64px;
    margin: 0 auto;
  }

  .kg-checkmark-circle {
    fill: none;
    stroke: var(--kg-success);
    stroke-width: 4;
    stroke-dasharray: 166;
    stroke-dashoffset: 166;
    animation: kg-stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
  }

  .kg-checkmark-check {
    fill: none;
    stroke: var(--kg-success);
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    animation: kg-stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.4s forwards;
  }

  @keyframes kg-stroke {
    to { stroke-dashoffset: 0; }
  }
`;
