import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface RuntimeState {
  visibleFieldIds: string[]
  visiblePageIds: string[]
  requiredOverrides: Record<string, boolean>
  hiddenReasonByTarget: Record<string, string>
}

const initialState: RuntimeState = {
  visibleFieldIds: [],
  visiblePageIds: [],
  requiredOverrides: {},
  hiddenReasonByTarget: {},
}

interface RuntimePatch {
  visibleFieldIds?: string[]
  visiblePageIds?: string[]
  requiredOverrides?: Record<string, boolean>
  hiddenReasonByTarget?: Record<string, string>
}

export const runtimeSlice = createSlice({
  name: 'runtime',
  initialState,
  reducers: {
    applyRuntimePatch(state, action: PayloadAction<RuntimePatch>) {
      const {
        visibleFieldIds,
        visiblePageIds,
        requiredOverrides,
        hiddenReasonByTarget,
      } = action.payload

      if (visibleFieldIds) {
        state.visibleFieldIds = visibleFieldIds
      }
      if (visiblePageIds) {
        state.visiblePageIds = visiblePageIds
      }
      if (requiredOverrides) {
        state.requiredOverrides = requiredOverrides
      }
      if (hiddenReasonByTarget) {
        state.hiddenReasonByTarget = hiddenReasonByTarget
      }
    },
    resetRuntimeState() {
      return initialState
    },
  },
})

export const { applyRuntimePatch, resetRuntimeState } = runtimeSlice.actions

export default runtimeSlice.reducer
