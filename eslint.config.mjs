import eslintConfig from '@skellla/lint-config/eslint';

export default [
  {
    ignores: [
      '**/logs/',
      '**/coverage/',
      '**/node_modules/',
      '**/.vscode/',
      '**/*.xxx.*',
      '**/dist/',
      'examples/**/*',
    ],
  },
  ...eslintConfig,
];
