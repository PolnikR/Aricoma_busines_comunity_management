import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { UserProvider } from '@/contexts/UserContext'
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
          <UserProvider>
            <App />
          </UserProvider>
        </LanguageProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

startApp()
