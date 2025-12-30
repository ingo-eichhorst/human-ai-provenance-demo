import { DiffToken } from '../utils/diff';
import './DiffView.css';

interface DiffViewProps {
  tokens: DiffToken[];
  isGenerating?: boolean;
}

export function DiffView({ tokens, isGenerating = false }: DiffViewProps) {
  if (isGenerating) {
    return (
      <div className="diff-view diff-view--generating">
        <div className="diff-view__spinner">
          <div className="spinner"></div>
          <span>Generating changes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="diff-view">
      <div className="diff-view__content">
        {tokens.map((token, index) => (
          <span
            key={index}
            className={`diff-token diff-token--${token.type}`}
          >
            {token.text}
          </span>
        ))}
      </div>
    </div>
  );
}
