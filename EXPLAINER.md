# Understanding Digital Provenance: A Guide to the Human+AI Provenance Demo

## The Trust Problem in the AI Era

Imagine receiving a document claiming to be a historical account written by a renowned scholar. How do you know it's authentic? How can you tell if parts were added later, or if it was actually written by AI rather than the scholar?

For decades, we've dealt with photo manipulation—doctored images that spread misinformation. Digital signatures and metadata helped address this problem for images. But now we face a new challenge: AI can generate convincing text, edit documents seamlessly, and blur the line between human and machine authorship. **How do we maintain trust in content when AI is in the loop?**

This is where **content provenance** comes in—a cryptographic "paper trail" that proves who created content, when, and how it was modified.

## What is This Demo?

The **Human+AI Provenance Demo** is an educational tool that shows how industry-standard technologies can track the authorship and editing history of text documents, even when humans and AI collaborate.

Think of it as a **text editor with a built-in notary**. Every time you:
- Write or edit text manually
- Ask AI to generate content
- Use AI to rewrite a section

...the system creates a cryptographically signed record of that action. This creates an immutable chain of evidence showing exactly what happened, who did it (human or AI), and when.

```
┌─────────────────────────────────────────────────────────┐
│  YOU WRITE: "The cat sat on the mat"                    │
│  ↓                                                       │
│  SYSTEM RECORDS:                                        │
│    ✓ What changed (before/after hashes)                │
│    ✓ Who did it (human edit)                           │
│    ✓ When it happened (timestamp)                      │
│    ✓ Digital signature (cryptographic proof)           │
└─────────────────────────────────────────────────────────┘
```

## The Two Pillars: C2PA and SCITT

The demo uses two complementary technologies that work together like a lock and key:

### C2PA: The Content Signature

**C2PA** (Coalition for Content Provenance and Authenticity) is like a **notarized document**. When you sign a legal document, the notary verifies your identity and stamps it with their seal. C2PA does the same thing digitally:

- **Binds metadata to content** using cryptographic hashes
- **Proves authorship** through digital signatures
- **Documents the history** of all edits and transformations

Think of it as **"This document contains X, and I (with this cryptographic key) certify it."**

### SCITT: The Timestamp Authority

**SCITT** (Supply Chain Integrity, Transparency and Trust) adds a critical missing piece: **proof of when** the signature was created.

Here's why this matters:

**Without SCITT:**
```
❌ Someone could:
   1. Compromise a signing key
   2. Create a fake document
   3. Backdate it to 2020
   4. Claim "I created this years ago!"
   → No way to prove they're lying
```

**With SCITT:**
```
✓ A third-party transparency log:
   1. Records the exact time a document was signed
   2. Creates an immutable receipt
   3. Makes backdating impossible
   → If someone claims 2020 but the log shows 2025, fraud is exposed
```

Think of SCITT as a **notary's timestamp seal**. It doesn't just say "this is signed," it says "this was signed at exactly 3:42 PM on January 15, 2025, and here's third-party proof."

### Why Both Are Needed

| Technology | What It Proves | Real-World Analogy |
|-----------|----------------|-------------------|
| **C2PA** | "I created this content" | Your signature on a contract |
| **SCITT** | "I created it at this specific time" | Notary's official timestamp |
| **Together** | "I created this content, and here's independent proof of when" | Legally binding notarized document |

## How It Works: The Provenance Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                    CONTENT LIFECYCLE                         │
└──────────────────────────────────────────────────────────────┘

1. CREATE/EDIT CONTENT
   │
   │  Human types: "The cat sat on the mat"
   │  OR
   │  AI generates: "Once upon a time, in a cozy cottage..."
   │
   ▼

2. RECORD THE ACTION
   │
   │  System creates a C2PA "action" record:
   │  - Before hash: e3b0c44...
   │  - After hash: 2c26b46...
   │  - Actor: Human (IPTC: humanEdits)
   │        OR
   │        AI (IPTC: trainedAlgorithmicMedia)
   │  - Model: gpt-4o-mini (if AI)
   │  - Timestamp: 2025-01-15T15:42:00Z
   │
   ▼

