/**
 * KasGate Widget Entry Point
 *
 * This is the main entry point for the embeddable payment widget.
 * It exports all public APIs and registers the web component.
 */

// Import and register the web component
import { KasGateElement, KasGateConfig } from './KasGateElement.js';
import { KaswareIntegration, isKaswareInstalled } from './integrations/kasware.js';
import { sompiToKas, kasToSompi } from './utils/units.js';

// Ensure component is registered
if (typeof window !== 'undefined' && typeof customElements !== 'undefined' && !customElements.get('kas-gate')) {
  customElements.define('kas-gate', KasGateElement);
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Create a new payment widget programmatically
 */
export function createPayment(
  container: HTMLElement | string,
  config: KasGateConfig
): KasGateElement {
  const element = document.createElement('kas-gate') as KasGateElement;

  // Set attributes from config
  if (config.merchantId) {
    element.setAttribute('merchant-id', config.merchantId);
  }
  if (config.amount) {
    element.setAttribute('amount', config.amount);
  }
  if (config.serverUrl) {
    element.setAttribute('server-url', config.serverUrl);
  }
  if (config.apiKey) {
    element.setAttribute('api-key', config.apiKey);
  }
  if (config.orderId) {
    element.setAttribute('order-id', config.orderId);
  }
  if (config.theme) {
    element.setAttribute('theme', config.theme);
  }

  // Initialize with full config (includes callbacks)
  element.init(config);

  // Append to container
  const containerEl = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!containerEl) {
    throw new Error(`Container not found: ${container}`);
  }

  containerEl.appendChild(element);

  return element;
}

/**
 * Open payment in a modal
 */
export function openModal(config: KasGateConfig): {
  element: KasGateElement;
  close: () => void;
} {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: kasgate-fade-in 0.2s ease;
  `;

  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes kasgate-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes kasgate-slide-up {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Create modal content wrapper
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    animation: kasgate-slide-up 0.3s ease;
  `;

  // Create close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    position: absolute;
    top: -40px;
    right: 0;
    background: none;
    border: none;
    color: white;
    font-size: 32px;
    cursor: pointer;
    padding: 8px;
    line-height: 1;
  `;

  // Create payment element
  const element = document.createElement('kas-gate') as KasGateElement;
  element.init(config);

  // Assemble modal
  wrapper.style.position = 'relative';
  wrapper.appendChild(closeButton);
  wrapper.appendChild(element);
  overlay.appendChild(wrapper);
  document.body.appendChild(overlay);

  // Close function
  const close = () => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(overlay);
      document.head.removeChild(style);
    }, 200);
  };

  // Event listeners
  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Close on escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Auto-close on confirmed
  element.addEventListener('statechange', ((e: CustomEvent) => {
    if (e.detail.state === 'confirmed') {
      setTimeout(close, 3000);
    }
  }) as EventListener);

  return { element, close };
}

// ============================================================
// EXPORTS
// ============================================================

export {
  KasGateElement,
  KaswareIntegration,
  isKaswareInstalled,
  sompiToKas,
  kasToSompi,
};

export type { KasGateConfig };

// Re-export types
export type { SessionResponse } from './utils/api.js';
export type { WidgetState } from './KasGateElement.js';

// Export version
export const VERSION = '1.0.0';

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).KasGate = {
    createPayment,
    openModal,
    KasGateElement,
    KaswareIntegration,
    isKaswareInstalled,
    sompiToKas,
    kasToSompi,
    VERSION,
  };
}
