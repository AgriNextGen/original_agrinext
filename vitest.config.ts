import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Exclude integration-test runners that require real Supabase credentials
    // and are designed to be run directly via `npx tsx`, not via vitest.
    exclude: [
      'tests/logistics/logistics-system.test.ts',
      'tests/agent/agent-system.test.ts',
      'tests/admin/admin-system.test.ts',
      'tests/chaos/system-chaos.test.ts',
    ],
    // Provide dummy Supabase values so the client module can initialise
    // without throwing "supabaseUrl is required" in unit-test runs.
    // All tests that actually touch the database mock @/integrations/supabase/client.
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
