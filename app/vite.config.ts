import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/routing': 'http://localhost:9988',
      '/geocode': 'http://localhost:9988',
      '/tiles': 'http://localhost:9988',
      '/sprites': 'http://localhost:9988',
      '/fonts': 'http://localhost:9988',
    },
  },
})
