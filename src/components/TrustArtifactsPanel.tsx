import { useState } from 'react';
import { useAppContext } from '../state/AppContext';
import { truncateHash } from '../utils/formatting';
import { copyToClipboard } from '../utils/clipboard';
import type { C2PAAction } from '../types/c2pa';
import './TrustArtifactsPanel.css';

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="info-tooltip">
      <span className="info-icon">ⓘ</span>
      <span className="tooltip-text">{text}</span>
    </span>
  );
}

function ActionItem({
  action,
  index,
  isExpanded,
  onToggle
}: {
  action: C2PAAction;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isHuman = action.digitalSourceType?.includes('humanEdits');
  const isAI = action.digitalSourceType?.includes('trainedAlgorithmicMedia');

  return (
    <div className="event-item" onClick={onToggle}>
      <div className="event-header">
        <span className="event-number">#{index + 1}</span>
        <span className={`actor-badge ${isHuman ? 'human' : 'ai'}`}>
          {isHuman ? 'Human' : isAI ? 'AI' : 'Unknown'}
        </span>
        <span className="event-action">{action.action}</span>
        <span className="event-time">{new Date(action.when).toLocaleString()}</span>
      </div>

      {isExpanded && (
        <div className="event-details">
          <div className="detail-row">
            <span className="detail-label">Action:</span>
            <span className="detail-value">{action.action}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Timestamp:</span>
            <span className="detail-value">{action.when}</span>
          </div>
          {action.softwareAgent && (
            <div className="detail-row">
              <span className="detail-label">Software:</span>
              <span className="detail-value">{action.softwareAgent}</span>
            </div>
          )}
          {action.digitalSourceType && (
            <div className="detail-row">
              <span className="detail-label">Source Type:</span>
              <span className="detail-value source-type">{action.digitalSourceType}</span>
            </div>
          )}
          {action.parameters?.aiModel && (
            <div className="detail-row">
              <span className="detail-label">AI Model:</span>
              <span className="detail-value">{action.parameters.aiModel}</span>
            </div>
          )}
          {action.parameters?.promptHash && (
            <div className="detail-row">
              <span className="detail-label">Prompt Hash:</span>
              <span className="detail-value hash-mono">{truncateHash(action.parameters.promptHash)}</span>
            </div>
          )}
          {action.parameters?.beforeHash && (
            <div className="detail-row">
              <span className="detail-label">Before Hash:</span>
              <span className="detail-value hash-mono">{truncateHash(action.parameters.beforeHash)}</span>
            </div>
          )}
          {action.parameters?.afterHash && (
            <div className="detail-row">
              <span className="detail-label">After Hash:</span>
              <span className="detail-value hash-mono">{truncateHash(action.parameters.afterHash)}</span>
            </div>
          )}
          {action.parameters?.changeRange && (
            <div className="detail-row">
              <span className="detail-label">Range:</span>
              <span className="detail-value">
                {action.parameters.changeRange.start}-{action.parameters.changeRange.end}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TrustArtifactsPanel() {
  const { state } = useAppContext();
  const [expandedActionIndex, setExpandedActionIndex] = useState<number | null>(null);

  const handleCopyHash = async (hash: string) => {
    try {
      await copyToClipboard(hash);
    } catch (error) {
      console.error('Failed to copy hash:', error);
    }
  };

  const toggleActionDetails = (index: number) => {
    setExpandedActionIndex(expandedActionIndex === index ? null : index);
  };

  return (
    <div className="trust-artifacts-panel panel">
      <h2>Trust Artifacts (C2PA)</h2>

      <div className="artifacts-sections">
        {/* Content Hash */}
        <div className="artifact-section">
          <h3>
            Content Hash (SHA-256)
            <InfoTooltip text="SHA-256 hash of the current editor text. Changes whenever content is modified." />
          </h3>
          <div className="hash-display">
            <code className="hash-value">{truncateHash(state.content.hash || '—')}</code>
            {state.content.hash && (
              <button
                className="copy-btn"
                onClick={() => handleCopyHash(state.content.hash)}
                title="Copy full hash"
              >
                📋
              </button>
            )}
          </div>
        </div>

        {/* C2PA Actions */}
        <div className="artifact-section">
          <h3>
            C2PA Actions ({state.c2pa.actions.length} actions)
            <InfoTooltip text="Chronological record of all edits using C2PA standard. Each action captures the source type (human or AI) and change details." />
          </h3>
          <div className="event-list">
            {state.c2pa.actions.length === 0 ? (
              <p className="empty-state">No actions yet</p>
            ) : (
              state.c2pa.actions.map((action, index) => (
                <ActionItem
                  key={index}
                  action={action}
                  index={index}
                  isExpanded={expandedActionIndex === index}
                  onToggle={() => toggleActionDetails(index)}
                />
              ))
            )}
          </div>
        </div>

        {/* C2PA Manifest Status */}
        <div className="artifact-section">
          <h3>
            C2PA Manifest
            <InfoTooltip text="C2PA external manifest with COSE signature. Contains all actions and hard-binds to content via SHA-256 hash assertion." />
          </h3>
          <div className={`status-badge ${state.c2pa.manifest ? 'status-valid' : 'status-unsigned'}`}>
            {state.c2pa.manifest ? '✓ Signed' : '○ Not signed'}
          </div>
          {state.c2pa.manifest && (
            <div className="manifest-info">
              <div className="detail-row">
                <span className="detail-label">Claim ID:</span>
                <span className="detail-value hash-mono">
                  {truncateHash(state.c2pa.manifest.claim.instanceId)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Format:</span>
                <span className="detail-value">{state.c2pa.manifest.claim['dc:format']}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Generator:</span>
                <span className="detail-value">{state.c2pa.manifest.claim.claimGenerator}</span>
              </div>
            </div>
          )}
        </div>

        {/* SCITT Receipt Status */}
        <div className="artifact-section">
          <h3>
            SCITT Transparency Receipt
            <InfoTooltip text="Receipt from SCITT transparency log. Provides independent proof of content provenance." />
          </h3>
          <div className={`status-badge ${state.c2pa.scittReceipt ? 'status-valid' : 'status-missing'}`}>
            {state.c2pa.scittReceipt ? '✓ Anchored' : '— Not anchored'}
          </div>
          {state.c2pa.scittReceipt && (
            <div className="scitt-info">
              <div className="detail-row">
                <span className="detail-label">Log ID:</span>
                <span className="detail-value">{state.c2pa.scittReceipt.logId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Timestamp:</span>
                <span className="detail-value">
                  {new Date(state.c2pa.scittReceipt.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Service:</span>
                <span className="detail-value">{state.c2pa.scittReceipt.serviceUrl}</span>
              </div>
            </div>
          )}
          {state.c2pa.scittReceipt?.serviceUrl.startsWith('demo://') && (
            <span className="demo-badge">Demo Mode</span>
          )}
        </div>
      </div>
    </div>
  );
}
