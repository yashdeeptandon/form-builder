import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type AppMode = 'builder' | 'preview'

interface UiState {
  mode: AppMode
  isLeftPanelOpen: boolean
  isRightPanelOpen: boolean
}

const initialState: UiState = {
  mode: 'builder',
  isLeftPanelOpen: true,
  isRightPanelOpen: true,
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<AppMode>) {
      state.mode = action.payload
    },
    toggleLeftPanel(state) {
      state.isLeftPanelOpen = !state.isLeftPanelOpen
    },
    toggleRightPanel(state) {
      state.isRightPanelOpen = !state.isRightPanelOpen
    },
    resetUiState() {
      return initialState
    },
  },
})

export const { setMode, toggleLeftPanel, toggleRightPanel, resetUiState } =
  uiSlice.actions

export default uiSlice.reducer
