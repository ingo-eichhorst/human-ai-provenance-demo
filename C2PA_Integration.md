# C2PA Integration Guide: A2UI Provenance Demo

## Document Purpose

This document outlines how to integrate C2PA (Coalition for Content Provenance and Authenticity) and its SDKs into the A2UI Provenance Demo. It identifies what concepts can be kept, what needs to change, and provides concrete integration pathways.

---

## Part 1: Current State Analysis

### What A2UI Does Today

The demo tracks content provenance through:

```
┌─────────────────────────────────────────────────────────┐
│  Bundle (JSON export)                                    │
│  ├── content: string                                     │
│  ├── manifest                                            │
│  │   ├── events[]: ProvenanceEvent[]                    │
│  │   ├── contentHash: SHA-256                           │
│  │   ├── eventChainHash: cumulative hash                │
│  │   ├── signature: ECDSA P-256 (base64)                │
│  │   ├── publicKey: JWK                                 │
│  │   └── timestamp                                       │
│  ├── receipt (simulated)                                 │
│  └── attestation                                         │
└─────────────────────────────────────────────────────────┘
```

### Key Services

| Service | Role | File |
|---------|------|------|
| `CryptoService` | SHA-256 hashing, ECDSA signing | `src/services/CryptoService.ts` |
| `ProvenanceService` | Event creation, chain computation | `src/services/ProvenanceService.ts` |
| `BundleService` | Export bundle creation | `src/services/BundleService.ts` |
| `VerificationService` | Bundle validation | `src/services/VerificationService.ts` |

---

## Part 2: C2PA Architecture

### C2PA Manifest Structure

```
┌─────────────────────────────────────────────────────────┐
│  C2PA MANIFEST STORE (JUMBF container)                   │
│  ├── Manifest URN: urn:c2pa:[UUID]                       │
│  └── Claim (signed with COSE)                            │
│      ├── claim_generator_info                            │
│      │   ├── name: "A2UI Provenance Demo"               │
│      │   └── version: "1.0.0"                           │
│      ├── created_assertions[]                            │
│      │   ├── c2pa.hash.data (hard binding)              │
│      │   └── c2pa.actions                                │
│      │       └── actions[]                               │
│      │           ├── action: "c2pa.created"             │
│      │           ├── action: "c2pa.edited"              │
│      │           ├── digitalSourceType                   │
│      │           └── parameters: {...}                   │
│      ├── signature (COSE, X.509 certificate)             │
│      └── timestamp (RFC 3161 optional)                   │
└─────────────────────────────────────────────────────────┘
```

### Available SDKs

| SDK | Platform | Status | Size | Use Case |
|-----|----------|--------|------|----------|
| **@contentauth/c2pa-web** | Browser | Production | ~2MB WASM | Read/validate manifests in browser |
| **@contentauth/c2pa-node-v2** | Node.js | Production | Native | Create/sign manifests server-side |
| **@trustnxt/c2pa-ts** | Any | Development | Pure TS | Lightweight, no WASM dependency |

---

## Part 3: Concept Mapping

### What Can Be KEPT (Compatible)

| Current Concept | Status | Notes |
|-----------------|--------|-------|
| SHA-256 hashing | ✅ Keep | C2PA uses same algorithm |
| ECDSA P-256 signatures | ✅ Keep | C2PA supports this curve |
| Content hashing | ✅ Keep | Maps to C2PA "hard binding" |
| Event ordering | ✅ Keep | Maps to C2PA "actions" assertion |
| Human/AI attribution | ✅ Keep | Maps to C2PA `digitalSourceType` |
| Timestamp tracking | ✅ Keep | Maps to C2PA timestamp/RFC 3161 |
| Verification logic | ⚠️ Adapt | Similar flow, different format |

### What MUST CHANGE

| Current Concept | Required Change | Why |
|-----------------|-----------------|-----|
| **JWK ephemeral keys** | → X.509 certificates | C2PA requires PKI, no ephemeral keys |
| **Custom JSON bundle** | → JUMBF/sidecar | C2PA uses JUMBF format, embedded or external |
| **Base64 signature** | → COSE signature | C2PA uses CBOR Object Signing (RFC 8152) |
| **ProvenanceEvent type** | → c2pa.actions assertion | Different schema structure |
| **eventChainHash** | → Ingredient references | C2PA chains via ingredient manifests |
| **Receipt (simulated)** | → RFC 3161 timestamp | Real timestamp authority needed |

---

## Part 4: Integration Architecture

### Recommended Approach: Hybrid Model

Keep the current demo for educational purposes while adding C2PA export capability:

