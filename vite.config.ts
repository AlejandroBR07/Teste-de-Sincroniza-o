import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: base: './' garante que os arquivos funcionem em qualquer subdiretório (como no GitHub Pages)
  base: './',
})