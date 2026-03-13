import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' must be './' for files to load correctly on GoDaddy when not at the root domain
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})