import { describe, it, expect, beforeAll } from 'vitest';
import { c2paManifestService } from './C2PAManifestService';
import { cryptoService, CryptoService } from './CryptoService';
import type { C2PAAction, C2PAHashAssertion, C2PAActionsAssertion } from '../types/c2pa';

describe('C2PAManifestService', () => {
  beforeAll(async () => {
    await cryptoService.initialize();
  });

  // Helper to create a mock action
  function createMockAction(): C2PAAction {
    return {
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
  }

  describe('buildClaim()', () => {
    it('should create claim with correct dc:format (default text/plain)', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [createMockAction()];

      const claim = await c2paManifestService.buildClaim(content, actions);

      expect(claim['dc:format']).toBe('text/plain');
    });

    it('should create claim with custom dc:format', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [createMockAction()];

      const claim = await c2paManifestService.buildClaim(content, actions, 'application/json');

      expect(claim['dc:format']).toBe('application/json');
    });

    it('should generate unique instanceId (UUID format)', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [createMockAction()];

      const claim1 = await c2paManifestService.buildClaim(content, actions);
      const claim2 = await c2paManifestService.buildClaim(content, actions);

      expect(claim1.instanceId).toBeTruthy();
      expect(claim2.instanceId).toBeTruthy();
      expect(claim1.instanceId).not.toBe(claim2.instanceId);
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claim1.instanceId)).toBe(true);
    });

    it('should include claimGenerator and claimGeneratorInfo', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [createMockAction()];

      const claim = await c2paManifestService.buildClaim(content, actions);

      expect(claim.claimGenerator).toBe('Human+AI Provenance Demo');
      expect(claim.claimGeneratorInfo).toEqual({
        name: 'Human+AI Provenance Demo',
        version: '1.0.0',
      });
    });

    it('should create c2pa.hash.data assertion with SHA-256 hash of content', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [createMockAction()];

      const claim = await c2paManifestService.buildClaim(content, actions);

      const hashAssertion = claim.assertions.find(a => a.label === 'c2pa.hash.data');
      expect(hashAssertion).toBeTruthy();
      expect((hashAssertion!.data as C2PAHashAssertion).name).toBe('sha256');
      expect((hashAssertion!.data as C2PAHashAssertion).hash).toBeTruthy();
      expect((hashAssertion!.data as C2PAHashAssertion).hash.length).toBe(64); // SHA-256 = 64 hex chars
    });

    it('should create c2pa.actions assertion with provided actions', async () => {
      const content = 'Test content';
      const action1 = createMockAction();
      const action2 = { ...createMockAction(), action: 'c2pa.created' as const };
      const actions: C2PAAction[] = [action1, action2];

      const claim = await c2paManifestService.buildClaim(content, actions);

      const actionsAssertion = claim.assertions.find(a => a.label === 'c2pa.actions');
      expect(actionsAssertion).toBeTruthy();
      expect((actionsAssertion!.data as C2PAActionsAssertion).actions).toHaveLength(2);
      expect((actionsAssertion!.data as C2PAActionsAssertion).actions[0]).toEqual(action1);
      expect((actionsAssertion!.data as C2PAActionsAssertion).actions[1]).toEqual(action2);
    });

    it('should compute correct content hash for various content types', async () => {
      const content1 = 'Test content';
      const content2 = 'Different content';
      const actions: C2PAAction[] = [createMockAction()];

      const claim1 = await c2paManifestService.buildClaim(content1, actions);
      const claim2 = await c2paManifestService.buildClaim(content2, actions);

      const hash1 = (claim1.assertions.find(a => a.label === 'c2pa.hash.data')!.data as C2PAHashAssertion).hash;
      const hash2 = (claim2.assertions.find(a => a.label === 'c2pa.hash.data')!.data as C2PAHashAssertion).hash;

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty content string', async () => {
      const content = '';
      const actions: C2PAAction[] = [createMockAction()];

      const claim = await c2paManifestService.buildClaim(content, actions);

      expect(claim).toBeTruthy();
      const hashAssertion = claim.assertions.find(a => a.label === 'c2pa.hash.data');
      expect((hashAssertion!.data as C2PAHashAssertion).hash).toBeTruthy();
    });

    it('should handle empty actions array', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [];

      const claim = await c2paManifestService.buildClaim(content, actions);

      const actionsAssertion = claim.assertions.find(a => a.label === 'c2pa.actions');
      expect((actionsAssertion!.data as C2PAActionsAssertion).actions).toHaveLength(0);
    });

    it('should handle multiple actions', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [
        createMockAction(),
        createMockAction(),
        createMockAction(),
      ];

      const claim = await c2paManifestService.buildClaim(content, actions);

      const actionsAssertion = claim.assertions.find(a => a.label === 'c2pa.actions');
      expect((actionsAssertion!.data as C2PAActionsAssertion).actions).toHaveLength(3);
    });
  });

  describe('signClaim()', () => {
    it('should return COSESignature with required fields', async () => {
      const claim = await c2paManifestService.buildClaim('Test', [createMockAction()]);

      const signature = await c2paManifestService.signClaim(claim, cryptoService.privateKey!);

      expect(signature).toBeTruthy();
      expect(signature.protected).toBeTruthy();
      expect(signature.payload).toBeTruthy();
      expect(signature.signature).toBeTruthy();
      expect(signature.publicKey).toBeTruthy();
    });

    it('should encode protected headers in base64', async () => {
      const claim = await c2paManifestService.buildClaim('Test', [createMockAction()]);

      const signature = await c2paManifestService.signClaim(claim, cryptoService.privateKey!);

      // Decode and verify protected headers
      const protectedHeaders = JSON.parse(atob(signature.protected));
      expect(protectedHeaders.alg).toBe(-7); // ECDSA w/ SHA-256
      expect(protectedHeaders.kid).toBe('demo-key-1');
    });

    it('should include alg: -7 (ECDSA SHA-256) in protected headers', async () => {
      const claim = await c2paManifestService.buildClaim('Test', [createMockAction()]);

      const signature = await c2paManifestService.signClaim(claim, cryptoService.privateKey!);

      const protectedHeaders = JSON.parse(atob(signature.protected));
      expect(protectedHeaders.alg).toBe(-7);
    });

    it('should encode payload (claim) in base64', async () => {
      const claim = await c2paManifestService.buildClaim('Test', [createMockAction()]);

      const signature = await c2paManifestService.signClaim(claim, cryptoService.privateKey!);

      // Decode and verify payload
      const payload = JSON.parse(atob(signature.payload));
      expect(payload.instanceId).toBe(claim.instanceId);
      expect(payload['dc:format']).toBe(claim['dc:format']);
    });

    it('should produce valid base64 signature', async () => {
      const claim = await c2paManifestService.buildClaim('Test', [createMockAction()]);

      const signature = await c2paManifestService.signClaim(claim, cryptoService.privateKey!);

      // Valid base64 pattern
      expect(/^[A-Za-z0-9+/]+=*$/.test(signature.signature)).toBe(true);
    });

    it('should include public key from cryptoService', async () => {
      const claim = await c2paManifestService.buildClaim('Test', [createMockAction()]);

      const signature = await c2paManifestService.signClaim(claim, cryptoService.privateKey!);

      expect(signature.publicKey).toBe(cryptoService.exportPublicKey());
    });

    it('should produce verifiable signature', async () => {
      const claim = await c2paManifestService.buildClaim('Test', [createMockAction()]);

      const signature = await c2paManifestService.signClaim(claim, cryptoService.privateKey!);

      // Reconstruct signing data
      const signingData = `${signature.protected}.${signature.payload}`;

      // Verify signature
      const isValid = await cryptoService.verify(signingData, signature.signature, signature.publicKey);

      expect(isValid).toBe(true);
    });
  });

  describe('createExternalManifest()', () => {
    it('should return manifest with @context set to C2PA v2.0 URL', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [createMockAction()];

      const manifest = await c2paManifestService.createExternalManifest(
        content,
        actions,
        cryptoService.privateKey!
      );

      expect(manifest['@context']).toBe('https://c2pa.org/specifications/manifest/v2.0');
    });

    it('should include signed claim with signature field', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [createMockAction()];

      const manifest = await c2paManifestService.createExternalManifest(
        content,
        actions,
        cryptoService.privateKey!
      );

      expect(manifest.claim).toBeTruthy();
      expect(manifest.claim.signature).toBeTruthy();
      expect(manifest.claim.signature!.protected).toBeTruthy();
      expect(manifest.claim.signature!.payload).toBeTruthy();
      expect(manifest.claim.signature!.signature).toBeTruthy();
      expect(manifest.claim.signature!.publicKey).toBeTruthy();
    });

    it('should produce manifest where signature can be verified', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [createMockAction()];

      const manifest = await c2paManifestService.createExternalManifest(
        content,
        actions,
        cryptoService.privateKey!
      );

      const signature = manifest.claim.signature!;

      // Create claim without signature for verification
      const { signature: _, ...claimWithoutSignature } = manifest.claim;

      // Encode claim using canonical JSON (same as signing process)
      const claimBase64 = CryptoService.utf8ToBase64(cryptoService.canonicalStringify(claimWithoutSignature));

      // Verify that the payload matches the claim
      expect(signature.payload).toBe(claimBase64);

      // Reconstruct signing data
      const signingData = `${signature.protected}.${signature.payload}`;

      // Verify signature
      const isValid = await cryptoService.verify(signingData, signature.signature, signature.publicKey);

      expect(isValid).toBe(true);
    });

    it('should chain buildClaim + signClaim correctly', async () => {
      const content = 'Test content';
      const actions: C2PAAction[] = [createMockAction()];

      const manifest = await c2paManifestService.createExternalManifest(
        content,
        actions,
        cryptoService.privateKey!
      );

      // Manifest should have all claim properties
      expect(manifest.claim.instanceId).toBeTruthy();
      expect(manifest.claim['dc:format']).toBe('text/plain');
      expect(manifest.claim.claimGenerator).toBe('Human+AI Provenance Demo');

      // Manifest should have assertions
      expect(manifest.claim.assertions).toHaveLength(2);
      expect(manifest.claim.assertions.find(a => a.label === 'c2pa.hash.data')).toBeTruthy();
      expect(manifest.claim.assertions.find(a => a.label === 'c2pa.actions')).toBeTruthy();

      // Manifest should have signature
      expect(manifest.claim.signature).toBeTruthy();
    });
  });

  describe('serializeManifest()', () => {
    it('should return valid JSON string', async () => {
      const manifest = await c2paManifestService.createExternalManifest(
        'Test',
        [createMockAction()],
        cryptoService.privateKey!
      );

      const serialized = c2paManifestService.serializeManifest(manifest);

      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it('should use 2-space indentation (pretty print)', async () => {
      const manifest = await c2paManifestService.createExternalManifest(
        'Test',
        [createMockAction()],
        cryptoService.privateKey!
      );

      const serialized = c2paManifestService.serializeManifest(manifest);

      // Check for 2-space indentation
      expect(serialized).toContain('  ');
      // Should have newlines (pretty printed)
      expect(serialized.split('\n').length).toBeGreaterThan(1);
    });

    it('should be parseable back to original manifest', async () => {
      const manifest = await c2paManifestService.createExternalManifest(
        'Test',
        [createMockAction()],
        cryptoService.privateKey!
      );

      const serialized = c2paManifestService.serializeManifest(manifest);
      const parsed = JSON.parse(serialized);

      expect(parsed['@context']).toBe(manifest['@context']);
      expect(parsed.claim.instanceId).toBe(manifest.claim.instanceId);
      expect(parsed.claim.signature.signature).toBe(manifest.claim.signature!.signature);
    });
  });
});
