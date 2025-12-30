# A2UI Provenance Demo

A simple, educational demonstration of content provenance concepts in an AI-assisted text editing workflow. This demo illustrates how cryptographic provenance mechanisms work to ensure content authenticity, authorship attribution, and tamper evidence.

**⚠️ IMPORTANT: This is a proof-of-concept demo, NOT production-ready software. Do not use with sensitive content.**

## Features

- **Text Editor** with human editing tracking
- **AI-Assisted Rewriting** using OpenAI GPT-4o-mini
- **Real-time Provenance Tracking** with cryptographic hashes and signatures
- **Event Chain** showing complete edit history
- **Bundle Export/Import** with full verification
- **Tamper Detection** demonstrating integrity verification

## Technology Stack

- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite** - Build tool
- **Web Crypto API** - SHA-256 hashing, ECDSA signing
- **OpenAI API** - AI text rewriting (gpt-4o-mini)

## Installation

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   - Navigate to `http://localhost:3000`
   - The app should open automatically

## Usage Guide

### Demo Scenario Walkthrough

#### 1. Configure API Key

- In the header, enter your OpenAI API key
- Click "Save" - a green checkmark (✓) will appear when configured
- Keys are stored in localStorage for convenience

#### 2. Write Initial Content

- Type a paragraph in the editor
- Watch the **Trust Artifacts Panel** update in real-time:
  - Content Hash changes
  - Edit history records your changes
  - Manifest is signed automatically

#### 3. AI-Assisted Rewriting

- Select a sentence in your text
- Enter an instruction (e.g., "make this more concise")
- Click "Rewrite Selected Text"
- The AI response replaces your selection
- A new AI event appears in the edit history with:
  - Model name (gpt-4o-mini)
  - Prompt hash
  - Response hash

#### 4. Export Bundle

- Click "Copy Bundle" button
- A JSON bundle is copied to your clipboard containing:
  - Full content
  - Complete manifest with all events
  - Cryptographic signatures
  - Transparency receipt (demo)
  - Attestation (demo)

#### 5. Verify Bundle

- Paste the bundle into the **Verifier** section
- Click "Verify Bundle"
- All 5 checks should pass (green):
  - ✓ Bundle Hash Check
  - ✓ Content Hash Check
  - ✓ Signature Verification
  - ✓ Receipt Verification
  - ✓ Event Chain Check

#### 6. Tamper Detection Demo

- In the verifier, manually edit the pasted bundle JSON
- For example, change some text in the `"content"` field
- Click "Verify Bundle" again
- Verification fails (red) with specific error messages showing which checks failed

## Architecture Overview

### Components

- **Header** - API key configuration
- **EditorPanel** - Text editing + AI rewrite controls
- **TrustArtifactsPanel** - Real-time provenance display
- **VerifierPanel** - Bundle verification UI

### Services

- **CryptoService** - Web Crypto API wrapper (SHA-256, ECDSA P-256)
- **ProvenanceService** - Event creation and chain computation
- **AIClientService** - OpenAI API integration
- **BundleService** - Bundle creation and serialization
- **VerificationService** - Multi-check verification logic

### Data Flow

1. **Human Edit** → Hash content → Create event → Update chain → Sign manifest → Generate receipt
2. **AI Rewrite** → Call OpenAI → Hash prompt/response → Create AI event → Same flow as above
3. **Export** → Assemble bundle → Compute bundle hash → Copy to clipboard
4. **Verify** → Parse bundle → Run 5 parallel checks → Display results

## Cryptographic Implementation

### What Uses Real Cryptography

- ✅ **SHA-256 Hashing** - All content, events, manifests
- ✅ **ECDSA P-256 Signing** - Manifest signatures
- ✅ **Event Chain** - Cumulative Merkle-style hashing
- ✅ **Signature Verification** - Public key cryptography

### What is Simulated (Demo Mode)

- 🎭 **Transparency Log Receipt** - Generated locally, not sent to external log
- 🎭 **Tooling Attestation** - Hardcoded "approved" status
- 🎭 **Key Security** - Keys ephemeral, regenerated each session

## Security Warnings

**This is a DEMO application. NOT suitable for production use:**

- ❌ Private keys stored in browser memory (extractable via dev tools)
- ❌ No key encryption or secure storage
- ❌ No certificate validation / PKI infrastructure
- ❌ Demo receipts not from real transparency log
- ❌ No protection beyond standard React escaping

**Safe Demo Practices:**
- Only use with non-sensitive, test content
- API keys stored in localStorage (clear after demo)
- Keys regenerated each session (not persistent)
- Run on HTTPS or localhost (Web Crypto API requirement)

## Build for Production

```bash
npm run build
```

Output: `dist/` folder ready to deploy to static hosting (Vercel, Netlify, GitHub Pages)

**Note:** Must be served over HTTPS (or localhost) for Web Crypto API to work.

## Project Structure

```
src/
├── components/          # React UI components
│   ├── Header.tsx
│   ├── EditorPanel.tsx
│   ├── TrustArtifactsPanel.tsx
│   └── VerifierPanel.tsx
├── services/            # Business logic
│   ├── CryptoService.ts
│   ├── ProvenanceService.ts
│   ├── AIClientService.ts
│   ├── BundleService.ts
│   └── VerificationService.ts
├── state/               # State management
│   ├── AppState.ts
│   ├── AppContext.tsx
│   ├── actions.ts
│   └── reducer.ts
├── types/               # TypeScript interfaces
│   ├── provenance.ts
│   ├── bundle.ts
│   └── verification.ts
├── utils/               # Helper functions
│   ├── constants.ts
│   ├── formatting.ts
│   └── clipboard.ts
├── App.tsx              # Root component
└── main.tsx             # Entry point
```

## Troubleshooting

### Common Issues

**"OpenAI API error: Invalid API key"**
- Check your API key is correct
- Ensure you have credits in your OpenAI account

**"Failed to initialize cryptographic keys"**
- Ensure you're running on HTTPS or localhost
- Web Crypto API requires secure context

**Build errors**
- Run `npm install` to ensure all dependencies installed
- Check Node.js version is 18+

**Verification always fails**
- Don't manually format the JSON before pasting
- Ensure you copied the entire bundle

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Browser Compatibility

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14.1+
- Edge 90+

Requires Web Crypto API support.

## License

MIT License - Educational/Demo use only

## References

- [C2PA Specification](https://c2pa.org/specifications/)
- [SCITT Architecture](https://datatracker.ietf.org/doc/draft-ietf-scitt-architecture/)
- [Sigstore Documentation](https://docs.sigstore.dev/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [OpenAI API](https://platform.openai.com/docs/api-reference)

## Acknowledgments

This demo is a simplified educational implementation inspired by:
- Content Authenticity Initiative (CAI)
- C2PA (Coalition for Content Provenance and Authenticity)
- SCITT (Supply Chain Integrity, Transparency and Trust)
- Sigstore (Software artifact signing and verification)

---

**Version:** 1.0.0
**Date:** 2025-12-30
**For questions or issues:** See documentation in `PRD_final.md`, `spec.md`, and `PLAN.md`
