/**
 * ESLint — flat config (ESLint 9+, Next.js 16).
 * `eslint-config-next/core-web-vitals` already ships as a flat config array.
 */
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextCoreWebVitals,
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'tests/**', 'erp-proposal/**'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];

export default config;
