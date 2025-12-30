import { ProvenanceEvent, PendingChange, UserInteraction } from '../types/provenance';
import { Manifest, Receipt } from '../types/bundle';

export type AppAction =
  | { type: 'INIT_CRYPTO'; payload: { publicKey: string; privateKey: CryptoKey } }
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'UPDATE_CONTENT'; payload: { text: string; hash: string } }
  | { type: 'SET_SELECTION'; payload: { start: number; end: number } | null }
  | { type: 'ADD_EVENT'; payload: ProvenanceEvent }
  | { type: 'UPDATE_EVENT_CHAIN'; payload: string }
  | { type: 'UPDATE_MANIFEST'; payload: Manifest }
  | { type: 'UPDATE_MANIFEST_HASH'; payload: string }
  | { type: 'UPDATE_MANIFEST_STATUS'; payload: 'valid' | 'invalid' | 'unsigned' }
  | { type: 'UPDATE_RECEIPT'; payload: Receipt }
  | { type: 'SET_AI_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CREATE_PENDING_CHANGE'; payload: Omit<PendingChange, 'id' | 'timestamp'> }
  | { type: 'SET_PENDING_GENERATING'; payload: boolean }
  | { type: 'ACCEPT_PENDING_CHANGE' }
  | { type: 'REJECT_PENDING_CHANGE' }
  | { type: 'CANCEL_PENDING_CHANGE' }
  | { type: 'LOG_USER_INTERACTION'; payload: Omit<UserInteraction, 'id' | 'timestamp'> }
  | { type: 'SET_STARTER_PROMPTS_VISIBLE'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: 'editor' | 'verifier' };
