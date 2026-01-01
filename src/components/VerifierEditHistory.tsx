import { useState } from 'react';
import type { C2PAVerificationResult, C2PAActionsAssertion } from '../types/c2pa';
import { ActionItem } from './ActionItem';
import './VerifierEditHistory.css';

interface VerifierEditHistoryProps {
  verificationResult: C2PAVerificationResult | null;
  verifiedContent: string | null;
}

export function VerifierEditHistory({ verificationResult, verifiedContent }: VerifierEditHistoryProps) {
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
      <h2>Verified Document</h2>

      {verifiedContent && (
        <div className="verified-content-section">
          <h3>Content</h3>
          <textarea className="verified-content-display" value={verifiedContent} readOnly />
        </div>
      )}

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
                verifiedContent={verifiedContent}
                showChangePreview={true}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
