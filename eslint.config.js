const tailwindcss = require('eslint-plugin-tailwindcss');

/**
 * ESLint 10 reads this file. The rule set matches .eslintrc.js:
 * tailwindcss/no-arbitrary-value only. Fragment checks stay in
 * scripts/lint-preview.js.
 */
module.exports = [
  {
    files: ['**/*.js'],
    plugins: { tailwindcss },
    settings: {
      tailwindcss: {
        config: {},
      },
    },
    rules: {
      'tailwindcss/no-arbitrary-value': 'error',
    },
  },
];
