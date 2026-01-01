# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Human+AI Provenance Demo is an educational demonstration of cryptographic content provenance using **C2PA (Coalition for Content Provenance and Authenticity)** standards in an AI-assisted text editing workflow. It tracks human and AI edits using C2PA external manifests, IPTC Digital Source Types, and SCITT transparency log integration.

**⚠️ This is a proof-of-concept demo, NOT production code.**

## Development Commands

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start concurrent frontend (port 3000) + backend (port 3002)
npm run dev:frontend    # Start frontend only (Vite dev server)
npm run server          # Start backend only (Express server)

# Build
npm run build           # TypeScript compile + Vite bundle
npm run preview         # Preview production build

# Code Quality
npm run lint            # ESLint (strict mode, no warnings allowed)
npm run test            # Run Vitest tests
npm run test:run        # Run tests once (CI mode)
```

## Architecture Overview

### State-Driven Service Architecture

The application uses **React Context + useReducer** for global state management with a **service layer** for business logic:

```
UI Components → AppContext (dispatch) → Reducer → AppState → Services
```

**Critical State Shape** (`src/state/AppState.ts`):
- `config`: { apiKey, initialized } - Configuration state
- `crypto`: { publicKey, privateKey } - ECDSA P-256 keypair (ephemeral)
- `content`: { text, hash, selection } - Current editor content
- `pendingChange`: { data, isGenerating } - Uncommitted change workflow
- `userInteractions`: [] - User interaction log
- `c2pa`: { actions[], manifest, scittReceipt } - **C2PA provenance tracking**
- `ui`: { isProcessingAI, isSigning, isAnchoring, lastError, showStarterPrompts, activeTab } - UI state

### Service Layer Architecture

**Services are singletons or factory-created** and handle all business logic:

#### Core Services

1. **CryptoService** (`src/services/CryptoService.ts`) - **Singleton**
   - Web Crypto API wrapper (ECDSA P-256, SHA-256)
   - Key operations: `initialize()`, `hash()`, `sign()`, `verify()`
   - Canonical object hashing: sorts keys deterministically
   - Export: `export const cryptoService = new CryptoService()`

2. **ProvenanceService** (`src/services/ProvenanceService.ts`) - **Factory**
   - Creates C2PA-formatted actions for human and AI edits
   - Uses IPTC Digital Source Type vocabulary:
     - `humanEdits`: http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits
     - `trainedAlgorithmicMedia`: http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia
   - Factory pattern: `createProvenanceService(cryptoService)`
   - Key methods: `createHumanAction()`, `createAIAction()`

3. **AIClientService** (`src/services/AIClientService.ts`) - **Factory**
   - OpenAI API integration (gpt-4o-mini)
   - Text generation and rewriting
   - Hashes prompts and responses for provenance
   - Factory pattern: `createAIClientService(cryptoService)`
   - Key methods: `generateFromPrompt()`, `rewriteText()`

#### C2PA Services

4. **C2PAManifestService** (`src/services/C2PAManifestService.ts`) - **Singleton**
   - Builds C2PA claims with assertions
   - Creates COSE signatures (simplified JSON+base64 for demo, not full CBOR)
   - Generates external manifests (sidecar `.c2pa.json` files)
   - Export: `export const c2paManifestService = new C2PAManifestService()`
   - Key methods:
     - `buildClaim(content, actions, format)` - Creates C2PA claim structure
     - `signClaim(claim, privateKey)` - Creates COSE signature
     - `createExternalManifest(content, actions, privateKey)` - Full manifest creation

5. **C2PAVerificationService** (`src/services/C2PAVerificationService.ts`) - **Singleton**
   - Verifies content + manifest pairs
   - Runs 3 verification checks: content hash, signature, SCITT receipt
   - Export: `export const c2paVerificationService = new C2PAVerificationService()`
   - Key methods: `verify(content, manifestJson)`

6. **SCITTService** (`src/services/SCITTService.ts`) - **Singleton**
   - SCITT (Supply Chain Integrity, Transparency and Trust) integration
   - Demo mode: generates local receipts (not sent to real transparency log)
   - Production mode ready: supports DataTrails public SCITT
   - Export: `export const scittService = new SCITTService()`
   - Key methods:
     - `submitToLog(manifest)` - Submit to transparency log
     - `verifyReceipt(manifest, receipt)` - Verify receipt authenticity

7. **EmbeddedManifestService** (`src/services/EmbeddedManifestService.ts`) - **Singleton**
   - Embeds C2PA manifests as base64 footers in text files
   - Format: `[content]\n\n---C2PA-MANIFEST-START---\n[base64]\n---C2PA-MANIFEST-END---`
   - Export: `export const embeddedManifestService = new EmbeddedManifestService()`
   - Key methods:
     - `embedManifest(content, manifest)` - Add manifest footer
     - `extractManifest(embeddedContent)` - Parse embedded manifest
     - `hasEmbeddedManifest(content)` - Check for markers

#### Export Services

8. **PDFExportService** (`src/services/PDFExportService.ts`) - **Singleton**
   - Creates PDFs from text content using pdf-lib
   - Embeds C2PA manifest as file attachment
   - Export: `export const pdfExportService = new PDFExportService()`
   - Key methods: `createPDFWithManifest(content, manifest, title)`
   - Note: For full JUMBF compliance, use backend C2PA signing

9. **ImageExportService** (`src/services/ImageExportService.ts`) - **Singleton**
   - Renders text content as PNG using HTML Canvas
   - Prepares images for backend C2PA signing
   - Export: `export const imageExportService = new ImageExportService()`
   - Key methods:
     - `renderContentAsImage(content)` - Generate PNG blob
     - `blobToBase64(blob)` - Convert for API transport
     - `downloadBase64AsFile(base64, filename)` - Download signed image

#### Legacy Services (Still Used)

10. **BundleService** (`src/services/BundleService.ts`) - **Factory**
    - Creates legacy export bundles (old format, pre-C2PA)
    - Bundle serialization with sorted keys
    - Factory pattern: `createBundleService(cryptoService, provenanceService)`

11. **VerificationService** (`src/services/VerificationService.ts`) - **Factory**
    - Legacy bundle verification (5 parallel checks)
    - Factory pattern: `createVerificationService(cryptoService, provenanceService)`

### Backend Server (`server/`)

**Express server on port 3002** for real C2PA signing:

- **`server/index.ts`** - Express application
  - CORS enabled for localhost:3000
  - Endpoints:
    - `GET /health` - Health check
    - `POST /api/sign-image` - Sign PNG with C2PA manifest

- **`server/c2paSigningService.ts`** - C2PA signing implementation
  - Uses `@contentauth/c2pa-node` Builder and LocalSigner
  - Signs PNG images with ECDSA (es256) certificates
  - Adds RFC 3161 timestamp via DigiCert TSA
  - Reads certificates from `./server/certs/` (ps256.pub, ps256.pem)
  - Key method: `signImageWithC2PA(imageBuffer, manifest, certPath, keyPath)`

### Data Flow Patterns

#### Pending Change Workflow (NEW)

1. User types in editor → on blur, create `PendingChange` object
2. Compute hashes: `beforeHash`, `afterHash`
3. Display `DiffView` component with word-level diff
4. Show `ActionBar` with Accept/Reject buttons
5. On **Accept**:
   - Update content state
   - Create C2PA action (human or AI based on source)
   - Dispatch `ADD_C2PA_ACTION`
   - Build manifest via `C2PAManifestService`
   - Sign manifest with private key
   - Dispatch `UPDATE_C2PA_MANIFEST`
   - Submit to SCITT via `SCITTService`
   - Dispatch `UPDATE_SCITT_RECEIPT`
   - Clear pending change
6. On **Reject**: Clear pending change without updating state

#### AI Generation Flow

1. User clicks starter prompt (e.g., "Haiku about cats")
2. Call OpenAI API via `AIClientService.generateFromPrompt()`
3. Hash prompt and response
4. Create `PendingChange` with AI metadata
5. Display diff view
6. On accept: Follow pending change workflow → creates C2PA action with `trainedAlgorithmicMedia` source type

#### AI Rewrite Flow

1. User selects text + enters instruction
2. Call `AIClientService.rewriteText(selectedText, instruction)`
3. Hash prompt and response
4. Create `PendingChange` with AI metadata, changeRange
5. On accept: Creates C2PA action with AI metadata (model, promptHash, responseHash)

#### C2PA Action Creation Flow

**Human Edit:**
```typescript
const action: C2PAAction = {
  action: 'c2pa.edited',
  when: new Date().toISOString(),
  softwareAgent: 'Human+AI Provenance Demo/1.0.0',
  digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits',
  parameters: {
    description: 'Manual text edit',
    beforeHash: '...',
    afterHash: '...',
    changeRange: { start, end }
  }
};
```

**AI Edit:**
```typescript
const action: C2PAAction = {
  action: 'c2pa.edited',
  when: new Date().toISOString(),
  softwareAgent: 'Human+AI Provenance Demo/1.0.0',
  digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
  parameters: {
    description: 'AI-generated content',
    aiModel: 'gpt-4o-mini',
    promptHash: '...',
    responseHash: '...',
    beforeHash: '...',
    afterHash: '...',
    changeRange: { start, end }
  }
};
```

#### Export Flow (Multiple Formats)

**1. Export as .c2pa.txt (Embedded Manifest):**
- Build manifest with all C2PA actions
- Sign with ECDSA private key
- Embed as base64 footer via `EmbeddedManifestService`
- Download single file

**2. Export as Separate Files:**
- Save `document.txt` (plain content)
- Save `document.c2pa.json` (external manifest)

**3. Export as PDF (Demo):**
- Use `PDFExportService.createPDFWithManifest()`
- Embeds manifest as file attachment (not full JUMBF)
- Download PDF

**4. Export as Signed Image:**
- Render content as PNG via `ImageExportService`
- Send to backend `/api/sign-image`
- Backend signs with real C2PA via `@contentauth/c2pa-node`
- Adds TSA timestamp
- Download signed PNG (verifiable in c2paviewer.com)

#### Verification Flow (Two Modes)

**Mode 1: Single File (.c2pa.txt)**
1. User uploads embedded manifest file
2. Extract via `EmbeddedManifestService.extractManifest()`
3. Run verification via `C2PAVerificationService.verify()`
4. Display 3 check results: content hash, signature, SCITT receipt

**Mode 2: Separate Files**
1. User uploads content.txt + manifest.c2pa.json
2. Parse manifest JSON
3. Run same verification checks
4. Display results with action history

## Critical Implementation Details

### Cryptographic Patterns

**ECDSA Signing:**
```typescript
// Keys generated on app initialization
await window.crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
)

