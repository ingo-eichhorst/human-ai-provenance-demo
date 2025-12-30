import './TabNavigation.css';

interface TabNavigationProps {
  activeTab: 'editor' | 'verifier';
  onTabChange: (tab: 'editor' | 'verifier') => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav className="tab-navigation">
      <button
        className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`}
        onClick={() => onTabChange('editor')}
      >
        Editor
      </button>
      <button
        className={`tab-button ${activeTab === 'verifier' ? 'active' : ''}`}
        onClick={() => onTabChange('verifier')}
      >
        Verifier
      </button>
    </nav>
  );
}
