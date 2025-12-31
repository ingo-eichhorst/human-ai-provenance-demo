import { v4 as uuidv4 } from 'uuid';
import { AppState } from './AppState';
import { AppAction } from './actions';
import { APP_VERSION, TOOL_NAME } from '../utils/constants';

export function createInitialState(): AppState {
  return {
    config: {
      apiKey: null,
      initialized: false
    },
    crypto: {
      publicKey: null,
      privateKey: null
    },
    content: {
      text: '',
      hash: '',
      selection: null
    },
    pendingChange: {
      data: null,
      isGenerating: false
    },
    userInteractions: [],
    c2pa: {
      actions: [],
      manifest: null,
      scittReceipt: null
    },
    ui: {
      isProcessingAI: false,
      isSigning: false,
      isAnchoring: false,
      lastError: null,
      showStarterPrompts: true,
      activeTab: 'editor'
    }
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'INIT_CRYPTO':
      return {
        ...state,
        crypto: {
          publicKey: action.payload.publicKey,
          privateKey: action.payload.privateKey
        },
        config: {
          ...state.config,
          initialized: true
        }
      };

    case 'SET_API_KEY':
      return {
        ...state,
        config: {
          ...state.config,
          apiKey: action.payload
        }
      };

    case 'UPDATE_CONTENT':
      return {
        ...state,
        content: {
          ...state.content,
          text: action.payload.text,
          hash: action.payload.hash
        }
      };

    case 'SET_SELECTION':
      return {
        ...state,
        content: {
          ...state.content,
          selection: action.payload
        }
      };

    case 'ADD_C2PA_ACTION':
      return {
        ...state,
        c2pa: {
          ...state.c2pa,
          actions: [...state.c2pa.actions, action.payload]
        }
      };

    case 'UPDATE_C2PA_MANIFEST':
      return {
        ...state,
        c2pa: {
          ...state.c2pa,
          manifest: action.payload
        }
      };

    case 'UPDATE_SCITT_RECEIPT':
      return {
        ...state,
        c2pa: {
          ...state.c2pa,
          scittReceipt: action.payload
        }
      };

    case 'CLEAR_C2PA':
      return {
        ...state,
        c2pa: {
          actions: [],
          manifest: null,
          scittReceipt: null
        }
      };

    case 'SET_SIGNING':
      return {
        ...state,
        ui: {
          ...state.ui,
          isSigning: action.payload
        }
      };

    case 'SET_ANCHORING':
      return {
        ...state,
        ui: {
          ...state.ui,
          isAnchoring: action.payload
        }
      };

    case 'SET_AI_PROCESSING':
      return {
        ...state,
        ui: {
          ...state.ui,
          isProcessingAI: action.payload
        }
      };

    case 'SET_ERROR':
      return {
        ...state,
        ui: {
          ...state.ui,
          lastError: action.payload
        }
      };

    case 'CREATE_PENDING_CHANGE':
      return {
        ...state,
        pendingChange: {
          data: {
            id: uuidv4(),
            timestamp: Date.now(),
            ...action.payload
          },
          isGenerating: false
        },
        ui: {
          ...state.ui,
          showStarterPrompts: false
        }
      };

    case 'SET_PENDING_GENERATING':
      return {
        ...state,
        pendingChange: {
          ...state.pendingChange,
          isGenerating: action.payload
        }
      };

    case 'ACCEPT_PENDING_CHANGE':
      return {
        ...state,
        pendingChange: {
          data: null,
          isGenerating: false
        }
      };

    case 'REJECT_PENDING_CHANGE':
      return {
        ...state,
        pendingChange: {
          data: null,
          isGenerating: false
        },
        ui: {
          ...state.ui,
          showStarterPrompts: state.content.text === ''
        }
      };

    case 'CANCEL_PENDING_CHANGE':
      return {
        ...state,
        pendingChange: {
          data: null,
          isGenerating: false
        }
      };

    case 'LOG_USER_INTERACTION':
      return {
        ...state,
        userInteractions: [
          ...state.userInteractions,
          {
            id: uuidv4(),
            timestamp: Date.now(),
            ...action.payload
          }
        ]
      };

    case 'SET_STARTER_PROMPTS_VISIBLE':
      return {
        ...state,
        ui: {
          ...state.ui,
          showStarterPrompts: action.payload
        }
      };

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTab: action.payload
        }
      };

    default:
      return state;
  }
}