3. SIGN THE MANIFEST
   │
   │  System creates a C2PA manifest containing:
   │  - All actions (the edit history)
   │  - Content hash (SHA-256)
   │  - Digital signature (ECDSA)
   │
   ▼

4. ANCHOR TO TRANSPARENCY LOG
   │
   │  Submit manifest to SCITT log
   │  Receive timestamped receipt
   │  (Demo mode: simulated locally)
   │
   ▼

5. EXPORT WITH PROOF
   │
   │  Save as:
   │  - Single file (.c2pa.txt with embedded manifest)
   │  - Separate files (content + manifest)
   │  - Signed PDF or image
   │
   ▼

6. VERIFY LATER
   │
   │  Anyone can upload the file and verify:
   │  ✓ Content matches hash (not tampered)
   │  ✓ Signature is valid (authentic signer)
   │  ✓ SCITT receipt is valid (correct timestamp)
```

## The Passport Stamps Analogy

Think of a document's provenance like a **passport**:

- **Each edit is a stamp** showing where you've been (what changed)
- **The signature is your photo** proving it's really you
- **The SCITT timestamp is the official entry date** stamped by border control
- **The entire passport** is the C2PA manifest—a complete travel history

Just like you can't remove a stamp from a passport without detection, you can't alter the provenance chain without breaking the cryptographic signatures.

## What This Demo Actually Shows

### Real Industry Standards
This isn't a toy or proprietary format. The demo implements:

- ✅ **C2PA Specification** — Used by Adobe, Microsoft, BBC, and others
- ✅ **SCITT Architecture** — IETF internet standard (like HTTP or email)
- ✅ **IPTC Digital Source Types** — Industry vocabulary distinguishing human vs. AI content
- ✅ **Real Cryptography** — SHA-256 hashing, ECDSA signatures via Web Crypto API

### Demo vs. Production

**What's Real:**
- The cryptographic algorithms (SHA-256, ECDSA)
- The C2PA manifest structure
- The signature verification process
- Backend C2PA signing for images (verifiable at c2paviewer.com)

**What's Simulated:**
- SCITT receipts (generated locally, not sent to real transparency log)
- Key storage (regenerated each session, not secured)
- Certificate validation (demo self-signed certificates)

**Translation:** The math is correct, the concepts are real, but you wouldn't use this for protecting classified documents or legal contracts.

## Why This Matters

As AI becomes more prevalent in content creation:

1. **Transparency**: Readers deserve to know what's human-written vs. AI-generated
2. **Accountability**: Creators should be able to prove their work is authentic
3. **Trust**: We need systems that make fraud detectable, not just preventable

This demo shows that **it's technically possible** to maintain provenance chains in human+AI workflows using open standards. The technology exists. The question is whether we'll adopt it.

## See It In Action

Try the demo yourself:

1. **Write some text** → See it signed with a "humanEdits" badge
2. **Ask AI to generate content** → See it marked as "trainedAlgorithmicMedia"
3. **Export the file** → Get a cryptographically signed manifest
4. **Modify the content** → Upload to verifier and watch it fail
5. **Leave it unchanged** → Verification passes with green checkmarks

Every action leaves a cryptographic fingerprint that can't be erased.

## Learn More

### Standards & Initiatives
- **[C2PA Specification](https://c2pa.org/specifications/)** — Coalition for Content Provenance and Authenticity
- **[Content Authenticity Initiative](https://contentauthenticity.org/)** — Adobe-led coalition fighting misinformation
- **[SCITT Architecture](https://datatracker.ietf.org/doc/draft-ietf-scitt-architecture/)** — IETF supply chain transparency standard
- **[IPTC Digital Source Type](http://cv.iptc.org/newscodes/digitalsourcetype/)** — Controlled vocabulary for content attribution

### Tools
- **[C2PA Viewer](https://c2paviewer.com/)** — Verify C2PA-signed images and documents
- **[Verify](https://verify.contentauthenticity.org/)** — Adobe's content credentials verification tool

### This Project
- **[README.md](./README.md)** — Full technical documentation
- **[CLAUDE.md](./CLAUDE.md)** — Developer guide for building with C2PA

---

**Bottom Line:** This demo proves that cryptographic provenance for human+AI content is not science fiction—it's working technology built on open standards. The question isn't *can we* track AI-assisted content creation. It's *will we*.
