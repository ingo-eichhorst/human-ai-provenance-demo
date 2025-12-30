# A2UI Provenance Demo - Implementation Plan

**Version:** 1.0
**Date:** 2025-12-30
**Purpose:** Step-by-step implementation guide for coding agents

---

## Overview

This document breaks down the implementation into discrete, manageable steps. Each step includes:
- **Objective**: What to build
- **Input**: Prerequisites and dependencies
- **Output**: Deliverables
- **Acceptance Criteria**: How to verify completion
- **Estimated Complexity**: Simple / Medium / Complex

**Total Steps:** 15

---

## Phase 1: Foundation Setup (Steps 1-3)

### Step 1: Project Initialization

**Objective:** Set up React + TypeScript + Vite project with all dependencies

**Input:**
- PRD_final.md requirements
- spec.md technology stack section

**Tasks:**
1. Initialize Vite project with React-TypeScript template
2. Install core dependencies:
   ```bash
   npm create vite@latest . -- --template react-ts
   npm install @ag-ui/react langgraph uuid
   npm install -D @types/uuid
   ```
3. Configure `tsconfig.json` for strict type checking
4. Configure `vite.config.ts` (target: es2020, port: 3000)
5. Set up project folder structure:
   ```
   src/
   ├── components/
   ├── services/
   ├── state/
   ├── types/
   ├── utils/
   ├── App.tsx
   └── main.tsx
   ```
6. Create basic `index.css` with layout styles

**Output:**
- Runnable Vite dev server (`npm run dev`)
- Empty project structure
- All dependencies installed

**Acceptance Criteria:**
- ✅ `npm run dev` starts development server without errors
- ✅ Browser shows default Vite React page at http://localhost:3000
- ✅ TypeScript compilation succeeds with no errors
- ✅ All folders created in `src/`
- ✅ `package.json` contains all required dependencies

**Estimated Complexity:** Simple

---

### Step 2: Type Definitions

**Objective:** Define all TypeScript interfaces and types

**Input:**
- spec.md Section 2.3.1 (State Schema)
- spec.md data structure definitions
- PRD_final.md data structures

**Tasks:**
1. Create `src/types/provenance.ts`:
   ```typescript
   export interface ProvenanceEvent {
     id: string;
     actor: 'human' | 'ai';
     timestamp: number;
     range: { start: number; end: number };
     beforeText: string;
     afterText: string;
     beforeHash: string;
     afterHash: string;
     aiMetadata?: {
       model: string;
       promptHash: string;
       responseHash: string;
     };
   }
   ```

2. Create `src/types/bundle.ts`:
   ```typescript
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
   ```

3. Create `src/types/verification.ts`:
   ```typescript
   export interface CheckResult {
     passed: boolean;
     message: string;
     details?: string;
   }

   export interface VerificationResult {
     overallStatus: 'pass' | 'fail';
     checks: {
       bundleHash: CheckResult;
       contentHash: CheckResult;
       signature: CheckResult;
       receipt: CheckResult;
       eventChain: CheckResult;
     };
   }
   ```

4. Create `src/state/AppState.ts`:
   ```typescript
   export interface AppState {
     config: {
       apiKey: string | null;
       initialized: boolean;
     };
     crypto: {
       publicKey: string | null;
       privateKey: CryptoKey | null;
     };
     content: {
       text: string;
       hash: string;
       selection: { start: number; end: number } | null;
     };
     provenance: {
       events: ProvenanceEvent[];
       eventChainHash: string;
     };
     manifest: {
       data: Manifest | null;
       hash: string | null;
       signatureStatus: 'valid' | 'invalid' | 'unsigned';
     };
     receipt: {
       data: Receipt | null;
       status: 'present' | 'missing';
     };
     attestation: {
       data: Attestation;
       status: 'approved';
     };
     ui: {
       isProcessingAI: boolean;
       lastError: string | null;
     };
   }
   ```

5. Create `src/state/actions.ts` with all action types

**Output:**
- 4 type definition files with all interfaces
- No implementation, just type definitions
- All types exported for use in other modules

**Acceptance Criteria:**
- ✅ All files compile without TypeScript errors
- ✅ All interfaces match spec.md definitions
- ✅ Imports work correctly (no circular dependencies)
- ✅ All types are exported
- ✅ `ProvenanceEvent` includes both human and AI metadata structure
- ✅ `Bundle` structure matches spec exactly

**Estimated Complexity:** Simple

---

### Step 3: Utility Functions

**Objective:** Create helper utilities for formatting and constants

**Input:**
- spec.md Section 11.1 (project structure)
- PRD_final.md UI requirements

