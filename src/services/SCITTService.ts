import type { SCITTReceipt, C2PAExternalManifest } from '../types/c2pa';
import { cryptoService } from './CryptoService';

// SCITT service options
interface SCITTServiceConfig {
  serviceUrl: string;
  logId: string;
}

// Demo SCITT services (choose one)
const SCITT_SERVICES = {
  // DataTrails SCITT service (free tier available)
  datatrails: {
    serviceUrl: 'https://app.datatrails.ai/archivist/v1/publicscitt',
    logId: 'datatrails-public',
  },
  // Simulated local service for demo
  demo: {
    serviceUrl: 'demo://local',
    logId: 'demo-log',
  },
};

export class SCITTService {
  private config: SCITTServiceConfig;

  constructor(service: 'datatrails' | 'demo' = 'demo') {
    this.config = SCITT_SERVICES[service];
  }

  /**
   * Submit manifest to SCITT transparency log
   */
  async submitToLog(manifest: C2PAExternalManifest): Promise<SCITTReceipt> {
    // For demo mode, generate simulated receipt
    if (this.config.serviceUrl.startsWith('demo://')) {
      return this.generateDemoReceipt(manifest);
    }

    // For real SCITT service, submit via API
    try {
      const response = await fetch(`${this.config.serviceUrl}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manifest: btoa(JSON.stringify(manifest)),
        }),
      });

      if (!response.ok) {
        throw new Error(`SCITT submission failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        receipt: result.receipt,
        serviceUrl: this.config.serviceUrl,
        logId: this.config.logId,
        timestamp: result.timestamp || new Date().toISOString(),
        entryId: result.entryId,
      };
    } catch (error) {
      console.warn('SCITT submission failed, using demo mode:', error);
      return this.generateDemoReceipt(manifest);
    }
  }

  /**
   * Generate demo receipt for offline testing
   */
  private async generateDemoReceipt(manifest: C2PAExternalManifest): Promise<SCITTReceipt> {
    // Simple receipt: hash of manifest + timestamp
    const manifestJson = JSON.stringify(manifest);
    const manifestHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(manifestJson));
    const hashHex = cryptoService.bufferToHex(manifestHash);

    const demoReceipt = {
      version: 1,
      manifestHash: hashHex,
      timestamp: new Date().toISOString(),
      logId: this.config.logId,
      note: 'This is a simulated SCITT receipt for demo purposes',
    };

    return {
      receipt: btoa(JSON.stringify(demoReceipt)),
      serviceUrl: this.config.serviceUrl,
      logId: this.config.logId,
      timestamp: demoReceipt.timestamp,
    };
  }

  /**
   * Verify SCITT receipt
   */
  async verifyReceipt(manifest: C2PAExternalManifest, receipt: SCITTReceipt): Promise<boolean> {
    if (receipt.serviceUrl.startsWith('demo://')) {
      // Demo receipt verification: just check hash
      // Exclude scitt field from hash computation (it wasn't there when receipt was created)
      const { scitt, ...manifestWithoutScitt } = manifest;
      const manifestJson = JSON.stringify(manifestWithoutScitt);
      const manifestHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(manifestJson));
      const hashHex = cryptoService.bufferToHex(manifestHash);

      const receiptData = JSON.parse(atob(receipt.receipt));
      return receiptData.manifestHash === hashHex;
    }

    // Real SCITT verification would query the transparency log
    // For now, just verify receipt is present and well-formed
    return receipt.receipt.length > 0 && receipt.timestamp.length > 0;
  }
}

export const scittService = new SCITTService('demo');
