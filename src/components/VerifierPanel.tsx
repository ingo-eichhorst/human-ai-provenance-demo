import { useState } from 'react';
import type { C2PAVerificationResult } from '../types/c2pa';
import { c2paVerificationService } from '../services/C2PAVerificationService';
import './VerifierPanel.css';

interface VerifierPanelProps {
  onVerificationComplete: (result: C2PAVerificationResult | null) => void;
}

export function VerifierPanel({ onVerificationComplete }: VerifierPanelProps) {
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<C2PAVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!contentFile || !manifestFile) {
      setError('Please select both content and manifest files');
      return;
    }

    setError(null);
    setVerificationResult(null);
    onVerificationComplete(null);
    setIsVerifying(true);

    try {
      // Read files
      const content = await contentFile.text();
      const manifestJson = await manifestFile.text();

      // Verify content + manifest pair
      const result = await c2paVerificationService.verify(content, manifestJson);
      setVerificationResult(result);
      onVerificationComplete(result);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid manifest JSON: Please select a valid C2PA manifest file');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Verification failed: Unknown error');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setContentFile(file);
    setError(null);
    setVerificationResult(null);
  };

  const handleManifestFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setManifestFile(file);
    setError(null);
    setVerificationResult(null);
  };

  const canVerify = contentFile && manifestFile && !isVerifying;

  return (
    <div className="verifier-panel panel">
      <h2>Verify C2PA Provenance</h2>
      <p className="instructions">
        Upload both the content file and its C2PA manifest to verify authenticity and provenance.
      </p>

      {/* File uploads */}
      <div className="file-upload-section">
        <div className="file-upload">
          <label htmlFor="content-file">
            <strong>Content File (.txt)</strong>
          </label>
          <input
            id="content-file"
            type="file"
            accept=".txt,text/plain"
            onChange={handleContentFileChange}
            disabled={isVerifying}
          />
          {contentFile && (
            <p className="file-selected">
              Selected: {contentFile.name} ({(contentFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <div className="file-upload">
          <label htmlFor="manifest-file">
            <strong>C2PA Manifest (.c2pa.json)</strong>
          </label>
          <input
            id="manifest-file"
            type="file"
            accept=".json,application/json"
            onChange={handleManifestFileChange}
            disabled={isVerifying}
          />
          {manifestFile && (
            <p className="file-selected">
              Selected: {manifestFile.name} ({(manifestFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>
      </div>

      {/* Verify button */}
      <button
        className="verify-btn"
        onClick={handleVerify}
        disabled={!canVerify}
      >
        {isVerifying ? 'Verifying...' : 'Verify'}
      </button>

      {/* Error display */}
      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Verification result */}
      {verificationResult && (
        <div className={`verification-result ${verificationResult.valid ? 'success' : 'failure'}`}>
          <h3>
            {verificationResult.valid ? '✓ Verification Passed' : '✗ Verification Failed'}
          </h3>

          <div className="checks-grid">
            <div className={`check-item ${verificationResult.checks.contentHash.passed ? 'passed' : 'failed'}`}>
              <span className="check-icon">
                {verificationResult.checks.contentHash.passed ? '✓' : '✗'}
              </span>
              <div className="check-details">
                <strong>Content Hash</strong>
                <p>{verificationResult.checks.contentHash.message}</p>
              </div>
            </div>

            <div className={`check-item ${verificationResult.checks.signatureValid.passed ? 'passed' : 'failed'}`}>
              <span className="check-icon">
                {verificationResult.checks.signatureValid.passed ? '✓' : '✗'}
              </span>
              <div className="check-details">
                <strong>Signature</strong>
                <p>{verificationResult.checks.signatureValid.message}</p>
              </div>
            </div>

            <div className={`check-item ${verificationResult.checks.scittReceipt.passed ? 'passed' : 'failed'}`}>
              <span className="check-icon">
                {verificationResult.checks.scittReceipt.passed ? '✓' : '✗'}
              </span>
              <div className="check-details">
                <strong>SCITT Receipt</strong>
                <p>{verificationResult.checks.scittReceipt.message}</p>
              </div>
            </div>
          </div>

          {verificationResult.errors.length > 0 && (
            <div className="verification-errors">
              <h4>Errors:</h4>
              <ul>
                {verificationResult.errors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
