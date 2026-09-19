import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Test files import modules that eagerly validate env.ts at import time
// (src/lib/env.ts runs loadEnv() at module scope) — load the same
// .env.local drizzle.config.ts uses so `pnpm test` doesn't need its own
// separate env setup.
config({ path: '.env.local' });

// section 2/11: Vitest for unit tests, fixture-based (section 6.9) — no
// network in the test suite itself. Uses the project's own tsconfig.json
// path aliases (@/lib/*, @/modules/*, ...) rather than re-declaring them.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