```
┌─────────────────────────────────────────────────────────┐
│                    A2UI Application                      │
│                                                          │
│  ┌─────────────┐         ┌─────────────┐                │
│  │   Editor    │────────▶│   State     │                │
│  │   Panel     │         │  (Context)  │                │
│  └─────────────┘         └──────┬──────┘                │
│                                 │                        │
│                    ┌────────────┴────────────┐          │
│                    ▼                         ▼          │
│          ┌─────────────────┐      ┌─────────────────┐  │
│          │ ProvenanceService│      │  C2PAService    │  │
│          │ (current format) │      │  (NEW - export) │  │
│          └────────┬────────┘      └────────┬────────┘  │
│                   │                        │            │
│                   ▼                        ▼            │
│          ┌─────────────────┐      ┌─────────────────┐  │
│          │  BundleService  │      │ c2pa-node-v2    │  │
│          │  (JSON export)  │      │ (PDF/image)     │  │
│          └─────────────────┘      └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Part 5: Implementation Plan

### Phase 1: C2PA Type Alignment (No SDK Required)

**Goal**: Refactor internal types to use C2PA vocabulary for educational clarity.

**Files to modify**:
- `src/types/provenance.ts`
- `src/services/ProvenanceService.ts`

**Changes**:

```typescript
// BEFORE: src/types/provenance.ts
interface ProvenanceEvent {
  id: string;
  actor: 'human' | 'ai';
  timestamp: number;
  range: { start: number; end: number };
  beforeText: string;
  afterText: string;
  beforeHash: string;
  afterHash: string;
  aiMetadata?: { model: string; promptHash: string; responseHash: string; };
}

// AFTER: C2PA-aligned vocabulary
interface C2PAAction {
  action: 'c2pa.created' | 'c2pa.edited' | 'c2pa.opened';
  when: string;  // ISO 8601 timestamp (C2PA format)
  softwareAgent?: string;  // C2PA field name
  digitalSourceType?: DigitalSourceType;  // C2PA enumeration
  parameters?: {
    description?: string;
    'ai:model'?: string;      // C2PA AI namespace
    'ai:promptHash'?: string;
    'ai:responseHash'?: string;
    changeRange?: { start: number; end: number };
  };
}

type DigitalSourceType =
  | 'http://cv.iptc.org/newscodes/digitalsourcetype/humanEdited'
  | 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia';
```

### Phase 2: C2PA Export Service (Backend Required)

**Goal**: Generate real C2PA manifests for PDF export.

**Dependencies**:
```json
{
  "dependencies": {
    "@contentauth/c2pa-node-v2": "^0.5.0"
  }
}
```

**Architecture Decision**: C2PA signing requires server-side code because:
1. Private keys must not be exposed to browser
2. Certificate chain must be configured
3. WASM-based browser signing is read-only

**New Service**: `src/services/C2PAExportService.ts`

```typescript
// Server-side only (Express/Node.js backend)
import { Builder, LocalSigner } from '@contentauth/c2pa-node-v2';

export class C2PAExportService {
  private signer: LocalSigner;

  constructor(certPath: string, keyPath: string) {
    this.signer = LocalSigner.newSigner(
      fs.readFileSync(certPath),
      fs.readFileSync(keyPath),
      'es256',  // ECDSA P-256
      'http://timestamp.digicert.com'  // RFC 3161 TSA
    );
  }

  async exportToPDF(
    content: string,
    actions: C2PAAction[],
    inputPdf: Buffer
  ): Promise<Buffer> {
    const builder = Builder.new();

    // Add claim generator info (maps to current attestation)
    builder.setClaimGeneratorInfo({
      name: 'A2UI Provenance Demo',
      version: '1.0.0'
    });

    // Add actions assertion (maps to current events[])
    builder.addAssertion('c2pa.actions', {
      actions: actions.map(a => this.convertToC2PAAction(a))
    });

    // Sign and embed in PDF
    const outputPdf = await builder.sign(
      this.signer,
      inputPdf,
      'application/pdf'
    );

    return outputPdf;
  }

  private convertToC2PAAction(action: C2PAAction) {
    return {
      action: action.action,
      when: action.when,
      softwareAgent: action.softwareAgent,
      digitalSourceType: action.digitalSourceType,
      parameters: action.parameters
    };
  }
}
```

### Phase 3: Browser-Side C2PA Verification

**Goal**: Verify uploaded C2PA files in the VerifierPanel.

**Dependencies**:
```json
{
  "dependencies": {
    "@contentauth/c2pa-web": "^0.2.0"
  }
}
```

**Integration**: `src/services/C2PAVerifyService.ts`

```typescript
import { createC2pa, C2paReadResult } from '@contentauth/c2pa-web';
import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

export class C2PAVerifyService {
  private c2pa: Awaited<ReturnType<typeof createC2pa>> | null = null;

  async initialize(): Promise<void> {
    this.c2pa = await createC2pa({
      wasmSrc,
      workerSrc: '/c2pa-worker.js'  // Optional web worker
    });
  }

  async verifyFile(file: File): Promise<C2PAVerificationResult> {
    if (!this.c2pa) throw new Error('C2PA not initialized');

    const result = await this.c2pa.read(file);

    if (!result.manifestStore) {
      return { valid: false, reason: 'No C2PA manifest found' };
    }

    const activeManifest = result.manifestStore.activeManifest;

    return {
      valid: result.manifestStore.validationStatus.length === 0,
      claimGenerator: activeManifest.claimGenerator,
      actions: this.extractActions(activeManifest),
      signature: {
        issuer: activeManifest.signatureInfo?.issuer,
        time: activeManifest.signatureInfo?.time
      },
      validationErrors: result.manifestStore.validationStatus
    };
  }

