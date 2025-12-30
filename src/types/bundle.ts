import { ProvenanceEvent } from './provenance';

export interface Manifest {
  events: ProvenanceEvent[];
  contentHash: string;
  eventChainHash: string;
  signature: string;
  publicKey: string;
  timestamp: number;
}

export interface Receipt {
  manifestHash: string;
  timestamp: number;
  receiptSignature: string;
}

export interface Attestation {
  toolName: string;
  version: string;
  approved: boolean;
}

export interface Bundle {
  content: string;
  manifest: Manifest;
  receipt: Receipt;
  attestation: Attestation;
  bundleHash: string;
}
