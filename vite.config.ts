import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { DEMO_MODE } from './src/config/demo'

export default defineConfig({
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
})
