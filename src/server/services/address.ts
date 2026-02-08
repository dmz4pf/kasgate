/**
 * Address Service - HD Wallet Address Derivation
 *
 * Derives unique payment addresses from merchant xPub keys using BIP-32/44.
 * Each payment session gets a unique address for tracking.
 */

import { XPub, createAddress, NetworkType, PublicKey } from '@dfns/kaspa-wasm';
import { NETWORK_CONFIG, getCurrentNetwork } from '../../config/network.js';
import { KASPA_COIN_TYPE } from '../../shared/constants.js';
import { ensureKaspaInitialized } from '../../kaspa/init.js';
import { query, execute } from '../db/index.js';

// ============================================================
// TYPES
// ============================================================

export interface DerivedAddress {
  address: string;
  index: number;
  path: string;
}

interface MerchantAddressInfo {
  id: string;
  xpub: string;
  next_address_index: number;
}

// ============================================================
// ADDRESS SERVICE CLASS
// ============================================================

export class AddressService {
  private generators: Map<string, XPub> = new Map();

  /**
   * Get or create an XPub for a merchant's xpub string
   */
  private getGenerator(xpub: string): XPub {
    // Return cached generator if available
    if (this.generators.has(xpub)) {
      return this.generators.get(xpub)!;
    }

    ensureKaspaInitialized();

    // Create XPub from string
    const generator = new XPub(xpub);
    this.generators.set(xpub, generator);
    return generator;
  }

  /**
   * Get the network type for address creation
   */
  private getNetworkType(): NetworkType {
    return getCurrentNetwork() === 'mainnet'
      ? NetworkType.Mainnet
      : NetworkType.Testnet;
  }

  /**
   * Derive an address at a specific index
   *
   * For BIP-44 path: m/44'/111111'/0'/0/{index}
   * The xPub represents m/44'/111111'/0'
   * We derive: /0/{index} (receive chain, then address index)
   */
  deriveAddress(xpub: string, index: number): DerivedAddress {
    const generator = this.getGenerator(xpub);

    // Derive receive chain (index 0) then address index
    // m/44'/111111'/0'/0/{index}
    const receiveChain = generator.deriveChild(0);
    const addressXPub = receiveChain.deriveChild(index);
    const pubkey = addressXPub.toPublicKey();

    // Create address from public key
    const address = createAddress(pubkey, this.getNetworkType());

    return {
      address: address.toString(),
      index,
      path: `m/44'/${KASPA_COIN_TYPE}'/0'/0/${index}`,
    };
  }

  /**
   * Get the next unused address for a merchant
   * This atomically increments the address index
   */
  getNextAddress(merchantId: string): DerivedAddress {
    // Get merchant info
    const merchant = query<MerchantAddressInfo>(
      'SELECT id, xpub, next_address_index FROM merchants WHERE id = ?',
      [merchantId]
    )[0];

    if (!merchant) {
      throw new Error(`Merchant not found: ${merchantId}`);
    }

    const index = merchant.next_address_index;

    // Derive the address
    const derivedAddress = this.deriveAddress(merchant.xpub, index);

    // Increment the index in the database
    execute(
      'UPDATE merchants SET next_address_index = next_address_index + 1, updated_at = datetime("now") WHERE id = ?',
      [merchantId]
    );

    console.log(`[KasGate] Derived address for merchant ${merchantId}: index ${index}`);

    return derivedAddress;
  }

  /**
   * Verify that an address was derived from a merchant's xPub
   */
  verifyAddress(xpub: string, address: string, maxIndex: number = 1000): number | null {
    const generator = this.getGenerator(xpub);
    const networkType = this.getNetworkType();
    const receiveChain = generator.deriveChild(0);

    // Search through indices to find a match
    for (let i = 0; i < maxIndex; i++) {
      const addressXPub = receiveChain.deriveChild(i);
      const pubkey = addressXPub.toPublicKey();
      const derivedAddress = createAddress(pubkey, networkType);

      if (derivedAddress.toString() === address) {
        return i;
      }
    }

    return null;
  }

  /**
   * Clear cached generators (for testing or xPub rotation)
   */
  clearCache(): void {
    this.generators.clear();
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let addressService: AddressService | null = null;

/**
 * Get the singleton address service instance
 */
export function getAddressService(): AddressService {
  if (!addressService) {
    addressService = new AddressService();
  }
  return addressService;
}

/**
 * Reset the address service (for testing)
 */
export function resetAddressService(): void {
  if (addressService) {
    addressService.clearCache();
    addressService = null;
  }
}
