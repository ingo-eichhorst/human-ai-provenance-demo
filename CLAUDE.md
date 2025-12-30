# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A2UI Provenance Demo is an educational demonstration of cryptographic provenance in AI-assisted text editing. It tracks human and AI edits with cryptographic signatures, event chains, and tamper-evident verification.

**⚠️ This is a proof-of-concept demo, NOT production code.**

## Development Commands

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start dev server (http://localhost:3000)

# Build
npm run build           # TypeScript compile + Vite bundle
npm run preview         # Preview production build

# Code Quality
npm run lint            # ESLint (strict mode, no warnings allowed)
```

## Architecture Overview

### State-Driven Service Architecture

The application uses **React Context + useReducer** for global state management with a **service layer** for business logic:

```
UI Components → AppContext (dispatch) → Reducer → AppState → Services
```

**Critical State Shape** (`src/state/AppState.ts`):
- `crypto`: { publicKey, privateKey } - ECDSA P-256 keypair (ephemeral)
- `content`: { text, hash, selection } - Current editor content
- `provenance`: { events[], eventChainHash } - Edit history chain
- `manifest`: { data, hash, signatureStatus } - Signed provenance manifest
- `receipt`: { data, status } - Transparency log receipt (demo)

### Service Layer Architecture

**Services are singletons or factory-created** and handle all business logic:

1. **CryptoService** (`src/services/CryptoService.ts`)
   - Web Crypto API wrapper (ECDSA P-256, SHA-256)
   - Singleton: `export const cryptoService = new CryptoService()`
   - Key operations: `initialize()`, `hash()`, `sign()`, `verify()`
   - Canonical object hashing: sorts keys deterministically

2. **ProvenanceService** (`src/services/ProvenanceService.ts`)
   - Creates human/AI provenance events with unique UUIDs
   - Computes event chain hash: `hash(event_n || hash(event_n-1 || ...))`
   - Factory pattern: `createProvenanceService(cryptoService)`

3. **AIClientService** (`src/services/AIClientService.ts`)
   - OpenAI API integration (gpt-4o-mini)
   - Hashes prompts and responses for provenance
   - Factory pattern: `createAIClientService(cryptoService)`

4. **BundleService** (`src/services/BundleService.ts`)
   - Creates export bundles with deterministic hashing
   - Serializes to canonical JSON (sorted keys, pretty-printed)
   - Bundle hash excludes itself from computation

5. **VerificationService** (`src/services/VerificationService.ts`)
   - Runs 5 parallel verification checks
   - Returns detailed pass/fail results
   - Factory pattern: `createVerificationService(cryptoService, provenanceService)`

### Data Flow Patterns

**Human Edit Flow:**
1. User types → debounced (500ms) → hash content
2. Create ProvenanceEvent (actor: 'human')
3. Append to events array → recompute event chain hash
4. Build manifest → sign with ECDSA → generate receipt
5. Update state → UI reflects changes

**AI Rewrite Flow:**
1. User selects text + enters instruction
2. Call OpenAI API → hash prompt and response
3. Create ProvenanceEvent (actor: 'ai', aiMetadata: { model, promptHash, responseHash })
4. Replace selection → follow manifest signing flow (same as human edit)

**Bundle Export Flow:**
1. Gather: content, manifest, receipt, attestation
2. Compute bundleHash (canonical JSON, excluding bundleHash field itself)
3. Serialize with sorted keys → copy to clipboard

**Verification Flow:**
1. Parse bundle JSON → validate structure
2. Run 5 checks in parallel (Promise.all):
   - Bundle hash: recompute and compare
   - Content hash: verify against manifest
   - Signature: ECDSA verification with publicKey
   - Receipt: presence check (demo mode)
   - Event chain: recompute and compare
3. Aggregate results (pass only if all checks pass)

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

// Signing: manifest data is canonicalized before signing
const manifestToSign = JSON.stringify(data, Object.keys(data).sort());
const signature = await crypto.sign(manifestToSign, privateKey);
```

**Canonical JSON Hashing:**
- All object hashing uses sorted keys to ensure deterministic output
- Critical for bundle hash verification
- Implemented in `CryptoService.hashObject()`

**Event Chain Integrity:**
- Cumulative hashing links all events cryptographically
- Formula: `hash(event_n || previousChainHash)`
- Any modification to history invalidates the chain

### State Management

**Reducer Pattern:**
- All state updates are immutable (spread operators)
- Actions follow Redux naming: `{ type: 'ACTION_NAME', payload: ... }`
- Initial state factory: `createInitialState()` in `reducer.ts`

**Context Usage:**
```typescript
const { state, dispatch } = useAppContext();
dispatch({ type: 'ADD_EVENT', payload: event });
```

### Component Patterns

**EditorPanel:**
- Uses debouncing (500ms) to batch human edits
- Selection tracking via `onSelect` event
- AI rewrite button disabled unless text selected

**TrustArtifactsPanel:**
- Real-time reactive to state changes
- Expandable event details (click to toggle)
- Color-coded actor badges (blue=human, green=AI)

**VerifierPanel:**
- Standalone component (can verify any bundle)
- Clear error messaging for JSON parse failures
- Visual feedback: green banner (pass) / red banner (fail)

## Key Files to Understand

### Core Services (read in this order):
1. `src/services/CryptoService.ts` - Understand all crypto operations first
2. `src/services/ProvenanceService.ts` - Event creation and chain computation
3. `src/state/reducer.ts` - State shape and update logic
4. `src/App.tsx` - Component wiring and bundle export flow

### Type Definitions:
- `src/types/provenance.ts` - ProvenanceEvent interface
- `src/types/bundle.ts` - Manifest, Receipt, Attestation, Bundle
- `src/state/AppState.ts` - Complete state shape

## Common Modifications

### Adding New Provenance Data:
1. Update `ProvenanceEvent` interface in `src/types/provenance.ts`
2. Modify event creation in `ProvenanceService.createHumanEvent()` or `createAIEvent()`
3. Update event display in `TrustArtifactsPanel.tsx` (EventItem component)

### Adding New Verification Checks:
1. Add new check method in `VerificationService.ts`
2. Update `VerificationResult` type in `src/types/verification.ts`
3. Call new check in `verifyBundle()` Promise.all
4. Update `VerifierPanel.tsx` to display new check result

### Changing AI Provider:
1. Modify `AIClientService.ts` fetch URL and request format
2. Update model name in response object
3. Ensure prompt/response hashing logic remains intact

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
- Bundle hash computation excludes `bundleHash` field itself
- Always sort object keys before hashing
- Use `BundleService.serializeBundle()` for deterministic output

**Debouncing:**
- Human edits debounced 500ms (DEBOUNCE_DELAY constant)
- Don't create events on every keystroke
- Clear timer on unmount to prevent memory leaks

## Security Notes (Demo Context)

**Not Production-Ready:**
- Private keys stored in browser memory (extractable)
- No key encryption or secure storage
- Transparency receipts are simulated (not real log)
- API keys in localStorage (convenience, not secure)

**What IS Cryptographically Sound:**
- SHA-256 hashing (real Web Crypto API)
- ECDSA P-256 signatures (real cryptography)
- Event chain integrity (tamper-evident)
- Signature verification (authentic public key crypto)

## References

- **PRD_final.md** - Product requirements and use cases
- **spec.md** - Technical specification and data flow diagrams
- **PLAN.md** - Implementation roadmap (15 steps)
- **README.md** - User-facing documentation and setup guide
