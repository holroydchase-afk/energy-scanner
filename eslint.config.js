import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Synced as-is from studio-agents (scripts/sync-tools.sh); a re-sync would undo local edits.
  {
    files: ['scripts/ux-rules.mjs', 'scripts/ux-shots.mjs'],
    rules: { 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
);
