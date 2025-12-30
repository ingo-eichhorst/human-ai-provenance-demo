import './ActionBar.css';

interface ActionBarProps {
  onAccept: () => void;
  onReject: () => void;
  changeSource: 'ai-generate' | 'ai-rewrite' | 'manual-edit';
  isGenerating?: boolean;
}

const SOURCE_LABELS = {
  'ai-generate': 'AI Generated',
  'ai-rewrite': 'AI Rewrite',
  'manual-edit': 'Manual Edit'
};

export function ActionBar({ onAccept, onReject, changeSource, isGenerating = false }: ActionBarProps) {
  return (
    <div className="action-bar">
      <div className="action-bar__info">
        <span className="action-bar__label">
          {SOURCE_LABELS[changeSource]}
        </span>
        <span className="action-bar__prompt">
          Review the changes and accept or reject
        </span>
      </div>
      <div className="action-bar__buttons">
        <button
          className="action-bar__button action-bar__button--reject"
          onClick={onReject}
          disabled={isGenerating}
        >
          Reject
        </button>
        <button
          className="action-bar__button action-bar__button--accept"
          onClick={onAccept}
          disabled={isGenerating}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
