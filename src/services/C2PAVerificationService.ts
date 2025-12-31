import { cryptoService } from './CryptoService';
import { scittService } from './SCITTService';
import type {
  C2PAExternalManifest,
  C2PAVerificationResult,
  C2PAHashAssertion,
  CheckResult,
} from '../types/c2pa';

export class C2PAVerificationService {
  /**
   * Verify content + manifest pair
   */
  async verify(content: string, manifestJson: string): Promise<C2PAVerificationResult> {
    const errors: string[] = [];

    try {
      // Parse manifest
      const manifest: C2PAExternalManifest = JSON.parse(manifestJson);

      // Check 1: Content hash
      const contentHashCheck = await this.verifyContentHash(content, manifest);
      if (!contentHashCheck.passed) {
        errors.push(contentHashCheck.message);
      }

      // Check 2: Signature
      const signatureCheck = await this.verifySignature(manifest);
      if (!signatureCheck.passed) {
        errors.push(signatureCheck.message);
      }

      // Check 3: SCITT receipt (if present)
      const scittCheck = await this.verifySCITT(manifest);
      if (!scittCheck.passed) {
        errors.push(scittCheck.message);
      }

      return {
        valid: errors.length === 0,
        checks: {
          contentHash: contentHashCheck,
          signatureValid: signatureCheck,
          scittReceipt: scittCheck,
        },
        manifest,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        checks: {
          contentHash: { passed: false, message: 'Failed to parse manifest' },
          signatureValid: { passed: false, message: 'Not verified' },
          scittReceipt: { passed: false, message: 'Not verified' },
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async verifyContentHash(content: string, manifest: C2PAExternalManifest): Promise<CheckResult> {
    // Find hash assertion
    const hashAssertion = manifest.claim.assertions.find((a) => a.label === 'c2pa.hash.data')
      ?.data as C2PAHashAssertion | undefined;

    if (!hashAssertion) {
      return { passed: false, message: 'No hash assertion found' };
    }

    // Compute content hash
    const contentHash = await cryptoService.hash(content);

    // Compare
    if (contentHash !== hashAssertion.hash) {
      return {
        passed: false,
        message: `Content hash mismatch: expected ${hashAssertion.hash}, got ${contentHash}`,
      };
    }

    return { passed: true, message: 'Content hash matches' };
  }

  private async verifySignature(manifest: C2PAExternalManifest): Promise<CheckResult> {
    const signature = manifest.claim.signature;

    if (!signature) {
      return { passed: false, message: 'No signature found' };
    }

    // Reconstruct signing data
    const signingData = `${signature.protected}.${signature.payload}`;

    // Decode payload to get public key (in real impl, use x5chain)
    // For demo, we'll assume signature is valid if present
    // (In production, verify against certificate chain)

    return { passed: true, message: 'Signature present (demo mode)' };
  }

  private async verifySCITT(manifest: C2PAExternalManifest): Promise<CheckResult> {
    if (!manifest.scitt) {
      return { passed: true, message: 'No SCITT receipt (optional)' };
    }

    const isValid = await scittService.verifyReceipt(manifest, manifest.scitt);

    return {
      passed: isValid,
      message: isValid ? 'SCITT receipt valid' : 'SCITT receipt invalid',
    };
  }
}

export const c2paVerificationService = new C2PAVerificationService();
