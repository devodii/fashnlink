// Dedicated, narrow ESLint config used only by `pnpm tailwind:fix`.
//
// Flags/fixes classnames whose canonical spelling (as resolved by the
// Tailwind CSS v4 compiler itself, not a hand-maintained list) differs from
// what's written — e.g. `aspect-[3/4]` -> `aspect-3/4`. This is the same
// diagnostic the Tailwind CSS IntelliSense VS Code extension surfaces as
// `tailwindcss(suggestCanonicalClasses)`.
//
// Kept separate from `eslint.config.mjs` on purpose: this file enables only
// the one rule we want auto-applied repo-wide, so `pnpm tailwind:fix` can't
// accidentally trigger fixes from unrelated rules in the main lint config.
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import tailwindcss from 'eslint-plugin-tailwindcss';

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Reused only for the parser/plugin wiring (TypeScript parser, react-hooks,
// @next/next, etc.) so that pre-existing `eslint-disable` comments in source
// files still resolve to a known rule instead of erroring with "Definition
// for rule ... was not found". None of those rules' own severities are kept
// — every rule they'd otherwise enable is switched off below, so this file
// only ever lints/fixes `tailwindcss/enforces-canonical-classname`.
const base = compat.extends('next/core-web-vitals', 'next/typescript').map((config) => {
  const rest = { ...config };
  delete rest.rules;
  return rest;
});

const eslintConfig = [
  ...base,
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'storybook-static/**', 'node_modules/**'],
  },
  {
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: { tailwindcss },
    settings: {
      tailwindcss: {
        cssConfigPath: './app/globals.css',
      },
    },
    rules: {
      'tailwindcss/enforces-canonical-classname': 'error',
    },
  },
];

export default eslintConfig;
