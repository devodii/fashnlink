// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import designTokens from './eslint-rules/no-off-token-colors.mjs';
import rhfImports from './eslint-rules/no-named-rhf-imports.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // Must stay last among the extended configs: turns off any ESLint
  // stylistic rule that would conflict with Prettier's own formatting.
  ...compat.extends('prettier'),
  {
    plugins: {
      'local-design-tokens': designTokens,
      'local-rhf-imports': rhfImports,
    },
    rules: {
      // section 10.2: every color comes from app/globals.css design tokens.
      'local-design-tokens/no-off-token-colors': 'error',
      // section 10.5: react-hook-form is always used via `import * as RHF`,
      // fields are Controller-based, never register().
      'local-rhf-imports/no-named-rhf-imports': 'error',
    },
  },
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'storybook-static/**'],
  },
  ...storybook.configs['flat/recommended'],
];

export default eslintConfig;
