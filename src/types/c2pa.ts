// ============================================================================
// C2PA Action Types (replaces ProvenanceEvent)
// ============================================================================

export type C2PAActionType =
  | 'c2pa.created'
  | 'c2pa.edited'
  | 'c2pa.opened';

// IPTC Digital Source Type vocabulary
export type DigitalSourceType =
  | 'http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits'
  | 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia';

// C2PA Action assertion
export interface C2PAAction {
  action: C2PAActionType;
  when: string; // ISO 8601 timestamp
  softwareAgent?: string; // e.g., "A2UI Provenance Demo/1.0.0"
  digitalSourceType?: DigitalSourceType;
  parameters?: {
    description?: string;
    aiModel?: string;
    promptHash?: string;
    responseHash?: string;
    beforeHash?: string;
    afterHash?: string;
    changeRange?: { start: number; end: number };
  };
}

// ============================================================================
// C2PA Manifest Structure (External Sidecar)
// ============================================================================

// C2PA Claim (core of the manifest)
export interface C2PAClaim {
  'dc:title'?: string;
  'dc:format': string; // MIME type of asset
  instanceId: string; // UUID for this claim
  claimGenerator: string; // Tool identifier
  claimGeneratorInfo?: {
    name: string;
    version: string;
  };
  assertions: C2PAAssertion[];
  signature?: COSESignature; // Added after signing
}

// C2PA Assertion wrapper
export interface C2PAAssertion {
  label: string; // e.g., "c2pa.actions", "c2pa.hash.data"
  data: unknown; // Assertion-specific data
}

// Hard binding assertion (links manifest to content)
export interface C2PAHashAssertion {
  name: 'sha256'; // Hash algorithm
  hash: string; // Hex-encoded hash of content
}

// Actions assertion
export interface C2PAActionsAssertion {
  actions: C2PAAction[];
}

// ============================================================================
// COSE Signature (CBOR Object Signing and Encryption)
// ============================================================================

export interface COSESignature {
  protected: string; // Base64-encoded protected headers
  unprotected?: {
    x5chain?: string[]; // Certificate chain (optional for demo)
  };
  payload: string; // Base64-encoded claim data
  signature: string; // Base64-encoded signature bytes
}

// ============================================================================
// SCITT (Supply Chain Integrity, Transparency and Trust)
// ============================================================================

export interface SCITTReceipt {
  receipt: string; // Base64-encoded COSE receipt from SCITT service
  serviceUrl: string; // SCITT transparency service endpoint
  logId: string; // Transparency log identifier
  timestamp: string; // ISO 8601 timestamp from log
  entryId?: string; // Optional log entry identifier
}

// ============================================================================
// C2PA External Manifest (complete sidecar file)
// ============================================================================

export interface C2PAExternalManifest {
  '@context': 'https://c2pa.org/specifications/manifest/v2.0';
  claim: C2PAClaim;
  scitt?: SCITTReceipt; // Optional SCITT transparency receipt
}

// ============================================================================
// Verification Types
// ============================================================================

export interface CheckResult {
  passed: boolean;
  message: string;
}

export interface C2PAVerificationResult {
  valid: boolean;
  checks: {
    contentHash: CheckResult; // Content matches manifest hash
    signatureValid: CheckResult; // COSE signature valid
    scittReceipt: CheckResult; // SCITT receipt valid (if present)
  };
  manifest?: C2PAExternalManifest;
  errors: string[];
}
