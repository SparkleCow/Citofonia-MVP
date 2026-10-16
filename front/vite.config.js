import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El frontend llama a rutas relativas "/api/..." y Vite las redirige al
// backend Spring Boot. Cambia el puerto aqui si tu backend corre en otro.
const BACKEND = process.env.VITE_API_PROXY || 'http://localhost:8081'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true
      }
    }
  }
})
