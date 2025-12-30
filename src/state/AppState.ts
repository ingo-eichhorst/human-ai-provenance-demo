import { ProvenanceEvent, PendingChange, UserInteraction } from '../types/provenance';
import { Manifest, Receipt, Attestation } from '../types/bundle';

export interface AppState {
  config: {
    apiKey: string | null;
    initialized: boolean;
  };
  crypto: {
    publicKey: string | null;
    privateKey: CryptoKey | null;
  };
  content: {
    text: string;
    hash: string;
    selection: { start: number; end: number } | null;
  };
  pendingChange: {
    data: PendingChange | null;
    isGenerating: boolean;
  };
  userInteractions: UserInteraction[];
  provenance: {
    events: ProvenanceEvent[];
    eventChainHash: string;
  };
  manifest: {
    data: Manifest | null;
    hash: string | null;
    signatureStatus: 'valid' | 'invalid' | 'unsigned';
  };
  receipt: {
    data: Receipt | null;
    status: 'present' | 'missing';
  };
  attestation: {
    data: Attestation;
    status: 'approved';
  };
  ui: {
    isProcessingAI: boolean;
    lastError: string | null;
    showStarterPrompts: boolean;
    activeTab: 'editor' | 'verifier';
  };
}
