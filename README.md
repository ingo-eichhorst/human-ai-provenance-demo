# A2UI Provenance Demo

An educational demonstration of content provenance using **C2PA (Coalition for Content Provenance and Authenticity)** standards in an AI-assisted text editing workflow. This demo shows how cryptographic provenance mechanisms work to ensure content authenticity, authorship attribution, and tamper evidence using industry-standard formats.

**⚠️ IMPORTANT: This is a proof-of-concept demo, NOT production-ready software. Do not use with sensitive content.**

## Features

### Core Functionality
- **C2PA External Manifests** - Industry-standard provenance format with sidecar `.c2pa.json` files
- **IPTC Digital Source Types** - Distinguishes human edits from AI-generated content
- **SCITT Integration** - Supply Chain Integrity, Transparency and Trust log (demo mode)
- **Text Editor** with pending change workflow (diff view, accept/reject)
- **AI-Assisted Editing** using OpenAI GPT-4o-mini (generation & rewriting)
- **Real-time Provenance Tracking** with cryptographic hashes and signatures

### Export Formats
- **Embedded Manifests** (`.c2pa.txt`) - Single file with base64-encoded manifest footer
- **Separate Files** - Content + external manifest (`.c2pa.json`)
- **PDF Export** - PDF with embedded manifest attachment (demo)
- **Signed Images** - Real C2PA signing via backend server (verifiable at c2paviewer.com)

### Verification
- **Dual-mode Verifier** - Single file or separate files
- **Content Hash Verification** - SHA-256 hash matching
- **Signature Verification** - ECDSA P-256 signature validation (demo mode)
- **SCITT Receipt Verification** - Transparency log receipt validation
- **Edit History Display** - View all C2PA actions with expandable details

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite** - Build tool
- **Web Crypto API** - SHA-256 hashing, ECDSA signing
- **OpenAI API** - AI text generation and rewriting (gpt-4o-mini)
- **pdf-lib** - PDF generation with embedded manifests

### Backend
- **Node.js 18+** - Runtime
- **Express** - HTTP server (port 3002)
- **@contentauth/c2pa-node** - Real C2PA signing for images
- **tsx** - TypeScript execution

## Installation

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- For signed image export: Self-signed certificates in `server/certs/` (ps256.pub, ps256.pem)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development servers (frontend + backend):**
   ```bash
   npm run dev
   ```
   This starts:
   - Frontend (Vite) on `http://localhost:3000`
   - Backend (Express) on `http://localhost:3002`

3. **Alternative: Start servers separately:**
   ```bash
   npm run dev:frontend  # Frontend only
   npm run server        # Backend only
   ```

4. **Open in browser:**
   - Navigate to `http://localhost:3000`
   - The app should open automatically

## Usage Guide

### Demo Scenario Walkthrough

#### 1. Configure API Key

- In the header, enter your OpenAI API key
- Click "Save" - a green checkmark (✓) will appear when configured
- Keys are stored in localStorage for convenience

#### 2. Generate Initial Content (NEW)

**Option A: Use Starter Prompts**
- Click one of the predefined prompt cards (e.g., "Haiku about cats")
- AI generates content based on the prompt
- View the diff showing the generated text
- Click "Accept Change" to commit

**Option B: Write Manually**
- Type text directly in the editor
- On blur, a pending change is created
- View the diff showing your edits
- Click "Accept Change" to commit

Watch the **Trust Artifacts Panel** update in real-time:
- Content Hash changes (SHA-256)
- C2PA Actions list grows with each accepted change
- Human edits get `humanEdits` source type (blue badge)
- AI edits get `trainedAlgorithmicMedia` source type (green badge)
- Manifest is signed automatically (ECDSA P-256)
- SCITT receipt is generated (demo mode)

#### 3. AI-Assisted Rewriting

- Select a portion of text (or leave empty for full document)
- Enter an instruction in the rewrite box (e.g., "make this more concise")
- Click "Rewrite Selected Text" or "Rewrite Document"
- View the diff showing proposed changes
- Click "Accept Change" to commit
- A new C2PA action appears with:
  - Model name (gpt-4o-mini)
  - Prompt hash (SHA-256)
  - Response hash (SHA-256)
  - AI source type badge (green)

#### 4. Export with C2PA Provenance

Four export options available:

**A. Export as .c2pa.txt (Recommended)**
- Click "Export as .c2pa.txt"
- Downloads single file with embedded manifest footer
- Format: `[content]\n\n---C2PA-MANIFEST-START---\n[base64]\n---C2PA-MANIFEST-END---`

