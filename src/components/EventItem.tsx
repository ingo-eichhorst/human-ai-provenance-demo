import { ProvenanceEvent } from '../types/provenance';
import { truncateHash, formatTimestamp, formatEventSummary } from '../utils/formatting';
import './EventItem.css';

interface EventItemProps {
  event: ProvenanceEvent;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function EventItem({
  event,
  index,
  isExpanded,
  onToggle
}: EventItemProps) {
  return (
    <div className="event-item">
      <div className="event-header" onClick={onToggle}>
        <div className="event-number">#{index + 1}</div>
        <div className={`actor-badge actor-${event.actor}`}>
          {event.actor === 'human' ? '👤 Human' : '🤖 AI'}
        </div>
        <div className="event-summary">{formatEventSummary(event)}</div>
        <div className="event-timestamp">{formatTimestamp(event.timestamp)}</div>
        <div className="expand-icon">{isExpanded ? '▼' : '▶'}</div>
      </div>

      {isExpanded && (
        <div className="event-details">
          <div className="detail-row">
            <span className="detail-label">Range:</span>
            <span className="detail-value">chars {event.range.start}-{event.range.end}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Before Hash:</span>
            <code className="detail-value monospace">{truncateHash(event.beforeHash)}</code>
          </div>
          <div className="detail-row">
            <span className="detail-label">After Hash:</span>
            <code className="detail-value monospace">{truncateHash(event.afterHash)}</code>
          </div>
          {event.aiMetadata && (
            <>
              <div className="detail-row">
                <span className="detail-label">Model:</span>
                <span className="detail-value">{event.aiMetadata.model}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Prompt Hash:</span>
                <code className="detail-value monospace">{truncateHash(event.aiMetadata.promptHash)}</code>
              </div>
              <div className="detail-row">
                <span className="detail-label">Response Hash:</span>
                <code className="detail-value monospace">{truncateHash(event.aiMetadata.responseHash)}</code>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
