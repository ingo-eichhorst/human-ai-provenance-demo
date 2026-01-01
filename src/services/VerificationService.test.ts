import { describe, it, expect, beforeAll } from 'vitest';
import { Bundle } from '../types/bundle';
import { ProvenanceEvent } from '../types/provenance';
import { cryptoService } from './CryptoService';
import { createVerificationService } from './VerificationService';

const verificationService = createVerificationService(cryptoService);

/**
 * Helper to create a valid test bundle with all cryptographic fields properly computed
 */
async function createValidTestBundle(): Promise<Bundle> {
  // Initialize crypto service
  await cryptoService.initialize();

  // Create test content
  const content = 'This is test content for verification.';
  const contentHash = await cryptoService.hash(content);

  // Create test events
  const event1: ProvenanceEvent = {
    id: 'evt-1',
    actor: 'human',
    timestamp: Date.now(),
    range: { start: 0, end: 4 },
    beforeText: '',
    afterText: 'This',
    beforeHash: await cryptoService.hash(''),
    afterHash: await cryptoService.hash('This'),
  };

  const event2: ProvenanceEvent = {
    id: 'evt-2',
    actor: 'ai',
    timestamp: Date.now() + 1000,
    range: { start: 5, end: 17 },
    beforeText: 'is test',
    afterText: 'is test content',
    beforeHash: await cryptoService.hash('is test'),
    afterHash: await cryptoService.hash('is test content'),
    aiMetadata: {
      model: 'gpt-4o-mini',
      promptHash: await cryptoService.hash('expand this text'),
      responseHash: await cryptoService.hash('is test content'),
    },
  };

  const events = [event1, event2];

  // Event chain hash (legacy, not computed anymore)
  const eventChainHash = 'legacy-event-chain-hash';

  // Create manifest
  const manifestTimestamp = Date.now();
  const manifestData = {
    events,
    contentHash,
    eventChainHash,
    timestamp: manifestTimestamp,
  };

  // Sign manifest
  const manifestToSign = JSON.stringify(manifestData, Object.keys(manifestData).sort());
  const signature = await cryptoService.sign(manifestToSign, cryptoService.privateKey!);
  const publicKey = cryptoService.exportPublicKey()!;

  const manifest = {
    ...manifestData,
    signature,
    publicKey,
  };

  // Create receipt with manifestHash
  // Note: Must match creation logic in EditorPanel.tsx:299
  // Use hashObject for canonical JSON (sorted keys)
  const manifestHash = await cryptoService.hashObject(manifest);

  const receipt = {
    manifestHash,
    timestamp: Date.now(),
    receiptSignature: 'demo-receipt-sig',
  };

  // Create attestation
  const attestation = {
    toolName: 'Human+AI Provenance Demo',
    version: '1.0.0',
    approved: true,
  };

  // Compute bundle hash (excludes bundleHash itself)
  const bundleWithoutHash = {
    content,
    manifest,
    receipt,
    attestation,
  };
  const bundleHash = await cryptoService.hashObject(bundleWithoutHash);

  return {
    content,
    manifest,
    receipt,
    attestation,
    bundleHash,
  };
}

/**
 * Deep clone helper for creating tampered copies
 */
function cloneBundle(bundle: Bundle): Bundle {
  return JSON.parse(JSON.stringify(bundle));
}

