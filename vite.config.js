import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/tretiy-sledovatel/' : '/',
  server: {
    port: 5173,
    strictPort: false,
  },
}))
