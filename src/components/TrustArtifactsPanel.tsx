import { useState } from 'react';
import { useAppContext } from '../state/AppContext';
import { truncateHash } from '../utils/formatting';
import { copyToClipboard } from '../utils/clipboard';
import { EventItem } from './EventItem';
import './TrustArtifactsPanel.css';

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="info-tooltip">
      <span className="info-icon">ⓘ</span>
      <span className="tooltip-text">{text}</span>
    </span>
  );
}

export function TrustArtifactsPanel() {
  const { state } = useAppContext();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const handleCopyHash = async (hash: string) => {
    try {
      await copyToClipboard(hash);
    } catch (error) {
      console.error('Failed to copy hash:', error);
    }
  };

  const toggleEventDetails = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  return (
    <div className="trust-artifacts-panel panel">
      <h2>Trust Artifacts</h2>

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

        {/* Edit History */}
        <div className="artifact-section">
          <h3>
            Edit History ({state.provenance.events.length} events)
            <InfoTooltip text="Chronological record of all edits. Each event captures who made the change (human or AI) and what changed." />
          </h3>
          <div className="event-list">
            {state.provenance.events.length === 0 ? (
              <p className="empty-state">No edits yet</p>
            ) : (
              state.provenance.events.map((event, index) => (
                <EventItem
                  key={event.id}
                  event={event}
                  index={index}
                  isExpanded={expandedEventId === event.id}
                  onToggle={() => toggleEventDetails(event.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Event Chain Hash */}
        <div className="artifact-section">
          <h3>
            Event Chain Hash
            <InfoTooltip text="Tamper-evident hash linking all events. Computed as hash(event + previous_chain_hash). Any modification to history invalidates the chain." />
          </h3>
          <div className="hash-display">
            <code className="hash-value">{truncateHash(state.provenance.eventChainHash || '—')}</code>
            {state.provenance.eventChainHash && (
              <button
                className="copy-btn"
                onClick={() => handleCopyHash(state.provenance.eventChainHash)}
                title="Copy full hash"
              >
                📋
              </button>
            )}
          </div>
          <p className="hint">Cumulative hash of all edits</p>
        </div>

        {/* Manifest Status */}
        <div className="artifact-section">
          <h3>
            Manifest Status
            <InfoTooltip text="ECDSA P-256 digital signature over the provenance data. Proves the manifest hasn't been altered since signing." />
          </h3>
          <div className={`status-badge status-${state.manifest.signatureStatus}`}>
            {state.manifest.signatureStatus === 'valid' && '✓ Signed'}
            {state.manifest.signatureStatus === 'unsigned' && '○ Not signed'}
            {state.manifest.signatureStatus === 'invalid' && '✗ Invalid'}
          </div>
          {state.manifest.hash && (
            <div className="hash-display small">
              <code>{truncateHash(state.manifest.hash)}</code>
            </div>
          )}
        </div>

        {/* Receipt Status */}
        <div className="artifact-section">
          <h3>
            Transparency Receipt
            <InfoTooltip text="Entry in a public transparency log. Provides independent proof that this content existed at a specific time. (Simulated in demo)" />
          </h3>
          <div className={`status-badge status-${state.receipt.status === 'present' ? 'valid' : 'missing'}`}>
            {state.receipt.status === 'present' ? '✓ Logged' : '— Missing'}
          </div>
          <span className="demo-badge">Demo Mode</span>
          <p className="hint">Simulated transparency log</p>
        </div>

        {/* Attestation Status */}
        <div className="artifact-section">
          <h3>
            Tool Attestation
            <InfoTooltip text="Verification that the editing tool is approved and unmodified. (Simulated in demo)" />
          </h3>
          <div className="status-badge status-valid">
            ✓ Approved
          </div>
          <p className="tool-info">{state.attestation.data.toolName} v{state.attestation.data.version}</p>
          <span className="demo-badge">Demo Mode</span>
          <p className="hint">Simulated attestation</p>
        </div>
      </div>
    </div>
  );
}
