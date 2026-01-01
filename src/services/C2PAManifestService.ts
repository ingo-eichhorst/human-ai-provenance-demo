import { v4 as uuidv4 } from 'uuid';
import { cryptoService } from './CryptoService';
import type {
  C2PAAction,
  C2PAClaim,
  C2PAExternalManifest,
  C2PAHashAssertion,
  C2PAActionsAssertion,
  COSESignature,
} from '../types/c2pa';

export class C2PAManifestService {
  /**
   * Build C2PA claim from content and actions
   */
  async buildClaim(
    content: string,
    actions: C2PAAction[],
    format: string = 'text/plain'
  ): Promise<C2PAClaim> {
    const contentHash = await cryptoService.hash(content);

    // Create hash assertion (hard binding)
    const hashAssertion: C2PAHashAssertion = {
      name: 'sha256',
      hash: contentHash,
    };

    // Create actions assertion
    const actionsAssertion: C2PAActionsAssertion = {
      actions,
    };

    return {
      'dc:format': format,
      instanceId: uuidv4(),
      claimGenerator: 'Human+AI Provenance Demo',
      claimGeneratorInfo: {
        name: 'Human+AI Provenance Demo',
        version: '1.0.0',
      },
      assertions: [
        { label: 'c2pa.hash.data', data: hashAssertion },
        { label: 'c2pa.actions', data: actionsAssertion },
      ],
    };
  }

  /**
   * Sign claim using COSE (CBOR Object Signing)
   * Simplified COSE for demo - uses JSON + base64 instead of CBOR
   */
  async signClaim(claim: C2PAClaim, privateKey: CryptoKey): Promise<COSESignature> {
    // COSE protected headers (simplified)
    const protectedHeaders = {
      alg: -7, // ECDSA w/ SHA-256 (COSE algorithm ID)
      kid: 'demo-key-1', // Key ID
    };

    // Encode protected headers
    const protectedBase64 = btoa(JSON.stringify(protectedHeaders));

    // Encode payload (claim)
    const payloadBase64 = btoa(JSON.stringify(claim));

    // Create signing data: protected || payload
    const signingData = `${protectedBase64}.${payloadBase64}`;

    // Sign with ECDSA
    const signature = await cryptoService.sign(signingData, privateKey);

    // Get public key for verification
    const publicKey = cryptoService.exportPublicKey();
    if (!publicKey) {
      throw new Error('Public key not available for signing');
    }

    return {
      protected: protectedBase64,
      payload: payloadBase64,
      signature,
      publicKey,
    };
  }

  /**
   * Create complete external manifest
   */
  async createExternalManifest(
    content: string,
    actions: C2PAAction[],
    privateKey: CryptoKey
  ): Promise<C2PAExternalManifest> {
    // Build claim
    const claim = await this.buildClaim(content, actions);

    // Sign claim
    const signature = await this.signClaim(claim, privateKey);

    // Add signature to claim
    const signedClaim: C2PAClaim = {
      ...claim,
      signature,
    };

    return {
      '@context': 'https://c2pa.org/specifications/manifest/v2.0',
      claim: signedClaim,
    };
  }

  /**
   * Serialize manifest to JSON for export
   */
  serializeManifest(manifest: C2PAExternalManifest): string {
    return JSON.stringify(manifest, null, 2);
  }
}

export const c2paManifestService = new C2PAManifestService();
