
# Scenario

Minimal demo story you can present
- Human writes a paragraph.
- Human selects one sentence → asks AI to rewrite only that part.
- Side panel shows: history, hashes change, AI event recorded, manifest signed, transparency receipt appended.
- Copy bundle → paste into verifier tab → all checks pass.
- Tamper the pasted content → verifier immediately flags checksum + signature inconsistencies.

# Requiremenst

1) Editor (co-creation)
- A text editor where the human writes freely.
- AI can only modify explicitly selected ranges:
- user selects a span
- user provides an instruction
- AI returns a patch restricted to that range
- The app records every committed change as a structured event: actor: human or ai, range (start/end), replacement, before/after hashes, for AI: model name, prompt/response hashes

2) Trust artifacts side panel (live state)
- A side panel shows “current trust state”, updated after every change:
- Content hash (current text)
- history of edits and the author
- Event-chain head hash (provenance chain tip)
- Manifest hash + signature status (tamper evidence)
- Transparency receipt status (non-equivocation log receipt; demo version is fine)
- Tooling attestation status (demo attestation: “this UI build/runtime measurement is approved”)

3) Copy/export + paste/verify
- “Copy” exports a single bundle that includes: content, manifest (provenance + artifacts), bundleHash (checksum across canonicalized {content, manifest})
- Verifier tab/page: user pastes bundle, app recomputes hashes and verifies: bundleHash matches recomputation, content hash matches manifest head hash, manifest signature verifies, receipt verifies, (optional) event chain recomputes end-to-end

If anything changed between copy and paste, show exactly which check failed (checksum mismatch, signature mismatch, receipt mismatch).

# UI integration

- Use AG UI: https://docs.ag-ui.com/introduction
- Ude this implementation as basis: https://dojo.ag-ui.com/langgraph-typescript/feature/predictive_state_updates?view=code

# Prevenance implementation idea

I’ll outline a concrete, end-to-end architecture: data model, signing keys, attestation, transparency logging, verification UX, and what breaks when metadata is stripped—with mitigations.


Below is what an **end-to-end “provable media supply chain”** looks like when you combine:

* **C2PA** (asset-level provenance, signed claims + edit history)
* **SCITT / Sigstore** (append-only transparency log for **non-equivocation** + **public audit**)
* **Attested tooling** (signatures only come from *measured, approved* generator/editor builds)

Philosophically: you’re not proving “truth” — you’re making **process claims durable, attributable, and publicly auditable**, so fraud becomes *detectable* and *actionable*.

---

## 0) System diagram

```mermaid
flowchart LR
  A[Creator / Editor Tool\n(attested runtime)] --> B[C2PA SDK\nbuild+sign manifest]
  B --> C[Asset with C2PA Manifest Store\n(JUMBF / sidecar)]
  B --> D[Signed Statement\n(asset_digest + manifest_digest + tool_identity + attestation_ref)]
  D --> E[Transparency Service\n(SCITT TS or Sigstore Rekor)]
  E --> F[Receipt / Inclusion Proof\n(COSE Receipt / Rekor bundle)]
  F --> G[Embed receipt\nas C2PA assertion (update manifest)\nor store sidecar]
  C --> H[Publish / Share]
  H --> I[Verifier\nextract+validate C2PA]
  I --> J[Verify receipt\nagainst TS key + inclusion proof]
  I --> K[Verify tooling attestation\n(policy + allowlist)]
  L[Manifest Repository\n(optional)] <-->|Soft binding lookup| I
```

Key idea: **C2PA binds provenance to the bytes**, and **SCITT/Sigstore binds the *claims* to an append-only log** so history can’t be silently rewritten. C2PA requires a **hard binding** (cryptographic hash) to the asset. ([c2pa.org][1])
And C2PA also supports **soft bindings** (fingerprints/watermarks) + a **manifest repository** for recovery when metadata is stripped. ([c2pa.org][1])

---

## 1) Trust anchors (what verifiers must trust)

### A. C2PA trust

* **Signer certificates / trust list**: who is allowed to sign Content Credentials for your ecosystem.

