import { describe, it, expect, beforeAll } from 'vitest';
import { cryptoService } from './CryptoService';

describe('CryptoService', () => {
  describe('initialize()', () => {
    it('should generate valid ECDSA P-256 keypair', async () => {
      const result = await cryptoService.initialize();

      expect(result.publicKey).toBeTruthy();
      expect(result.privateKey).toBeTruthy();
      expect(typeof result.publicKey).toBe('string');
    });

    it('should store public key as JWK string', async () => {
      await cryptoService.initialize();
      const publicKey = cryptoService.exportPublicKey();

      expect(publicKey).toBeTruthy();
      const jwk = JSON.parse(publicKey!);
      expect(jwk.kty).toBe('EC');
      expect(jwk.crv).toBe('P-256');
    });

    it('should store private key internally', async () => {
      await cryptoService.initialize();
      expect(cryptoService.privateKey).toBeTruthy();
      expect(cryptoService.privateKey?.type).toBe('private');
    });

    it('should allow multiple calls (regenerates keys)', async () => {
      const result1 = await cryptoService.initialize();
      const result2 = await cryptoService.initialize();

      expect(result1.publicKey).not.toBe(result2.publicKey);
    });
  });

  describe('hash()', () => {
    it('should return consistent hex string for same input', async () => {
      const input = 'test data';
      const hash1 = await cryptoService.hash(input);
      const hash2 = await cryptoService.hash(input);

      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different input', async () => {
      const hash1 = await cryptoService.hash('data1');
      const hash2 = await cryptoService.hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return 64-character hex string (SHA-256)', async () => {
      const hash = await cryptoService.hash('test');

      expect(hash.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('should handle empty string input', async () => {
      const hash = await cryptoService.hash('');

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64);
    });

    it('should handle unicode characters', async () => {
      const hash = await cryptoService.hash('Hello 世界 🌍');

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64);
    });

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(10000);
      const hash = await cryptoService.hash(longString);

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64);
    });
  });

  describe('hashObject()', () => {
    it('should return consistent hash regardless of key order', async () => {
      const obj1 = { b: 2, a: 1, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };

      const hash1 = await cryptoService.hashObject(obj1);
      const hash2 = await cryptoService.hashObject(obj2);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different object values', async () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 3 };

      const hash1 = await cryptoService.hashObject(obj1);
      const hash2 = await cryptoService.hashObject(obj2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle nested objects with sorted keys', async () => {
      const obj1 = { outer: { b: 2, a: 1 }, z: 3 };
      const obj2 = { z: 3, outer: { a: 1, b: 2 } };

      const hash1 = await cryptoService.hashObject(obj1);
      const hash2 = await cryptoService.hashObject(obj2);

      expect(hash1).toBe(hash2);
    });

    it('should handle arrays in objects', async () => {
      const obj = { items: [1, 2, 3], name: 'test' };
      const hash = await cryptoService.hashObject(obj);

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64);
    });

    it('should handle null values', async () => {
      const obj = { a: null, b: 'value' };
      const hash = await cryptoService.hashObject(obj);

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64);
    });

    it('should handle empty objects', async () => {
      const hash = await cryptoService.hashObject({});

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64);
    });
  });

  describe('sign() and verify()', () => {
    beforeAll(async () => {
      await cryptoService.initialize();
    });

    it('should return base64-encoded signature', async () => {
      const data = 'test data';
      const signature = await cryptoService.sign(data, cryptoService.privateKey!);

      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');
      // Base64 pattern
      expect(/^[A-Za-z0-9+/]+=*$/.test(signature)).toBe(true);
    });

    it('should produce different signatures for different data', async () => {
      const sig1 = await cryptoService.sign('data1', cryptoService.privateKey!);
      const sig2 = await cryptoService.sign('data2', cryptoService.privateKey!);

      expect(sig1).not.toBe(sig2);
    });

    it('should verify valid signature', async () => {
      const data = 'test data';
      const signature = await cryptoService.sign(data, cryptoService.privateKey!);
      const publicKey = cryptoService.exportPublicKey()!;

      const isValid = await cryptoService.verify(data, signature, publicKey);

      expect(isValid).toBe(true);
    });

    it('should return false for tampered data', async () => {
      const data = 'original data';
      const signature = await cryptoService.sign(data, cryptoService.privateKey!);
      const publicKey = cryptoService.exportPublicKey()!;

      const isValid = await cryptoService.verify('tampered data', signature, publicKey);

      expect(isValid).toBe(false);
    });

    it('should return false for wrong public key', async () => {
      const data = 'test data';
      const signature = await cryptoService.sign(data, cryptoService.privateKey!);

      // Generate new keypair to get different public key
      await cryptoService.initialize();
      const wrongPublicKey = cryptoService.exportPublicKey()!;

      const isValid = await cryptoService.verify(data, signature, wrongPublicKey);

      expect(isValid).toBe(false);
    });

    it('should return false for corrupted signature', async () => {
      const data = 'test data';
      const publicKey = cryptoService.exportPublicKey()!;
      const corruptedSignature = 'AAAA' + 'B'.repeat(100);

      const isValid = await cryptoService.verify(data, corruptedSignature, publicKey);

      expect(isValid).toBe(false);
    });

    it('should handle malformed public key JWK gracefully', async () => {
      const data = 'test data';
      const signature = await cryptoService.sign(data, cryptoService.privateKey!);
      const malformedJwk = '{"invalid": "jwk"}';

      const isValid = await cryptoService.verify(data, signature, malformedJwk);

      expect(isValid).toBe(false);
    });
  });

  describe('exportPublicKey()', () => {
    it('should return JWK string after initialization', async () => {
      await cryptoService.initialize();
      const publicKey = cryptoService.exportPublicKey();

      expect(publicKey).toBeTruthy();
      expect(typeof publicKey).toBe('string');
    });
  });

  describe('bufferToHex()', () => {
    it('should convert empty buffer to empty string', () => {
      const buffer = new Uint8Array([]).buffer;
      const hex = cryptoService.bufferToHex(buffer);

      expect(hex).toBe('');
    });

    it('should convert single byte correctly', () => {
      const buffer = new Uint8Array([255]).buffer;
      const hex = cryptoService.bufferToHex(buffer);

      expect(hex).toBe('ff');
    });

    it('should pad single-digit hex values with leading zero', () => {
      const buffer = new Uint8Array([15]).buffer;
      const hex = cryptoService.bufferToHex(buffer);

      expect(hex).toBe('0f');
    });

    it('should convert multi-byte buffer correctly', () => {
      const buffer = new Uint8Array([0, 127, 255]).buffer;
      const hex = cryptoService.bufferToHex(buffer);

      expect(hex).toBe('007fff');
    });
  });

  describe('bufferToBase64() and base64ToBuffer()', () => {
    it('should convert empty buffer to empty string', () => {
      const buffer = new Uint8Array([]).buffer;
      const base64 = cryptoService.bufferToBase64(buffer);

      expect(base64).toBe('');
    });

    it('should convert buffer to valid base64 string', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
      const base64 = cryptoService.bufferToBase64(buffer);

      expect(base64).toBeTruthy();
      expect(/^[A-Za-z0-9+/]+=*$/.test(base64)).toBe(true);
    });

    it('should round-trip with base64ToBuffer', () => {
      const originalBuffer = new Uint8Array([1, 2, 3, 4, 5, 255]).buffer;
      const base64 = cryptoService.bufferToBase64(originalBuffer);
      const convertedBuffer = cryptoService.base64ToBuffer(base64);

      const originalArray = new Uint8Array(originalBuffer);
      const convertedArray = new Uint8Array(convertedBuffer);

      expect(convertedArray).toEqual(originalArray);
    });
  });
});
