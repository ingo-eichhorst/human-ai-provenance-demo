import { truncateHash } from '../utils/formatting';
import type { C2PAAction } from '../types/c2pa';
import './ActionItem.css';

interface ActionItemProps {
  action: C2PAAction;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  verifiedContent?: string | null;
  showChangePreview?: boolean;
}

/**
 * Shared ActionItem component for displaying C2PA actions
 * Used in both TrustArtifactsPanel and VerifierEditHistory
 */
export function ActionItem({
  action,
  index,
  isExpanded,
  onToggle,
  verifiedContent,
  showChangePreview = false
}: ActionItemProps) {
  const isHuman = action.digitalSourceType?.includes('humanEdits');
  const isAI = action.digitalSourceType?.includes('trainedAlgorithmicMedia');

  // Format action type for display
  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'c2pa.created': return 'Created';
      case 'c2pa.edited': return 'Edited';
      case 'c2pa.opened': return 'Opened';
      default: return actionType;
    }
  };

  // Extract changed text from content using changeRange
  const getChangedText = () => {
    if (!verifiedContent || !action.parameters?.changeRange) return null;
    const { start, end } = action.parameters.changeRange;
    return verifiedContent.slice(start, end);
  };

  const changedText = showChangePreview ? getChangedText() : null;
  const actionLabel = getActionLabel(action.action);

  return (
    <div className={`event-item ${isHuman ? 'human-action' : 'ai-action'}`} onClick={onToggle}>
      <div className="event-header">
        <div className="event-header-left">
          <span className="event-number">#{index + 1}</span>
          <span className={`actor-badge ${isHuman ? 'human' : 'ai'}`}>
            {isHuman ? '👤 Human' : isAI ? '🤖 AI' : 'Unknown'}
          </span>
          <span className="event-action">{actionLabel}</span>
        </div>
        <span className="event-time">{new Date(action.when).toLocaleString()}</span>
      </div>

      {action.parameters?.description && (
        <div className="event-description">
          {action.parameters.description}
        </div>
      )}

      {changedText && (
        <div className="change-preview">
          <div className="change-preview-label">Changed Text:</div>
          <div className="change-preview-text">{changedText}</div>
        </div>
      )}

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
