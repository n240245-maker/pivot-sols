import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { DEMO_MODE } from './src/config/demo'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  if (command === 'build') {
    const value = env.VITE_API_BASE_URL?.trim()
    // A local build can be checked before a hosting account is authorized.
    // Every Vercel deployment must point at its explicitly configured HTTPS API.
    if (process.env.VERCEL || value) {
      let url: URL
      try { url = new URL(value || '') } catch { throw new Error('Set VITE_API_BASE_URL to the backend HTTPS origin before deploying.') }
      if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) {
        throw new Error('Production VITE_API_BASE_URL must be a public HTTPS origin without credentials or a path.')
      }
    }
  }
  return {
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!DEMO_MODE && id.includes('node_modules/@supabase/')) return 'supabase'
          if (id.includes('node_modules/')) return 'vendor'
        },
      },
    },
  },
  }
})
