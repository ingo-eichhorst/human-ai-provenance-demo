import { PendingChange, UserInteraction } from '../types/provenance';
import type { C2PAAction, C2PAExternalManifest, SCITTReceipt } from '../types/c2pa';

export interface AppState {
  config: {
    apiKey: string | null;
    initialized: boolean;
  };
  crypto: {
    publicKey: string | null;  // JWK string
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
  // Replace provenance/manifest/receipt/attestation with c2pa
  c2pa: {
    actions: C2PAAction[];
    manifest: C2PAExternalManifest | null;
    scittReceipt: SCITTReceipt | null;
  };
  ui: {
    isProcessingAI: boolean;
    isSigning: boolean;
    isAnchoring: boolean; // Track SCITT submission
    lastError: string | null;
    showStarterPrompts: boolean;
    activeTab: 'editor' | 'verifier';
  };
}
