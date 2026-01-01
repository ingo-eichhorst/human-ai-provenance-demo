import { useEffect, useCallback, useState } from 'react';
import { useAppContext } from './state/AppContext';
import { cryptoService } from './services/CryptoService';
import { Header } from './components/Header';
import { TabNavigation } from './components/TabNavigation';
import { EditorPanel } from './components/EditorPanel';
import { TrustArtifactsPanel } from './components/TrustArtifactsPanel';
import { VerifierPanel } from './components/VerifierPanel';
import { VerifierEditHistory } from './components/VerifierEditHistory';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { C2PAVerificationResult } from './types/c2pa';
import './App.css';

function App() {
  const { state, dispatch } = useAppContext();
  const [verificationResult, setVerificationResult] = useState<C2PAVerificationResult | null>(null);
  const [verifiedContent, setVerifiedContent] = useState<string | null>(null);

  // Initialize crypto keys on mount
  useEffect(() => {
    async function initializeCrypto() {
      if (!state.config.initialized) {
        console.warn('Human+AI Provenance Demo - NOT FOR PRODUCTION USE');
        console.info('Keys are ephemeral and not secured. Do not use with sensitive content.');

        try {
          const { publicKey, privateKey } = await cryptoService.initialize();
          dispatch({
            type: 'INIT_CRYPTO',
            payload: { publicKey, privateKey }
          });
        } catch (error) {
          console.error('Failed to initialize crypto:', error);
          dispatch({
            type: 'SET_ERROR',
            payload: 'Failed to initialize cryptographic keys'
          });
        }
      }
    }

    initializeCrypto();
  }, [state.config.initialized, dispatch]);

  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (state.ui.lastError) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_ERROR', payload: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.ui.lastError, dispatch]);

  // Handle tab change
  const handleTabChange = useCallback((tab: 'editor' | 'verifier') => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  }, [dispatch]);

  return (
    <div className="app-container">
      <Header />
      <TabNavigation
        activeTab={state.ui.activeTab}
        onTabChange={handleTabChange}
      />

      {state.ui.activeTab === 'editor' ? (
        <div className="main-content">
          <div className="left-panel">
            <ErrorBoundary>
              <EditorPanel />
            </ErrorBoundary>
          </div>

          <div className="right-panel">
            <ErrorBoundary>
              <TrustArtifactsPanel />
            </ErrorBoundary>
          </div>
        </div>
      ) : (
        <div className="main-content">
          <div className="left-panel">
            <ErrorBoundary>
              <VerifierPanel
                onVerificationComplete={setVerificationResult}
                onContentExtracted={setVerifiedContent}
              />
            </ErrorBoundary>
          </div>

          <div className="right-panel">
            <ErrorBoundary>
              <VerifierEditHistory
                verificationResult={verificationResult}
                verifiedContent={verifiedContent}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {state.ui.lastError && (
        <div className="error-toast">
          {state.ui.lastError}
        </div>
      )}
    </div>
  );
}

export default App;
