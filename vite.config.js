
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    proxy: {
      '/api': {
        target: 'https://script.google.com',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api/, '/macros/s/AKfycbyj0x9x-3Q8BbLTB1tZx8xzVBp7-76rYl7VcnGuc_KxxceIbkOp3z635jneTk3EQ9U1ow/exec'),
        followRedirects: true,
      },
    },
  },
})
