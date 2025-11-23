import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base: ./' é fundamental para o GitHub Pages encontrar os arquivos JS e CSS relativos
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Aumentar o limite de aviso de tamanho de chunk para evitar alertas no log
    chunkSizeWarningLimit: 1000,
    // Garantir que o diretório de saída esteja limpo antes de construir
    emptyOutDir: true
  }
})
