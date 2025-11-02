// src/main.jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { AppKitProvider } from './lib/AppKitProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppKitProvider>
      {/* If you use React Query anywhere, keep this. Otherwise you can remove it. */}
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AppKitProvider>
  </React.StrictMode>
)
