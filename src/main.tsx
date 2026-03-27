import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProviders } from '@/app/providers/app-providers'
import { enableMocking } from '@/mocks/init'

async function bootstrap() {
  await enableMocking()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  )
}

void bootstrap()