  private extractActions(manifest: any): C2PAAction[] {
    const actionsAssertion = manifest.assertions?.find(
      (a: any) => a.label === 'c2pa.actions'
    );
    return actionsAssertion?.data?.actions || [];
  }
}
```

---

## Part 6: Certificate Strategy

### The Problem

C2PA requires X.509 certificates from a recognized Certificate Authority. Options:

### Option A: Test Certificates (Development Only)

Generate self-signed certs for development:

```bash
# Generate test certificate (NOT FOR PRODUCTION)
openssl req -x509 -newkey ec:<(openssl ecparam -name prime256v1) \
  -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=A2UI Demo/O=Demo Organization"
```

**Limitation**: Self-signed certs will show as "untrusted" in Content Credentials tools.

### Option B: CAI Test Credentials (Development)

The Content Authenticity Initiative provides test credentials:
- Sign up at [Content Credentials](https://contentcredentials.org/)
- Use their development credentials

### Option C: Production Certificates (Production Only)

For production deployment, obtain certificates from:
- DigiCert
- GlobalSign
- Other C2PA-recognized CAs

**Cost**: Typically $200-500/year for code signing certificates.

---

## Part 7: File Format Considerations

### Current State: Text Only

A2UI works with plain text. C2PA is designed for binary media files.

### Integration Options

| Export Format | C2PA Support | Implementation |
|---------------|--------------|----------------|
| **PDF** | ✅ Full support | Generate PDF with text, embed manifest |
| **PNG (screenshot)** | ✅ Full support | Render text as image, embed manifest |
| **JSON sidecar** | ⚠️ External manifest | Keep current bundle + add .c2pa sidecar |
| **Plain text** | ❌ Not supported | Text files can't embed JUMBF |

### Recommended: PDF Export

```typescript
// Convert text content to PDF with C2PA manifest
async function exportAsC2PAPDF(content: string, events: C2PAAction[]) {
  // 1. Generate PDF from text (using pdf-lib or similar)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  page.drawText(content, { x: 50, y: page.getHeight() - 50 });
  const pdfBytes = await pdfDoc.save();

  // 2. Add C2PA manifest via backend service
  const signedPdf = await c2paExportService.exportToPDF(
    content,
    events,
    Buffer.from(pdfBytes)
  );

  return signedPdf;
}
```

---

## Part 8: Migration Path Summary

### Immediate (No Breaking Changes)

1. **Add C2PA glossary** to README.md explaining concept mappings
2. **Add JSDoc comments** referencing C2PA equivalents in type definitions
3. **Update SPEC.md** with C2PA alignment notes

### Short Term (Type Refactoring)

1. Rename `ProvenanceEvent` → `Action` (or keep both with mapping)
2. Add `digitalSourceType` field for AI attribution
3. Use ISO 8601 timestamps (C2PA format)
4. Add `softwareAgent` field

### Medium Term (SDK Integration)

1. Add backend service for C2PA signing (Node.js required)
2. Implement PDF export with embedded manifests
3. Add C2PA file verification in VerifierPanel
4. Configure development certificates

### Long Term (Full Production)

1. Obtain production X.509 certificates
2. Integrate with timestamp authority (RFC 3161)
3. Support ingredient chains for version tracking
4. Register with C2PA trust list (optional)

---

## Part 9: What to Keep vs. Change Summary

### ✅ KEEP

| Component | Reason |
|-----------|--------|
| `CryptoService` hashing | SHA-256 is C2PA compatible |
| `CryptoService` ECDSA | P-256 curve is C2PA compatible |
| Event ordering concept | Maps directly to C2PA actions |
| Content hash verification | Maps to C2PA hard binding |
| Actor attribution | Maps to digitalSourceType |
| State management | Architectural pattern unaffected |
| UI components | No changes required |
| Verification flow | Similar pattern, different format |

### ⚠️ ADAPT

| Component | Change |
|-----------|--------|
| `ProvenanceEvent` type | Add C2PA-aligned fields |
| `BundleService` | Add C2PA export option |
| `VerificationService` | Add C2PA format support |
| Timestamp format | Use ISO 8601 |

### ❌ REPLACE (for C2PA export only)

| Component | Replacement |
|-----------|-------------|
| JWK key format | X.509 certificates |
| Custom signature format | COSE signatures |
| JSON bundle format | JUMBF container |
| Simulated receipt | RFC 3161 timestamp |

---

## Sources

- [C2PA Official Site](https://c2pa.org/)
- [C2PA Specification v2.2](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html)
- [C2PA Implementation Guidance](https://spec.c2pa.org/specifications/specifications/2.2/guidance/Guidance.html)
- [c2pa-js GitHub](https://github.com/contentauth/c2pa-js)
- [c2pa-node-v2 GitHub](https://github.com/contentauth/c2pa-node-v2)
- [c2pa-ts GitHub](https://github.com/TrustNXT/c2pa-ts)
- [Content Authenticity Initiative Tools](https://opensource.contentauthenticity.org/)
- [C2PA Manifest Examples](https://opensource.contentauthenticity.org/docs/manifest/manifest-examples/)