### B. Transparency trust (SCITT or Sigstore)

* **Transparency Service (TS) public key(s)** to validate receipts. SCITT mandates TSs produce **COSE Receipts** (signed Merkle inclusion proofs). ([IETF Datatracker][2])
* If using Sigstore, verifiers trust **Fulcio/Rekor roots** and validate Rekor inclusion during verification. ([Sigstore][3])

### C. Attestation trust

* Hardware / platform attestation roots (TEE/TPM vendor roots)
* A **policy allowlist**: approved tool vendors, approved binary measurements, approved model-serving enclaves, etc.

---

## 2) Data artifacts (the “objects” you create)

### 2.1 C2PA Manifest Store (embedded or sidecar)

* Contains one or more manifests; the newest is the **active manifest**. ([Content Authenticity Initiative][4])
* Each manifest has:

  * **Hard binding** to the asset bytes (typically SHA-256 recommended) ([c2pa.org][1])
  * **Assertions**: “created by tool X”, “edited with tool Y”, “model id”, etc.
  * **Ingredients**: references to prior assets/manifests (for edit history)
  * **Claim signature**: signed by the tool/organization identity ([C2PA][5])

### 2.2 Transparency “Signed Statement”

A compact statement you register in the log. Minimal fields:

* `asset_digest` (hash of bytes, or of canonicalized representation)
* `manifest_digest` (hash of the C2PA claim/manifest)
* `signer_identity` (cert fingerprint / issuer)
* `timestamp`
* `attestation_ref` (hash or pointer to attestation evidence)
* `policy_id` (which compliance profile this step claims to satisfy)

### 2.3 Receipt / Inclusion proof

* SCITT: **COSE Receipt** = TS-signed Merkle inclusion proof ([IETF Datatracker][2])
* Sigstore: Rekor inclusion proof/bundle used in verification workflows ([Sigstore][3])

---

## 3) Creation flow (from “generate” to “verifiable provenance”)

### Step 1 — Attested tool bootstraps a signing identity

Goal: the tool can sign **only if it’s running in an approved state**.

* Tool runs inside an attested environment (TEE/TPM backed).
* It generates a keypair whose private key is **sealed** to that attested measurement.
* Option A (Sigstore style): tool uses **keyless signing** — gets a short-lived cert via OIDC identity flow, logs to Rekor. ([Sigstore][6])
* Option B (Org CA): your organization issues the tool a cert only after verifying attestation evidence.

### Step 2 — Tool generates the asset

* Produce `asset_bytes`

### Step 3 — Build initial C2PA manifest (M0)

* Compute **hard binding hash** to the asset. ([c2pa.org][1])
* Write assertions (example set):

  * `created_by`: tool name + version
  * `model`: model identifier + provider
  * `inputs`: **hashed** prompt / params (or encrypted blob for private workflows)
  * `environment`: runtime id, enclave id, build measurement hash
* Sign the claim → embed manifest store into the asset (or sidecar).

### Step 4 — Register a transparency statement (S0)

Create `SignedStatement(asset_digest, manifest_digest, attestation_ref, …)` and register it:

* SCITT TS returns **COSE Receipt** ([IETF Datatracker][2])
* Sigstore returns a verifiable inclusion record/bundle for later checks ([Sigstore][3])

### Step 5 — Bind the receipt back to the asset provenance

You need the receipt to “travel with” the content.

Two clean patterns:

**Pattern P1: “Update manifest” (preferred)**

* Create a second manifest (M1) that:

  * references M0 as ingredient/previous step
  * adds an assertion `transparency_receipt = R0`
* Sign M1; make M1 the active manifest.

**Pattern P2: Sidecar**

* Store `R0` as `asset.ext.receipt` and distribute together (works in controlled pipelines).

---

## 4) Editing flow (non-destructive, auditable history)

When any editor touches the asset:

1. Verifier in the editor checks current active manifest + receipt(s)
2. Editor produces new bytes (new asset digest)
3. Editor writes a new manifest (M2):

   * hard-binds to new bytes
   * lists prior asset/manifests as **ingredients**
   * adds assertions describing the edit action(s)
