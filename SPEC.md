# A2UI Provenance Demo - System Specification

**Version:** 1.0
**Date:** 2025-12-30
**Purpose:** Technical specification for implementation planning

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Runtime                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    React Application                        │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌─────────────────────────────────────┐ │ │
│  │  │              │  │   State Management (LangGraph)      │ │ │
│  │  │   UI Layer   │◄─┤   - Content State                   │ │ │
│  │  │              │  │   - Provenance Events                │ │ │
│  │  │  - Editor    │  │   - Manifest State                   │ │ │
│  │  │  - Trust     │  │   - Crypto Keys                      │ │ │
│  │  │    Panel     │  └─────────────────────────────────────┘ │ │
│  │  │  - Verifier  │           ▲                               │ │
│  │  │              │           │                               │ │
│  │  └──────┬───────┘           │                               │ │
│  │         │                   │                               │ │
│  │         ▼                   ▼                               │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │           Service Layer (Business Logic)            │   │ │
│  │  │                                                      │   │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │   │ │
│  │  │  │  Provenance  │  │    Crypto    │  │  Bundle   │ │   │ │
│  │  │  │   Service    │  │   Service    │  │  Service  │ │   │ │
│  │  │  └──────────────┘  └──────────────┘  └───────────┘ │   │ │
│  │  │                                                      │   │ │
│  │  │  ┌──────────────┐  ┌──────────────┐                │   │ │
│  │  │  │   AI Client  │  │  Verification│                │   │ │
│  │  │  │   Service    │  │   Service    │                │   │ │
│  │  │  └──────────────┘  └──────────────┘                │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                        ▲           ▲                        │ │
│  └────────────────────────┼───────────┼────────────────────────┘ │
│                           │           │                          │
│  ┌────────────────────────┼───────────┼────────────────────────┐ │
│  │     Browser APIs       │           │                        │ │
│  │  - Web Crypto API ◄────┘           │                        │ │
│  │  - Clipboard API                   │                        │ │
│  │  - Local Storage                   │                        │ │
│  └────────────────────────────────────┼────────────────────────┘ │
│                                        │                          │
└────────────────────────────────────────┼──────────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │   OpenAI API         │
                              │   (gpt-5-nano)       │
                              └──────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI Framework** | React 18+ | Component-based UI |
| **Language** | TypeScript 5+ | Type safety |
| **UI Library** | AG UI | Component library |
| **State Management** | LangGraph TypeScript | Predictive state updates, event sourcing |
| **Cryptography** | Web Crypto API | SHA-256, ECDSA/Ed25519 |
| **AI Integration** | OpenAI API | Text rewriting (gpt-5-nano) |
| **Build Tool** | Vite | Fast development, HMR |
| **Package Manager** | npm/pnpm | Dependency management |

---

## 2. Component Specifications

### 2.1 UI Components

#### 2.1.1 AppContainer Component
**Responsibility:** Root application layout and state initialization

**Props:** None (root component)

**State:**
- `isInitialized: boolean` - Crypto keys generated
- `apiKeyConfigured: boolean` - OpenAI API key set

**Children:**
- `<Header />`
- `<EditorPanel />`
- `<TrustArtifactsPanel />`
- `<VerifierPanel />`

**Layout:**
```tsx
<div className="app-container">
  <Header />
  <div className="main-content">
    <div className="left-panel">  {/* 60% width */}
      <EditorPanel />
    </div>
    <div className="right-panel">  {/* 40% width */}
      <TrustArtifactsPanel />  {/* top 50% */}
      <VerifierPanel />         {/* bottom 50% */}
    </div>
  </div>
</div>
```

---

#### 2.1.2 Header Component
**Responsibility:** API key configuration, app title

**Props:** None

**State:**
- `apiKey: string` - OpenAI API key (from localStorage/LangGraph state)
- `showApiKeyInput: boolean` - Toggle input visibility

**Events Emitted:**
- `onApiKeyChange(key: string)` - Updates global state

**UI Elements:**
- App title/logo
- API key input field (password type, with show/hide toggle)
- Save button
- Status indicator (configured/not configured)

---

#### 2.1.3 EditorPanel Component
**Responsibility:** Text editing, AI rewrite controls, bundle export

**Props:**
```typescript
interface EditorPanelProps {
  content: string;
  selection: { start: number; end: number } | null;
  onContentChange: (content: string) => void;
  onSelectionChange: (selection: { start: number; end: number }) => void;
  onAIRewrite: (instruction: string) => Promise<void>;
  onExportBundle: () => void;
}
```

**State (Local):**
- `aiInstruction: string` - User's rewrite instruction
- `isProcessing: boolean` - AI request in progress

**UI Elements:**
- Textarea/ContentEditable for text input
- Selection display (show selected range)
- AI instruction input
- "Rewrite Selected Text" button (enabled only when text selected)
- "Copy Bundle" button
- Loading indicator during AI processing

**Events:**
- `onChange` → triggers `onContentChange` → creates human provenance event
- `onSelect` → triggers `onSelectionChange`
- Button clicks → triggers AI rewrite or bundle export

