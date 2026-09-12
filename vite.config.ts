import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Keeps the bundle usable on the older WebViews found on some Android devices.
    legacy()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 8100 is the port Ionic serves on, so `npm run dev` and `ionic serve`
  // land on the same URL.
  server: {
    port: 8100,
  },
  preview: {
    port: 8100,
  },
})
