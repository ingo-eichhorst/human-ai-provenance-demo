import { Bundle, Manifest, Receipt, Attestation } from '../types/bundle';
import { CryptoService } from './CryptoService';
import { copyToClipboard } from '../utils/clipboard';

export class BundleService {
  constructor(private cryptoService: CryptoService) {}

  /**
   * Create export bundle from current state
   */
  async createBundle(
    content: string,
    manifest: Manifest,
    receipt: Receipt,
    attestation: Attestation
  ): Promise<Bundle> {
    // Assemble bundle without bundleHash first
    const bundleWithoutHash = {
      content,
      manifest,
      receipt,
      attestation
    };

    // Compute bundleHash (canonical JSON, excluding bundleHash field itself)
    const bundleHash = await this.cryptoService.hashObject(bundleWithoutHash);

    // Return complete bundle with hash
    return {
      ...bundleWithoutHash,
      bundleHash
    };
  }

  /**
   * Serialize bundle to JSON string
   */
  serializeBundle(bundle: Bundle): string {
    // Pretty-print JSON with sorted keys for readability
    const sortKeys = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sortKeys);
      } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj)
          .sort()
          .reduce((result: any, key) => {
            result[key] = sortKeys(obj[key]);
            return result;
          }, {});
      }
      return obj;
    };

    const sorted = sortKeys(bundle);
    return JSON.stringify(sorted, null, 2);
  }

  /**
   * Parse bundle from JSON string
   */
  parseBundle(json: string): Bundle {
    return JSON.parse(json);
  }

  /**
   * Copy bundle to clipboard
   */
  async copyBundleToClipboard(bundle: Bundle): Promise<void> {
    const json = this.serializeBundle(bundle);
    await copyToClipboard(json);
  }
}

// Export factory function
export function createBundleService(cryptoService: CryptoService): BundleService {
  return new BundleService(cryptoService);
}
