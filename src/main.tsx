import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { UserProvider } from '@/contexts/UserContext'
import './index.css'

async function unregisterInactiveMockWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations
        .filter((registration) => registration.active?.scriptURL.endsWith('/mockServiceWorker.js'))
        .map((registration) => registration.unregister()),
    )
  } catch {
    // Service worker cleanup must never prevent the application from starting.
  }
}

async function startApp() {
  await unregisterInactiveMockWorker()

  const rootElement = document.getElementById('root')

  if (rootElement === null) {
    throw new Error('Application root element was not found')
  }

  createRoot(rootElement).render(
    <StrictMode>
      <LanguageProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </LanguageProvider>
    </StrictMode>,
  )
}

void startApp()
