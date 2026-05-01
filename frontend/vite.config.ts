import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Force Vite to pre-bundle CJS modules (react-plotly.js / plotly.js)
  // This prevents the "got: object" runtime crash from ESM/CJS interop
  optimizeDeps: {
    include: ['react-plotly.js', 'plotly.js'],
  },
  build: {
    commonjsOptions: {
      include: [/react-plotly\.js/, /plotly\.js/, /node_modules/],
    },
  },
})
