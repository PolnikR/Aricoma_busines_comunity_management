import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { LanguageProvider } from '@/contexts/LanguageContext'
import './index.css'

async function startApp() {
  // Dev-only mock backend (recovery-apps). Never runs in a production build.
  // Unhandled requests (providers, VMs, tags) pass straight through to the
  // real backend without warnings.
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  const rootElement = document.getElementById('root')

  if (rootElement === null) {
    throw new Error('Application root element was not found')
  }

  createRoot(rootElement).render(
    <StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </StrictMode>,
  )
}

void startApp()
