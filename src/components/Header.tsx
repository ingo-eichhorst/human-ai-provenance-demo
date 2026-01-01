import { useState, useEffect } from 'react';
import { useAppContext } from '../state/AppContext';
import { STORAGE_KEY_API_KEY, APP_NAME } from '../utils/constants';
import './Header.css';

export function Header() {
  const { state, dispatch } = useAppContext();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    // Load API key from localStorage on mount
    const savedKey = localStorage.getItem(STORAGE_KEY_API_KEY);
    if (savedKey) {
      setApiKeyInput(savedKey);
      dispatch({ type: 'SET_API_KEY', payload: savedKey });
    }
  }, [dispatch]);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem(STORAGE_KEY_API_KEY, apiKeyInput.trim());
      dispatch({ type: 'SET_API_KEY', payload: apiKeyInput.trim() });
    }
  };

  const isConfigured = !!state.config.apiKey;

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="app-title">{APP_NAME}</h1>

        <div className="api-key-section">
          <label htmlFor="api-key-input">OpenAI API Key:</label>
          <input
            id="api-key-input"
            type={showApiKey ? 'text' : 'password'}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-..."
            className="api-key-input"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="toggle-visibility-btn"
            type="button"
          >
            {showApiKey ? '🙈' : '👁️'}
          </button>
          <button
            onClick={handleSaveApiKey}
            className="save-btn"
            type="button"
          >
            Save
          </button>
          {isConfigured && <span className="status-indicator">✓</span>}
        </div>
      </div>
    </header>
  );
}
