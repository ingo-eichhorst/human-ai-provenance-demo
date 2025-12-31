import { useState } from 'react';
import type { C2PAVerificationResult, C2PAAction, C2PAActionsAssertion } from '../types/c2pa';
import { truncateHash } from '../utils/formatting';
import './VerifierEditHistory.css';

interface VerifierEditHistoryProps {
  verificationResult: C2PAVerificationResult | null;
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

export function VerifierEditHistory({ verificationResult }: VerifierEditHistoryProps) {
  const [expandedActionIndex, setExpandedActionIndex] = useState<number | null>(null);

  const toggleActionDetails = (index: number) => {
    setExpandedActionIndex(expandedActionIndex === index ? null : index);
  };

  if (!verificationResult || !verificationResult.manifest) {
    return (
      <div className="verifier-edit-history panel">
        <h2>Edit History</h2>
        <p className="empty-state">Verify files to see edit history</p>
      </div>
    );
  }

  // Extract actions from manifest
  const actionsAssertion = verificationResult.manifest.claim.assertions.find(
    a => a.label === 'c2pa.actions'
  )?.data as C2PAActionsAssertion | undefined;

  const actions = actionsAssertion?.actions || [];

  return (
    <div className="verifier-edit-history panel">
      <h2>Edit History</h2>

      <div className="edit-history-content">
        <h3>C2PA Actions ({actions.length} actions)</h3>
        <div className="event-list">
          {actions.length === 0 ? (
            <p className="empty-state">No actions in this manifest</p>
          ) : (
            actions.map((action, index) => (
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
    </div>
  );
}
