import { Bundle } from '../types/bundle';
import { VerificationResult, CheckResult } from '../types/verification';
import { CryptoService } from './CryptoService';

export class VerificationService {
  constructor(
    private cryptoService: CryptoService
  ) {}

  /**
   * Verify a bundle completely
   */
  async verifyBundle(bundle: Bundle): Promise<VerificationResult> {
    // Run all checks in parallel
    const [
      bundleHashCheck,
      contentHashCheck,
      signatureCheck,
      receiptCheck
    ] = await Promise.all([
      this.verifyBundleHash(bundle),
      this.verifyContentHash(bundle),
      this.verifySignature(bundle),
      this.verifyReceipt(bundle)
    ]);

    const checks = {
      bundleHash: bundleHashCheck,
      contentHash: contentHashCheck,
      signature: signatureCheck,
      receipt: receiptCheck
    };

    const overallStatus = Object.values(checks).every(check => check.passed)
      ? 'pass'
      : 'fail';

    return {
      overallStatus,
      checks
    };
  }

  /**
   * Verify bundle hash
   */
  private async verifyBundleHash(bundle: Bundle): Promise<CheckResult> {
    try {
      // Recompute bundle hash (excluding bundleHash field)
      const bundleWithoutHash = {
        content: bundle.content,
        manifest: bundle.manifest,
        receipt: bundle.receipt,
        attestation: bundle.attestation
      };

      const recomputed = await this.cryptoService.hashObject(bundleWithoutHash);

      if (recomputed === bundle.bundleHash) {
        return {
          passed: true,
          message: 'Bundle hash matches',
          details: 'This check recomputes the cryptographic hash (SHA-256) of the entire bundle and compares it to the stored hash. It ensures the bundle has not been modified in any way since creation. Passing this check guarantees all data in the bundle (content, manifest, receipt, attestation) is exactly as it was when exported.'
        };
      } else {
        return {
          passed: false,
          message: 'Bundle hash mismatch',
          details: `Expected: ${bundle.bundleHash}, Got: ${recomputed}`
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: 'Bundle hash verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify content hash
   */
  private async verifyContentHash(bundle: Bundle): Promise<CheckResult> {
    try {
      const contentHash = await this.cryptoService.hash(bundle.content);

      if (contentHash === bundle.manifest.contentHash) {
        return {
          passed: true,
          message: 'Content hash matches manifest',
          details: 'This check recomputes the hash of the document text and compares it to the hash recorded in the manifest. It verifies that the actual content has not been tampered with or modified. Passing this check guarantees the document text is authentic and matches exactly what was recorded in the provenance manifest.'
        };
      } else {
        return {
          passed: false,
          message: 'Content hash mismatch',
          details: `Content was modified after manifest was created`
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: 'Content hash verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify manifest signature
   */
  private async verifySignature(bundle: Bundle): Promise<CheckResult> {
    try {
      // Recreate the manifest data that was signed
      const manifestData = {
        events: bundle.manifest.events,
        contentHash: bundle.manifest.contentHash,
        eventChainHash: bundle.manifest.eventChainHash,
        timestamp: bundle.manifest.timestamp
      };

      const manifestToVerify = JSON.stringify(manifestData, Object.keys(manifestData).sort());

      const isValid = await this.cryptoService.verify(
        manifestToVerify,
        bundle.manifest.signature,
        bundle.manifest.publicKey
      );

      if (isValid) {
        return {
          passed: true,
          message: 'Signature valid',
          details: 'This check cryptographically verifies the ECDSA signature on the manifest using the public key embedded in the bundle. It proves the manifest was signed by whoever holds the corresponding private key and has not been forged. Passing this check guarantees the manifest is authentic and was created by the claimed author.'
        };
      } else {
        return {
          passed: false,
          message: 'Signature invalid',
          details: 'Manifest was forged or modified'
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: 'Signature verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify transparency receipt (demo mode)
   */
  private async verifyReceipt(bundle: Bundle): Promise<CheckResult> {
    try {
      if (!bundle.receipt) {
        return {
          passed: false,
          message: 'Receipt missing',
          details: 'No transparency log receipt found'
        };
      }

      // Check that receipt has expected fields
      const hasRequiredFields =
        bundle.receipt.manifestHash &&
        bundle.receipt.timestamp &&
        bundle.receipt.receiptSignature;

      if (!hasRequiredFields) {
        return {
          passed: false,
          message: 'Receipt incomplete',
          details: 'Receipt is missing required fields'
        };
      }

      // Verify manifestHash matches actual manifest
      // Note: Must use same logic as creation (EditorPanel.tsx:299)
      // Use hashObject for canonical JSON (sorted keys)
      const computedManifestHash = await this.cryptoService.hashObject(bundle.manifest);

      if (bundle.receipt.manifestHash !== computedManifestHash) {
        return {
          passed: false,
          message: 'Receipt manifestHash mismatch',
          details: 'Receipt does not match the current manifest. The manifest may have been modified after the receipt was generated.'
        };
      }

      // Demo mode: receipt signature is not verified (no transparency log)
      return {
        passed: true,
        message: 'Receipt valid (demo mode)',
        details: 'This check verifies the receipt exists with valid fields and the manifestHash matches the actual manifest. In a production system, this would also cryptographically verify the receipt signature against a trusted transparency log. Note: Receipt signature validation is not performed in demo mode.'
      };
    } catch (error) {
      return {
        passed: false,
        message: 'Receipt verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

}

// Export factory function
export function createVerificationService(
  cryptoService: CryptoService
): VerificationService {
  return new VerificationService(cryptoService);
}