**B. Export as Separate Files**
- Click "Export as Separate Files"
- Downloads two files:
  - `document.txt` - Plain content
  - `document.c2pa.json` - External manifest

**C. Export as PDF (Demo)**
- Click "Export as PDF (Demo)"
- Downloads PDF with manifest as file attachment
- Note: Not full JUMBF format, for demo purposes

**D. Export as Signed Image**
- Click "Export as Signed Image"
- Renders content as PNG
- Sends to backend for real C2PA signing
- Downloads signed PNG with embedded JUMBF manifest
- Verifiable at https://c2paviewer.com/

#### 5. Verify C2PA Provenance

Switch to the **Verifier** tab:

**Mode 1: Single File Verification**
1. Select "Single File (.c2pa.txt)" mode
2. Drag and drop your `.c2pa.txt` file
3. Click "Verify"
4. View verification results:
   - ✓ Content Hash Check (SHA-256 match)
   - ✓ Signature Verification (ECDSA P-256)
   - ✓ SCITT Receipt Verification
5. View edit history with all C2PA actions

**Mode 2: Separate Files Verification**
1. Select "Separate Files" mode
2. Upload content file (.txt)
3. Upload manifest file (.c2pa.json)
4. Click "Verify"
5. View same verification results and edit history

All checks should pass (green) for valid, unmodified content.

#### 6. Tamper Detection Demo

- In the verifier, upload a valid file
- Manually edit the uploaded file before verification (e.g., change some text)
- OR modify the manifest JSON
- Click "Verify"
- Verification fails (red) with specific error messages showing:
  - ✗ Content Hash Check Failed (hash mismatch)
  - Other checks may also fail depending on modification

For PNG verification with real C2PA signatures:
- Upload signed images to https://c2paviewer.com/
- View full C2PA manifest with all assertions
- Check signature chain and timestamps

## Architecture Overview

### Application Structure

```
┌─────────────────────────────────────────────────────┐
│                   App (Header + Tabs)               │
├─────────────────┬───────────────────────────────────┤
│  Editor Tab     │         Verifier Tab              │
├─────────────────┼───────────────────────────────────┤
│ EditorPanel     │         VerifierPanel             │
│ - StarterPrompts│         - File upload             │
│ - Text editor   │         - Mode toggle             │
│ - DiffView      │         - Verification results    │
│ - ActionBar     │                                   │
│ - Export buttons│                                   │
├─────────────────┼───────────────────────────────────┤
│TrustArtifacts   │      VerifierEditHistory          │
│ - Content hash  │         - Verified content        │
│ - C2PA actions  │         - C2PA actions            │
│ - Manifest      │         - Action details          │
│ - SCITT receipt │                                   │
└─────────────────┴───────────────────────────────────┘
```

### Components

- **Header** - API key configuration, show/hide toggle
- **TabNavigation** - Editor/Verifier tab switching
- **EditorPanel** - Main editing interface with AI controls
- **StarterPrompts** - Predefined AI prompt cards
- **DiffView** - Word-level diff visualization (LCS algorithm)
- **ActionBar** - Accept/Reject buttons for pending changes
- **TrustArtifactsPanel** - Real-time C2PA provenance display
- **VerifierPanel** - Dual-mode file verification UI
- **VerifierEditHistory** - Verified document and action history display

### Services

#### Core Services
- **CryptoService** - Web Crypto API wrapper (SHA-256, ECDSA P-256)
- **ProvenanceService** - C2PA action creation (human/AI with IPTC source types)
- **AIClientService** - OpenAI API integration (gpt-4o-mini)

#### C2PA Services
- **C2PAManifestService** - C2PA claim building and signing
- **C2PAVerificationService** - Content + manifest verification
- **SCITTService** - Transparency log integration (demo mode)
- **EmbeddedManifestService** - Manifest embedding/extraction

#### Export Services
- **PDFExportService** - PDF generation with manifest attachments
- **ImageExportService** - Content rendering as PNG images

#### Backend Service
- **c2paSigningService** - Real C2PA signing via @contentauth/c2pa-node

### Data Flow

1. **Human Edit** → Pending change → Diff view → Accept → Create C2PA action → Sign manifest → Generate SCITT receipt
2. **AI Generate** → Call OpenAI → Hash prompt/response → Pending change → Accept → Create C2PA action with AI metadata
3. **AI Rewrite** → Select text → Call OpenAI → Same flow as AI Generate
4. **Export** → Choose format → Build/sign manifest → Embed or save separately → Download
5. **Verify** → Upload file(s) → Extract/parse manifest → Run 3 checks → Display results + action history

## Cryptographic Implementation

### What Uses Real Cryptography