**Tasks:**
1. Create `src/utils/constants.ts`:
   ```typescript
   export const APP_NAME = 'A2UI Provenance Demo';
   export const APP_VERSION = '1.0.0';
   export const TOOL_NAME = 'A2UI Provenance Demo';
   export const HASH_DISPLAY_LENGTH = 16; // Show first 8 + last 8 chars
   export const DEBOUNCE_DELAY = 500; // ms for human edit debouncing
   export const STORAGE_KEY_API_KEY = 'a2ui-provenance-api-key';
   export const STORAGE_KEY_PUBLIC_KEY = 'a2ui-provenance-public-key';
   ```

2. Create `src/utils/formatting.ts`:
   ```typescript
   export function truncateHash(hash: string, length = 16): string {
     if (hash.length <= length) return hash;
     const halfLength = Math.floor(length / 2);
     return `${hash.slice(0, halfLength)}...${hash.slice(-halfLength)}`;
   }

   export function formatTimestamp(timestamp: number): string {
     return new Date(timestamp).toLocaleString();
   }

   export function formatEventSummary(event: ProvenanceEvent): string {
     const maxLength = 50;
     const summary = `Replaced "${event.beforeText}" with "${event.afterText}"`;
     return summary.length > maxLength
       ? summary.slice(0, maxLength) + '...'
       : summary;
   }
   ```

3. Create `src/utils/clipboard.ts`:
   ```typescript
   export async function copyToClipboard(text: string): Promise<void> {
     try {
       await navigator.clipboard.writeText(text);
     } catch (error) {
       // Fallback for older browsers
       const textArea = document.createElement('textarea');
       textArea.value = text;
       document.body.appendChild(textArea);
       textArea.select();
       document.execCommand('copy');
       document.body.removeChild(textArea);
     }
   }
   ```

**Output:**
- 3 utility files with helper functions
- All functions typed and exported

**Acceptance Criteria:**
- ✅ All utility functions compile without errors
- ✅ `truncateHash()` correctly truncates long hashes
- ✅ `formatTimestamp()` returns readable date strings
- ✅ `copyToClipboard()` handles both modern and fallback APIs
- ✅ Constants are properly exported and usable

**Estimated Complexity:** Simple

---

## Phase 2: Core Services (Steps 4-6)

### Step 4: CryptoService Implementation

**Objective:** Implement all cryptographic operations using Web Crypto API

**Input:**
- spec.md Section 2.2.2 (CryptoService)
- Web Crypto API documentation

**Tasks:**
1. Create `src/services/CryptoService.ts`
2. Implement class with methods:
   - `initialize()`: Generate ECDSA P-256 keypair
   - `hash(data: string)`: SHA-256 hashing
   - `hashObject(obj: object)`: Canonical JSON hashing
   - `sign(data: string, privateKey: CryptoKey)`: ECDSA signing
   - `verify(data: string, signature: string, publicKey: string)`: Signature verification
   - `bufferToHex()`, `bufferToBase64()`, `base64ToBuffer()`: Conversion utilities
   - `exportPublicKey()`: Export key to JWK format
   - `importPublicKey()`: Import key from JWK format

3. Use Web Crypto API (`window.crypto.subtle`)
4. Handle key import/export for JWK format (JSON Web Key)
5. Ensure all async operations return Promises

**Implementation Notes:**
- ECDSA with P-256 curve and SHA-256
- Keys should be extractable for export
- Canonical JSON: `JSON.stringify(obj, Object.keys(obj).sort())`
- Base64 encoding for signatures
- Hex encoding for hashes

**Output:**
- `CryptoService.ts` class file
- All methods implemented and tested
- Singleton instance exported

**Acceptance Criteria:**
- ✅ `initialize()` generates valid ECDSA keypair
- ✅ `hash()` produces consistent 64-character hex SHA-256 hashes
- ✅ `hashObject()` produces same hash regardless of key order in input
- ✅ `sign()` produces base64-encoded signature
- ✅ `verify()` returns `true` for valid signatures, `false` for invalid
- ✅ Sign + verify roundtrip works correctly
- ✅ All methods handle errors gracefully (throw meaningful errors)
- ✅ No TypeScript errors
- ✅ Public key can be exported and re-imported successfully

**Test Cases to Verify:**
```typescript
// Manual test in browser console
const crypto = new CryptoService();
await crypto.initialize();
const hash1 = await crypto.hash("hello");
const hash2 = await crypto.hash("hello");
console.assert(hash1 === hash2, "Hashes should be identical");

const sig = await crypto.sign("test", crypto.privateKey);
const valid = await crypto.verify("test", sig, crypto.publicKey);
console.assert(valid === true, "Signature should verify");
```

