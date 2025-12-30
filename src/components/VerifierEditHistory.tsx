import { useState } from 'react';
import { Bundle } from '../types/bundle';
import { EventItem } from './EventItem';
import './VerifierEditHistory.css';

interface VerifierEditHistoryProps {
  parsedBundle: Bundle | null;
}

export function VerifierEditHistory({ parsedBundle }: VerifierEditHistoryProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const toggleEventDetails = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  if (!parsedBundle || !parsedBundle.manifest.events) {
    return (
      <div className="verifier-edit-history panel">
        <h2>Edit History</h2>
        <p className="empty-state">Verify a bundle to see its edit history</p>
      </div>
    );
  }

  return (
    <div className="verifier-edit-history panel">
      <h2>Edit History</h2>

      <div className="edit-history-content">
        <h3>Provenance Events ({parsedBundle.manifest.events.length} events)</h3>
        <div className="event-list">
          {parsedBundle.manifest.events.length === 0 ? (
            <p className="empty-state">No edits in this bundle</p>
          ) : (
            parsedBundle.manifest.events.map((event, index) => (
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
    </div>
  );
}
