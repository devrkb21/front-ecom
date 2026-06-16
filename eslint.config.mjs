import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default [
  {
    ignores: ['.next/**', '.open-next/**', '.vercel/**', 'node_modules/**', 'eslint.config.mjs'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];
