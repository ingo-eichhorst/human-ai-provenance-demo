import type { C2PAExternalManifest } from '../types/c2pa';
import { C2PA_MANIFEST_START_MARKER, C2PA_MANIFEST_END_MARKER } from '../utils/constants';
import { CryptoService } from './CryptoService';

/**
 * Result of extracting an embedded manifest
 */
export interface ExtractResult {
  content: string; // Clean content without footer
  manifestJson: string; // Decoded JSON string
  manifest: C2PAExternalManifest; // Parsed manifest object
}

/**
 * Service for embedding and extracting C2PA manifests from document content
 *
 * The manifest is embedded as a base64-encoded footer with markers:
 * ---C2PA-MANIFEST-START---
 * <base64-encoded-manifest-JSON>
 * ---C2PA-MANIFEST-END---
 */
class EmbeddedManifestService {
  /**
   * Embed manifest into content as base64 footer
   * @param content - Original content (hash is computed on this)
   * @param manifest - C2PA manifest object
   * @returns Content with embedded manifest footer
   */
  embedManifest(content: string, manifest: C2PAExternalManifest): string {
    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestBase64 = CryptoService.utf8ToBase64(manifestJson);

    const footer = [
      '', // Blank line separator
      C2PA_MANIFEST_START_MARKER,
      manifestBase64,
      C2PA_MANIFEST_END_MARKER,
    ].join('\n');

    return content + footer;
  }

  /**
   * Extract manifest from embedded content
   * @param embeddedContent - Content with embedded manifest
   * @returns Extracted content and manifest
   * @throws Error if markers not found, base64 invalid, or JSON invalid
   */
  extractManifest(embeddedContent: string): ExtractResult {
    const startIndex = embeddedContent.lastIndexOf(C2PA_MANIFEST_START_MARKER);
    const endIndex = embeddedContent.lastIndexOf(C2PA_MANIFEST_END_MARKER);

    if (startIndex === -1 || endIndex === -1) {
      throw new Error('No C2PA manifest found in document');
    }

    if (startIndex >= endIndex) {
      throw new Error('Invalid C2PA manifest markers');
    }

    // Extract base64 content between markers
    const base64Start = startIndex + C2PA_MANIFEST_START_MARKER.length;
    const base64Content = embeddedContent.slice(base64Start, endIndex).trim();

    // Decode base64 (Unicode-safe)
    let manifestJson: string;
    try {
      manifestJson = CryptoService.base64ToUtf8(base64Content);
    } catch (e) {
      throw new Error('Failed to decode manifest: invalid base64 encoding');
    }

    // Parse JSON
    let manifest: C2PAExternalManifest;
    try {
      manifest = JSON.parse(manifestJson);
    } catch (e) {
      throw new Error('Failed to parse manifest: invalid JSON');
    }

    // Extract clean content (everything before the footer)
    // Find where footer starts (the blank line before markers)
    let footerStart = startIndex;
    // Look for preceding newlines to include in removal
    while (footerStart > 0 && embeddedContent[footerStart - 1] === '\n') {
      footerStart--;
    }

    const content = embeddedContent.slice(0, footerStart);

    return { content, manifestJson, manifest };
  }

  /**
   * Check if content has an embedded manifest
   */
  hasEmbeddedManifest(content: string): boolean {
    return (
      content.includes(C2PA_MANIFEST_START_MARKER) && content.includes(C2PA_MANIFEST_END_MARKER)
    );
  }
}

export const embeddedManifestService = new EmbeddedManifestService();
