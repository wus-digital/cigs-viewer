import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['dist/**', 'node_modules/**']),
  { rules: { '@next/next/no-html-link-for-pages': 'off' } },
  {
    files: ['src/**/*.tsx'],
    rules: {
      // The published viewer must work without Next.js or an image proxy.
      '@next/next/no-img-element': 'off',
    },
  },
]);
