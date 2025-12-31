import { useState, useCallback } from 'react';
import type { C2PAVerificationResult } from '../types/c2pa';
import { c2paVerificationService } from '../services/C2PAVerificationService';
import { embeddedManifestService } from '../services/EmbeddedManifestService';
import './VerifierPanel.css';

interface VerifierPanelProps {
  onVerificationComplete: (result: C2PAVerificationResult | null) => void;
  onContentExtracted: (content: string | null) => void;
}

type VerifyMode = 'embedded' | 'separate';

export function VerifierPanel({ onVerificationComplete, onContentExtracted }: VerifierPanelProps) {
  const [mode, setMode] = useState<VerifyMode>('embedded');
  const [embeddedFile, setEmbeddedFile] = useState<File | null>(null);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<C2PAVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle drag events for drop zone
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setEmbeddedFile(file);
      setError(null);
      setVerificationResult(null);
    }
  }, []);

  // Verify embedded file
  const handleVerifyEmbedded = useCallback(async () => {
    if (!embeddedFile) {
      setError('Please select a file to verify');
      return;
    }

    setError(null);
    setVerificationResult(null);
    onContentExtracted(null);
    onVerificationComplete(null);
    setIsVerifying(true);

    try {
      const fileContent = await embeddedFile.text();

      // Extract manifest from embedded content
      const { content, manifestJson } = embeddedManifestService.extractManifest(fileContent);

      // Verify content + manifest pair
      const result = await c2paVerificationService.verify(content, manifestJson);
      setVerificationResult(result);
      onContentExtracted(content);
      onVerificationComplete(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Verification failed: Unknown error');
      }
    } finally {
      setIsVerifying(false);
    }
  }, [embeddedFile, onVerificationComplete, onContentExtracted]);

  // Verify separate files (existing logic)
  const handleVerifySeparate = useCallback(async () => {
    if (!contentFile || !manifestFile) {
      setError('Please select both content and manifest files');
      return;
    }

    setError(null);
    setVerificationResult(null);
    onContentExtracted(null);
    onVerificationComplete(null);
    setIsVerifying(true);

    try {
      const content = await contentFile.text();
      const manifestJson = await manifestFile.text();
      const result = await c2paVerificationService.verify(content, manifestJson);
      setVerificationResult(result);
      onContentExtracted(content);
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
  }, [contentFile, manifestFile, onVerificationComplete, onContentExtracted]);

  const handleContentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setContentFile(file);
    setError(null);
    setVerificationResult(null);
    onContentExtracted(null);
  };

  const handleManifestFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setManifestFile(file);
    setError(null);
    setVerificationResult(null);
    onContentExtracted(null);
  };

  const canVerifyEmbedded = embeddedFile && !isVerifying;
  const canVerifySeparate = contentFile && manifestFile && !isVerifying;

  return (
    <div className="verifier-panel panel">
      <h2>Verify C2PA Provenance</h2>

      {/* Mode toggle */}
      <div className="verify-mode-toggle">
        <button
          className={`mode-btn ${mode === 'embedded' ? 'active' : ''}`}
          onClick={() => setMode('embedded')}
        >
          Single File (.c2pa.txt)
        </button>
        <button
          className={`mode-btn ${mode === 'separate' ? 'active' : ''}`}
          onClick={() => setMode('separate')}
        >
          Separate Files
        </button>
      </div>

      {mode === 'embedded' ? (
        <>
          <p className="instructions">
            Upload a .c2pa.txt file with embedded manifest to verify authenticity.
          </p>

          {/* Drag-and-drop zone */}
          <div
            className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${embeddedFile ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {embeddedFile ? (
              <p className="file-selected">
                {embeddedFile.name} ({(embeddedFile.size / 1024).toFixed(2)} KB)
              </p>
            ) : (
              <p>Drag and drop .c2pa.txt file here, or click to browse</p>
            )}
            <input
              type="file"
              accept=".txt,.c2pa.txt,text/plain"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setEmbeddedFile(file);
                setError(null);
                setVerificationResult(null);
              }}
              disabled={isVerifying}
            />
          </div>

          <button className="verify-btn" onClick={handleVerifyEmbedded} disabled={!canVerifyEmbedded}>
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
        </>
      ) : (
        <>
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

          <button className="verify-btn" onClick={handleVerifySeparate} disabled={!canVerifySeparate}>
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
        </>
      )}

      {/* Error display */}
      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Verification result */}
      {verificationResult && (
        <div className={`verification-result ${verificationResult.valid ? 'success' : 'failure'}`}>
          <h3>{verificationResult.valid ? '✓ Verification Passed' : '✗ Verification Failed'}</h3>

          <div className="checks-grid">
            <div
              className={`check-item ${verificationResult.checks.contentHash.passed ? 'passed' : 'failed'}`}
            >
              <span className="check-icon">
                {verificationResult.checks.contentHash.passed ? '✓' : '✗'}
              </span>
              <div className="check-details">
                <strong>Content Hash</strong>
                <p>{verificationResult.checks.contentHash.message}</p>
              </div>
            </div>

            <div
              className={`check-item ${verificationResult.checks.signatureValid.passed ? 'passed' : 'failed'}`}
            >
              <span className="check-icon">
                {verificationResult.checks.signatureValid.passed ? '✓' : '✗'}
              </span>
              <div className="check-details">
                <strong>Signature</strong>
                <p>{verificationResult.checks.signatureValid.message}</p>
              </div>
            </div>

            <div
              className={`check-item ${verificationResult.checks.scittReceipt.passed ? 'passed' : 'failed'}`}
            >
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
