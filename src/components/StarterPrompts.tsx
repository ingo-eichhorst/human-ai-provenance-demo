import './StarterPrompts.css';

interface StarterPrompt {
  icon: string;
  text: string;
  prompt: string;
}

interface StarterPromptsProps {
  onPromptSelect: (prompt: string) => void;
  disabled?: boolean;
}

const PROMPTS: StarterPrompt[] = [
  {
    icon: '🐱',
    text: 'Haiku about cats',
    prompt: 'Write a haiku about cats'
  },
  {
    icon: '📧',
    text: 'SMS to Einstein',
    prompt: 'Write a fun SMS to Einstein'
  },
  {
    icon: '🎤',
    text: 'Rap about 42',
    prompt: 'Write the first verse and chorus of a rap about 42'
  }
];

export function StarterPrompts({ onPromptSelect, disabled = false }: StarterPromptsProps) {
  return (
    <div className="starter-prompts">
      <h3 className="starter-prompts__title">Get started with AI generation</h3>
      <div className="starter-prompts__grid">
        {PROMPTS.map((prompt, index) => (
          <button
            key={index}
            className="starter-prompt-card"
            onClick={() => onPromptSelect(prompt.prompt)}
            disabled={disabled}
          >
            <span className="starter-prompt-card__icon">{prompt.icon}</span>
            <span className="starter-prompt-card__text">{prompt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