---

#### 2.1.4 TrustArtifactsPanel Component
**Responsibility:** Real-time provenance state visualization

**Props:**
```typescript
interface TrustArtifactsPanelProps {
  contentHash: string;
  events: ProvenanceEvent[];
  eventChainHash: string;
  manifestHash: string;
  signatureStatus: 'valid' | 'invalid' | 'unsigned';
  receiptStatus: 'present' | 'missing';
  attestationStatus: 'approved' | 'denied' | 'unknown';
}
```

**UI Sections:**
1. **Content Hash Display**
   - Label: "Content Hash (SHA-256)"
   - Value: Truncated hash with copy button
   - Updates on every content change

2. **Edit History**
   - Scrollable list of events
   - Each event shows:
     - Event number
     - Actor badge (color-coded: blue=human, green=AI)
     - Timestamp (formatted)
     - Action summary
     - Expandable details (hashes, ranges)

3. **Event Chain Hash**
   - Label: "Event Chain Hash"
   - Value: Truncated hash
   - Tooltip: "Cumulative hash of all edits"

4. **Manifest Status**
   - Signature icon + status text
   - Color-coded: green=valid, red=invalid, gray=unsigned
   - Manifest hash display

5. **Receipt Status**
   - Icon + "Transparency Log Receipt"
   - Status: "Logged ✓" / "Missing"
   - Demo badge: "Simulated"

6. **Attestation Status**
   - Icon + "Tool Attestation"
   - Status: "Approved ✓"
   - Tool info: "A2UI Provenance Demo v1.0.0"
   - Demo badge: "Simulated"

---

#### 2.1.5 VerifierPanel Component
**Responsibility:** Bundle verification and tamper detection

**Props:**
```typescript
interface VerifierPanelProps {
  onVerify: (bundle: Bundle) => VerificationResult;
}
```

**State (Local):**
- `bundleInput: string` - Pasted bundle JSON
- `verificationResult: VerificationResult | null`
- `isVerifying: boolean`

**UI Elements:**
1. **Input Section**
   - Large textarea for bundle JSON paste
   - "Verify Bundle" button
   - "Clear" button

2. **Results Section** (shown after verification)
   - Overall verdict banner:
     - Green: "✓ ALL CHECKS PASSED"
     - Red: "✗ VERIFICATION FAILED"
   - Checklist of individual verification results:
     - ☑ Bundle Hash Check
     - ☑ Content Hash Check
     - ☑ Signature Verification
     - ☑ Receipt Verification
     - ☑ Event Chain Check
   - Failed checks highlighted in red with explanation

3. **Tamper Instructions**
   - Help text: "Try editing the bundle JSON to see tamper detection"

**Events:**
- "Verify" button → parse JSON → call `onVerify` → display results

---

### 2.2 Service Layer Components

#### 2.2.1 ProvenanceService
**Responsibility:** Event creation, event chain computation

**Interface:**
```typescript
interface IProvenanceService {
  /**
   * Create a human edit event
   */
  createHumanEvent(
    range: { start: number; end: number },
    beforeText: string,
    afterText: string,
    beforeHash: string,
    afterHash: string
  ): ProvenanceEvent;

  /**
   * Create an AI edit event
   */
  createAIEvent(
    range: { start: number; end: number },
    beforeText: string,
    afterText: string,
    beforeHash: string,
    afterHash: string,
    model: string,
    promptHash: string,
    responseHash: string
  ): ProvenanceEvent;

  /**
   * Compute event chain hash (cumulative)
   */
  computeEventChainHash(events: ProvenanceEvent[]): string;

  /**
   * Build manifest from current state
   */
  buildManifest(
    events: ProvenanceEvent[],
    contentHash: string,
    eventChainHash: string
  ): Omit<Manifest, 'signature' | 'publicKey'>;
}
```

**Implementation Notes:**
- Generate unique event IDs (UUID v4)
- Event chain uses recursive hashing: `hash(event_n || hash(event_n-1 || ...))`
- Events are immutable once created

---

#### 2.2.2 CryptoService
**Responsibility:** All cryptographic operations

**Interface:**
```typescript
interface ICryptoService {
  /**
   * Initialize crypto keys (generate ECDSA keypair)
   */
  initialize(): Promise<{ publicKey: string; privateKey: CryptoKey }>;

  /**
   * Compute SHA-256 hash
   */
  hash(data: string): Promise<string>;

  /**
   * Sign data with private key
   */
  sign(data: string, privateKey: CryptoKey): Promise<string>;

  /**
   * Verify signature with public key
   */
  verify(data: string, signature: string, publicKey: string): Promise<boolean>;

  /**
   * Compute canonical hash of object (for bundle hash)
   */
  hashObject(obj: object): Promise<string>;
}
```

**Implementation Details:**

**Key Generation (ECDSA P-256):**
```typescript
const keyPair = await window.crypto.subtle.generateKey(
  {
    name: "ECDSA",
    namedCurve: "P-256"
  },
  true, // extractable
  ["sign", "verify"]
);
```