// Signing: C2PA claim is canonicalized before signing
const claimToSign = JSON.stringify(claim, Object.keys(claim).sort());
const signature = await cryptoService.sign(claimToSign, privateKey);
```

**Canonical JSON Hashing:**
- All object hashing uses sorted keys to ensure deterministic output
- Critical for content hash verification
- Implemented in `CryptoService.hashObject()`

**C2PA Claim Structure:**
```typescript
interface C2PAClaim {
  dc:title: string;
  dc:format: string;
  instanceID: string;
  claim_generator: { name, version };
  assertions: C2PAAssertion[];
  signature?: COSESignature;
}
```

### State Management

**Reducer Pattern:**
- All state updates are immutable (spread operators)
- Actions follow Redux naming: `{ type: 'ACTION_NAME', payload: ... }`
- Initial state factory: `createInitialState()` in `reducer.ts`

**Context Usage:**
```typescript
const { state, dispatch } = useAppContext();

// Add C2PA action
dispatch({ type: 'ADD_C2PA_ACTION', payload: action });

// Update manifest
dispatch({ type: 'UPDATE_C2PA_MANIFEST', payload: manifest });

// Update SCITT receipt
dispatch({ type: 'UPDATE_SCITT_RECEIPT', payload: receipt });
```

**Key Actions:**
- `INIT_CRYPTO` - Initialize cryptographic keys
- `SET_API_KEY` - Set OpenAI API key
- `UPDATE_CONTENT` - Update editor content and hash
- `SET_SELECTION` - Track text selection
- `CREATE_PENDING_CHANGE` - Start pending change workflow
- `ACCEPT_PENDING_CHANGE` - Accept pending change
- `REJECT_PENDING_CHANGE` - Reject pending change
- `ADD_C2PA_ACTION` - Add C2PA action to history
- `UPDATE_C2PA_MANIFEST` - Set signed C2PA manifest
- `UPDATE_SCITT_RECEIPT` - Set SCITT receipt
- `CLEAR_C2PA` - Reset C2PA state
- `SET_SIGNING` / `SET_ANCHORING` - UI loading states
- `SET_ACTIVE_TAB` - Switch between Editor/Verifier tabs

### Component Patterns

**App.tsx:**
- Tab-based layout (Editor/Verifier)
- Two-panel grid (60% left, 40% right)
- Error toast with auto-dismiss
- Concurrent frontend + backend mode

**Header:**
- OpenAI API key configuration
- Show/hide password toggle
- LocalStorage persistence

**TabNavigation:**
- Editor/Verifier tab switching

**EditorPanel (Complex - 601 lines):**
- Starter prompts for AI generation
- Text editing with selection tracking
- AI rewrite with instructions
- Pending change workflow (diff view + accept/reject)
- Multiple export options (4 formats)
- Services integration: CryptoService, ProvenanceService, AIClientService, C2PAManifestService, SCITTService, PDFExportService, ImageExportService

**StarterPrompts:**
- Predefined AI prompt cards
- Click to generate content

**DiffView:**
- Word-level diff visualization using LCS algorithm
- Color-coded tokens: unchanged (dark), deleted (red/strikethrough), added (green/bold)
- Loading spinner during generation

**ActionBar:**
- Accept/Reject buttons for pending changes
- Source labeling (AI Generated, AI Rewrite, Manual Edit)

**TrustArtifactsPanel:**
- Real-time reactive to C2PA state
- Four sections:
  1. Content Hash (SHA-256) with copy button
  2. C2PA Actions list (expandable ActionItem components)
  3. C2PA Manifest status (signed/unsigned, claim ID, format)
  4. SCITT Receipt status (anchored/not anchored, log ID, timestamp)
- Color-coded actor badges (blue=human, green=AI)
- Info tooltips

**VerifierPanel:**
- Two verification modes (toggle)
- Drag-and-drop file upload
- C2PA verification via `C2PAVerificationService`
- Result display: pass/fail banner, check grid
- Visual feedback for errors

**VerifierEditHistory:**
- Displays verified document content (read-only)
- Lists C2PA actions from verified manifest
- Expandable action details
- Changed text preview using `changeRange`

## Key Files to Understand

### Core Services (read in this order):
1. `src/services/CryptoService.ts` - Understand all crypto operations first
2. `src/services/ProvenanceService.ts` - C2PA action creation
3. `src/services/C2PAManifestService.ts` - C2PA manifest building and signing
4. `src/services/SCITTService.ts` - Transparency log integration
5. `src/state/reducer.ts` - State shape and update logic
6. `src/App.tsx` - Component wiring and export flow

### Type Definitions:
- `src/types/c2pa.ts` - **PRIMARY** - All C2PA types (actions, manifests, claims, assertions, SCITT)
- `src/types/provenance.ts` - PendingChange, UserInteraction
- `src/types/bundle.ts` - Legacy bundle types
- `src/types/verification.ts` - Verification result types
- `src/state/AppState.ts` - Complete state shape

### Backend Server:
- `server/index.ts` - Express server entry point
- `server/c2paSigningService.ts` - Real C2PA signing implementation

### Critical Components:
- `src/components/EditorPanel.tsx` - Main editing UI with full workflow
- `src/components/TrustArtifactsPanel.tsx` - C2PA artifacts display
- `src/components/VerifierPanel.tsx` - C2PA verification UI
- `src/components/VerifierEditHistory.tsx` - Verified document display

## Common Modifications

### Adding New C2PA Action Parameters

1. Update `C2PAAction` interface in `src/types/c2pa.ts`:
```typescript
interface C2PAAction {
  // ... existing fields
  parameters?: {
    // Add your new parameter here
    customField?: string;
  };
}
```

2. Modify action creation in `ProvenanceService.createHumanAction()` or `createAIAction()`:
```typescript
parameters: {
  description,
  customField: yourValue, // Add here
  // ... other params
}
```

3. Update action display in `TrustArtifactsPanel.tsx` ActionItem component to show new field

### Adding New Verification Checks

1. Add new check method in `C2PAVerificationService.ts`:
```typescript
private async verifyNewCheck(manifest: C2PAExternalManifest): Promise<CheckResult> {
  // Your verification logic
  return { passed: true, message: 'Check passed' };
}
```

2. Update `C2PAVerificationResult` type in `src/types/c2pa.ts`

3. Call new check in `verify()` method:
```typescript
const newCheck = await this.verifyNewCheck(manifest);
```

4. Update `VerifierPanel.tsx` to display new check result

### Adding New Export Format

1. Create new export service in `src/services/` if needed

2. Add export handler in `EditorPanel.tsx`:
```typescript
const handleExportNewFormat = async () => {
  if (!state.c2pa.manifest) return;
  // Your export logic
  newFormatService.export(state.content.text, state.c2pa.manifest);
};
```

3. Add button in EditorPanel render:
```tsx
<button onClick={handleExportNewFormat}>Export as New Format</button>
```

### Changing AI Provider

1. Modify `AIClientService.ts`:
   - Update API endpoint URL
   - Update request format
   - Update model name in response
   - Ensure prompt/response hashing remains intact

2. Update `APP_NAME` or `APP_VERSION` in `constants.ts` if needed

3. Update C2PA action creation to include new model name

## Important Constraints

**Web Crypto API Requirements:**
- Must run on HTTPS or localhost
- Keys are ephemeral (regenerated each session)
- No key persistence to localStorage (by design)

**State Immutability:**
- Never mutate state directly
- Always return new objects from reducer
- Use spread operators: `{ ...state, field: newValue }`

**Canonical JSON:**
- C2PA claim signing requires sorted object keys
- Use `CryptoService.hashObject()` for deterministic hashing
- Use `C2PAManifestService.serializeManifest()` for export

**Pending Change Workflow:**
- Only one pending change allowed at a time
- Must accept or reject before creating new change
- Diff computation uses word-level LCS algorithm

**Backend Server:**
- Requires certificates in `server/certs/` (ps256.pub, ps256.pem)
- Must run concurrently with frontend (`npm run dev`)
- CORS configured for localhost:3000 only

## Security Notes (Demo Context)

**Not Production-Ready:**
- Private keys stored in browser memory (extractable)
- No key encryption or secure storage
- SCITT receipts are simulated in demo mode (not real transparency log)
- API keys in localStorage (convenience, not secure)
- COSE signatures use simplified JSON+base64 (not full CBOR)
- Backend certificates are test certificates (not CA-issued)

**What IS Cryptographically Sound:**
- SHA-256 hashing (real Web Crypto API)
- ECDSA P-256 signatures (real cryptography)
- C2PA manifest structure (follows C2PA spec patterns)
- Signature verification (authentic public key crypto)
- Backend C2PA signing (real `@contentauth/c2pa-node` library)

**What is Simulated:**
- SCITT receipts (generated locally, not from real transparency log)
- COSE structure (simplified for demo, not full CBOR)
- Timestamps (client-generated, not from TSA in frontend)
- Certificate validation (demo mode, no PKI)

## References

- **C2PA_Integration.md** - Detailed C2PA integration guide and migration notes
- **PRD_final.md** - Product requirements and use cases
- **spec.md** - Technical specification and data flow diagrams
- **PLAN.md** - Implementation roadmap (15 steps)
- **README.md** - User-facing documentation and setup guide
- **C2PA Specification** - https://c2pa.org/specifications/
- **SCITT Architecture** - https://datatracker.ietf.org/doc/draft-ietf-scitt-architecture/
- **IPTC Digital Source Type** - http://cv.iptc.org/newscodes/digitalsourcetype/
