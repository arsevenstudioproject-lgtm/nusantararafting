import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2022',
    rollupOptions: { output: { manualChunks: {
      three: ['three'], physics: ['@dimforge/rapier3d-compat'], vision: ['@mediapipe/tasks-vision'],
    } } },
    chunkSizeWarningLimit: 2500,
  },
})
