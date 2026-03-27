import { configureStore } from '@reduxjs/toolkit'

import builderReducer from '@/domains/builder/builder.slice'
import previewReducer from '@/domains/preview/preview.slice'
import runtimeReducer from '@/domains/runtime/runtime.slice'
import uiReducer from '@/domains/ui/ui.slice'

export const store = configureStore({
  reducer: {
    builder: builderReducer,
    preview: previewReducer,
    runtime: runtimeReducer,
    ui: uiReducer,
  },
  devTools: import.meta.env.DEV,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
