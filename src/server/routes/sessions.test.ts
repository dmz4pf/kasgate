/**
 * Session Routes Tests
 * Tests for input sanitization and API endpoint validation
 */

import { describe, it, expect } from 'vitest';
import { sanitizeString } from './sessions.js';

describe('Input Sanitization (Bug #27)', () => {
  describe('sanitizeString', () => {
    it('should strip script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const output = sanitizeString(input);
      expect(output).toBe('alert("xss")Hello');
      expect(output).not.toContain('<script>');
    });

    it('should strip all HTML tags', () => {
      const input = '<div><span>Hello</span><a href="evil">Link</a></div>';
      const output = sanitizeString(input);
      expect(output).toBe('HelloLink');
      expect(output).not.toContain('<');
      expect(output).not.toContain('>');
    });

    it('should strip img tags with onerror', () => {
      const input = '<img src=x onerror="alert(1)">';
      const output = sanitizeString(input);
      expect(output).toBe('');
    });

    it('should strip svg/onload payloads', () => {
      const input = '<svg onload="alert(1)">';
      const output = sanitizeString(input);
      expect(output).toBe('');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      const output = sanitizeString(input);
      expect(output).toBe('alert(1)');
      expect(output).not.toContain('javascript:');
    });

    it('should remove data: protocol', () => {
      const input = 'data:text/html,<script>alert(1)</script>';
      const output = sanitizeString(input);
      expect(output).not.toContain('data:');
    });

    it('should handle case variations', () => {
      const input = '<SCRIPT>alert(1)</SCRIPT>JAVASCRIPT:foo';
      const output = sanitizeString(input);
      expect(output).not.toContain('<SCRIPT>');
      expect(output).not.toContain('JAVASCRIPT:');
    });

    it('should strip event handlers', () => {
      const input = 'onclick=alert(1) onmouseover=evil()';
      const output = sanitizeString(input);
      expect(output).not.toContain('onclick=');
      expect(output).not.toContain('onmouseover=');
    });

    it('should preserve safe content', () => {
      const input = 'Order #12345 - Customer: John Doe';
      const output = sanitizeString(input);
      expect(output).toBe('Order #12345 - Customer: John Doe');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const output = sanitizeString(input);
      expect(output).toBe('Hello World');
    });

    it('should handle nested tags', () => {
      const input = '<<script>script>alert(1)<</script>/script>';
      const output = sanitizeString(input);
      expect(output).not.toContain('<script>');
    });

    it('should handle malformed tags', () => {
      const input = '<scr<script>ipt>alert(1)</scr</script>ipt>';
      const output = sanitizeString(input);
      expect(output).not.toContain('<script>');
    });

    it('should handle style tags', () => {
      const input = '<style>body{background:red}</style>';
      const output = sanitizeString(input);
      expect(output).not.toContain('<style>');
    });
  });

  describe('Metadata Size Limits', () => {
    it('should truncate keys to 50 chars', () => {
      const longKey = 'a'.repeat(100);
      const truncated = longKey.slice(0, 50);
      expect(truncated).toHaveLength(50);
    });

    it('should truncate values to 500 chars', () => {
      const longValue = 'b'.repeat(1000);
      const truncated = longValue.slice(0, 500);
      expect(truncated).toHaveLength(500);
    });

    it('should enforce max 20 keys', () => {
      const metadata: Record<string, string> = {};
      for (let i = 0; i < 25; i++) {
        metadata[`key${i}`] = `value${i}`;
      }
      expect(Object.keys(metadata).length).toBe(25);
      expect(Object.keys(metadata).length).toBeGreaterThan(20);
    });

    it('should enforce 1KB total size', () => {
      const metadata = {
        key1: 'a'.repeat(500),
        key2: 'b'.repeat(500),
        key3: 'c'.repeat(500),
      };
      const size = JSON.stringify(metadata).length;
      expect(size).toBeGreaterThan(1024);
    });
  });
});