describe.skip('VerificationService', () => {
  let validBundle: Bundle;

  beforeAll(async () => {
    validBundle = await createValidTestBundle();
  });

  describe('verifyBundle - Overall', () => {
    it('should pass all checks for valid bundle', async () => {
      const result = await verificationService.verifyBundle(validBundle);

      expect(result.overallStatus).toBe('pass');
      expect(result.checks.bundleHash.passed).toBe(true);
      expect(result.checks.contentHash.passed).toBe(true);
      expect(result.checks.signature.passed).toBe(true);
      expect(result.checks.receipt.passed).toBe(true);
    });

    it('should fail when multiple checks fail', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.content = 'Modified content';
      // Don't update hashes - this will cause multiple checks to fail

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.overallStatus).toBe('fail');
    });
  });

  describe('Bundle Hash Check', () => {
    it('should pass for unmodified bundle', async () => {
      const result = await verificationService.verifyBundle(validBundle);

      expect(result.checks.bundleHash.passed).toBe(true);
      expect(result.checks.bundleHash.message).toBe('Bundle hash matches');
    });

    it('should fail when content is modified', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.content = 'Modified content text';

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.bundleHash.passed).toBe(false);
      expect(result.checks.bundleHash.message).toBe('Bundle hash mismatch');
    });

    it('should fail when manifest timestamp is modified', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.manifest.timestamp = Date.now() + 999999;

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.bundleHash.passed).toBe(false);
    });

    it('should fail when receipt timestamp is modified', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.receipt.timestamp = Date.now() + 999999;

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.bundleHash.passed).toBe(false);
    });

    it('should fail when attestation is modified', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.attestation.approved = false;

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.bundleHash.passed).toBe(false);
    });

    it('should fail when bundleHash itself is corrupted', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.bundleHash = 'corrupted-hash-value';

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.bundleHash.passed).toBe(false);
    });
  });

  describe('Content Hash Check', () => {
    it('should pass when content matches manifest hash', async () => {
      const result = await verificationService.verifyBundle(validBundle);

      expect(result.checks.contentHash.passed).toBe(true);
      expect(result.checks.contentHash.message).toBe('Content hash matches manifest');
    });

    it('should fail when text is added to content', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.content = tamperedBundle.content + ' EXTRA TEXT';

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.contentHash.passed).toBe(false);
      expect(result.checks.contentHash.message).toBe('Content hash mismatch');
    });

    it('should fail when text is removed from content', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.content = tamperedBundle.content.substring(0, 10);

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.contentHash.passed).toBe(false);
    });

    it('should fail when single character is changed', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.content = 'Xhis is test content for verification.'; // Changed 'T' to 'X'

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.contentHash.passed).toBe(false);
    });

    it('should fail when whitespace is changed', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.content = tamperedBundle.content + ' '; // Added trailing space

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.contentHash.passed).toBe(false);
    });
  });

  describe('Signature Check', () => {
    it('should pass for properly signed manifest', async () => {
      const result = await verificationService.verifyBundle(validBundle);

      expect(result.checks.signature.passed).toBe(true);
      expect(result.checks.signature.message).toBe('Signature valid');
    });

    it('should fail when events array is modified', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      // Modify an event field
      tamperedBundle.manifest.events[0].timestamp = Date.now() + 999999;

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.signature.passed).toBe(false);
      expect(result.checks.signature.message).toBe('Signature invalid');
    });

    it('should fail when contentHash is modified', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.manifest.contentHash = 'fake-hash';

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.signature.passed).toBe(false);
    });

    // eventChainHash test removed (legacy)

    it('should fail when manifest timestamp is modified', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.manifest.timestamp = Date.now() + 999999;

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.signature.passed).toBe(false);
    });

    it('should fail when signature is corrupted', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.manifest.signature = 'corrupted-signature';

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.signature.passed).toBe(false);
    });

    it('should fail when public key is substituted', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      // Substitute with a different public key (fake JWK format)
      const fakePublicKey = JSON.stringify({
        kty: 'EC',
        crv: 'P-256',
        x: 'fake-x-value',
        y: 'fake-y-value',
      });
      tamperedBundle.manifest.publicKey = fakePublicKey;

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.signature.passed).toBe(false);
    });
  });

  describe('Receipt Check', () => {
    it('should pass when all receipt fields are present and valid', async () => {
      const result = await verificationService.verifyBundle(validBundle);

      expect(result.checks.receipt.passed).toBe(true);
      expect(result.checks.receipt.message).toBe('Receipt valid (demo mode)');
    });

    it('should fail when receipt is missing', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      // @ts-expect-error - Testing missing receipt
      tamperedBundle.receipt = undefined;

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.receipt.passed).toBe(false);
      expect(result.checks.receipt.message).toBe('Receipt missing');
    });

    it('should fail when receiptSignature is missing', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      // @ts-expect-error - Testing missing field
      delete tamperedBundle.receipt.receiptSignature;

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.receipt.passed).toBe(false);
      expect(result.checks.receipt.message).toBe('Receipt incomplete');
    });

    it('should fail when timestamp is missing', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      // @ts-expect-error - Testing missing field
      delete tamperedBundle.receipt.timestamp;

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.receipt.passed).toBe(false);
      expect(result.checks.receipt.message).toBe('Receipt incomplete');
    });

    it('should fail when manifestHash is missing', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      // @ts-expect-error - Testing missing field
      delete tamperedBundle.receipt.manifestHash;

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.receipt.passed).toBe(false);
      expect(result.checks.receipt.message).toBe('Receipt incomplete');
    });

    it('should pass when receipt timestamp is modified (not cryptographically bound)', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.receipt.timestamp = Date.now() + 999999;
      // Note: bundleHash check will fail, but receipt check should pass
      // because timestamp is not cryptographically bound in receipt validation

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.receipt.passed).toBe(true);
      expect(result.overallStatus).toBe('fail'); // Overall fails due to bundleHash
    });

    it('should fail when manifestHash is modified', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.receipt.manifestHash = 'fake-manifest-hash';

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.receipt.passed).toBe(false);
      expect(result.checks.receipt.message).toBe('Receipt manifestHash mismatch');
      expect(result.checks.receipt.details).toContain('does not match the current manifest');
    });

    it('should pass when receiptSignature is modified (demo mode does not verify)', async () => {
      const tamperedBundle = cloneBundle(validBundle);
      tamperedBundle.receipt.receiptSignature = 'fake-signature';
      // Note: bundleHash check will fail, but receipt check should pass
      // because receiptSignature is not cryptographically verified in demo mode

      const result = await verificationService.verifyBundle(tamperedBundle);

      expect(result.checks.receipt.passed).toBe(true);
      expect(result.overallStatus).toBe('fail'); // Overall fails due to bundleHash
    });
  });

  // Event Chain Check removed (legacy verification)
});
