import * as Redux from 'redux';

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
    const serializedState = JSON.stringify(state);
    localStorage.setItem('reduxState', serializedState);
  } catch (err) {
    console.error('Error saving state:', err);
  }
};

// Initial states
const profilesInitialState = {
  items: [],
  selectedProfileId: null,
};

const dndInitialState = {
  isDragging: false,
  draggedItem: null
};

// Action types
const SET_PROFILES = 'profiles/setProfiles';
const SET_SELECTED_PROFILE = 'profiles/setSelectedProfile';
const ADD_PROFILE = 'profiles/addProfile';
const DELETE_PROFILE = 'profiles/deleteProfile';
const UPDATE_PROFILE_STATUS = 'profiles/updateProfileStatus';
const SET_DRAG_STATE = 'dnd/setDragState';
const UPDATE_PROFILE = 'profiles/updateProfile';

// Action creators
export const setProfiles = (profiles) => ({
  type: SET_PROFILES,
  payload: profiles
});

export const setSelectedProfile = (profile) => {
  console.log('setSelectedProfile action creator called with:', profile);
  return {
    type: SET_SELECTED_PROFILE,
    payload: profile ? profile.id : null
  };
};

export const addProfile = (profile) => ({
  type: ADD_PROFILE,
  payload: {
    ...profile,
    startupUrl: profile.startupUrl || ''
  }
});

export const deleteProfile = (profileId) => ({
  type: DELETE_PROFILE,
  payload: profileId
});

export const updateProfileStatus = (profileId, status) => ({
  type: UPDATE_PROFILE_STATUS,
  payload: { profileId, status }
});

export const setDragState = (isDragging, draggedItem) => ({
  type: SET_DRAG_STATE,
  payload: { isDragging, draggedItem }
});

export const updateProfile = (profile) => {
  console.log('updateProfile action creator called with:', profile);
  return {
    type: UPDATE_PROFILE,
    payload: profile
  };
};

// Reducers
const profilesReducer = (state = profilesInitialState, action) => {
  console.log('Reducer called with action:', action.type);
  
  switch (action.type) {
    case SET_PROFILES:
      return {
        ...state,
        items: action.payload
      };
    
    case SET_SELECTED_PROFILE:
      console.log('SET_SELECTED_PROFILE payload:', action.payload);
      return {
        ...state,
        selectedProfileId: action.payload
      };
    
    case UPDATE_PROFILE_STATUS:
      return {
        ...state,
        items: state.items.map(profile =>
          profile.id === action.payload.profileId
            ? { ...profile, status: action.payload.status }
            : profile
        )
      };
    
    case ADD_PROFILE:
      console.log('Adding profile:', action.payload);
      return {
        ...state,
        items: [...state.items, action.payload]
      };
    
    case DELETE_PROFILE:
      return {
        ...state,
        items: state.items.filter(profile => profile.id !== action.payload),
        selectedProfileId: state.selectedProfileId === action.payload ? null : state.selectedProfileId
      };
    
    case UPDATE_PROFILE:
      console.log('UPDATE_PROFILE payload:', action.payload);
      return {
        ...state,
        items: state.items.map(profile =>
          profile.id === action.payload.id
            ? { ...action.payload }
            : profile
        ),
        // Only update selectedProfileId if it matches the updated profile's ID
        selectedProfileId: state.selectedProfileId === action.payload.id 
          ? action.payload.id 
          : state.selectedProfileId
      };
    
    default:
      return state;
  }
};

const dndReducer = (state = dndInitialState, action) => {
  switch (action.type) {
    case SET_DRAG_STATE:
      return {
        ...state,
        isDragging: action.payload.isDragging,
        draggedItem: action.payload.draggedItem
      };
    default:
      return state;
  }
};

// Combine reducers
const rootReducer = Redux.combineReducers({
  profiles: profilesReducer,
  dnd: dndReducer
});

// Create store with persisted state
const store = Redux.createStore(
  rootReducer,
  loadState(), // Load initial state from localStorage
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

// Subscribe to store changes to save state
store.subscribe(() => {
  saveState(store.getState());
});

export default store;