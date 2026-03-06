module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: ['airbnb-base', 'prettier'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['airbnb-base', 'prettier'],
      rules: {
        'no-plusplus': 'off',
        'no-param-reassign': 'off',
        'no-restricted-syntax': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  rules: {},
};
