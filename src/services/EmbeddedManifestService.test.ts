import { describe, it, expect } from 'vitest';
import { embeddedManifestService } from './EmbeddedManifestService';
import type { C2PAExternalManifest } from '../types/c2pa';
import { C2PA_MANIFEST_START_MARKER, C2PA_MANIFEST_END_MARKER } from '../utils/constants';

// Helper to create a mock manifest
function createMockManifest(): C2PAExternalManifest {
  return {
    '@context': 'https://c2pa.org/specifications/manifest/v2.0',
    claim: {
      'dc:title': 'Test Document',
      'dc:format': 'text/plain',
      instanceId: 'test-instance-id',
      claimGenerator: 'Test Generator',
      claimGeneratorInfo: { name: 'Test', version: '1.0.0' },
      assertions: [
        {
          label: 'c2pa.hash.data',
          data: {
            hash: 'abcd1234',
            algorithm: 'sha256'
          }
        },
        {
          label: 'c2pa.actions',
          data: {
            actions: []
          }
        }
      ],
      signature: {
        protected: 'protected-header',
        payload: 'payload-data',
        signature: 'signature-data',
        publicKey: '{"kty":"EC"}'
      }
    }
  };
}

describe('EmbeddedManifestService', () => {
  describe('embedManifest()', () => {
    it('should append manifest footer to content', () => {
      const content = 'Hello, world!';
      const manifest = createMockManifest();

      const embedded = embeddedManifestService.embedManifest(content, manifest);

      expect(embedded).toContain(content);
      expect(embedded.startsWith(content)).toBe(true);
    });

    it('should include start and end markers', () => {
      const content = 'Test content';
      const manifest = createMockManifest();

      const embedded = embeddedManifestService.embedManifest(content, manifest);

      expect(embedded).toContain(C2PA_MANIFEST_START_MARKER);
      expect(embedded).toContain(C2PA_MANIFEST_END_MARKER);
    });

    it('should encode manifest as base64', () => {
      const content = 'Test content';
      const manifest = createMockManifest();

      const embedded = embeddedManifestService.embedManifest(content, manifest);

      // Extract the part between markers
      const startIndex = embedded.indexOf(C2PA_MANIFEST_START_MARKER);
      const endIndex = embedded.indexOf(C2PA_MANIFEST_END_MARKER);
      const base64Part = embedded.slice(
        startIndex + C2PA_MANIFEST_START_MARKER.length,
        endIndex
      ).trim();

      // Should be valid base64
      expect(/^[A-Za-z0-9+/]+=*$/.test(base64Part)).toBe(true);

      // Should decode to valid JSON
      const decoded = atob(base64Part);
      expect(() => JSON.parse(decoded)).not.toThrow();
    });

    it('should separate content and footer with newline', () => {
      const content = 'Test content';
      const manifest = createMockManifest();

      const embedded = embeddedManifestService.embedManifest(content, manifest);

      // Should have newline after content before marker
      expect(embedded.startsWith(`${content}\n${C2PA_MANIFEST_START_MARKER}`)).toBe(true);
    });

    it('should preserve original content unchanged', () => {
      const content = 'Original text\nwith newlines\nand special chars: é, ñ, 世界';
      const manifest = createMockManifest();

      const embedded = embeddedManifestService.embedManifest(content, manifest);

      expect(embedded.startsWith(content)).toBe(true);
    });

    it('should handle empty content', () => {
      const content = '';
      const manifest = createMockManifest();

      const embedded = embeddedManifestService.embedManifest(content, manifest);

      expect(embedded).toContain(C2PA_MANIFEST_START_MARKER);
      expect(embedded).toContain(C2PA_MANIFEST_END_MARKER);
    });

    it('should handle content with existing newlines', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const manifest = createMockManifest();

      const embedded = embeddedManifestService.embedManifest(content, manifest);

      expect(embedded.startsWith(content)).toBe(true);
      expect(embedded).toContain(C2PA_MANIFEST_START_MARKER);
    });
  });

  describe('extractManifest()', () => {
    it('should extract clean content without footer', () => {
      const originalContent = 'Hello, world!';
      const manifest = createMockManifest();
      const embedded = embeddedManifestService.embedManifest(originalContent, manifest);

      const result = embeddedManifestService.extractManifest(embedded);

      expect(result.content).toBe(originalContent);
    });

    it('should return decoded manifest JSON string', () => {
      const content = 'Test content';
      const manifest = createMockManifest();
      const embedded = embeddedManifestService.embedManifest(content, manifest);

      const result = embeddedManifestService.extractManifest(embedded);

      expect(result.manifestJson).toBeTruthy();
      expect(() => JSON.parse(result.manifestJson)).not.toThrow();
    });

    it('should return parsed manifest object', () => {
      const content = 'Test content';
      const manifest = createMockManifest();
      const embedded = embeddedManifestService.embedManifest(content, manifest);

      const result = embeddedManifestService.extractManifest(embedded);

      expect(result.manifest).toBeTruthy();
      expect(result.manifest['@context']).toBe(manifest['@context']);
      expect(result.manifest.claim.instanceId).toBe(manifest.claim.instanceId);
    });

    it('should throw error when start marker missing', () => {
      const content = `Test content\n\n${C2PA_MANIFEST_END_MARKER}`;

      expect(() => embeddedManifestService.extractManifest(content)).toThrow(
        'No C2PA manifest found in document'
      );
    });

    it('should throw error when end marker missing', () => {
      const content = `Test content\n\n${C2PA_MANIFEST_START_MARKER}\nbase64data`;

      expect(() => embeddedManifestService.extractManifest(content)).toThrow(
        'No C2PA manifest found in document'
      );
    });

    it('should throw error when markers are in wrong order', () => {
      const content = `${C2PA_MANIFEST_END_MARKER}\nsome data\n${C2PA_MANIFEST_START_MARKER}`;

      expect(() => embeddedManifestService.extractManifest(content)).toThrow(
        'Invalid C2PA manifest markers'
      );
    });

    it('should throw error for invalid base64 content', () => {
      const content = `Test\n\n${C2PA_MANIFEST_START_MARKER}\n!!!invalid-base64!!!\n${C2PA_MANIFEST_END_MARKER}`;

      expect(() => embeddedManifestService.extractManifest(content)).toThrow(
        'Failed to decode manifest: invalid base64 encoding'
      );
    });

    it('should throw error for invalid JSON in manifest', () => {
      const invalidJson = btoa('{ invalid json }');
      const content = `Test\n\n${C2PA_MANIFEST_START_MARKER}\n${invalidJson}\n${C2PA_MANIFEST_END_MARKER}`;

      expect(() => embeddedManifestService.extractManifest(content)).toThrow(
        'Failed to parse manifest: invalid JSON'
      );
    });

    it('should handle multiple potential marker locations (use lastIndexOf)', () => {
      const content = 'Test content';
      const manifest = createMockManifest();
      // Embed manifest, then add confusing text with partial marker
      const embedded = embeddedManifestService.embedManifest(content, manifest);
      const confusingContent = `Previous text with ${C2PA_MANIFEST_START_MARKER.slice(0, 10)}\n${embedded}`;

      const result = embeddedManifestService.extractManifest(confusingContent);

      expect(result.content).toContain('Previous text');
      expect(result.manifest).toBeTruthy();
    });

    it('should remove preceding newlines when extracting content', () => {
      const content = 'Clean content';
      const manifest = createMockManifest();
      const embedded = embeddedManifestService.embedManifest(content, manifest);

      const result = embeddedManifestService.extractManifest(embedded);

      expect(result.content).toBe(content);
      expect(result.content.endsWith('\n')).toBe(false);
    });

    it('should round-trip with embedManifest correctly', () => {
      const originalContent = 'Original content\nwith multiple lines\nand unicode: 世界';
      const originalManifest = createMockManifest();

      const embedded = embeddedManifestService.embedManifest(originalContent, originalManifest);
      const result = embeddedManifestService.extractManifest(embedded);

      expect(result.content).toBe(originalContent);
      expect(result.manifest.claim.instanceId).toBe(originalManifest.claim.instanceId);
      expect(result.manifest['@context']).toBe(originalManifest['@context']);
    });
  });

  describe('hasEmbeddedManifest()', () => {
    it('should return true when both markers present', () => {
      const content = 'Test content';
      const manifest = createMockManifest();
      const embedded = embeddedManifestService.embedManifest(content, manifest);

      const hasManifest = embeddedManifestService.hasEmbeddedManifest(embedded);

      expect(hasManifest).toBe(true);
    });

    it('should return false when start marker missing', () => {
      const content = `Test content\n\n${C2PA_MANIFEST_END_MARKER}`;

      const hasManifest = embeddedManifestService.hasEmbeddedManifest(content);

      expect(hasManifest).toBe(false);
    });

    it('should return false when end marker missing', () => {
      const content = `Test content\n\n${C2PA_MANIFEST_START_MARKER}\ndata`;

      const hasManifest = embeddedManifestService.hasEmbeddedManifest(content);

      expect(hasManifest).toBe(false);
    });

    it('should return false for empty content', () => {
      const hasManifest = embeddedManifestService.hasEmbeddedManifest('');

      expect(hasManifest).toBe(false);
    });

    it('should return false for plain text without markers', () => {
      const content = 'Just plain text without any markers';

      const hasManifest = embeddedManifestService.hasEmbeddedManifest(content);

      expect(hasManifest).toBe(false);
    });
  });
});
