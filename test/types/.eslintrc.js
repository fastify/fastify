module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'standard',
    // 'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parser: `@typescript-eslint/parser`,
  parserOptions: {
    project: `./test/types/tsconfig.json`,
  },
  rules: {
    '@typescript-eslint/require-await': 0,
  },
};
