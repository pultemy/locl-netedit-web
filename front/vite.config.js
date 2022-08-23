// vite.config.js
import { resolve } from 'path';
import { splitVendorChunkPlugin, defineConfig } from 'vite'


module.exports = defineConfig({
  build: {
    rollupOptions: {
      input: {
        // main: resolve(__dirname, 'index.html'),
        snap: resolve(__dirname, 'nested/snap.html'),
        lineEdit: resolve(__dirname, 'nested/lineEdit.html')
      }
    }
  },
  plugins: [splitVendorChunkPlugin()]
})