- ✅ **SHA-256 Hashing** - All content, actions, manifests (Web Crypto API)
- ✅ **ECDSA P-256 Signing** - Manifest signatures (Web Crypto API)
- ✅ **C2PA Manifest Structure** - Follows C2PA specification patterns
- ✅ **Signature Verification** - Public key cryptography (Web Crypto API)
- ✅ **Backend C2PA Signing** - Real @contentauth/c2pa-node library (for images)
- ✅ **TSA Timestamps** - Backend adds RFC 3161 timestamps via DigiCert (for images)

### What is Simulated (Demo Mode)

- 🎭 **SCITT Receipts** - Generated locally, not sent to real transparency log
- 🎭 **COSE Structure** - Simplified JSON+base64 (not full CBOR encoding)
- 🎭 **Key Security** - Keys ephemeral, regenerated each session
- 🎭 **Certificate Validation** - No PKI infrastructure, demo self-signed certs
- 🎭 **Frontend Timestamps** - Client-generated (backend uses real TSA)

## Security Warnings

**This is a DEMO application. NOT suitable for production use:**

- ❌ Private keys stored in browser memory (extractable via dev tools)
- ❌ No key encryption or secure storage
- ❌ No certificate validation / PKI infrastructure (frontend)
- ❌ SCITT receipts simulated (not from real transparency log)
- ❌ No protection beyond standard React escaping
- ❌ API keys in localStorage (convenience, not secure)
- ❌ Backend certificates are self-signed test certificates

**Safe Demo Practices:**
- Only use with non-sensitive, test content
- API keys stored in localStorage (clear after demo)
- Cryptographic keys regenerated each session (not persistent)
- Run on HTTPS or localhost (Web Crypto API requirement)
- Backend server for local testing only

## Build for Production

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

Output: `dist/` folder ready to deploy to static hosting (Vercel, Netlify, GitHub Pages)

**Important Notes:**
- Must be served over HTTPS (or localhost) for Web Crypto API to work
- Backend server (`npm run server`) must be deployed separately if using signed image export
- Update CORS settings in `server/index.ts` for production domain
- Replace test certificates with real CA-issued certificates for production C2PA signing

## Project Structure

```
a2ui-provenance-demo/
├── server/                  # Backend Express server (port 3002)
│   ├── index.ts            # Express app with CORS
│   ├── c2paSigningService.ts  # Real C2PA signing
│   └── certs/              # Self-signed certificates (ps256.pub, ps256.pem)
├── src/
│   ├── components/         # React UI components
│   │   ├── Header.tsx      # API key config
│   │   ├── TabNavigation.tsx  # Tab switching
│   │   ├── EditorPanel.tsx    # Main editor (601 lines)
│   │   ├── StarterPrompts.tsx # AI prompt cards
│   │   ├── DiffView.tsx       # Word-level diff
│   │   ├── ActionBar.tsx      # Accept/Reject UI
│   │   ├── TrustArtifactsPanel.tsx  # C2PA display
│   │   ├── VerifierPanel.tsx        # File verification
│   │   └── VerifierEditHistory.tsx  # Verified doc display
│   ├── services/           # Business logic services
│   │   ├── CryptoService.ts          # Web Crypto wrapper
│   │   ├── ProvenanceService.ts      # C2PA action creation
│   │   ├── AIClientService.ts        # OpenAI integration
│   │   ├── C2PAManifestService.ts    # Manifest building
│   │   ├── C2PAVerificationService.ts # Verification
│   │   ├── SCITTService.ts           # Transparency log
│   │   ├── EmbeddedManifestService.ts # Manifest embedding
│   │   ├── PDFExportService.ts       # PDF generation
│   │   ├── ImageExportService.ts     # Image rendering
│   │   ├── BundleService.ts          # Legacy bundles
│   │   └── VerificationService.ts    # Legacy verification
│   ├── state/              # State management (React Context + useReducer)
│   │   ├── AppState.ts     # State interface
│   │   ├── AppContext.tsx  # Context provider
│   │   ├── actions.ts      # Action types
│   │   └── reducer.ts      # Reducer logic
│   ├── types/              # TypeScript interfaces
│   │   ├── c2pa.ts         # C2PA types (PRIMARY)
│   │   ├── provenance.ts   # PendingChange, UserInteraction
│   │   ├── bundle.ts       # Legacy bundle types
│   │   └── verification.ts # Verification results
│   ├── utils/              # Helper functions
│   │   ├── constants.ts    # App constants
│   │   ├── formatting.ts   # Hash/timestamp formatting
│   │   ├── clipboard.ts    # Clipboard utilities
│   │   └── diff.ts         # Word-level diff algorithm (LCS)
│   ├── App.tsx             # Root component
│   ├── App.css             # App styles
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build config
├── vitest.config.ts        # Test configuration
├── CLAUDE.md               # Development guide (this file)
├── C2PA_Integration.md     # C2PA integration guide
├── PRD_final.md            # Product requirements
├── SPEC.md                 # Technical specification
└── PLAN.md                 # Implementation roadmap
```

