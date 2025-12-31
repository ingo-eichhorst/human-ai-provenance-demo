import type { C2PAAction } from '../types/c2pa';
import { CryptoService } from './CryptoService';

export class ProvenanceService {
  constructor(_cryptoService: CryptoService) {}

  /**
   * Create a human edit action (C2PA format)
   */
  createHumanAction(params: {
    range: { start: number; end: number };
    beforeText: string;
    afterText: string;
    beforeHash: string;
    afterHash: string;
  }): C2PAAction {
    return {
      action: 'c2pa.edited',
      when: new Date().toISOString(),
      softwareAgent: 'A2UI Provenance Demo/1.0.0',
      digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits',
      parameters: {
        description: 'Human text edit',
        beforeHash: params.beforeHash,
        afterHash: params.afterHash,
        changeRange: params.range,
      },
    };
  }

  /**
   * Create an AI edit action (C2PA format)
   */
  createAIAction(params: {
    range: { start: number; end: number };
    beforeText: string;
    afterText: string;
    beforeHash: string;
    afterHash: string;
    model: string;
    promptHash: string;
    responseHash: string;
  }): C2PAAction {
    return {
      action: 'c2pa.edited',
      when: new Date().toISOString(),
      softwareAgent: 'A2UI Provenance Demo/1.0.0',
      digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
      parameters: {
        description: 'AI-assisted text edit',
        aiModel: params.model,
        promptHash: params.promptHash,
        responseHash: params.responseHash,
        beforeHash: params.beforeHash,
        afterHash: params.afterHash,
        changeRange: params.range,
      },
    };
  }

  // Note: computeEventChainHash and buildManifest removed
  // - Event chain is replaced by SCITT transparency log
  // - Manifest building is now handled by C2PAManifestService
}

// Export factory function
export function createProvenanceService(cryptoService: CryptoService): ProvenanceService {
  return new ProvenanceService(cryptoService);
}
