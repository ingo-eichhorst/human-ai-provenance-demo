import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '../state/AppContext';
import { cryptoService } from '../services/CryptoService';
import { createProvenanceService } from '../services/ProvenanceService';
import { createAIClientService } from '../services/AIClientService';
import { c2paManifestService } from '../services/C2PAManifestService';
import { scittService } from '../services/SCITTService';
import { pdfExportService } from '../services/PDFExportService';
import { imageExportService } from '../services/ImageExportService';
import { embeddedManifestService } from '../services/EmbeddedManifestService';
import { computeWordDiff, mergeAdjacentTokens } from '../utils/diff';
import { StarterPrompts } from './StarterPrompts';
import { DiffView } from './DiffView';
import { ActionBar } from './ActionBar';
import './EditorPanel.css';

const provenanceService = createProvenanceService(cryptoService);
const aiClientService = createAIClientService(cryptoService);

export function EditorPanel() {
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

      // Create C2PA action
      const action = pending.aiMetadata
        ? provenanceService.createAIAction({
            range,
            beforeText: pending.originalText,
            afterText: pending.proposedText,
            beforeHash: pending.originalHash,
            afterHash: pending.proposedHash,
            model: pending.aiMetadata.model,
            promptHash: pending.aiMetadata.promptHash,
            responseHash: pending.aiMetadata.responseHash
          })
        : provenanceService.createHumanAction({
            range,
            beforeText: pending.originalText,
            afterText: pending.proposedText,
            beforeHash: pending.originalHash,
            afterHash: pending.proposedHash
          });

      dispatch({ type: 'ADD_C2PA_ACTION', payload: action });

      // Build C2PA manifest with all actions
      const newActions = [...state.c2pa.actions, action];

      dispatch({ type: 'SET_SIGNING', payload: true });
      try {
        const manifest = await c2paManifestService.createExternalManifest(
          pending.proposedText,
          newActions,
          state.crypto.privateKey!
        );

        dispatch({ type: 'UPDATE_C2PA_MANIFEST', payload: manifest });

        // Submit to SCITT for transparency log receipt
        dispatch({ type: 'SET_ANCHORING', payload: true });
        const scittReceipt = await scittService.submitToLog(manifest);
        dispatch({ type: 'UPDATE_SCITT_RECEIPT', payload: scittReceipt });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create manifest';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      } finally {
        dispatch({ type: 'SET_SIGNING', payload: false });
        dispatch({ type: 'SET_ANCHORING', payload: false });
      }

      // Clear pending change
      dispatch({ type: 'ACCEPT_PENDING_CHANGE' });

      // Clear selection
      dispatch({ type: 'SET_SELECTION', payload: null });
    },
    [state.pendingChange.data, state.c2pa.actions, state.crypto, dispatch]
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

  // Export as dual files (content.txt + manifest.c2pa.json)
  const handleExportFiles = useCallback(async () => {
    if (!state.c2pa.manifest) return;

    try {
      const contentFilename = 'document.txt';
      const manifestFilename = 'document.c2pa.json';

      // Add SCITT receipt to manifest if available
      const manifestWithReceipt = state.c2pa.scittReceipt
        ? { ...state.c2pa.manifest, scitt: state.c2pa.scittReceipt }
        : state.c2pa.manifest;

      // Download content file
      const contentBlob = new Blob([state.content.text], { type: 'text/plain' });
      const contentUrl = URL.createObjectURL(contentBlob);
      const contentLink = document.createElement('a');
      contentLink.href = contentUrl;
      contentLink.download = contentFilename;
      contentLink.click();
      URL.revokeObjectURL(contentUrl);

      // Download manifest file
      const manifestJson = c2paManifestService.serializeManifest(manifestWithReceipt);
      const manifestBlob = new Blob([manifestJson], { type: 'application/json' });
      const manifestUrl = URL.createObjectURL(manifestBlob);
      const manifestLink = document.createElement('a');
      manifestLink.href = manifestUrl;
      manifestLink.download = manifestFilename;
      manifestLink.click();
      URL.revokeObjectURL(manifestUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.content.text, state.c2pa.manifest, state.c2pa.scittReceipt, dispatch]);

  // Export as single file with embedded manifest
  const handleExportEmbedded = useCallback(async () => {
    if (!state.c2pa.manifest) return;

    try {
      // Add SCITT receipt to manifest if available
      const manifestWithReceipt = state.c2pa.scittReceipt
        ? { ...state.c2pa.manifest, scitt: state.c2pa.scittReceipt }
        : state.c2pa.manifest;

      // Embed manifest into content
      const embeddedContent = embeddedManifestService.embedManifest(
        state.content.text,
        manifestWithReceipt
      );

      // Download as single file
      const blob = new Blob([embeddedContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'document.c2pa.txt';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.content.text, state.c2pa.manifest, state.c2pa.scittReceipt, dispatch]);

  // Export as PDF with embedded manifest
  const handleExportPDF = useCallback(async () => {
    if (!state.c2pa.manifest) return;

    try {
      // Add SCITT receipt to manifest if available
      const manifestWithReceipt = state.c2pa.scittReceipt
        ? { ...state.c2pa.manifest, scitt: state.c2pa.scittReceipt }
        : state.c2pa.manifest;

      // Generate PDF
      const pdfBytes = await pdfExportService.createPDFWithManifest(
        state.content.text,
        manifestWithReceipt,
        'A2UI Document'
      );

      // Download PDF
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'document.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF export failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.content.text, state.c2pa.manifest, state.c2pa.scittReceipt, dispatch]);

  // Export as signed image with C2PA manifest (verifiable at verify.contentauthenticity.org)
  const handleExportSignedImage = useCallback(async () => {
    if (!state.c2pa.manifest) return;

    try {
      dispatch({ type: 'SET_SIGNING', payload: true });

      // 1. Render content as PNG image
      const imageBlob = await imageExportService.renderContentAsImage(state.content.text);

      // 2. Convert to base64
      const imageBase64 = await imageExportService.blobToBase64(imageBlob);

      // 3. Prepare manifest with SCITT receipt if available
      const manifestWithReceipt = state.c2pa.scittReceipt
        ? { ...state.c2pa.manifest, scitt: state.c2pa.scittReceipt }
        : state.c2pa.manifest;

      // 4. Send to backend for C2PA signing
      const response = await fetch('http://localhost:3002/api/sign-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          manifest: manifestWithReceipt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign image');
      }

      const { signedImage } = await response.json();

      // 5. Download signed image
      imageExportService.downloadBase64AsFile(signedImage, 'document-signed.png');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Image export failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_SIGNING', payload: false });
    }
  }, [state.content.text, state.c2pa.manifest, state.c2pa.scittReceipt, dispatch]);

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

      {/* Export buttons */}
      {!state.pendingChange.data && state.c2pa.manifest && (
        <div className="export-controls">
          <button
            className="export-btn export-btn-primary"
            onClick={handleExportEmbedded}
            disabled={state.ui.isSigning || state.ui.isAnchoring}
          >
            Export as .c2pa.txt
          </button>
          <button
            className="export-btn"
            onClick={handleExportFiles}
            disabled={state.ui.isSigning || state.ui.isAnchoring}
          >
            Export as Separate Files
          </button>
          <button
            className="export-btn"
            onClick={handleExportPDF}
            disabled={state.ui.isSigning || state.ui.isAnchoring}
          >
            Export as PDF (Demo)
          </button>
          <button
            className="export-btn"
            onClick={handleExportSignedImage}
            disabled={state.ui.isSigning || state.ui.isAnchoring}
          >
            Export as Signed Image
          </button>
        </div>
      )}
    </div>
  );
}