**Hashing (SHA-256):**
```typescript
async hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
  return this.bufferToHex(hashBuffer);
}
```

**Signing:**
```typescript
async sign(data: string, privateKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signature = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }
    },
    privateKey,
    dataBuffer
  );
  return this.bufferToBase64(signature);
}
```

**Canonical Object Hashing:**
```typescript
async hashObject(obj: object): Promise<string> {
  // Canonical JSON: sorted keys, no whitespace
  const canonical = JSON.stringify(obj, Object.keys(obj).sort());
  return this.hash(canonical);
}
```

---

#### 2.2.3 BundleService
**Responsibility:** Bundle creation, serialization, export

**Interface:**
```typescript
interface IBundleService {
  /**
   * Create export bundle from current state
   */
  createBundle(
    content: string,
    manifest: Manifest,
    receipt: Receipt,
    attestation: Attestation
  ): Promise<Bundle>;

  /**
   * Serialize bundle to JSON string
   */
  serializeBundle(bundle: Bundle): string;

  /**
   * Parse bundle from JSON string
   */
  parseBundle(json: string): Bundle;

  /**
   * Copy bundle to clipboard
   */
  copyToClipboard(bundle: Bundle): Promise<void>;
}
```

**Implementation Notes:**

**Bundle Creation:**
1. Assemble bundle object with all fields
2. Compute `bundleHash`:
   - Create canonical representation (sorted keys)
   - Hash entire bundle except `bundleHash` field itself
3. Add `bundleHash` to bundle

**Serialization:**
- Use pretty-printed JSON (2-space indent) for readability
- Ensure stable key ordering

**Clipboard API:**
```typescript
async copyToClipboard(bundle: Bundle): Promise<void> {
  const json = this.serializeBundle(bundle);
  await navigator.clipboard.writeText(json);
}
```

---

#### 2.2.4 VerificationService
**Responsibility:** Bundle verification, tamper detection

**Interface:**
```typescript
interface IVerificationService {
  /**
   * Verify a bundle completely
   */
  verifyBundle(bundle: Bundle): Promise<VerificationResult>;
}

interface VerificationResult {
  overallStatus: 'pass' | 'fail';
  checks: {
    bundleHash: CheckResult;
    contentHash: CheckResult;
    signature: CheckResult;
    receipt: CheckResult;
    eventChain: CheckResult;
  };
}

interface CheckResult {
  passed: boolean;
  message: string;
  details?: string;
}
```

**Verification Algorithm:**

```typescript
async verifyBundle(bundle: Bundle): Promise<VerificationResult> {
  const checks = {
    bundleHash: await this.verifyBundleHash(bundle),
    contentHash: await this.verifyContentHash(bundle),
    signature: await this.verifySignature(bundle),
    receipt: await this.verifyReceipt(bundle),
    eventChain: await this.verifyEventChain(bundle)
  };

  const overallStatus = Object.values(checks).every(c => c.passed)
    ? 'pass'
    : 'fail';

  return { overallStatus, checks };
}
```

**Individual Checks:**

1. **Bundle Hash Check:**
   ```typescript
   // Recompute bundle hash (excluding bundleHash field)
   const recomputed = await this.cryptoService.hashObject({
     content: bundle.content,
     manifest: bundle.manifest,
     receipt: bundle.receipt,
     attestation: bundle.attestation
   });

   return {
     passed: recomputed === bundle.bundleHash,
     message: recomputed === bundle.bundleHash
       ? "Bundle hash matches"
       : "Bundle hash mismatch - bundle was modified"
   };
   ```

2. **Content Hash Check:**
   ```typescript
   const contentHash = await this.cryptoService.hash(bundle.content);
   return {
     passed: contentHash === bundle.manifest.contentHash,
     message: contentHash === bundle.manifest.contentHash
       ? "Content hash matches manifest"
       : "Content hash mismatch - content was tampered"
   };
   ```

3. **Signature Verification:**
   ```typescript
   const manifestData = JSON.stringify({
     events: bundle.manifest.events,
     contentHash: bundle.manifest.contentHash,
     eventChainHash: bundle.manifest.eventChainHash,
     timestamp: bundle.manifest.timestamp
   }, Object.keys(bundle.manifest).sort());

   const isValid = await this.cryptoService.verify(
     manifestData,
     bundle.manifest.signature,
     bundle.manifest.publicKey
   );

   return {
     passed: isValid,
     message: isValid
       ? "Signature valid"
       : "Signature invalid - manifest was forged or modified"
   };
   ```

4. **Receipt Verification (Demo):**
   ```typescript
   // Demo mode: check receipt is present and has expected fields
   const hasReceipt = bundle.receipt && bundle.receipt.receiptSignature;
   return {
     passed: hasReceipt,
     message: hasReceipt
       ? "Receipt present (demo mode)"
       : "Receipt missing"
   };
   ```

5. **Event Chain Check:**
   ```typescript
   const recomputedChain = this.provenanceService.computeEventChainHash(
     bundle.manifest.events
   );

   return {
     passed: recomputedChain === bundle.manifest.eventChainHash,
     message: recomputedChain === bundle.manifest.eventChainHash
       ? "Event chain valid"
       : "Event chain mismatch - history was altered"
   };
   ```

