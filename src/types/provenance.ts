export interface ProvenanceEvent {
  id: string;
  actor: 'human' | 'ai';
  timestamp: number;
  range: {
    start: number;
    end: number;
  };
  beforeText: string;
  afterText: string;
  beforeHash: string;
  afterHash: string;
  aiMetadata?: {
    model: string;
    promptHash: string;
    responseHash: string;
  };
  decision?: {
    type: 'accept';
    pendingChangeId: string;
    source: 'ai-generate' | 'ai-rewrite' | 'manual-edit';
    timestamp: number;
  };
}

export interface PendingChange {
  id: string;
  source: 'ai-generate' | 'ai-rewrite' | 'manual-edit';
  originalText: string;
  proposedText: string;
  originalHash: string;
  proposedHash: string;
  range?: { start: number; end: number };
  timestamp: number;
  aiMetadata?: {
    model: string;
    promptHash: string;
    responseHash: string;
    promptText?: string;
  };
}

export type UserInteractionType =
  | 'text-selection'
  | 'accept-change'
  | 'reject-change'
  | 'starter-prompt-click';

export interface UserInteraction {
  id: string;
  type: UserInteractionType;
  timestamp: number;
  metadata?: {
    start?: number;
    end?: number;
    selectedText?: string;
    pendingChangeId?: string;
    changeSource?: string;
    promptText?: string;
  };
}