## Troubleshooting

### Common Issues

**"OpenAI API error: Invalid API key"**
- Check your API key is correct
- Ensure you have credits in your OpenAI account
- Verify API key has proper permissions

**"Failed to initialize cryptographic keys"**
- Ensure you're running on HTTPS or localhost
- Web Crypto API requires secure context
- Check browser console for detailed errors

**Backend server not starting**
- Check port 3002 is available
- Ensure certificates exist in `server/certs/`
- Run `npm run server` separately to see errors
- Check Node.js version is 18+

**Signed image export fails**
- Ensure backend server is running (`npm run dev` or `npm run server`)
- Check `server/certs/` contains ps256.pub and ps256.pem
- Backend must be on localhost:3002
- Check browser console for fetch errors

**Build errors**
- Run `npm install` to ensure all dependencies installed
- Check Node.js version is 18+
- Clear `node_modules/` and reinstall if needed
- Check for TypeScript errors: `npm run lint`

**Verification always fails**
- Ensure you uploaded the correct file(s)
- Don't manually edit files before verification
- For embedded files, check for `---C2PA-MANIFEST-START---` marker
- Verify file wasn't modified after export

**Diff view not showing**
- Ensure content has actually changed
- Check that you're not in AI generation mode (loading spinner)
- Verify pending change was created (check state in React DevTools)

## Development

### Available Scripts

- `npm run dev` - Start concurrent frontend + backend
- `npm run dev:frontend` - Start frontend only (Vite dev server)
- `npm run server` - Start backend only (Express server)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint (strict mode, no warnings)
- `npm run test` - Run Vitest tests
- `npm run test:run` - Run tests once (CI mode)

### Browser Compatibility

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14.1+
- Edge 90+

Requires Web Crypto API support.

### Testing

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run
```

## C2PA Specification Compliance

This demo implements key C2PA concepts:

- ✅ **External Manifests** - Sidecar `.c2pa.json` files
- ✅ **Claims** - With assertions and signatures
- ✅ **Hard Binding** - SHA-256 content hash assertion
- ✅ **Actions Assertion** - C2PA action history
- ✅ **Digital Source Types** - IPTC vocabulary (humanEdits, trainedAlgorithmicMedia)
- ✅ **COSE Signatures** - Simplified for demo (not full CBOR)
- ⚠️ **JUMBF Format** - Only for backend-signed images
- ⚠️ **Trust Lists** - Not implemented (demo certs only)
- ⚠️ **Redaction** - Not implemented

## License

MIT License - Educational/Demo use only

## References

### Standards and Specifications
- [C2PA Specification](https://c2pa.org/specifications/) - Coalition for Content Provenance and Authenticity
- [SCITT Architecture](https://datatracker.ietf.org/doc/draft-ietf-scitt-architecture/) - Supply Chain Integrity, Transparency and Trust
- [IPTC Digital Source Type](http://cv.iptc.org/newscodes/digitalsourcetype/) - Controlled vocabulary for source attribution

### Libraries and Tools
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - Browser cryptography
- [OpenAI API](https://platform.openai.com/docs/api-reference) - AI text generation
- [@contentauth/c2pa-node](https://www.npmjs.com/package/@contentauth/c2pa-node) - C2PA signing library
- [C2PA Viewer](https://c2paviewer.com/) - Verify signed images

### Project Documentation
- **CLAUDE.md** - Comprehensive development guide for Claude Code
- **C2PA_Integration.md** - Detailed C2PA integration notes
- **PRD_final.md** - Product requirements and use cases
- **SPEC.md** - Technical specification and data flows
- **PLAN.md** - Implementation roadmap

## Acknowledgments

This demo is an educational implementation inspired by:
- **Content Authenticity Initiative (CAI)** - Adobe-led coalition
- **C2PA (Coalition for Content Provenance and Authenticity)** - Industry standard
- **SCITT (Supply Chain Integrity, Transparency and Trust)** - IETF standard
- **IPTC** - International Press Telecommunications Council (Digital Source Type vocabulary)

---

**Version:** 1.0.0
**Last Updated:** 2025-12-31
**For questions or issues:** See documentation in `CLAUDE.md`, `C2PA_Integration.md`, `PRD_final.md`, and `SPEC.md`
