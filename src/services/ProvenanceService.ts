import { v4 as uuidv4 } from 'uuid';
import { ProvenanceEvent } from '../types/provenance';
import { Manifest } from '../types/bundle';
import { CryptoService } from './CryptoService';

export class ProvenanceService {
  constructor(private cryptoService: CryptoService) {}

  /**
   * Create a human edit event
   */
  createHumanEvent(params: {
    range: { start: number; end: number };
    beforeText: string;
    afterText: string;
    beforeHash: string;
    afterHash: string;
    decision?: {
      pendingChangeId: string;
      source: 'ai-generate' | 'ai-rewrite' | 'manual-edit';
    };
  }): ProvenanceEvent {
    const event: ProvenanceEvent = {
      id: uuidv4(),
      actor: 'human',
      timestamp: Date.now(),
      range: params.range,
      beforeText: params.beforeText,
      afterText: params.afterText,
      beforeHash: params.beforeHash,
      afterHash: params.afterHash
    };

    if (params.decision) {
      event.decision = {
        type: 'accept',
        pendingChangeId: params.decision.pendingChangeId,
        source: params.decision.source,
        timestamp: Date.now()
      };
    }

    return event;
  }

  /**
   * Create an AI edit event
   */
  createAIEvent(params: {
    range: { start: number; end: number };
    beforeText: string;
    afterText: string;
    beforeHash: string;
    afterHash: string;
    model: string;
    promptHash: string;
    responseHash: string;
    decision?: {
      pendingChangeId: string;
      source: 'ai-generate' | 'ai-rewrite' | 'manual-edit';
    };
  }): ProvenanceEvent {
    const event: ProvenanceEvent = {
      id: uuidv4(),
      actor: 'ai',
      timestamp: Date.now(),
      range: params.range,
      beforeText: params.beforeText,
      afterText: params.afterText,
      beforeHash: params.beforeHash,
      afterHash: params.afterHash,
      aiMetadata: {
        model: params.model,
        promptHash: params.promptHash,
        responseHash: params.responseHash
      }
    };

    if (params.decision) {
      event.decision = {
        type: 'accept',
        pendingChangeId: params.decision.pendingChangeId,
        source: params.decision.source,
        timestamp: Date.now()
      };
    }

    return event;
  }

  /**
   * Canonically stringify an object with recursively sorted keys
   * This ensures deterministic serialization regardless of property order
   */
  private canonicalStringify(obj: any): string {
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this.canonicalStringify(item)).join(',') + ']';
    } else if (obj !== null && typeof obj === 'object') {
      const sortedKeys = Object.keys(obj).sort();
      const pairs = sortedKeys.map(key =>
        JSON.stringify(key) + ':' + this.canonicalStringify(obj[key])
      );
      return '{' + pairs.join(',') + '}';
    }
    return JSON.stringify(obj);
  }

  /**
   * Compute event chain hash (cumulative)
   * Formula: hash(event_n || hash(event_n-1 || ... || hash(event_0)))
   */
  async computeEventChainHash(events: ProvenanceEvent[]): Promise<string> {
    if (events.length === 0) {
      return '';
    }

    let chainHash = '';
    for (const event of events) {
      const eventData = this.canonicalStringify(event);
      chainHash = await this.cryptoService.hash(eventData + chainHash);
    }

    return chainHash;
  }

  /**
   * Build manifest from current state
   */
  buildManifest(
    events: ProvenanceEvent[],
    contentHash: string,
    eventChainHash: string
  ): Omit<Manifest, 'signature' | 'publicKey'> {
    return {
      events,
      contentHash,
      eventChainHash,
      timestamp: Date.now()
    };
  }
}

// Export factory function
export function createProvenanceService(cryptoService: CryptoService): ProvenanceService {
  return new ProvenanceService(cryptoService);
}
