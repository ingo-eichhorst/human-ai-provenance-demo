# A2UI Provenance Demo - Product Requirements Document (Final)

## Overview

A simple, educational demo application that illustrates content provenance concepts in an AI-assisted text editing workflow. The demo emphasizes **visibility and transparency** of cryptographic provenance mechanisms, showing users how content authenticity, authorship attribution, and tamper-evidence work in practice.

**Scope:** Proof-of-concept demo (NOT production-ready). Single use case with clear visual feedback.

---

## Core Use Case (Demo Scenario)

1. **Human writes text** - User types a paragraph in the editor
2. **Human requests AI rewrite** - User selects a sentence, provides instruction, AI rewrites only that portion
3. **Provenance tracking** - Side panel shows live updates:
   - Content hash changes
   - Edit history with human/AI attribution
   - Event chain hash updates
   - Manifest signature status
   - Transparency receipt appended
   - Tooling attestation (demo mode)
4. **Export bundle** - User clicks "Copy Bundle" to export content + provenance
5. **Verification** - User pastes bundle into verifier component:
   - All checks pass (green status)
6. **Tamper detection** - User manually edits pasted content:
   - Verifier immediately flags checksum mismatch, signature inconsistency

---

## Technical Stack

### Core Technologies
- **React** (UI framework)
- **TypeScript** (type safety)
- **AG UI** - Component library and design system ([docs.ag-ui.com](https://docs.ag-ui.com/introduction))
- **LangGraph TypeScript** - State management foundation (reference: [dojo.ag-ui.com/langgraph-typescript](https://dojo.ag-ui.com/langgraph-typescript/feature/predictive_state_updates?view=code))

### AI Integration
- **OpenAI API** (gpt-5-nano model)
- User provides API key via UI input (stored in session/local storage)

### Cryptography
- **Real crypto libraries** (Web Crypto API or crypto-js/noble-crypto)
- SHA-256 hashing (content, events, manifests)
- Digital signatures (ECDSA or Ed25519)
- Demo keypair generation (keys generated at app initialization, not persisted)

---

## UI Layout

**Single-page application with all components visible simultaneously:**

```
┌─────────────────────────────────────────────────────────────┐
│  Header: App Title + OpenAI API Key Input                   │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│   EDITOR (60% width)         │   TRUST ARTIFACTS PANEL      │
│                              │   (40% width, top half)      │
│   - Text editor area         │                              │
│   - Text selection           │   - Content Hash             │
│   - AI rewrite controls      │   - Edit History             │
│     (instruction input +     │   - Event Chain Hash         │
│      "Rewrite" button)       │   - Manifest Status          │
│   - "Copy Bundle" button     │   - Receipt Status           │
│                              │   - Attestation Status       │
│                              │                              │
│                              ├──────────────────────────────┤
│                              │                              │
│                              │   VERIFIER COMPONENT         │
│                              │   (40% width, bottom half)   │
│                              │                              │
│                              │   - "Paste Bundle" input     │
│                              │   - Verification Results:    │
│                              │     • Bundle hash check      │
│                              │     • Content hash check     │
│                              │     • Signature check        │
│                              │     • Receipt check          │
│                              │     • Event chain check      │
│                              │   - Status indicators        │
│                              │     (green/red)              │
└──────────────────────────────┴──────────────────────────────┘
```

---

## Functional Requirements

### 1. Editor Component (Human-AI Co-creation)

#### 1.1 Text Editing
- **Free-form text input** - User can type/paste/edit text freely
- **Human edits tracked** - Each human keystroke/change creates a provenance event:
  - Actor: `"human"`
  - Range: `{start, end}` character positions
  - Replacement text
  - Before/after content hashes
  - Timestamp

#### 1.2 AI-Assisted Rewriting
- **Selection-based AI edits** - User workflow:
  1. Select text range in editor
  2. Enter instruction (e.g., "make this more concise")
  3. Click "Rewrite Selected Text"
  4. App sends to OpenAI API (gpt-5-nano):
     - Prompt includes selected text + instruction
     - Restricts AI to only rewrite the selected portion
  5. AI response replaces selection
  6. Provenance event created:
     - Actor: `"ai"`
     - Range: `{start, end}`
     - Replacement text
     - Model: `"gpt-5-nano"`
     - Prompt hash (SHA-256 of instruction)
     - Response hash (SHA-256 of AI output)
     - Before/after content hashes
     - Timestamp

#### 1.3 Bundle Export
- **"Copy Bundle" button** - Exports JSON bundle to clipboard:
  ```typescript
  {
    content: string,           // current full text
    manifest: {
      events: Event[],         // full edit history
      contentHash: string,     // SHA-256 of current content
      eventChainHash: string,  // hash of all events
      signature: string,       // digital signature of manifest
      publicKey: string,       // verification key
      timestamp: number
    },
    receipt: {
      manifestHash: string,    // hash of manifest
      timestamp: number,
      receiptSignature: string // demo transparency log receipt
    },
    attestation: {
      toolName: "A2UI Provenance Demo",
      version: "1.0.0",
      approved: true          // demo: always true
    },
    bundleHash: string        // SHA-256 of canonical bundle
  }
  ```

---

### 2. Trust Artifacts Panel (Live State Visibility)

**Real-time display of provenance state** - Updates after every edit:

#### 2.1 Content Hash
- Display current SHA-256 hash of full text content
- Truncated format: `abc123...xyz789` with copy button
- Updates immediately on any content change

#### 2.2 Edit History
- **List of all events** (scrollable), showing:
  - Event #N
  - Actor badge: `[Human]` or `[AI: gpt-5-nano]`
  - Action summary: "Replaced 'X' with 'Y'" (truncated)
  - Timestamp
  - Range: `chars 45-67`
- Click event to expand details (before/after hashes, prompt hash if AI)

#### 2.3 Event Chain Hash
- **Cumulative hash** of all events (Merkle-style chain)
- Formula: `hash(event_N || hash(event_N-1 || ... || hash(event_0)))`
- Shows chain integrity

#### 2.4 Manifest Status
- **Signature status** indicator:
  - "Signed ✓" (green) - manifest signature valid
  - "Not signed" (gray) - no signature yet
  - "Invalid ✗" (red) - signature verification failed
- Show manifest hash (truncated)

#### 2.5 Transparency Receipt Status
- **Demo receipt indicator:**
  - "Logged ✓" (green) - receipt present
  - Shows receipt timestamp
  - Note: "Demo mode - simulated transparency log"

#### 2.6 Tooling Attestation Status
- **Demo attestation badge:**
  - "Approved ✓" (green)
  - Tool name + version
  - Note: "Demo mode - simulated attestation"

---

### 3. Verifier Component

#### 3.1 Bundle Input
- **Large textarea** or JSON editor for pasting bundle
- **"Verify Bundle" button**

#### 3.2 Verification Checks (run on button click)
Perform all checks in sequence, display results:

1. **Bundle Hash Check**
   - Recompute `bundleHash` from pasted bundle
   - Compare to `bundleHash` field in bundle
   - Result: ✓ Match / ✗ Mismatch

2. **Content Hash Check**
   - Hash the `content` field (SHA-256)
   - Compare to `manifest.contentHash`
   - Result: ✓ Match / ✗ Mismatch

3. **Manifest Signature Check**
   - Verify `manifest.signature` using `manifest.publicKey`
   - Result: ✓ Valid / ✗ Invalid

4. **Transparency Receipt Check**
   - Verify `receipt.receiptSignature` (demo mode: always valid if present)
   - Check `receipt.manifestHash` matches computed manifest hash
   - Result: ✓ Valid / ✗ Invalid / - Missing

5. **Event Chain Recomputation (Optional Extra)**
   - Recompute event chain hash from `manifest.events[]`
   - Compare to `manifest.eventChainHash`
   - Result: ✓ Match / ✗ Mismatch

#### 3.3 Verification Results Display
- **Overall verdict:**
  - **Green "ALL CHECKS PASSED"** - if all checks ✓
  - **Red "VERIFICATION FAILED"** - if any check ✗
  - List which specific checks failed

#### 3.4 Tamper Detection Demo
- **Instructions in verifier:** "Try manually editing the pasted bundle JSON to see tamper detection in action"
- When user modifies bundle and re-verifies, shows exactly which check(s) fail

---

## Data Structures (TypeScript)

```typescript
// Event: single edit action
interface ProvenanceEvent {
  id: string;              // unique event ID
  actor: 'human' | 'ai';
  timestamp: number;       // Unix timestamp
  range: {
    start: number;         // character offset
    end: number;
  };
  beforeText: string;      // text before replacement
  afterText: string;       // text after replacement
  beforeHash: string;      // SHA-256 of content before this event
  afterHash: string;       // SHA-256 of content after this event

  // AI-specific fields (null if actor === 'human')
  aiMetadata?: {
    model: string;         // "gpt-5-nano"
    promptHash: string;    // SHA-256 of user instruction
    responseHash: string;  // SHA-256 of AI response
  };
}

// Manifest: contains full provenance history
interface Manifest {
  events: ProvenanceEvent[];
  contentHash: string;      // current content hash
  eventChainHash: string;   // cumulative hash of all events
  signature: string;        // digital signature (hex/base64)
  publicKey: string;        // verification key (PEM/JWK)
  timestamp: number;
}

// Transparency receipt (demo mode)
interface Receipt {
  manifestHash: string;
  timestamp: number;
  receiptSignature: string; // demo signature
}

// Attestation (demo mode)
interface Attestation {
  toolName: string;
  version: string;
  approved: boolean;
}

// Bundle: complete export package
interface Bundle {
  content: string;
  manifest: Manifest;
  receipt: Receipt;
  attestation: Attestation;
  bundleHash: string;       // SHA-256 of canonical JSON
}
```

---

## User Flow (Step-by-Step)

### Phase 1: Content Creation
1. User opens app, sees empty editor
2. User enters OpenAI API key (if not already stored)
3. User types initial paragraph
   - Trust panel updates: content hash changes, event history shows human edits

### Phase 2: AI Collaboration
4. User selects one sentence
5. User enters instruction: "make this more formal"
6. User clicks "Rewrite Selected Text"
7. App calls OpenAI API (gpt-5-nano)
8. Selected text replaced with AI response
9. Trust panel updates:
   - Content hash changes
   - New AI event added to history
   - Event chain hash updates
   - Manifest re-signed
   - Receipt generated

### Phase 3: Export & Verification
10. User clicks "Copy Bundle"
11. Bundle JSON copied to clipboard
12. User pastes bundle into Verifier component
13. User clicks "Verify Bundle"
14. All checks pass → green "ALL CHECKS PASSED" message

### Phase 4: Tamper Detection Demo
15. User manually edits pasted bundle JSON (e.g., changes content text)
16. User clicks "Verify Bundle" again
17. Verifier shows red "VERIFICATION FAILED"
    - Bundle hash check: ✗ Mismatch
    - Content hash check: ✗ Mismatch
    - Clear indication of tampering

---

## Simplified Provenance Implementation (Demo Level)

### What We Implement (Real)
- ✅ **SHA-256 hashing** (content, events, manifests) - Web Crypto API
- ✅ **Digital signatures** (ECDSA/Ed25519) - real cryptographic signing
- ✅ **Event chain** (cumulative hash, tamper-evident)
- ✅ **Bundle integrity** (canonical JSON hashing)
- ✅ **Signature verification** (public key cryptography)

### What We Simulate (Demo Mode)
- 🎭 **Transparency log receipt** - generated locally, not sent to external log
  - No real Sigstore/SCITT integration
  - Receipt signature created with same demo keypair
  - Note displayed: "Demo mode - simulated transparency log"
- 🎭 **Tooling attestation** - hardcoded "approved" status
  - No real TEE/TPM attestation
  - No measurement/allowlist verification
  - Note displayed: "Demo mode - simulated attestation"

### What We Omit (Out of Scope)
- ❌ C2PA SDK integration (full spec compliance)
- ❌ External transparency service (Sigstore/Rekor/SCITT)
- ❌ Certificate authority / PKI infrastructure
- ❌ Hardware attestation (TEE/TPM)
- ❌ Watermarking / soft bindings
- ❌ Manifest repository
- ❌ Multi-user identity management
- ❌ Persistent key storage (keys ephemeral, regenerated per session)

---

## Non-Functional Requirements

### Performance
- Hashing operations must complete in <100ms
- AI rewrite requests show loading state
- UI remains responsive during verification

### Usability
- Clear visual feedback for all state changes
- Error messages for API failures (e.g., invalid OpenAI key)
- Copy/paste operations use system clipboard
- Monospace font for hashes/technical fields

### Educational Value
- Inline tooltips explaining technical terms (hash, signature, receipt, etc.)
- Color-coded status indicators (green=good, red=failed, gray=pending)
- Expandable sections for detailed event data
- Clear labeling of "demo mode" simulations

### Security Notes (Demo Context)
- ⚠️ **Not production-ready** - keys generated in browser, not secured
- ⚠️ **No private key protection** - demo keys ephemeral, no encryption
- ⚠️ **No real PKI** - no certificate validation
- ⚠️ Users should understand this demonstrates concepts, not real security

---

## Development Phases (Suggested)

### Phase 1: Core Editor + State Management
- Set up React + TypeScript + AG UI project
- Implement basic text editor component
- LangGraph state management for content + events
- Human edit tracking (provenance event creation)

### Phase 2: Cryptographic Foundation
- Implement SHA-256 hashing utilities
- Digital signature generation/verification (ECDSA)
- Event chain hash computation
- Manifest creation + signing

### Phase 3: AI Integration
- OpenAI API integration (gpt-5-nano)
- API key management UI
- Text selection → AI rewrite flow
- AI event recording

### Phase 4: Trust Artifacts Panel
- Real-time hash display
- Event history list
- Signature/receipt status indicators

### Phase 5: Bundle Export/Verification
- Bundle generation (canonical JSON)
- Copy to clipboard
- Verifier component
- All verification checks
- Tamper detection demo

### Phase 6: Polish + Documentation
- Tooltips + help text
- Error handling + edge cases
- Inline demo instructions
- README with usage guide

---

## Success Criteria

✅ User can complete the full demo scenario (write → AI rewrite → export → verify → tamper) in <5 minutes

✅ All cryptographic operations produce real, verifiable outputs (not mocked)

✅ Trust panel updates reflect all state changes in real-time

✅ Verifier correctly detects any tampering with bundle content/metadata

✅ UI clearly labels demo/simulated components vs. real crypto

✅ Code is well-structured, typed (TypeScript), and follows AG UI patterns

---

## Open Questions / Decisions Needed

*(To be resolved during implementation)*

- **Keypair persistence:** Should demo keys persist across browser sessions (localStorage) or regenerate each time?
  - Recommendation: Regenerate for true demo ephemerality

- **Event granularity:** Track every keystroke as individual events, or batch human edits?
  - Recommendation: Batch human edits (debounced) to avoid event explosion; track AI edits as single atomic events

- **Bundle format:** Pretty-printed JSON or minified?
  - Recommendation: Pretty-printed for readability in demo context

- **Error handling:** How to handle OpenAI API failures (rate limits, invalid key, network errors)?
  - Recommendation: Show error toast, allow retry, don't create AI event on failure

---

## References

- AG UI Documentation: https://docs.ag-ui.com/introduction
- LangGraph TypeScript Example: https://dojo.ag-ui.com/langgraph-typescript/feature/predictive_state_updates?view=code
- OpenAI API: https://platform.openai.com/docs/api-reference
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- C2PA Specification (reference): https://c2pa.org/specifications/
- SCITT Architecture (reference): https://datatracker.ietf.org/doc/draft-ietf-scitt-architecture/

---

**End of PRD**

*Version: 1.0 Final*
*Date: 2025-12-30*
