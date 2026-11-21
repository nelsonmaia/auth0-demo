import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 800 },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001"
    }
  },
  preview: {
    host: true,
    proxy: {
      "/api": "http://localhost:3001"
    }
  }
})