---

#### 2.2.5 AIClientService
**Responsibility:** OpenAI API integration

**Interface:**
```typescript
interface IAIClientService {
  /**
   * Set OpenAI API key
   */
  setApiKey(key: string): void;

  /**
   * Rewrite selected text with AI
   */
  rewriteText(
    selectedText: string,
    instruction: string
  ): Promise<AIRewriteResponse>;
}

interface AIRewriteResponse {
  rewrittenText: string;
  model: string;
  promptHash: string;
  responseHash: string;
}
```

**Implementation:**

```typescript
async rewriteText(
  selectedText: string,
  instruction: string
): Promise<AIRewriteResponse> {
  if (!this.apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Construct prompt
  const prompt = `Rewrite the following text according to this instruction: "${instruction}"\n\nOriginal text: "${selectedText}"\n\nRewritten text:`;

  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful text rewriting assistant. Only return the rewritten text, nothing else.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error.message}`);
  }

  const data = await response.json();
  const rewrittenText = data.choices[0].message.content.trim();

  // Compute hashes
  const promptHash = await this.cryptoService.hash(prompt);
  const responseHash = await this.cryptoService.hash(rewrittenText);

  return {
    rewrittenText,
    model: 'gpt-5-nano',
    promptHash,
    responseHash
  };
}
```

---

### 2.3 State Management (LangGraph Integration)

#### 2.3.1 State Schema

**Global Application State:**
```typescript
interface AppState {
  // Configuration
  config: {
    apiKey: string | null;
    initialized: boolean;
  };

  // Cryptographic keys (ephemeral)
  crypto: {
    publicKey: string | null;  // PEM/JWK format
    privateKey: CryptoKey | null; // Web Crypto API key (non-serializable)
  };

  // Content state
  content: {
    text: string;
    hash: string; // SHA-256 of current text
    selection: { start: number; end: number } | null;
  };

  // Provenance state
  provenance: {
    events: ProvenanceEvent[];
    eventChainHash: string;
  };

  // Manifest state
  manifest: {
    data: Manifest | null;
    hash: string | null;
    signatureStatus: 'valid' | 'invalid' | 'unsigned';
  };

  // Receipt state (demo)
  receipt: {
    data: Receipt | null;
    status: 'present' | 'missing';
  };

  // Attestation state (demo)
  attestation: {
    data: Attestation;
    status: 'approved';
  };

  // UI state
  ui: {
    isProcessingAI: boolean;
    lastError: string | null;
  };
}
```

#### 2.3.2 State Update Actions

**Action Types:**
```typescript
type AppAction =
  | { type: 'INIT_CRYPTO'; payload: { publicKey: string; privateKey: CryptoKey } }
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'UPDATE_CONTENT'; payload: { text: string; hash: string } }
  | { type: 'SET_SELECTION'; payload: { start: number; end: number } | null }
  | { type: 'ADD_EVENT'; payload: ProvenanceEvent }
  | { type: 'UPDATE_MANIFEST'; payload: Manifest }
  | { type: 'UPDATE_RECEIPT'; payload: Receipt }
  | { type: 'SET_AI_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };
```

#### 2.3.3 LangGraph State Transitions

**Example: AI Rewrite Flow**
```typescript
// Nodes in the state graph
const stateGraph = {
  nodes: [
    'idle',
    'selecting',
    'ai_processing',
    'updating_content',
    'signing_manifest',
    'generating_receipt'
  ],

  edges: [
    { from: 'idle', to: 'selecting', event: 'TEXT_SELECTED' },
    { from: 'selecting', to: 'ai_processing', event: 'AI_REWRITE_REQUESTED' },
    { from: 'ai_processing', to: 'updating_content', event: 'AI_RESPONSE_RECEIVED' },
    { from: 'updating_content', to: 'signing_manifest', event: 'CONTENT_UPDATED' },
    { from: 'signing_manifest', to: 'generating_receipt', event: 'MANIFEST_SIGNED' },
    { from: 'generating_receipt', to: 'idle', event: 'RECEIPT_GENERATED' }
  ]
};
```

**Reducer/State Updater:**
```typescript
function updateState(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'UPDATE_CONTENT':
      return {
        ...state,
        content: {
          ...state.content,
          text: action.payload.text,
          hash: action.payload.hash
        }
      };

    case 'ADD_EVENT':
      const newEvents = [...state.provenance.events, action.payload];
      const newChainHash = provenanceService.computeEventChainHash(newEvents);
      return {
        ...state,
        provenance: {
          events: newEvents,
          eventChainHash: newChainHash
        }
      };

    // ... other cases
  }
}
```

---

## 3. Data Flow Diagrams

### 3.1 Human Edit Flow

```
┌─────────────┐
│   User      │
│  types text │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  EditorPanel.onChange()                     │
│  - Capture new text                         │
│  - Detect range changed                     │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  CryptoService.hash(newText)                │
│  → newHash                                  │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  ProvenanceService.createHumanEvent()       │
│  - range, beforeText, afterText             │
│  - beforeHash, afterHash                    │
│  → ProvenanceEvent                          │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Dispatch: ADD_EVENT                        │
│  State updates:                             │
│  - events array ← new event                 │
│  - eventChainHash ← recomputed              │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  ProvenanceService.buildManifest()          │
│  CryptoService.sign(manifest, privateKey)   │
│  → Manifest with signature                  │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Dispatch: UPDATE_MANIFEST                  │
│  State updates:                             │
│  - manifest.data ← signed manifest          │
│  - manifest.hash ← manifest hash            │
│  - manifest.signatureStatus ← 'valid'       │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Generate demo receipt                      │
│  Dispatch: UPDATE_RECEIPT                   │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  UI Updates (via React re-render)           │
│  - Editor shows new content                 │
│  - TrustPanel shows:                        │
│    • updated contentHash                    │
│    • new event in history                   │
│    • new eventChainHash                     │
│    • manifest signed ✓                      │
│    • receipt logged ✓                       │
└─────────────────────────────────────────────┘
```

---

### 3.2 AI Rewrite Flow

```
┌─────────────┐
│   User      │
│  1. selects │
│     text    │
│  2. enters  │
│  instruction│
│  3. clicks  │
│   "Rewrite" │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  EditorPanel.handleAIRewrite()               │
│  - selectedText = content[selection]         │
│  - instruction from input                    │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Dispatch: SET_AI_PROCESSING(true)           │
│  UI shows loading state                      │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  AIClientService.rewriteText()               │
│  - Call OpenAI API (gpt-5-nano)              │
│  - Wait for response                         │
└──────┬───────────────────────────────────────┘
       │
       ▼ (on success)
