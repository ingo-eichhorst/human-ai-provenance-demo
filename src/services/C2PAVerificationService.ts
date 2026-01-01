import { cryptoService, CryptoService } from './CryptoService';
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
    const signature = manifest.claim.signature;
    if (!signature?.payload) {
      return { passed: false, message: 'No signed payload found' };
    }

    try {
      // CRITICAL: Get claim from SIGNED payload, not from potentially tampered manifest.claim
      const signedClaimJson = CryptoService.base64ToUtf8(signature.payload);
      const signedClaim = JSON.parse(signedClaimJson);

      // Find hash assertion in the signed claim
      const hashAssertion = signedClaim.assertions?.find((a: any) => a.label === 'c2pa.hash.data')
        ?.data as C2PAHashAssertion | undefined;

      if (!hashAssertion) {
        return { passed: false, message: 'No hash assertion found in signed claim' };
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
    } catch (error) {
      return {
        passed: false,
        message: `Hash verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async verifySignature(manifest: C2PAExternalManifest): Promise<CheckResult> {
    const signature = manifest.claim.signature;

    if (!signature) {
      return { passed: false, message: 'No signature found' };
    }

    if (!signature.publicKey) {
      return { passed: false, message: 'No public key in signature' };
    }

    try {
      // Reconstruct signed data: protected || payload
      const signedData = `${signature.protected}.${signature.payload}`;

      // Verify using CryptoService
      const isValid = await cryptoService.verify(
        signedData,
        signature.signature,
        signature.publicKey
      );

      if (!isValid) {
        return { passed: false, message: 'Invalid signature' };
      }

      // CRITICAL: Verify that manifest.claim matches the signed payload
      // Decode signed payload and compare to manifest.claim (without signature field)
      const signedClaimJson = CryptoService.base64ToUtf8(signature.payload);
      const signedClaim = JSON.parse(signedClaimJson);

      // manifest.claim includes signature, signedClaim doesn't - remove for comparison
      const { signature: _, ...claimWithoutSig } = manifest.claim;

      // Use canonical JSON for comparison to avoid key order issues
      const signedClaimCanonical = cryptoService.canonicalStringify(signedClaim);
      const claimCanonical = cryptoService.canonicalStringify(claimWithoutSig);

      if (signedClaimCanonical !== claimCanonical) {
        return { passed: false, message: 'Claim data does not match signed payload' };
      }

      return { passed: true, message: 'Signature verified' };
    } catch (error) {
      return {
        passed: false,
        message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
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
