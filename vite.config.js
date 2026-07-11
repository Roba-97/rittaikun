import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        gallery: resolve(__dirname, 'pages/gallery.html'),
        showcase: resolve(__dirname, 'pages/showcase.html'),
        create: resolve(__dirname, 'pages/create.html'),
      },
    },
  },
})