┌──────────────────────────────────────────────┐
│  AIRewriteResponse received                  │
│  - rewrittenText                             │
│  - model, promptHash, responseHash           │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Replace selected text in content            │
│  newContent = content[0:start]               │
│             + rewrittenText                  │
│             + content[end:]                  │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  CryptoService.hash(newContent)              │
│  → newHash                                   │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  ProvenanceService.createAIEvent()           │
│  - range (selection)                         │
│  - beforeText (selected), afterText (AI)     │
│  - beforeHash, afterHash                     │
│  - model, promptHash, responseHash           │
│  → ProvenanceEvent (actor: 'ai')             │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Dispatch: UPDATE_CONTENT                    │
│  Dispatch: ADD_EVENT                         │
│  State updates (same as human edit flow)     │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Sign manifest, generate receipt             │
│  (same as human edit flow)                   │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Dispatch: SET_AI_PROCESSING(false)          │
│  UI updates with new content + provenance    │
└──────────────────────────────────────────────┘
```

---

### 3.3 Bundle Export Flow

```
┌─────────────┐
│   User      │
│  clicks     │
│ "Copy       │
│  Bundle"    │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  EditorPanel.handleExportBundle()            │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Gather current state:                       │
│  - content (from state)                      │
│  - manifest (from state)                     │
│  - receipt (from state)                      │
│  - attestation (hardcoded demo data)         │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  BundleService.createBundle()                │
│  1. Assemble bundle object                   │
│  2. Compute bundleHash:                      │
│     - Canonicalize bundle (sorted keys)      │
│     - Hash entire bundle (minus bundleHash)  │
│  3. Add bundleHash to bundle                 │
│  → Bundle object                             │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  BundleService.serializeBundle()             │
│  - JSON.stringify with pretty print          │
│  → JSON string                               │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  BundleService.copyToClipboard()             │
│  - navigator.clipboard.writeText(json)       │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Show success notification                   │
│  "Bundle copied to clipboard"                │
└──────────────────────────────────────────────┘
```

---

### 3.4 Bundle Verification Flow

```
┌─────────────┐
│   User      │
│  1. pastes  │
│     bundle  │
│     JSON    │
│  2. clicks  │
│   "Verify"  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  VerifierPanel.handleVerify()                │
│  - Parse JSON string → Bundle object         │
└──────┬───────────────────────────────────────┘
       │
       ▼ (if parse error)
┌──────────────────────────────────────────────┐
│  Show error: "Invalid JSON"                  │
│  Exit                                        │
└──────────────────────────────────────────────┘
       │
       ▼ (if parse success)
┌──────────────────────────────────────────────┐
│  VerificationService.verifyBundle()          │
│  Parallel execution of checks:               │
└──────┬───────────────────────────────────────┘
       │
       ├─────────────────────────────────────────┐
       │                                         │
       ▼                                         ▼
┌──────────────────┐              ┌─────────────────────┐
│ CHECK 1:         │              │ CHECK 2:            │
│ Bundle Hash      │              │ Content Hash        │
│                  │              │                     │
│ Recompute hash   │              │ Hash content field  │
│ of bundle        │              │ Compare to          │
│ (canonical form) │              │ manifest.contentHash│
│ Compare to       │              │                     │
│ bundle.bundleHash│              │ → CheckResult       │
│                  │              └─────────────────────┘
│ → CheckResult    │
└──────────────────┘
       │                                         │
       │         ┌───────────────────────────────┘
       │         │
       ▼         ▼
