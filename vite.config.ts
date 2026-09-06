/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Deployed at https://<user>.github.io/easy-baby-naming/
export default defineConfig({
  base: process.env.DEPLOY_BASE ?? '/easy-baby-naming/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
