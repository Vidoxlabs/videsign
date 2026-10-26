'use strict';

const tailwindcss = require('eslint-plugin-tailwindcss');

module.exports = [
  {
    ignores: ['dist/**'],
  },
  {
    plugins: {
      tailwindcss,
    },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
    },
    settings: {
      tailwindcss: {
        // ESLint only sees JavaScript here; fragment checks live in scripts/lint-preview.js.
        // An inline config object stops the plugin warning about an unresolvable config path.
        config: {},
      },
    },
    rules: {
      // AST Validation: Strictly enforce the no-arbitrary-value rule
      // to algorithmically force the AI to use explicitly defined design tokens.
      // Example: w-[15px] is forbidden.
      'tailwindcss/no-arbitrary-value': 'error',
    },
  },
];