┌──────────────────┐              ┌─────────────────────┐
│ CHECK 3:         │              │ CHECK 4:            │
│ Signature        │              │ Receipt (demo)      │
│                  │              │                     │
│ Extract manifest │              │ Check receipt       │
│ data (canonical) │              │ present + has       │
│ Verify signature │              │ signature           │
│ with publicKey   │              │                     │
│                  │              │ → CheckResult       │
│ → CheckResult    │              └─────────────────────┘
└──────────────────┘
       │                                         │
       │         ┌───────────────────────────────┘
       │         │
       ▼         ▼
┌──────────────────────────────────────────────┐
│ CHECK 5:                                     │
│ Event Chain                                  │
│                                              │
│ Recompute eventChainHash from events[]       │
│ Compare to manifest.eventChainHash           │
│                                              │
│ → CheckResult                                │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Aggregate results                           │
│  overallStatus = all checks passed ?         │
│                  'pass' : 'fail'             │
│  → VerificationResult                        │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Update UI with results                      │
│  - Show overall banner (green/red)           │
│  - Show each check status                    │
│  - Highlight failed checks with explanation  │
└──────────────────────────────────────────────┘
```

---

## 4. API Contracts

### 4.1 Internal Service APIs

#### CryptoService API
```typescript
interface CryptoService {
  // Initialization
  initialize(): Promise<{ publicKey: string; privateKey: CryptoKey }>;

  // Hashing
  hash(data: string): Promise<string>;
  hashObject(obj: object): Promise<string>;

  // Signing
  sign(data: string, privateKey: CryptoKey): Promise<string>;
  verify(data: string, signature: string, publicKey: string): Promise<boolean>;

  // Utilities
  bufferToHex(buffer: ArrayBuffer): string;
  bufferToBase64(buffer: ArrayBuffer): string;
  base64ToBuffer(base64: string): ArrayBuffer;
}
```

#### ProvenanceService API
```typescript
interface ProvenanceService {
  createHumanEvent(params: {
    range: { start: number; end: number };
    beforeText: string;
    afterText: string;
    beforeHash: string;
    afterHash: string;
  }): ProvenanceEvent;

  createAIEvent(params: {
    range: { start: number; end: number };
    beforeText: string;
    afterText: string;
    beforeHash: string;
    afterHash: string;
    model: string;
    promptHash: string;
    responseHash: string;
  }): ProvenanceEvent;

  computeEventChainHash(events: ProvenanceEvent[]): string;

  buildManifest(
    events: ProvenanceEvent[],
    contentHash: string,
    eventChainHash: string
  ): Omit<Manifest, 'signature' | 'publicKey'>;
}
```

### 4.2 External API Integration

#### OpenAI API
**Endpoint:** `POST https://api.openai.com/v1/chat/completions`

**Request:**
```typescript
{
  model: "gpt-5-nano",
  messages: [
    {
      role: "system",
      content: "You are a helpful text rewriting assistant. Only return the rewritten text, nothing else."
    },
    {
      role: "user",
      content: string  // Prompt with selected text + instruction
    }
  ],
  temperature: 0.7,
  max_tokens: 500
}
```

**Response:**
```typescript
{
  id: string,
  object: "chat.completion",
  created: number,
  model: "gpt-5-nano",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: string  // Rewritten text
      },
      finish_reason: "stop"
    }
  ],
  usage: {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number
  }
}
```

**Error Handling:**
- 401 Unauthorized → "Invalid API key"
- 429 Too Many Requests → "Rate limit exceeded, try again later"
- 500 Server Error → "OpenAI service error, try again"
- Network errors → "Network error, check connection"

---

## 5. Data Persistence & Storage

### 5.1 Browser Storage (LocalStorage)

**Stored Items:**
```typescript
// API Key
localStorage.setItem('a2ui-provenance-api-key', apiKey);

// Optional: Public key (for cross-session verification demonstration)
localStorage.setItem('a2ui-provenance-public-key', publicKeyPEM);
```

**NOT Stored:**
- Private keys (ephemeral, regenerated each session)
- Content (session-only)
- Provenance events (session-only)
- Manifests (session-only)

**Rationale:** Demo app, no persistent state needed. Fresh session = fresh keys.

---

## 6. Error Handling Strategies

### 6.1 Error Categories

| Category | Examples | User-Facing Message | Recovery Action |
|----------|----------|---------------------|-----------------|
| **Crypto Errors** | Key generation failure, signing failure | "Cryptographic operation failed" | Retry initialization |
| **API Errors** | OpenAI 401, 429, 500 | "AI service error: [details]" | Show error, allow retry |
| **Validation Errors** | Invalid bundle JSON | "Invalid bundle format" | Clear input, show example |
| **Network Errors** | Fetch timeout, no connection | "Network error" | Retry button |
| **State Errors** | Corrupted state | "Application state error" | Reload page |

### 6.2 Error Handling Patterns

