/**
 * Widget Base Styles
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

  .kg-container {
    background: var(--kg-bg);
    border-radius: var(--kg-radius-lg);
    box-shadow: 0 4px 24px var(--kg-shadow);
    overflow: hidden;
    width: 100%;
    max-width: 400px;
  }

  .kg-header {
    padding: var(--kg-spacing-lg);
    border-bottom: 1px solid var(--kg-border);
    text-align: center;
  }

  .kg-header-title {
    font-size: var(--kg-font-size-lg);
    font-weight: 600;
    color: var(--kg-text);
    margin-bottom: var(--kg-spacing-xs);
  }

  .kg-header-amount {
    font-size: var(--kg-font-size-xxl);
    font-weight: 700;
    color: var(--kg-primary);
  }

  .kg-body {
    padding: var(--kg-spacing-lg);
  }

  .kg-qr-container {
    display: flex;
    justify-content: center;
    padding: var(--kg-spacing-md);
    background: var(--kg-bg-secondary);
    border-radius: var(--kg-radius);
    margin-bottom: var(--kg-spacing-md);
  }

  .kg-qr-code {
    width: 200px;
    height: 200px;
  }

  .kg-address-container {
    background: var(--kg-bg-secondary);
    border-radius: var(--kg-radius);
    padding: var(--kg-spacing-md);
    margin-bottom: var(--kg-spacing-md);
  }

  .kg-address-label {
    font-size: var(--kg-font-size-sm);
    color: var(--kg-text-secondary);
    margin-bottom: var(--kg-spacing-xs);
  }

  .kg-address {
    font-family: monospace;
    font-size: var(--kg-font-size-sm);
    word-break: break-all;
    color: var(--kg-text);
  }

  .kg-copy-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--kg-spacing-sm);
    width: 100%;
    padding: var(--kg-spacing-md);
    background: var(--kg-bg-tertiary);
    border: 1px solid var(--kg-border);
    border-radius: var(--kg-radius);
    color: var(--kg-text);
    font-size: var(--kg-font-size-base);
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .kg-copy-button:hover {
    background: var(--kg-bg-secondary);
    border-color: var(--kg-border-focus);
  }

  .kg-copy-button.copied {
    background: var(--kg-success);
    color: white;
    border-color: var(--kg-success);
  }

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

  .kg-progress {
    height: 8px;
    background: var(--kg-bg-tertiary);
    border-radius: var(--kg-radius);
    overflow: hidden;
    margin: var(--kg-spacing-md) 0;
  }

  .kg-progress-bar {
    height: 100%;
    background: var(--kg-primary);
    border-radius: var(--kg-radius);
    transition: width 0.3s ease;
  }

  .kg-timer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--kg-spacing-sm);
    padding: var(--kg-spacing-sm);
    background: var(--kg-bg-secondary);
    border-radius: var(--kg-radius);
    font-size: var(--kg-font-size-sm);
    color: var(--kg-text-secondary);
  }

  .kg-timer-warning {
    color: var(--kg-warning);
  }

  .kg-footer {
    padding: var(--kg-spacing-md) var(--kg-spacing-lg);
    border-top: 1px solid var(--kg-border);
    text-align: center;
  }

  .kg-powered-by {
    font-size: var(--kg-font-size-xs);
    color: var(--kg-text-muted);
  }

  .kg-powered-by a {
    color: var(--kg-primary);
    text-decoration: none;
  }

  .kg-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--kg-spacing-sm);
    padding: var(--kg-spacing-md) var(--kg-spacing-lg);
    background: var(--kg-primary);
    color: white;
    border: none;
    border-radius: var(--kg-radius);
    font-size: var(--kg-font-size-base);
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    width: 100%;
  }

  .kg-button:hover {
    background: var(--kg-primary-hover);
  }

  .kg-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .kg-button-secondary {
    background: transparent;
    border: 2px solid var(--kg-border);
    color: var(--kg-text);
  }

  .kg-button-secondary:hover {
    background: var(--kg-bg-secondary);
    border-color: var(--kg-primary);
  }

  .kg-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--kg-bg-tertiary);
    border-top-color: var(--kg-primary);
    border-radius: 50%;
    animation: kg-spin 1s linear infinite;
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

  .kg-hidden {
    display: none !important;
  }

  .kg-error-message {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--kg-error);
    border-radius: var(--kg-radius);
    padding: var(--kg-spacing-md);
    color: var(--kg-error);
    font-size: var(--kg-font-size-sm);
    margin-bottom: var(--kg-spacing-md);
  }

  .kg-tabs {
    display: flex;
    border-bottom: 1px solid var(--kg-border);
    margin-bottom: var(--kg-spacing-md);
  }

  .kg-tab {
    flex: 1;
    padding: var(--kg-spacing-sm) var(--kg-spacing-md);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--kg-text-secondary);
    font-size: var(--kg-font-size-sm);
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  }

  .kg-tab:hover {
    color: var(--kg-text);
  }

  .kg-tab.active {
    color: var(--kg-primary);
    border-bottom-color: var(--kg-primary);
  }

  .kg-tab-panel {
    display: none;
  }

  .kg-tab-panel.active {
    display: block;
  }

  /* Payment Methods */
  .kg-payment-method {
    margin-bottom: var(--kg-spacing-md);
  }

  .kg-kasware-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--kg-spacing-sm);
    width: 100%;
    padding: var(--kg-spacing-md);
    background: linear-gradient(135deg, #49EACB 0%, #36b89f 100%);
    border: none;
    border-radius: var(--kg-radius);
    color: #0A0F14;
    font-size: var(--kg-font-size-base);
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .kg-kasware-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(73, 234, 203, 0.3);
  }

  .kg-kasware-button:active {
    transform: translateY(0);
  }

  .kg-kasware-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .kg-divider {
    display: flex;
    align-items: center;
    gap: var(--kg-spacing-md);
    margin: var(--kg-spacing-md) 0;
    color: var(--kg-text-secondary);
    font-size: var(--kg-font-size-sm);
  }

  .kg-divider::before,
  .kg-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--kg-border);
  }

  .kg-testnet-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--kg-spacing-sm);
    padding: var(--kg-spacing-sm) var(--kg-spacing-md);
    background: rgba(234, 179, 8, 0.1);
    border: 1px solid rgba(234, 179, 8, 0.3);
    border-radius: var(--kg-radius);
    color: #eab308;
    font-size: var(--kg-font-size-sm);
    margin-top: var(--kg-spacing-md);
  }

  .kg-testnet-notice span {
    font-weight: 600;
  }
`;
