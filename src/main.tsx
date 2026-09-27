import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { MotionConfig } from 'motion/react'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import './index.css'
import './auth.css'
import './dashboard.css'
import './directory.css'
import './books.css'
import './labs.css'
import './discovery.css'
import './demo.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DemoAuthProvider } from './contexts/DemoAuthContext'
import { DEMO_MODE } from './config/demo'
import { ContentProvider } from './contexts/ContentContext'

const StudentAuthProvider = DEMO_MODE ? DemoAuthProvider : AuthProvider

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <StudentAuthProvider><ContentProvider><App /></ContentProvider></StudentAuthProvider>
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>,
)
