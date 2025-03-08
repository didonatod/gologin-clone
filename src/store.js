import { createSlice, configureStore } from '@reduxjs/toolkit';
import { validateAndUpgrade } from './utils/profileSchema';

// Load state from localStorage
const loadState = () => {
  try {
    const serializedState = localStorage.getItem('reduxState');
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error('Error loading state:', err);
    return undefined;
  }
};

// Save state to localStorage
const saveState = (state) => {
  try {
    const serializedState = JSON.stringify({
      profiles: {
        items: state.profiles.items
      }
    });
    localStorage.setItem('reduxState', serializedState);
    console.log('Saved to localStorage:', JSON.parse(localStorage.getItem('reduxState')));
  } catch (err) {
    console.error('Error saving state:', err);
  }
};

// Initial state
const initialState = {
  items: [],
  selectedProfileId: null
};

// Create slice with reducers
const profilesSlice = createSlice({
  name: 'profiles',
  initialState,
  reducers: {
    setProfiles: (state, action) => {
      state.items = action.payload;
    },
    addProfile: (state, action) => {
      const { profile } = validateAndUpgrade(action.payload);
      // Initialize browser settings when adding a new profile
      const newProfile = {
        ...profile,
        browser: {
          version: 'latest',
          persistStorage: false,
          persistCookies: false,
          webrtcEnabled: false,
          canvasNoise: false,
          audioNoiseEnabled: false,
          audioNoiseLevel: 0.1,
          fontMaskingEnabled: false,
          hardwareSpecs: {
            cores: 4,
            memory: 8,
            gpu: 'Intel HD Graphics'
          },
          resolution: {
            width: 1920,
            height: 1080
          },
          fingerprint: {
            userAgent: null,
            platform: profile.os,
            browserVersion: 'latest',
            screenResolution: {
              width: 1920,
              height: 1080,
              pixelRatio: 1
            },
            timezone: {
              offset: new Date().getTimezoneOffset(),
              zone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            language: 'en-US',
            fonts: {
              installed: ['Arial', 'Times New Roman', 'Courier New'],
              fallback: 'Arial, sans-serif'
            },
            canvas: {
              noise: 0.5,
              mode: 'noise'
            },
            webgl: {
              vendor: 'Google Inc.',
              renderer: 'WebGL 2.0',
              noise: 0.3
            },
            audio: {
              noise: 0.2,
              context: {
                sampleRate: 44100,
                state: 'running',
                baseLatency: 0.01
              }
            },
            hardware: {
              cores: 4,
              memory: 8,
              gpu: 'Intel HD Graphics'
            },
            network: {
              downlink: 10,
              rtt: 50,
              saveData: false
            }
          }
        }
      };
      state.items.push(newProfile);
    },
    updateProfile: (state, action) => {
      console.log('Reducer - updateProfile called with:', action.payload);
      const index = state.items.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        // Ensure we preserve any existing browser settings
        const existingBrowser = state.items[index].browser || {};
        state.items[index] = {
          ...action.payload,
          browser: {
            ...existingBrowser,
            ...action.payload.browser
          }
        };
        console.log('Updated profile in state:', state.items[index]);
      }
    },
    updateProfileStatus: (state, action) => {
      const profile = state.items.find(p => p.id === action.payload.id);
      if (profile) {
        profile.status = action.payload.status;
      }
    },
    setSelectedProfile: (state, action) => {
      state.selectedProfileId = action.payload;
    }
  }
});

// Export actions
export const { 
  setProfiles, 
  addProfile, 
  updateProfile,
  updateProfileStatus,
  setSelectedProfile
} = profilesSlice.actions;

// Create store with persisted state
const store = configureStore({
  reducer: {
    profiles: profilesSlice.reducer
  },
  preloadedState: loadState(),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

// Subscribe to store changes to save state
store.subscribe(() => {
  const state = store.getState();
  saveState(state);
});

export default store; 