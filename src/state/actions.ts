import { PendingChange, UserInteraction } from '../types/provenance';
import type { C2PAAction, C2PAExternalManifest, SCITTReceipt } from '../types/c2pa';

export type AppAction =
  | { type: 'INIT_CRYPTO'; payload: { publicKey: CryptoKey; privateKey: CryptoKey } }
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'UPDATE_CONTENT'; payload: { text: string; hash: string } }
  | { type: 'SET_SELECTION'; payload: { start: number; end: number } | null }
  // C2PA actions (replace old provenance/manifest/receipt actions)
  | { type: 'ADD_C2PA_ACTION'; payload: C2PAAction }
  | { type: 'UPDATE_C2PA_MANIFEST'; payload: C2PAExternalManifest }
  | { type: 'UPDATE_SCITT_RECEIPT'; payload: SCITTReceipt }
  | { type: 'CLEAR_C2PA' }
  // UI state actions
  | { type: 'SET_AI_PROCESSING'; payload: boolean }
  | { type: 'SET_SIGNING'; payload: boolean }
  | { type: 'SET_ANCHORING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  // Pending change actions
  | { type: 'CREATE_PENDING_CHANGE'; payload: Omit<PendingChange, 'id' | 'timestamp'> }
  | { type: 'SET_PENDING_GENERATING'; payload: boolean }
  | { type: 'ACCEPT_PENDING_CHANGE' }
  | { type: 'REJECT_PENDING_CHANGE' }
  | { type: 'CANCEL_PENDING_CHANGE' }
  // User interaction tracking
  | { type: 'LOG_USER_INTERACTION'; payload: Omit<UserInteraction, 'id' | 'timestamp'> }
  // UI preferences
  | { type: 'SET_STARTER_PROMPTS_VISIBLE'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: 'editor' | 'verifier' };
