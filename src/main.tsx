import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { AuthProvider } from '@/contexts/AuthProvider'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { UserProvider } from '@/contexts/UserProvider'
import './index.css'

function startApp() {
  const rootElement = document.getElementById('root')

  if (rootElement === null) {
    throw new Error('Application root element was not found')
  }

  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <UserProvider>
              <App />
            </UserProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

startApp()
