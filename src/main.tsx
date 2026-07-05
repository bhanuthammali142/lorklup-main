import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Lazy load Firebase initialization to optimize bundle size
import('./lib/firebase').catch(err => console.warn('Failed to initialize Firebase:', err))
import { QueryProvider } from './lib/QueryProvider'
import { themeManager } from './lib/theme'
import { crashReporter } from './lib/crash-reporting'
import { otaUpdates } from './lib/ota-updates'

// Initialize diagnostics & update checks
crashReporter.initialize()
otaUpdates.checkForUpdates()

// Initialize app theme before render to prevent flashing
themeManager.getTheme().then(theme => themeManager.applyTheme(theme))
themeManager.initThemeListener()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
)
