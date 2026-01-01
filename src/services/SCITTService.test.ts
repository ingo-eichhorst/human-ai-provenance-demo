import { describe, it, expect, beforeAll } from 'vitest';
import { SCITTService } from './SCITTService';
import { c2paManifestService } from './C2PAManifestService';
import { cryptoService } from './CryptoService';
import type { C2PAAction, C2PAExternalManifest } from '../types/c2pa';

describe('SCITTService', () => {
  let testManifest: C2PAExternalManifest;

  beforeAll(async () => {
    await cryptoService.initialize();

    // Create a test manifest
    const testAction: C2PAAction = {
      action: 'c2pa.edited',
      when: new Date().toISOString(),
      softwareAgent: 'Test Agent',
      digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits',
      parameters: {
        description: 'Test edit',
        beforeHash: 'hash1',
        afterHash: 'hash2',
      },
    };

    testManifest = await c2paManifestService.createExternalManifest(
      'Test content',
      [testAction],
      cryptoService.privateKey!
    );
  });

  describe('constructor', () => {
    it('should default to demo mode', () => {
      const service = new SCITTService();
      expect(service).toBeTruthy();
    });

    it('should accept demo service parameter', () => {
      const service = new SCITTService('demo');
      expect(service).toBeTruthy();
    });

    it('should accept datatrails service parameter', () => {
      const service = new SCITTService('datatrails');
      expect(service).toBeTruthy();
    });
  });

  describe('submitToLog() - Demo Mode', () => {
    let demoService: SCITTService;

    beforeAll(() => {
      demoService = new SCITTService('demo');
    });

    it('should return SCITTReceipt with all required fields', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      expect(receipt).toBeTruthy();
      expect(receipt.receipt).toBeTruthy();
      expect(receipt.serviceUrl).toBeTruthy();
      expect(receipt.logId).toBeTruthy();
      expect(receipt.timestamp).toBeTruthy();
    });

    it('should include demo serviceUrl (demo://local)', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      expect(receipt.serviceUrl).toBe('demo://local');
    });

    it('should include demo logId', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      expect(receipt.logId).toBe('demo-log');
    });

    it('should include ISO 8601 timestamp', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      // ISO 8601 format pattern
      expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(receipt.timestamp)).toBe(true);
    });

    it('should include base64-encoded receipt', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      // Valid base64 pattern
      expect(/^[A-Za-z0-9+/]+=*$/.test(receipt.receipt)).toBe(true);

      // Should be decodable
      expect(() => atob(receipt.receipt)).not.toThrow();
    });

    it('should generate consistent receipt structure for same manifest', async () => {
      const receipt1 = await demoService.submitToLog(testManifest);
      const receipt2 = await demoService.submitToLog(testManifest);

      // Decode receipts
      const data1 = JSON.parse(atob(receipt1.receipt));
      const data2 = JSON.parse(atob(receipt2.receipt));

      // Should have same structure
      expect(data1.version).toBe(data2.version);
      expect(data1.logId).toBe(data2.logId);
      expect(data1.note).toBe(data2.note);

      // Manifest hashes should match (same manifest)
      expect(data1.manifestHash).toBe(data2.manifestHash);
    });

    it('should generate different receipt for different manifest', async () => {
      const otherManifest = await c2paManifestService.createExternalManifest(
        'Different content',
        [],
        cryptoService.privateKey!
      );

      const receipt1 = await demoService.submitToLog(testManifest);
      const receipt2 = await demoService.submitToLog(otherManifest);

      const data1 = JSON.parse(atob(receipt1.receipt));
      const data2 = JSON.parse(atob(receipt2.receipt));

      expect(data1.manifestHash).not.toBe(data2.manifestHash);
    });

    it('should include manifestHash in decoded receipt', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      const receiptData = JSON.parse(atob(receipt.receipt));

      expect(receiptData.manifestHash).toBeTruthy();
      expect(typeof receiptData.manifestHash).toBe('string');
      expect(receiptData.manifestHash.length).toBe(64); // SHA-256 = 64 hex chars
    });
  });

  describe('verifyReceipt() - Demo Mode', () => {
    let demoService: SCITTService;

    beforeAll(() => {
      demoService = new SCITTService('demo');
    });

    it('should return true for valid demo receipt', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      const isValid = await demoService.verifyReceipt(testManifest, receipt);

      expect(isValid).toBe(true);
    });

    it('should return false when manifestHash does not match', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      // Create different manifest
      const differentManifest = await c2paManifestService.createExternalManifest(
        'Different content',
        [],
        cryptoService.privateKey!
      );

      const isValid = await demoService.verifyReceipt(differentManifest, receipt);

      expect(isValid).toBe(false);
    });

    it('should exclude scitt field when computing manifest hash for comparison', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      // Add scitt field to manifest (simulating how it's stored in production)
      const manifestWithScitt = {
        ...testManifest,
        scitt: receipt,
      };

      // Should still verify (scitt field is excluded from hash computation)
      const isValid = await demoService.verifyReceipt(manifestWithScitt, receipt);

      expect(isValid).toBe(true);
    });

    it('should handle missing scitt field in manifest correctly', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      // Verify manifest without scitt field
      const isValid = await demoService.verifyReceipt(testManifest, receipt);

      expect(isValid).toBe(true);
    });

    it('should parse receipt from base64 correctly', async () => {
      const receipt = await demoService.submitToLog(testManifest);

      // Manually verify receipt structure
      const receiptData = JSON.parse(atob(receipt.receipt));

      expect(receiptData.version).toBe(1);
      expect(receiptData.manifestHash).toBeTruthy();
      expect(receiptData.timestamp).toBeTruthy();
      expect(receiptData.logId).toBe('demo-log');
      expect(receiptData.note).toContain('demo purposes');
    });
  });

  describe('verifyReceipt() - Non-Demo Mode', () => {
    it('should return true when receipt is well-formed (datatrails mode)', async () => {
      const datatrailsService = new SCITTService('datatrails');

      // Create a mock receipt that looks like it came from a real service
      const mockReceipt = {
        receipt: btoa(JSON.stringify({ data: 'mock receipt data' })),
        serviceUrl: 'https://app.datatrails.ai/archivist/v1/publicscitt',
        logId: 'datatrails-public',
        timestamp: new Date().toISOString(),
      };

      const isValid = await datatrailsService.verifyReceipt(testManifest, mockReceipt);

      expect(isValid).toBe(true);
    });

    it('should return false when receipt is empty', async () => {
      const datatrailsService = new SCITTService('datatrails');

      const invalidReceipt = {
        receipt: '',
        serviceUrl: 'https://app.datatrails.ai/archivist/v1/publicscitt',
        logId: 'datatrails-public',
        timestamp: new Date().toISOString(),
      };

      const isValid = await datatrailsService.verifyReceipt(testManifest, invalidReceipt);

      expect(isValid).toBe(false);
    });

    it('should return false when timestamp is empty', async () => {
      const datatrailsService = new SCITTService('datatrails');

      const invalidReceipt = {
        receipt: btoa(JSON.stringify({ data: 'mock' })),
        serviceUrl: 'https://app.datatrails.ai/archivist/v1/publicscitt',
        logId: 'datatrails-public',
        timestamp: '',
      };

      const isValid = await datatrailsService.verifyReceipt(testManifest, invalidReceipt);

      expect(isValid).toBe(false);
    });
  });
});