**Estimated Complexity:** Complex

---

### Step 5: ProvenanceService Implementation

**Objective:** Implement event creation and event chain computation

**Input:**
- spec.md Section 2.2.1 (ProvenanceService)
- `types/provenance.ts`
- `CryptoService` (dependency)

**Tasks:**
1. Create `src/services/ProvenanceService.ts`
2. Implement class with methods:
   - `createHumanEvent()`: Create human edit event
   - `createAIEvent()`: Create AI edit event
   - `computeEventChainHash()`: Cumulative hash of events
   - `buildManifest()`: Assemble manifest from state

3. Use `uuid` library for event ID generation
4. Inject `CryptoService` dependency (constructor parameter)
5. Implement event chain hashing algorithm:
   ```typescript
   // Recursive: hash(event_n || hash(event_n-1 || ... hash(event_0)))
   let chainHash = '';
   for (const event of events) {
     const eventData = JSON.stringify(event);
     chainHash = await this.cryptoService.hash(eventData + chainHash);
   }
   ```

**Output:**
- `ProvenanceService.ts` class file
- All methods implemented
- Singleton instance exported (or factory function)

**Acceptance Criteria:**
- ✅ `createHumanEvent()` generates event with unique ID (UUID v4)
- ✅ `createAIEvent()` includes `aiMetadata` field with all required properties
- ✅ Events include all required fields (see `ProvenanceEvent` type)
- ✅ `computeEventChainHash()` produces different hashes when events change
- ✅ Event chain hash is cumulative (adding event changes hash)
- ✅ `buildManifest()` returns manifest without signature/publicKey (omitted)
- ✅ All timestamps are Unix milliseconds (`Date.now()`)
- ✅ No TypeScript errors

**Test Cases to Verify:**
```typescript
const provService = new ProvenanceService(cryptoService);
const event1 = provService.createHumanEvent({...});
const event2 = provService.createHumanEvent({...});
console.assert(event1.id !== event2.id, "IDs should be unique");

const hash1 = await provService.computeEventChainHash([event1]);
const hash2 = await provService.computeEventChainHash([event1, event2]);
console.assert(hash1 !== hash2, "Chain hash should change");
```

**Estimated Complexity:** Medium

---

### Step 6: AIClientService Implementation

**Objective:** Implement OpenAI API integration for text rewriting

**Input:**
- spec.md Section 2.2.5 (AIClientService)
- spec.md Section 4.2 (OpenAI API contract)
- OpenAI API documentation

**Tasks:**
1. Create `src/services/AIClientService.ts`
2. Implement class with methods:
   - `setApiKey(key: string)`: Store API key
   - `rewriteText(selectedText: string, instruction: string)`: Call OpenAI API

3. Use `fetch()` to call OpenAI chat completions endpoint
4. Construct prompt as specified in spec
5. Hash prompt and response using `CryptoService`
6. Handle errors (401, 429, 500, network errors)

