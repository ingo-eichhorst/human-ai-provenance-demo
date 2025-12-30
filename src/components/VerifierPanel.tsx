import { useState } from 'react';
import { Bundle } from '../types/bundle';
import { VerificationResult } from '../types/verification';
import { cryptoService } from '../services/CryptoService';
import { createProvenanceService } from '../services/ProvenanceService';
import { createVerificationService } from '../services/VerificationService';
import './VerifierPanel.css';

const provenanceService = createProvenanceService(cryptoService);
const verificationService = createVerificationService(cryptoService, provenanceService);

interface VerifierPanelProps {
  onBundleParsed: (bundle: Bundle | null) => void;
}

export function VerifierPanel({ onBundleParsed }: VerifierPanelProps) {
  const [bundleInput, setBundleInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setError(null);
    setVerificationResult(null);
    onBundleParsed(null);
    setIsVerifying(true);

    try {
      // Parse JSON
      const bundle: Bundle = JSON.parse(bundleInput);

      // Validate bundle structure
      if (!bundle.content || !bundle.manifest || !bundle.bundleHash) {
        throw new Error('Invalid bundle format: missing required fields');
      }

      // Verify bundle
      const result = await verificationService.verifyBundle(bundle);
      setVerificationResult(result);
      onBundleParsed(bundle);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON: Please paste a valid bundle');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Verification failed: Unknown error');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClear = () => {
    setBundleInput('');
    setVerificationResult(null);
    onBundleParsed(null);
    setError(null);
  };

  return (
    <div className="verifier-content">
      <h2>Verifier</h2>
      <div className="input-section">
        <label htmlFor="bundle-input">Paste Bundle JSON:</label>
        <textarea
          id="bundle-input"
          className="bundle-input"
          value={bundleInput}
          onChange={(e) => setBundleInput(e.target.value)}
          placeholder='Paste the exported bundle JSON here...'
          spellCheck={false}
        />

        <div className="verifier-actions">
          <button
            className="verify-btn"
            onClick={handleVerify}
            disabled={!bundleInput.trim() || isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Bundle'}
          </button>
          <button
            className="clear-btn"
            onClick={handleClear}
            disabled={isVerifying}
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="verification-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {verificationResult && (
        <div className="results-section">
          <div className={`verdict-banner verdict-${verificationResult.overallStatus}`}>
            {verificationResult.overallStatus === 'pass' ? (
              <>✓ ALL CHECKS PASSED</>
            ) : (
              <>✗ VERIFICATION FAILED</>
            )}
          </div>

          <div className="checks-list">
            <CheckItem
              label="Bundle Hash"
              result={verificationResult.checks.bundleHash}
            />
            <CheckItem
              label="Content Hash"
              result={verificationResult.checks.contentHash}
            />
            <CheckItem
              label="Signature"
              result={verificationResult.checks.signature}
            />
            <CheckItem
              label="Receipt"
              result={verificationResult.checks.receipt}
            />
            <CheckItem
              label="Event Chain"
              result={verificationResult.checks.eventChain}
            />
          </div>
        </div>
      )}

      <div className="instructions">
        <p className="hint">
          <strong>Try it:</strong> Export a bundle from the editor, paste it here, and verify.
          Then manually edit the content in the JSON to see tamper detection in action!
        </p>
      </div>
    </div>
  );
}

function CheckItem({ label, result }: { label: string; result: any }) {
  return (
    <div className={`check-item check-${result.passed ? 'pass' : 'fail'}`}>
      <div className="check-icon">
        {result.passed ? '✓' : '✗'}
      </div>
      <div className="check-content">
        <div className="check-label">{label}</div>
        <div className="check-message">{result.message}</div>
        {result.details && (
          <div className="check-details">{result.details}</div>
        )}
      </div>
    </div>
  );
}