**Service Layer (throw errors):**
```typescript
class CryptoService {
  async sign(data: string, privateKey: CryptoKey): Promise<string> {
    try {
      // ... signing logic
    } catch (error) {
      throw new CryptoError('Signature generation failed', error);
    }
  }
}
```

**Component Layer (catch and display):**
```typescript
const handleAIRewrite = async (instruction: string) => {
  try {
    setIsProcessing(true);
    const result = await aiClientService.rewriteText(selectedText, instruction);
    // ... handle success
  } catch (error) {
    if (error instanceof APIError) {
      showError(`AI Error: ${error.message}`);
    } else {
      showError('An unexpected error occurred');
    }
  } finally {
    setIsProcessing(false);
  }
};
```

---

## 7. Security Considerations (Demo Context)

### 7.1 Limitations (Acknowledged in UI)

**NOT Production-Ready:**
- ❌ Private keys stored in memory (extractable via dev tools)
- ❌ No key encryption or secure storage
- ❌ No certificate validation / PKI
- ❌ Demo receipt signatures (not from real transparency log)
- ❌ No protection against XSS/injection (standard React escaping only)

**Demo Warnings to Display:**
- "Demo Mode: Keys are ephemeral and not secured"
- "Do not use with sensitive content"
- "Transparency receipts are simulated"

### 7.2 Safe Practices (Even in Demo)

**Input Sanitization:**
- User content: React auto-escapes by default
- Bundle JSON: Use `JSON.parse()` in try-catch, validate structure

**API Key Handling:**
- Never log API key
- Store in localStorage (acceptable for demo)
- Use password input type (hide by default)

**HTTPS Required:**
- OpenAI API requires HTTPS
- Deploy demo on HTTPS (Vercel/Netlify auto-provide)

---

## 8. Performance Requirements

### 8.1 Targets

| Operation | Target Time | Notes |
|-----------|-------------|-------|
| SHA-256 hash (1KB text) | < 10ms | Web Crypto API is fast |
| ECDSA signature | < 50ms | Acceptable latency |
| Event chain recomputation (100 events) | < 100ms | Cumulative hashing |
| Bundle creation | < 200ms | Includes all hashing + signing |
| Verification (full bundle) | < 500ms | All 5 checks in parallel |
| AI rewrite request | 2-5 seconds | Network + OpenAI processing |
| UI update (React re-render) | < 16ms | 60 FPS target |

### 8.2 Optimization Strategies

**Debouncing:**
- Human edits: debounce event creation (e.g., 500ms after last keystroke)
- Manifest signing: only after event fully recorded

**Memoization:**
- Event chain hash: recompute only when events array changes
- Content hash: recompute only when content changes

**Lazy Loading:**
- Expand event details: only render when user clicks "expand"

---

## 9. Testing Strategy

### 9.1 Unit Tests (Jest + Testing Library)

**CryptoService:**
- ✓ hash() produces consistent SHA-256
- ✓ sign() + verify() roundtrip works
- ✓ hashObject() produces canonical hash (key order independent)

**ProvenanceService:**
- ✓ createHumanEvent() generates valid event
- ✓ createAIEvent() includes all AI metadata
- ✓ computeEventChainHash() produces correct cumulative hash
- ✓ Event chain hash changes when events change

**BundleService:**
- ✓ createBundle() produces valid bundle structure
- ✓ bundleHash excludes itself from computation
- ✓ parseBundle() correctly deserializes

**VerificationService:**
- ✓ verifyBundle() passes for valid bundle
- ✓ verifyBundle() fails for tampered content
- ✓ verifyBundle() fails for invalid signature
- ✓ Individual checks work correctly

### 9.2 Integration Tests

**End-to-End Flow:**
- ✓ User types text → event created → manifest signed
- ✓ AI rewrite → event created → chain updated
- ✓ Export bundle → copy to clipboard → parse succeeds
- ✓ Verify bundle → all checks pass
- ✓ Tamper bundle → verification fails

### 9.3 Manual Testing Checklist

- [ ] App initializes without errors
- [ ] Crypto keys generate successfully
- [ ] Human edits create events
- [ ] Trust panel updates in real-time
- [ ] Text selection works
- [ ] AI rewrite with valid API key succeeds
- [ ] AI rewrite with invalid API key shows error
- [ ] Bundle export copies to clipboard
- [ ] Bundle verification passes for valid bundle
- [ ] Bundle verification fails for tampered bundle
- [ ] UI responsive and smooth

---

## 10. Deployment Configuration

### 10.1 Build Configuration