**Implementation:**
```typescript
async rewriteText(selectedText: string, instruction: string): Promise<AIRewriteResponse> {
  const prompt = `Rewrite the following text according to this instruction: "${instruction}"\n\nOriginal text: "${selectedText}"\n\nRewritten text:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-5-nano',
      messages: [
        { role: 'system', content: 'You are a helpful text rewriting assistant. Only return the rewritten text, nothing else.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  // Handle errors, parse response, compute hashes
  // Return AIRewriteResponse
}
```

**Output:**
- `AIClientService.ts` class file
- API integration implemented
- Error handling for common cases

**Acceptance Criteria:**
- ✅ `setApiKey()` stores key in memory
- ✅ `rewriteText()` makes correct API request to OpenAI
- ✅ Response parsing extracts rewritten text correctly
- ✅ `promptHash` and `responseHash` computed using CryptoService
- ✅ Returns `AIRewriteResponse` with all fields
- ✅ Throws meaningful errors for:
  - Missing API key
  - 401 Unauthorized (invalid key)
  - 429 Rate limit
  - 500 Server error
  - Network errors
- ✅ No TypeScript errors

**Test Cases to Verify:**
- Test with valid API key and simple text
- Test with invalid API key (should throw error)
- Test error message formatting

**Estimated Complexity:** Medium

---

## Phase 3: State Management (Step 7)

### Step 7: LangGraph State Setup

**Objective:** Set up LangGraph state management with reducers and actions

**Input:**
- spec.md Section 2.3 (State Management)
- `state/AppState.ts` types
- LangGraph documentation

**Tasks:**
1. Create `src/state/reducer.ts`:
   - Implement reducer function handling all action types
   - Actions: INIT_CRYPTO, SET_API_KEY, UPDATE_CONTENT, SET_SELECTION, ADD_EVENT, UPDATE_MANIFEST, UPDATE_RECEIPT, SET_AI_PROCESSING, SET_ERROR

2. Create `src/state/langGraphSetup.ts`:
   - Initialize LangGraph state graph
   - Define state transitions
   - Export state context provider

3. Create initial state factory:
   ```typescript
   export function createInitialState(): AppState {
     return {
       config: { apiKey: null, initialized: false },
       crypto: { publicKey: null, privateKey: null },
       content: { text: '', hash: '', selection: null },
       provenance: { events: [], eventChainHash: '' },
       manifest: { data: null, hash: null, signatureStatus: 'unsigned' },
       receipt: { data: null, status: 'missing' },
       attestation: {
         data: {
           toolName: TOOL_NAME,
           version: APP_VERSION,
           approved: true
         },
         status: 'approved'
       },
       ui: { isProcessingAI: false, lastError: null }
     };
   }
   ```

4. Implement reducer cases for each action type
5. Ensure immutability (use spread operators, no mutations)

**Output:**
- State management files with reducer and LangGraph setup
- Context provider component for wrapping app
- Type-safe action creators

**Acceptance Criteria:**
- ✅ Reducer handles all action types defined in `actions.ts`
- ✅ State updates are immutable (no direct mutations)
- ✅ LangGraph context provider exports successfully
- ✅ Initial state matches `AppState` interface
- ✅ Each action updates only relevant state slice
- ✅ `ADD_EVENT` action triggers `eventChainHash` recomputation
- ✅ No TypeScript errors
- ✅ State can be accessed via React hooks

**Test Cases to Verify:**
```typescript
const initialState = createInitialState();
const newState = reducer(initialState, { type: 'SET_API_KEY', payload: 'test-key' });
console.assert(newState.config.apiKey === 'test-key');
console.assert(initialState !== newState, "Should return new object");
```

**Estimated Complexity:** Medium

---

## Phase 4: UI Components (Steps 8-11)

### Step 8: AppContainer and Header Components

**Objective:** Create root layout and header with API key input

**Input:**
- spec.md Section 2.1.1, 2.1.2 (AppContainer, Header)
- AG UI component library
- State management from Step 7

**Tasks:**
1. Create `src/App.tsx` (AppContainer):
   - Wrap with LangGraph state provider
   - Initialize crypto on mount (call `CryptoService.initialize()`)
   - Load API key from localStorage
   - Implement layout (60/40 split)

2. Create `src/components/Header.tsx`:
   - App title
   - API key input (password type with show/hide toggle)
   - Save button (stores to localStorage)
   - Status indicator (green checkmark if configured)

3. Use AG UI components for styling
4. Implement basic CSS for layout grid

**Output:**
- `App.tsx` with layout structure
- `Header.tsx` component
- Basic styling for layout

**Acceptance Criteria:**
- ✅ App renders without errors
- ✅ Layout shows 60/40 split (left panel / right panel)
- ✅ Header displays app title
- ✅ API key input shows/hides on toggle
- ✅ Saved API key persists to localStorage
- ✅ Status indicator shows green when API key configured
- ✅ Crypto keys initialize on app mount
- ✅ State updates correctly when API key saved
- ✅ No TypeScript errors
- ✅ Responsive layout (basic)

**Test Cases to Verify:**
- Open app, verify header renders
- Enter API key, save, refresh page, verify key persisted
- Check localStorage for saved key

**Estimated Complexity:** Medium

---

### Step 9: EditorPanel Component

**Objective:** Implement text editor with selection tracking and AI rewrite controls

**Input:**
- spec.md Section 2.1.3 (EditorPanel)
- State management
- Services: AIClientService, ProvenanceService, CryptoService

**Tasks:**
1. Create `src/components/EditorPanel.tsx`
2. Implement textarea with:
   - Controlled input (value from state)
   - onChange handler (triggers content update)
   - onSelect handler (tracks selection range)
   - Debouncing for human edits (500ms)

3. Implement AI rewrite controls:
   - Instruction input field
   - "Rewrite Selected Text" button (disabled if no selection)
   - Loading indicator during AI processing

4. Implement "Copy Bundle" button (calls BundleService - will implement in Step 11)

5. Content change flow:
   - User types → debounced → hash new content → create human event → update state

6. AI rewrite flow:
   - Get selected text from range
   - Call AIClientService
   - Replace selection with response
   - Create AI event
   - Update state

**Output:**
- `EditorPanel.tsx` component with full functionality
- Event handlers for text editing and AI rewriting

**Acceptance Criteria:**
- ✅ Textarea renders with current content from state
- ✅ Typing in textarea updates content state (debounced)
- ✅ Text selection updates selection state
- ✅ Selection range displays correctly
- ✅ AI instruction input captures user input
- ✅ "Rewrite" button enabled only when text selected
- ✅ AI rewrite calls OpenAI API correctly
- ✅ Loading state shows during API request
- ✅ AI response replaces selected text
- ✅ Human events created for manual edits
- ✅ AI events created for AI rewrites
- ✅ Events include correct hashes (before/after)
- ✅ Error handling for API failures (shows error message)
- ✅ No TypeScript errors

**Test Cases to Verify:**
- Type text, verify event created after debounce
- Select text, enter instruction, click rewrite (with valid API key)
- Verify AI event appears with correct metadata

**Estimated Complexity:** Complex

---

### Step 10: TrustArtifactsPanel Component

**Objective:** Display real-time provenance state

**Input:**
- spec.md Section 2.1.4 (TrustArtifactsPanel)
- State management
- Utility functions for formatting

**Tasks:**
1. Create `src/components/TrustArtifactsPanel.tsx`
2. Implement 6 sections:
   - **Content Hash**: Display truncated hash with copy button
   - **Edit History**: Scrollable list of events
   - **Event Chain Hash**: Display truncated hash
   - **Manifest Status**: Signature status indicator
   - **Receipt Status**: Demo badge "Logged ✓"
   - **Attestation Status**: Demo badge "Approved ✓"

3. Event list item component:
   - Event number
   - Actor badge (color-coded)
   - Timestamp (formatted)
   - Action summary
   - Expandable details (click to show full event data)

4. Use AG UI components for cards/panels
5. Color coding: green for valid/approved, red for invalid, gray for unsigned
6. Copy buttons for hashes (use clipboard utility)

**Output:**
- `TrustArtifactsPanel.tsx` component
- Styled panel with all sections
- Real-time updates from state

**Acceptance Criteria:**
- ✅ Content hash displays and updates when content changes
- ✅ Hash truncation uses `truncateHash()` utility
- ✅ Copy button copies full hash to clipboard
- ✅ Edit history shows all events in chronological order
- ✅ Actor badges color-coded (blue=human, green=AI)
- ✅ Timestamps formatted with `formatTimestamp()`
- ✅ Event details expand/collapse on click
- ✅ Event chain hash displays correctly
- ✅ Manifest status shows "Signed ✓" when manifest present
- ✅ Receipt shows "Logged ✓" with demo badge
- ✅ Attestation shows "Approved ✓" with demo badge
- ✅ Panel scrollable if content overflows
- ✅ No TypeScript errors

**Test Cases to Verify:**
- Create several edits, verify all appear in history
- Expand event details, verify all fields shown
- Copy hash, verify clipboard contains full hash

**Estimated Complexity:** Medium

---

### Step 11: BundleService and VerificationService

**Objective:** Implement bundle creation/export and verification logic

**Input:**
- spec.md Section 2.2.3, 2.2.4 (BundleService, VerificationService)
- All services (dependencies)

**Tasks:**

**BundleService (`src/services/BundleService.ts`):**
1. Implement `createBundle()`:
   - Assemble bundle from content, manifest, receipt, attestation
   - Compute `bundleHash` (canonical JSON, excluding bundleHash field itself)
   - Return complete Bundle object

2. Implement `serializeBundle()`:
   - Pretty-print JSON (2-space indent, sorted keys)

3. Implement `copyToClipboard()`:
   - Use clipboard utility

**VerificationService (`src/services/VerificationService.ts`):**
1. Implement `verifyBundle()`:
   - Run all 5 verification checks in parallel
   - Return VerificationResult

2. Implement individual check methods:
   - `verifyBundleHash()`: Recompute and compare
   - `verifyContentHash()`: Hash content and compare to manifest
   - `verifySignature()`: Use CryptoService.verify()
   - `verifyReceipt()`: Demo check (just verify presence)
   - `verifyEventChain()`: Recompute chain hash and compare

3. Each check returns `CheckResult` with `passed`, `message`, optional `details`

**Output:**
- `BundleService.ts` with export functionality
- `VerificationService.ts` with all verification checks

**Acceptance Criteria:**
- ✅ `createBundle()` produces valid Bundle object
- ✅ `bundleHash` computed correctly (canonical JSON)
- ✅ `bundleHash` excludes itself from hash computation
- ✅ `serializeBundle()` produces pretty-printed JSON
- ✅ `copyToClipboard()` copies to system clipboard
- ✅ `verifyBundle()` runs all 5 checks
- ✅ Valid bundle passes all checks
- ✅ Tampered content fails content hash check
- ✅ Invalid signature fails signature check
- ✅ Modified events fail event chain check
- ✅ `overallStatus` is 'pass' only if all checks pass
- ✅ Error messages are clear and actionable
- ✅ No TypeScript errors

**Test Cases to Verify:**
```typescript
// Create bundle, verify it passes
const bundle = await bundleService.createBundle(...);
const result = await verificationService.verifyBundle(bundle);
console.assert(result.overallStatus === 'pass');

// Tamper content, verify it fails
bundle.content += ' tampered';
const result2 = await verificationService.verifyBundle(bundle);
console.assert(result2.overallStatus === 'fail');
console.assert(result2.checks.contentHash.passed === false);
```

**Estimated Complexity:** Complex

---

### Step 12: VerifierPanel Component

**Objective:** Implement bundle verification UI

**Input:**
- spec.md Section 2.1.5 (VerifierPanel)
- VerificationService
- BundleService (for parsing)

**Tasks:**
1. Create `src/components/VerifierPanel.tsx`
2. Implement 3 sections:
   - **Input Section**: Textarea for pasting bundle JSON, "Verify" button
   - **Results Section**: Verdict banner + checklist of results
   - **Instructions**: Help text for tamper testing

3. Verification flow:
   - User pastes JSON
   - Click "Verify"
   - Parse JSON → Bundle object
   - Call `VerificationService.verifyBundle()`
   - Display results

4. Results display:
   - Overall verdict: Green banner "✓ ALL CHECKS PASSED" or Red "✗ VERIFICATION FAILED"
   - 5 individual checks with status icons
   - Failed checks highlighted in red with explanation

5. Error handling:
   - Invalid JSON → show parse error
   - Missing fields → show validation error

**Output:**
- `VerifierPanel.tsx` component
- Verification UI with results display

**Acceptance Criteria:**
- ✅ Textarea allows pasting large JSON
- ✅ "Verify" button triggers verification
- ✅ Invalid JSON shows error message
- ✅ Valid bundle shows all checks
- ✅ Overall verdict correct (pass/fail)
- ✅ Individual checks display with icons (✓/✗)
- ✅ Failed checks show in red with explanation
- ✅ "Clear" button clears input and results
- ✅ Help text visible and helpful
- ✅ No TypeScript errors

**Test Cases to Verify:**
- Export bundle from editor, paste to verifier, verify passes
- Manually edit content in JSON, verify fails with content hash error
- Paste invalid JSON, verify error message shown

**Estimated Complexity:** Medium

---

## Phase 5: Integration & Polish (Steps 13-15)

### Step 13: End-to-End Integration

**Objective:** Wire all components together and implement complete workflows

**Input:**
- All components and services from previous steps

**Tasks:**
1. Connect EditorPanel's "Copy Bundle" button to BundleService
2. Implement full bundle export flow:
   - Gather state (content, manifest, receipt, attestation)
   - Call BundleService.createBundle()
   - Generate receipt (demo: just sign manifest hash with same key)
   - Call BundleService.copyToClipboard()
   - Show success notification

3. Implement manifest signing flow:
   - After every content change (human or AI)
   - Build manifest with ProvenanceService
   - Sign manifest with CryptoService
   - Generate demo receipt
   - Update state

4. Ensure state updates propagate to all components:
   - EditorPanel shows current content
   - TrustArtifactsPanel shows current hashes/events
   - State changes trigger re-renders

5. Add error boundaries for graceful error handling
6. Add loading states for async operations

**Output:**
- Fully integrated application
- All workflows working end-to-end
- Error handling in place

**Acceptance Criteria:**
- ✅ Complete demo scenario works:
  1. User types text → event created → trust panel updates
  2. User selects text, AI rewrites → AI event created → trust panel updates
  3. User exports bundle → clipboard contains valid JSON
  4. User pastes to verifier → all checks pass
  5. User tampers bundle → verification fails correctly

- ✅ State changes propagate correctly
- ✅ Manifest re-signed after every edit
- ✅ Receipt generated after every manifest update
- ✅ No race conditions in async operations
- ✅ Error boundaries catch rendering errors
- ✅ Loading indicators show during AI requests
- ✅ Success notifications appear for actions (bundle copied)
- ✅ No console errors during normal operation
- ✅ No TypeScript errors

**Test Cases to Verify:**
- Run through complete demo scenario 3 times
- Test error cases (invalid API key, network error, etc.)
- Test rapid typing (debouncing works)
- Test rapid AI requests (loading state correct)

**Estimated Complexity:** Complex

---

### Step 14: Styling and UI Polish

**Objective:** Apply AG UI styling and polish the user interface

**Input:**
- AG UI documentation and components
- spec.md layout requirements
- PRD UI requirements

**Tasks:**
1. Apply AG UI theme/design system
2. Refine layout:
   - 60/40 split with proper responsive behavior
   - Vertical split in right panel (50/50)
   - Proper spacing, padding, margins

3. Style components:
   - Editor: Monospace font, border, proper sizing
   - Trust panel: Cards for each section, icons for status
   - Verifier: Clear visual separation of sections
   - Buttons: Consistent styling, disabled states
   - Inputs: Proper focus states, validation styling

4. Add visual feedback:
   - Hover states for interactive elements
   - Active/focus states
   - Smooth transitions (not too animated)
   - Color coding (green=good, red=error, gray=neutral)

5. Improve typography:
   - Headings hierarchy
   - Monospace for hashes/technical content
   - Readable font for body text

6. Add icons:
   - Copy icons for hash copy buttons
   - Status icons (checkmarks, X marks)
   - Actor badges (human/AI icons)

7. Mobile responsiveness (basic):
   - Stack panels vertically on small screens
   - Ensure usability on tablets

**Output:**
- Polished UI matching PRD mockup intent
- Consistent styling throughout
- Professional appearance

**Acceptance Criteria:**
- ✅ Layout matches spec (60/40, vertical split)
- ✅ AG UI components used throughout
- ✅ Color scheme consistent (green/red/gray status indicators)
- ✅ Buttons have hover/active states
- ✅ Monospace font used for hashes and technical data
- ✅ Icons present for status indicators
- ✅ Copy buttons have clear affordance
- ✅ Spacing and padding consistent
- ✅ No layout shifts or jumps
- ✅ Readable on laptop screens (1366x768 minimum)
- ✅ Basic mobile responsiveness works
- ✅ No visual bugs or overlapping elements

**Visual QA Checklist:**
- [ ] Header looks professional
- [ ] Editor has clear boundaries
- [ ] Trust panel sections visually separated
- [ ] Event list is scannable
- [ ] Verifier results are clear
- [ ] Color coding is intuitive
- [ ] Loading states are obvious
- [ ] Error messages are visible

**Estimated Complexity:** Medium

---

### Step 15: Documentation and Final Testing

**Objective:** Create user documentation and perform final testing

**Input:**
- Completed application
- PRD_final.md success criteria
- spec.md acceptance criteria

**Tasks:**
1. Create `README.md`:
   - Project description
   - Installation instructions (`npm install`, `npm run dev`)
   - Usage guide (demo scenario walkthrough)
   - API key setup instructions
   - Technology stack
   - Demo limitations (not production-ready warnings)
   - Screenshots or GIF demo

2. Create inline help/tooltips:
   - Tooltip for "Content Hash" explaining what it is
   - Tooltip for "Event Chain" explaining cumulative hashing
   - Tooltip for "Signature Status" explaining digital signatures
   - Tooltip for "Demo Mode" badges explaining simulated features
   - Help text in verifier explaining tamper testing

3. Add console warnings for demo mode:
   ```typescript
   console.warn('A2UI Provenance Demo - NOT FOR PRODUCTION USE');
   console.info('Keys are ephemeral and not secured. Do not use with sensitive content.');
   ```

4. Final testing checklist:
   - [ ] All PRD success criteria met
   - [ ] All spec acceptance criteria met
   - [ ] Demo scenario completes successfully
   - [ ] Error handling works for all edge cases
   - [ ] No TypeScript compilation errors
   - [ ] No console errors in production build
   - [ ] Build succeeds (`npm run build`)
   - [ ] Production build works when served
   - [ ] Web Crypto API works (HTTPS or localhost)
   - [ ] OpenAI API integration works with valid key
   - [ ] Bundle export/import works
   - [ ] Verification detects all types of tampering
   - [ ] Cross-browser testing (Chrome, Firefox, Safari)

5. Create `DEMO_GUIDE.md`:
   - Step-by-step instructions for presenting the demo
   - What to say at each step
   - Expected outcomes
   - Common issues and solutions

**Output:**
- Complete documentation
- Final tested application
- Demo-ready build

**Acceptance Criteria:**
- ✅ README.md complete with all sections
- ✅ Installation instructions work (tested on clean machine)
- ✅ Usage guide clear and accurate
- ✅ Inline tooltips present and helpful
- ✅ Console warnings appear on app load
- ✅ All items in testing checklist pass
- ✅ Build produces no errors or warnings
- ✅ Production build runs correctly
- ✅ DEMO_GUIDE.md provides clear presentation steps
- ✅ Screenshots/demo GIF included in README
- ✅ No TODO comments left in code
- ✅ Code formatted consistently

**Final Verification:**
- Run `npm run build` → should succeed
- Test built app in `dist/` folder
- Run through demo scenario 5 times without errors
- Test in Chrome, Firefox, Safari
- Verify all documentation accurate

**Estimated Complexity:** Simple

---

## Implementation Summary

### Dependency Graph

```
Step 1 (Project Setup)
  ↓
Step 2 (Types) ──→ Step 3 (Utils)
  ↓                      ↓
Step 4 (CryptoService) ←─┘
  ↓
Step 5 (ProvenanceService)
  ↓
Step 6 (AIClientService)
  ↓
Step 7 (State Management)
  ↓
Step 8 (AppContainer + Header)
  ↓
Step 9 (EditorPanel)
  ↓
Step 10 (TrustArtifactsPanel)
  ↓
Step 11 (Bundle + VerificationService)
  ↓
Step 12 (VerifierPanel)
  ↓
Step 13 (Integration)
  ↓
Step 14 (Styling)
  ↓
Step 15 (Documentation)
```

### Estimated Timeline

| Phase | Steps | Complexity | Estimated Effort |
|-------|-------|------------|------------------|
| Phase 1: Foundation | 1-3 | Simple | 2-3 hours |
| Phase 2: Services | 4-6 | Medium-Complex | 5-7 hours |
| Phase 3: State | 7 | Medium | 2-3 hours |
| Phase 4: UI | 8-12 | Medium-Complex | 8-10 hours |
| Phase 5: Polish | 13-15 | Medium | 4-5 hours |
| **Total** | **15 steps** | - | **21-28 hours** |

### Critical Success Factors

1. **Web Crypto API Compatibility**: Must run on HTTPS or localhost
2. **OpenAI API Key**: User must provide valid key for AI features
3. **Type Safety**: All code must compile without TypeScript errors
4. **Immutability**: State updates must be immutable for LangGraph
5. **Error Handling**: Graceful degradation for all error cases
6. **Demo Clarity**: Clear labeling of simulated vs. real features

### Common Pitfalls to Avoid

- **Circular Dependencies**: Ensure services don't import each other circularly
- **State Mutations**: Never mutate state directly, always return new objects
- **Async Race Conditions**: Properly handle concurrent async operations
- **Bundle Hash Computation**: Must exclude bundleHash field from its own computation
- **Canonical JSON**: Key order matters for consistent hashing
- **Private Key Security**: Remember this is a demo, not production
- **HTTPS Requirement**: Web Crypto API requires secure context

---

## Acceptance Gates

Each phase must pass these gates before proceeding:

### Phase 1 Gate
- ✅ Project runs without errors
- ✅ All types compile
- ✅ Utilities work correctly

### Phase 2 Gate
- ✅ All services unit-testable
- ✅ Crypto operations verified (hash, sign, verify)
- ✅ AI client can call OpenAI (with test key)

### Phase 3 Gate
- ✅ State updates work
- ✅ Actions dispatch correctly
- ✅ No state mutation bugs

### Phase 4 Gate
- ✅ All UI components render
- ✅ User interactions work
- ✅ Data flows from state to UI

### Phase 5 Gate
- ✅ Demo scenario works end-to-end
- ✅ UI polished and professional
- ✅ Documentation complete

---

## Post-Implementation Checklist

Before marking the project complete:

- [ ] All 15 steps completed
- [ ] All acceptance criteria met
- [ ] Demo scenario successful (5 consecutive runs)
- [ ] No TypeScript errors
- [ ] No console errors (except intentional warnings)
- [ ] Build succeeds (`npm run build`)
- [ ] Production build tested
- [ ] Cross-browser testing passed
- [ ] Documentation complete and accurate
- [ ] README has installation and usage instructions
- [ ] Demo limitations clearly stated
- [ ] Code formatted and clean
- [ ] No sensitive data in code (API keys, etc.)

---

**End of Implementation Plan**

This plan provides a structured, step-by-step approach for building the A2UI Provenance Demo. Each step is designed to be independently completable with clear acceptance criteria for verification.