4. Register new statement S2 in TS → receipt R2
5. Attach receipt via update manifest (M3) or sidecar

Result: you get a *chain of signed, logged claims* — not just a single watermark.

---

## 5) Verification flow (what a consumer/verifier does)

Given an asset file:

### V1 — Validate C2PA integrity

* Extract manifest store and validate:

  * hard binding matches bytes (tamper-evident) ([c2pa.org][1])
  * claim signature chains to trusted signer

### V2 — Validate non-equivocation via transparency receipts

* Extract embedded receipt(s) and check:

  * TS signature valid (SCITT) ([IETF Datatracker][2])
  * inclusion proof matches a log root
  * statement hash matches `manifest_digest` (and/or `asset_digest`)
* Sigstore variant: verify Rekor inclusion proof/bundle similarly. ([Sigstore][3])

### V3 — Validate attested tooling claim

* Resolve `attestation_ref`:

  * verify attestation evidence chain
  * verify measurement is on allowlist for `policy_id`
  * fail closed (red) or fail open (yellow) depending on context

### V4 — Produce a UX verdict

* Green: C2PA valid + receipt valid + attestation policy satisfied
* Yellow: provenance present but no receipt / unknown tool / partial chain
* Red: hard binding mismatch, broken signatures, invalid receipt, etc.

---

## 6) Handling metadata stripping (the real world)

C2PA explicitly anticipates “manifest got decoupled” scenarios:

* Use **soft bindings** (fingerprint or invisible watermark) to query a **manifest repository** and recover the manifest store. ([c2pa.org][1])

So you run a **Manifest Repository** service:

* Keyed by:

  * soft binding id (watermark id / perceptual fingerprint)
  * optionally also by hard binding hashes of known encodings
* Returns candidate manifests + receipts for verification.

This gives you durability without pretending watermarking alone is secure.

---

## 7) “Certification process” (how this becomes enforceable)

To get from “standard exists” to “trustworthy ecosystem”, you define **profiles + audits**:

### Profile example: “Provenance-Assured GenMedia v1”

Mandates:

* C2PA hard binding + signed identity
* Mandatory assertions: tool id/version, model id/provider, edit actions, etc.
* Transparency registration for every new active manifest (receipt required)
* Attestation requirement: key must be sealed to approved measurement

### Certification mechanics

* Independent auditor validates:

  * build pipeline produces reproducible tool measurements
  * enclave/TEE policy + key sealing works
  * transparency logging is enforced (no unsigned exports)
* Certifier adds signer roots to a widely distributed trust list.

(That’s the “official system certification process” you were describing — it’s essentially *PKI + transparency + runtime attestation*, applied to media.)

---

## 8) Minimal viable implementation path

If you wanted to build this tomorrow with least invention:

1. Use an off-the-shelf **C2PA SDK** to write manifests + embed them.
2. Use **Sigstore** as your first transparency layer (keyless identity + append-only log verification patterns). ([Sigstore][6])
3. Add SCITT-style receipts once your TS supports COSE receipts natively (same concept; more standardized). ([IETF Datatracker][2])
4. Add attestation gating so the signing key only exists in approved tool runtimes.

[1]: https://c2pa.org/specifications/specifications/2.2/guidance/Guidance.html?utm_source=chatgpt.com "C2PA Implementation Guidance"
[2]: https://datatracker.ietf.org/doc/draft-ietf-scitt-architecture/?utm_source=chatgpt.com "draft-ietf-scitt-architecture-22"
[3]: https://docs.sigstore.dev/about/threat-model/?utm_source=chatgpt.com "Threat Model"
[4]: https://opensource.contentauthenticity.org/docs/getting-started/?utm_source=chatgpt.com "Getting started with Content Credentials"
[5]: https://spec.c2pa.org/specifications/specifications/2.2/explainer/_attachments/Explainer.pdf?utm_source=chatgpt.com "C2PA and Content Credentials Explainer"
[6]: https://docs.sigstore.dev/cosign/signing/overview/?utm_source=chatgpt.com "Overview"
