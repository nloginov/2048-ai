'use strict';

module.exports = {
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2020,
  },
  plugins: ['prettier'],
  extends: ['eslint:recommended', 'prettier'],
  env: {
    es6: true,
    browser: true,
    node: false,
  },
  rules: {
    'prefer-const': 'off', // let has value, too

    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: '*', next: 'block-like' },
      { blankLine: 'always', prev: 'block-like', next: '*' },
      { blankLine: 'always', prev: ['const', 'let'], next: '*' },
      { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
    ],

    'prettier/prettier': [
      'error',
      {
        semi: true,
        trailingComma: 'es5',
        tabWidth: 2,
        singleQuote: true,
      },
    ],
  },
  overrides: [
    {
      files: ['.eslintrc.js'],
      env: {
        browser: false,
        node: true,
      },
      plugins: ['node'],
      rules: Object.assign(
        {},
        require('eslint-plugin-node').configs.recommended.rules,
        {
          // dev only
          'node/no-unpublished-require': 'off',
        }
      ),
    },
  ],
};
