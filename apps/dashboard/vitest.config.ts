import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@useroutr/ui': path.resolve(__dirname, '../packages/ui/src/index.ts'),
      '@useroutr/types': path.resolve(__dirname, '../packages/types/src/index.ts'),
    },
  },
})