**Vite Config (`vite.config.ts`):**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',  // For Web Crypto API support
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  }
});
```

### 10.2 Environment Variables

```bash
# .env (for development)
VITE_APP_NAME=A2UI Provenance Demo
VITE_APP_VERSION=1.0.0
```

### 10.3 Hosting Requirements

**Target Platforms:**
- Vercel (recommended)
- Netlify
- GitHub Pages (with HTTPS)

**Requirements:**
- HTTPS enabled (required for Web Crypto API + OpenAI)
- SPA fallback routing (for potential future routes)
- Build command: `npm run build`
- Output directory: `dist`

---

## 11. Development Workflow

### 11.1 Project Structure

```
a2ui-provenance/
├── src/
│   ├── components/
│   │   ├── AppContainer.tsx
│   │   ├── Header.tsx
│   │   ├── EditorPanel.tsx
│   │   ├── TrustArtifactsPanel.tsx
│   │   └── VerifierPanel.tsx
│   ├── services/
│   │   ├── CryptoService.ts
│   │   ├── ProvenanceService.ts
│   │   ├── BundleService.ts
│   │   ├── VerificationService.ts
│   │   └── AIClientService.ts
│   ├── state/
│   │   ├── AppState.ts (type definitions)
│   │   ├── actions.ts
│   │   ├── reducer.ts
│   │   └── langGraphSetup.ts
│   ├── types/
│   │   ├── provenance.ts
│   │   ├── bundle.ts
│   │   └── verification.ts
│   ├── utils/
│   │   ├── formatting.ts (hash truncation, date formatting)
│   │   └── constants.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── PRD_final.md
└── spec.md (this document)
```

### 11.2 Dependencies

**Core:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@ag-ui/react": "latest",  // AG UI components
    "langgraph": "latest",      // State management
    "uuid": "^9.0.0"            // Event ID generation
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
}
```

### 11.3 Git Workflow

**Branches:**
- `main`: Stable, deployable code
- `develop`: Integration branch
- Feature branches: `feature/crypto-service`, `feature/editor-panel`, etc.

**Commit Convention:**
```
type(scope): description

Types: feat, fix, docs, refactor, test, chore
Example: feat(crypto): implement ECDSA signing
```

---

## 12. Future Enhancements (Out of Scope for v1.0)

### 12.1 Possible Extensions

- **Multi-document support**: Manage multiple documents in tabs
- **Export formats**: PDF with embedded metadata, .c2pa file format
- **Real transparency log**: Integration with Sigstore Rekor
- **Collaborative editing**: Multi-user with attribution
- **Undo/redo**: With provenance preservation
- **Search/filter events**: Filter by actor, date range
- **Event visualization**: Timeline graph of edits
- **Diff view**: Show before/after for each event
- **Watermarking**: Invisible watermark embedding (soft binding)

### 12.2 Production Hardening

- **Secure key management**: Hardware security module (HSM) integration
- **Certificate authority**: Real PKI with trusted roots
- **Real attestation**: TPM/TEE-backed tooling attestation
- **Server-side verification**: API endpoint for verification service
- **Rate limiting**: Prevent abuse of AI endpoint
- **Audit logging**: Server-side log of all operations

---

## 13. Acceptance Criteria

### 13.1 Functional Acceptance

**Must Have:**
- ✅ User can type text and see real-time content hash updates
- ✅ User can select text and request AI rewrite
- ✅ AI rewrite creates properly attributed provenance event
- ✅ Trust panel displays all provenance artifacts accurately
- ✅ Bundle export creates valid, verifiable bundle
- ✅ Verifier detects any tampering with bundle
- ✅ All cryptographic operations use real libraries (not mocks)

**Should Have:**
- ✅ Clean, professional UI using AG UI components
- ✅ Helpful error messages for common issues
- ✅ Loading states during async operations
- ✅ Tooltips explaining technical terms

**Nice to Have:**
- ✅ Smooth animations/transitions
- ✅ Keyboard shortcuts (Ctrl+S to export, etc.)
- ✅ Dark mode support

### 13.2 Technical Acceptance

- ✅ TypeScript compilation with no errors
- ✅ All services have unit test coverage > 80%
- ✅ End-to-end demo scenario works without errors
- ✅ App runs on Chrome, Firefox, Safari (latest versions)
- ✅ Web Crypto API compatibility verified
- ✅ HTTPS deployment successful
- ✅ No console errors in production build

### 13.3 Documentation Acceptance

- ✅ README with setup instructions
- ✅ Inline code comments for complex logic
- ✅ API documentation for all services
- ✅ User guide (in-app or separate doc)

---

## 14. Glossary of Terms

| Term | Definition |
|------|------------|
| **Provenance** | Record of the origin and history of content |
| **Event Chain** | Cumulative hash linking all edit events |
| **Manifest** | Signed document containing provenance metadata |
| **Hard Binding** | Cryptographic hash directly tying metadata to content bytes |
| **Transparency Receipt** | Proof of inclusion in an append-only log (simulated in demo) |
| **Attestation** | Proof that software/hardware is in a trusted state (simulated in demo) |
| **Bundle** | Complete export package (content + manifest + receipt + attestation) |
| **Tamper Evidence** | Mechanism to detect unauthorized modifications |
| **SHA-256** | Cryptographic hash function producing 256-bit digest |
| **ECDSA** | Elliptic Curve Digital Signature Algorithm |
| **Web Crypto API** | Browser standard for cryptographic operations |

---

**End of System Specification**

This document provides the technical blueprint for implementing the A2UI Provenance Demo. All components, data flows, APIs, and acceptance criteria are specified to enable direct translation into code.
