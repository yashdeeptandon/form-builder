import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface PreviewState {
  responses: Record<string, unknown>
  currentPageId: string | null
  visitedPageIds: string[]
}

const initialState: PreviewState = {
  responses: {},
  currentPageId: null,
  visitedPageIds: [],
}

interface SetResponsePayload {
  fieldId: string
  value: unknown
}

export const previewSlice = createSlice({
  name: 'preview',
  initialState,
  reducers: {
    setResponse(state, action: PayloadAction<SetResponsePayload>) {
      state.responses[action.payload.fieldId] = action.payload.value
    },
    setResponses(state, action: PayloadAction<Record<string, unknown>>) {
      state.responses = action.payload
    },
    clearResponse(state, action: PayloadAction<string>) {
      delete state.responses[action.payload]
    },
    setCurrentPage(state, action: PayloadAction<string | null>) {
      state.currentPageId = action.payload
    },
    visitPage(state, action: PayloadAction<string>) {
      if (!state.visitedPageIds.includes(action.payload)) {
        state.visitedPageIds.push(action.payload)
      }
    },
    resetPreviewState() {
      return initialState
    },
  },
})

export const {
  setResponse,
  setResponses,
  clearResponse,
  setCurrentPage,
  visitPage,
  resetPreviewState,
} = previewSlice.actions

export default previewSlice.reducer
