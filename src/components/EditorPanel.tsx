import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '../state/AppContext';
import { cryptoService } from '../services/CryptoService';
import { createProvenanceService } from '../services/ProvenanceService';
import { createAIClientService } from '../services/AIClientService';
import { computeWordDiff, mergeAdjacentTokens } from '../utils/diff';
import { StarterPrompts } from './StarterPrompts';
import { DiffView } from './DiffView';
import { ActionBar } from './ActionBar';
import './EditorPanel.css';

const provenanceService = createProvenanceService(cryptoService);
const aiClientService = createAIClientService(cryptoService);

export function EditorPanel({ onExportBundle }: { onExportBundle: () => void }) {
  const { state, dispatch } = useAppContext();
  const [aiInstruction, setAiInstruction] = useState('');
  const [localText, setLocalText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local text with committed content when not editing
  useEffect(() => {
    if (!state.pendingChange.data) {
      setLocalText(state.content.text);
    }
  }, [state.content.text, state.pendingChange.data]);

  // Set API key in AI client when it changes
  useEffect(() => {
    if (state.config.apiKey) {
      aiClientService.setApiKey(state.config.apiKey);
    }
  }, [state.config.apiKey]);

  // Handle starter prompt selection
  const handleStarterPrompt = useCallback(
    async (promptText: string) => {
      // Log user interaction
      dispatch({
        type: 'LOG_USER_INTERACTION',
        payload: {
          type: 'starter-prompt-click',
          metadata: { promptText }
        }
      });

      dispatch({ type: 'SET_PENDING_GENERATING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const result = await aiClientService.generateFromPrompt(promptText);
        const originalText = state.content.text;
        const originalHash = state.content.hash;
        const proposedHash = await cryptoService.hash(result.rewrittenText);

        // Create pending change
        dispatch({
          type: 'CREATE_PENDING_CHANGE',
          payload: {
            source: 'ai-generate',
            originalText,
            proposedText: result.rewrittenText,
            originalHash,
            proposedHash,
            aiMetadata: {
              model: result.model,
              promptHash: result.promptHash,
              responseHash: result.responseHash,
              promptText
            }
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'AI generation failed';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_PENDING_GENERATING', payload: false });
      }
    },
    [state.content.text, state.content.hash, dispatch]
  );

  // Handle manual text editing
  const handleTextAreaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setLocalText(newText);
    },
    []
  );

  // Handle blur - create pending change when user clicks out of textarea
  const handleTextAreaBlur = useCallback(
    async () => {
      if (localText !== state.content.text) {
        const originalText = state.content.text;
        const originalHash = state.content.hash;
        const proposedHash = await cryptoService.hash(localText);

        dispatch({
          type: 'CREATE_PENDING_CHANGE',
          payload: {
            source: 'manual-edit',
            originalText,
            proposedText: localText,
            originalHash,
            proposedHash
          }
        });
      }
    },
    [localText, state.content.text, state.content.hash, dispatch]
  );

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start !== end) {
        const selectedText = state.content.text.substring(start, end);

        dispatch({ type: 'SET_SELECTION', payload: { start, end } });

        // Log user interaction
        dispatch({
          type: 'LOG_USER_INTERACTION',
          payload: {
            type: 'text-selection',
            metadata: { start, end, selectedText }
          }
        });
      } else {
        dispatch({ type: 'SET_SELECTION', payload: null });
      }
    }
  }, [state.content.text, dispatch]);

  // Handle AI rewrite
  const handleAIRewrite = useCallback(
    async () => {
      if (!aiInstruction.trim()) {
        return;
      }

      const selection = state.content.selection;
      const textToRewrite = selection
        ? state.content.text.substring(selection.start, selection.end)
        : state.content.text;

      if (!textToRewrite) {
        return;
      }

      dispatch({ type: 'SET_PENDING_GENERATING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const result = await aiClientService.rewriteText(textToRewrite, aiInstruction);

        const originalText = state.content.text;
        const originalHash = state.content.hash;

        let proposedText: string;
        let range: { start: number; end: number } | undefined;

        if (selection) {
          // Rewrite selected text only
          proposedText =
            originalText.substring(0, selection.start) +
            result.rewrittenText +
            originalText.substring(selection.end);
          range = { start: selection.start, end: selection.start + result.rewrittenText.length };
        } else {
          // Rewrite entire document
          proposedText = result.rewrittenText;
          range = { start: 0, end: result.rewrittenText.length };
        }

        const proposedHash = await cryptoService.hash(proposedText);

        // Create pending change
        dispatch({
          type: 'CREATE_PENDING_CHANGE',
          payload: {
            source: 'ai-rewrite',
            originalText,
            proposedText,
            originalHash,
            proposedHash,
            range,
            aiMetadata: {
              model: result.model,
              promptHash: result.promptHash,
              responseHash: result.responseHash,
              promptText: aiInstruction
            }
          }
        });

        // Clear instruction
        setAiInstruction('');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'AI rewrite failed';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_PENDING_GENERATING', payload: false });
      }
    },
    [aiInstruction, state.content, dispatch]
  );

  // Handle accepting pending change
  const handleAccept = useCallback(
    async () => {
      const pending = state.pendingChange.data;
      if (!pending) return;

      // Log user interaction
      dispatch({
        type: 'LOG_USER_INTERACTION',
        payload: {
          type: 'accept-change',
          metadata: {
            pendingChangeId: pending.id,
            changeSource: pending.source
          }
        }
      });

      // Update content
      dispatch({
        type: 'UPDATE_CONTENT',
        payload: {
          text: pending.proposedText,
          hash: pending.proposedHash
        }
      });

      // Determine range
      const range = pending.range || { start: 0, end: pending.proposedText.length };

      // Create provenance event with decision metadata
      const event = pending.aiMetadata
        ? provenanceService.createAIEvent({
            range,
            beforeText: pending.originalText,
            afterText: pending.proposedText,
            beforeHash: pending.originalHash,
            afterHash: pending.proposedHash,
            model: pending.aiMetadata.model,
            promptHash: pending.aiMetadata.promptHash,
            responseHash: pending.aiMetadata.responseHash,
            decision: {
              pendingChangeId: pending.id,
              source: pending.source
            }
          })
        : provenanceService.createHumanEvent({
            range,
            beforeText: pending.originalText,
            afterText: pending.proposedText,
            beforeHash: pending.originalHash,
            afterHash: pending.proposedHash,
            decision: {
              pendingChangeId: pending.id,
              source: pending.source
            }
          });

      dispatch({ type: 'ADD_EVENT', payload: event });

      // Update event chain
      const newEvents = [...state.provenance.events, event];
      const newChainHash = await provenanceService.computeEventChainHash(newEvents);
      dispatch({ type: 'UPDATE_EVENT_CHAIN', payload: newChainHash });

      // Build and sign manifest
      const manifestData = provenanceService.buildManifest(
        newEvents,
        pending.proposedHash,
        newChainHash
      );
      const manifestToSign = JSON.stringify(manifestData, Object.keys(manifestData).sort());
      const signature = await cryptoService.sign(manifestToSign, state.crypto.privateKey!);

      const signedManifest = {
        ...manifestData,
        signature,
        publicKey: state.crypto.publicKey!
      };

      dispatch({ type: 'UPDATE_MANIFEST', payload: signedManifest });

      // Generate demo receipt
      // Use hashObject for canonical JSON (sorted keys)
      const manifestHash = await cryptoService.hashObject(signedManifest);
      const receiptSig = await cryptoService.sign(manifestHash, state.crypto.privateKey!);

      dispatch({
        type: 'UPDATE_RECEIPT',
        payload: {
          manifestHash,
          timestamp: Date.now(),
          receiptSignature: receiptSig
        }
      });

      // Clear pending change
      dispatch({ type: 'ACCEPT_PENDING_CHANGE' });

      // Clear selection
      dispatch({ type: 'SET_SELECTION', payload: null });
    },
    [state.pendingChange.data, state.provenance.events, state.crypto, dispatch]
  );

  // Handle rejecting pending change
  const handleReject = useCallback(() => {
    const pending = state.pendingChange.data;
    if (!pending) return;

    // Log user interaction
    dispatch({
      type: 'LOG_USER_INTERACTION',
      payload: {
        type: 'reject-change',
        metadata: {
          pendingChangeId: pending.id,
          changeSource: pending.source
        }
      }
    });

    // Clear pending change
    dispatch({ type: 'REJECT_PENDING_CHANGE' });

    // Reset local text to committed content
    setLocalText(state.content.text);
  }, [state.pendingChange.data, state.content.text, dispatch]);

  // Compute diff for pending change
  const diffTokens = state.pendingChange.data
    ? mergeAdjacentTokens(
        computeWordDiff(state.pendingChange.data.originalText, state.pendingChange.data.proposedText)
          .visualTokens
      )
    : [];

  const hasSelection = !!state.content.selection;
  const canRewrite =
    aiInstruction.trim() !== '' && !state.pendingChange.isGenerating && !state.pendingChange.data;
  const showStarterPrompts =
    state.ui.showStarterPrompts && !state.pendingChange.data && state.content.text === '';

  return (
    <div className="editor-panel">
      <h2>Editor</h2>

      {/* Starter Prompts - shown when content is empty */}
      {showStarterPrompts && (
        <StarterPrompts
          onPromptSelect={handleStarterPrompt}
          disabled={state.pendingChange.isGenerating}
        />
      )}

      {/* DiffView - shown when there's a pending change */}
      {state.pendingChange.data && (
        <DiffView tokens={diffTokens} isGenerating={state.pendingChange.isGenerating} />
      )}

      {/* Textarea - shown when there's content but no pending change */}
      {!state.pendingChange.data && !showStarterPrompts && (
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={localText}
          onChange={handleTextAreaChange}
          onBlur={handleTextAreaBlur}
          onSelect={handleSelectionChange}
          placeholder="Start typing your text here..."
          spellCheck={false}
        />
      )}

      {/* Selection info */}
      {hasSelection && !state.pendingChange.data && (
        <div className="selection-info">
          Selected: chars {state.content.selection!.start}-{state.content.selection!.end}
        </div>
      )}

      {/* ActionBar - shown when there's a pending change */}
      {state.pendingChange.data && (
        <ActionBar
          onAccept={handleAccept}
          onReject={handleReject}
          changeSource={state.pendingChange.data.source}
          isGenerating={state.pendingChange.isGenerating}
        />
      )}

      {/* AI Controls */}
      {!state.pendingChange.data && (
        <div className="ai-controls">
          <input
            type="text"
            className="ai-instruction-input"
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            placeholder={
              hasSelection
                ? "Enter rewrite instruction (e.g., 'make this more formal')"
                : "Enter instruction to rewrite entire document"
            }
            disabled={state.pendingChange.isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canRewrite) {
                handleAIRewrite();
              }
            }}
          />
          <button className="rewrite-btn" onClick={handleAIRewrite} disabled={!canRewrite}>
            {state.pendingChange.isGenerating
              ? 'Generating...'
              : hasSelection
              ? 'Rewrite Selected Text'
              : 'Rewrite Document'}
          </button>
        </div>
      )}

      {/* Export button */}
      {!state.pendingChange.data && (
        <button className="export-btn" onClick={onExportBundle} disabled={!state.manifest.data}>
          Copy Bundle
        </button>
      )}
    </div>
  );
}
