// ESLint 10 reads eslint.config.js. Keep this file in sync with that rule set.
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  plugins: [
    'tailwindcss'
  ],
  settings: {
    tailwindcss: {
      // ESLint only sees JavaScript here; fragment checks live in scripts/lint-preview.js.
      // An inline config object stops the plugin warning about an unresolvable config path.
      config: {}
    }
  },
  rules: {
    // AST Validation: Strictly enforce the no-arbitrary-value rule 
    // to algorithmically force the AI to use explicitly defined design tokens.
    // Example: w-[15px] is forbidden.
    'tailwindcss/no-arbitrary-value': 'error'
  }
};
