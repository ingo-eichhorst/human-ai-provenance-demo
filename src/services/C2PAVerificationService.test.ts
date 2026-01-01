import { describe, it, expect, beforeAll } from 'vitest';
import { c2paVerificationService } from './C2PAVerificationService';
import { c2paManifestService } from './C2PAManifestService';
import { scittService } from './SCITTService';
import { cryptoService } from './CryptoService';
import type { C2PAAction, C2PAExternalManifest } from '../types/c2pa';

describe('C2PAVerificationService', () => {
  let testContent: string;
  let testManifest: C2PAExternalManifest;
  let testManifestJson: string;

  beforeAll(async () => {
    await cryptoService.initialize();

    testContent = 'This is test content for verification';

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
      testContent,
      [testAction],
      cryptoService.privateKey!
    );

    // Add SCITT receipt
    const scittReceipt = await scittService.submitToLog(testManifest);
    testManifest.scitt = scittReceipt;

    testManifestJson = JSON.stringify(testManifest, null, 2);
  });

  describe('verify() - Overall Verification', () => {
    it('should return valid=true for correctly signed manifest with matching content', async () => {
      const result = await c2paVerificationService.verify(testContent, testManifestJson);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid=false when any check fails', async () => {
      const tamperedContent = 'This content has been tampered with';

      const result = await c2paVerificationService.verify(tamperedContent, testManifestJson);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should populate all three check results', async () => {
      const result = await c2paVerificationService.verify(testContent, testManifestJson);

      expect(result.checks.contentHash).toBeTruthy();
      expect(result.checks.signatureValid).toBeTruthy();
      expect(result.checks.scittReceipt).toBeTruthy();
    });

    it('should return errors array with failure messages', async () => {
      const tamperedContent = 'Tampered content';

      const result = await c2paVerificationService.verify(tamperedContent, testManifestJson);

      expect(result.errors).toBeTruthy();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include parsed manifest in result when valid', async () => {
      const result = await c2paVerificationService.verify(testContent, testManifestJson);

      expect(result.manifest).toBeTruthy();
      expect(result.manifest?.claim.instanceId).toBe(testManifest.claim.instanceId);
    });
  });

  describe('verify() - Manifest Parsing', () => {
    it('should fail gracefully for invalid JSON manifest', async () => {
      const invalidJson = '{ invalid json';

      const result = await c2paVerificationService.verify(testContent, invalidJson);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.checks.contentHash.passed).toBe(false);
    });

    it('should fail gracefully for malformed manifest structure', async () => {
      const malformedManifest = JSON.stringify({ invalid: 'structure' });

      const result = await c2paVerificationService.verify(testContent, malformedManifest);

      expect(result.valid).toBe(false);
    });
  });

  describe('verify() - Content Hash Verification', () => {
    it('should pass when content hash matches manifest hash assertion', async () => {
      const result = await c2paVerificationService.verify(testContent, testManifestJson);

      expect(result.checks.contentHash.passed).toBe(true);
      expect(result.checks.contentHash.message).toBe('Content hash matches');
    });

    it('should fail when content has been modified', async () => {
      const modifiedContent = testContent + ' - modified';

      const result = await c2paVerificationService.verify(modifiedContent, testManifestJson);

      expect(result.checks.contentHash.passed).toBe(false);
      expect(result.checks.contentHash.message).toContain('Content hash mismatch');
    });

    it('should fail when single character is changed', async () => {
      const tamperedContent = testContent.replace('T', 't');

      const result = await c2paVerificationService.verify(tamperedContent, testManifestJson);

      expect(result.checks.contentHash.passed).toBe(false);
    });

    it('should fail when whitespace is added/removed', async () => {
      const tamperedContent = testContent + ' ';

      const result = await c2paVerificationService.verify(tamperedContent, testManifestJson);

      expect(result.checks.contentHash.passed).toBe(false);
    });

    it('should fail when manifest is missing c2pa.hash.data assertion', async () => {
      // Tampering test: remove hash assertion from outer claim (not from signed payload)
      // This should fail the new claim/payload verification
      const manifestWithoutHash = {
        ...testManifest,
        claim: {
          ...testManifest.claim,
          assertions: testManifest.claim.assertions.filter(a => a.label !== 'c2pa.hash.data'),
        },
      };

      const result = await c2paVerificationService.verify(
        testContent,
        JSON.stringify(manifestWithoutHash)
      );

      // Should fail because the outer claim doesn't match the signed payload
      expect(result.checks.signatureValid.passed).toBe(false);
      expect(result.checks.signatureValid.message).toContain('Claim data does not match signed payload');
    });

    it('should handle empty content', async () => {
      const emptyContent = '';
      const emptyManifest = await c2paManifestService.createExternalManifest(
        emptyContent,
        [],
        cryptoService.privateKey!
      );

      const result = await c2paVerificationService.verify(
        emptyContent,
        JSON.stringify(emptyManifest)
      );

      expect(result.checks.contentHash.passed).toBe(true);
    });
  });

  describe('verify() - Signature Verification', () => {
    it('should pass when signature is valid', async () => {
      const result = await c2paVerificationService.verify(testContent, testManifestJson);

      expect(result.checks.signatureValid.passed).toBe(true);
      expect(result.checks.signatureValid.message).toBe('Signature verified');
    });

    it('should fail when signature field is missing', async () => {
      const manifestWithoutSignature = {
        ...testManifest,
        claim: {
          ...testManifest.claim,
          signature: undefined,
        },
      };

      const result = await c2paVerificationService.verify(
        testContent,
        JSON.stringify(manifestWithoutSignature)
      );

      expect(result.checks.signatureValid.passed).toBe(false);
      expect(result.checks.signatureValid.message).toBe('No signature found');
    });

    it('should fail when publicKey is missing from signature', async () => {
      const manifestWithoutPublicKey = {
        ...testManifest,
        claim: {
          ...testManifest.claim,
          signature: {
            ...testManifest.claim.signature!,
            publicKey: '',
          },
        },
      };

      const result = await c2paVerificationService.verify(
        testContent,
        JSON.stringify(manifestWithoutPublicKey)
      );

      expect(result.checks.signatureValid.passed).toBe(false);
      expect(result.checks.signatureValid.message).toBe('No public key in signature');
    });

    it('should fail when signature is corrupted', async () => {
      const manifestWithCorruptedSignature = {
        ...testManifest,
        claim: {
          ...testManifest.claim,
          signature: {
            ...testManifest.claim.signature!,
            signature: 'CORRUPTED_SIGNATURE_DATA',
          },
        },
      };

      const result = await c2paVerificationService.verify(
        testContent,
        JSON.stringify(manifestWithCorruptedSignature)
      );

      expect(result.checks.signatureValid.passed).toBe(false);
    });

    it('should fail when protected header is tampered', async () => {
      const manifestWithTamperedProtected = {
        ...testManifest,
        claim: {
          ...testManifest.claim,
          signature: {
            ...testManifest.claim.signature!,
            protected: btoa(JSON.stringify({ alg: -8 })), // Wrong algorithm
          },
        },
      };

      const result = await c2paVerificationService.verify(
        testContent,
        JSON.stringify(manifestWithTamperedProtected)
      );

      expect(result.checks.signatureValid.passed).toBe(false);
    });

    it('should fail when payload is tampered', async () => {
      // Create a different claim
      const differentClaim = await c2paManifestService.buildClaim('different', []);
      const manifestWithTamperedPayload = {
        ...testManifest,
        claim: {
          ...testManifest.claim,
          signature: {
            ...testManifest.claim.signature!,
            payload: btoa(JSON.stringify(differentClaim)),
          },
        },
      };

      const result = await c2paVerificationService.verify(
        testContent,
        JSON.stringify(manifestWithTamperedPayload)
      );

      expect(result.checks.signatureValid.passed).toBe(false);
    });

    it('should fail when public key is substituted', async () => {
      // Generate new keypair
      const newKeys = await cryptoService.initialize();

      const manifestWithWrongKey = {
        ...testManifest,
        claim: {
          ...testManifest.claim,
          signature: {
            ...testManifest.claim.signature!,
            publicKey: newKeys.publicKey,
          },
        },
      };

      const result = await c2paVerificationService.verify(
        testContent,
        JSON.stringify(manifestWithWrongKey)
      );

      expect(result.checks.signatureValid.passed).toBe(false);
    });

    it('should handle signature verification errors gracefully', async () => {
      const manifestWithInvalidKey = {
        ...testManifest,
        claim: {
          ...testManifest.claim,
          signature: {
            ...testManifest.claim.signature!,
            publicKey: '{"invalid": "jwk"}',
          },
        },
      };

      const result = await c2paVerificationService.verify(
        testContent,
        JSON.stringify(manifestWithInvalidKey)
      );

      expect(result.checks.signatureValid.passed).toBe(false);
    });
  });

  describe('verify() - SCITT Receipt Verification', () => {
    it('should pass when no SCITT receipt present (optional)', async () => {
      // Create manifest without SCITT receipt
      const manifestWithoutScitt = {
        ...testManifest,
        scitt: undefined,
      };

      const result = await c2paVerificationService.verify(
        testContent,
        JSON.stringify(manifestWithoutScitt)
      );

      expect(result.checks.scittReceipt.passed).toBe(true);
      expect(result.checks.scittReceipt.message).toBe('No SCITT receipt (optional)');
    });

    it('should pass when SCITT receipt is valid (demo mode)', async () => {
      const result = await c2paVerificationService.verify(testContent, testManifestJson);

      expect(result.checks.scittReceipt.passed).toBe(true);
      expect(result.checks.scittReceipt.message).toBe('SCITT receipt valid');
    });

    it('should fail when SCITT receipt is invalid', async () => {
      // Create manifest with invalid SCITT receipt
      const manifestWithInvalidScitt = {
        ...testManifest,
        scitt: {
          receipt: btoa(JSON.stringify({ manifestHash: 'wrong-hash' })),
          serviceUrl: 'demo://local',
          logId: 'demo-log',
          timestamp: new Date().toISOString(),
        },
      };

      const result = await c2paVerificationService.verify(
        testContent,
        JSON.stringify(manifestWithInvalidScitt)
      );

      expect(result.checks.scittReceipt.passed).toBe(false);
      expect(result.checks.scittReceipt.message).toBe('SCITT receipt invalid');
    });
  });
});
