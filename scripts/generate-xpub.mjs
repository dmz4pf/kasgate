/**
 * Generate a test xPub for KasGate testing
 * Run: node scripts/generate-xpub.mjs
 */

import pkg from 'websocket';
const { w3cwebsocket } = pkg;
globalThis.WebSocket = w3cwebsocket;

import { Mnemonic, XPrv } from '@dfns/kaspa-wasm';

// Generate new mnemonic (24 words)
const mnemonic = Mnemonic.random();
console.log('='.repeat(60));
console.log('SAVE THIS MNEMONIC (for wallet recovery):');
console.log('='.repeat(60));
console.log(mnemonic.phrase);
console.log('='.repeat(60));

// Derive master key
const seed = mnemonic.toSeed();
const xprv = new XPrv(seed);

// Derive account key: m/44'/111111'/0'
const purpose = xprv.deriveChild(44, true);      // 44'
const coinType = purpose.deriveChild(111111, true); // 111111' (Kaspa)
const account = coinType.deriveChild(0, true);   // 0'

// Get xPub at account level
const xpub = account.toXPub();
const xpubString = xpub.intoString('kpub');

console.log('\nxPub (use this for KasGate):');
console.log(xpubString);
console.log('\nNetwork: testnet-10');
console.log('='.repeat(60));
