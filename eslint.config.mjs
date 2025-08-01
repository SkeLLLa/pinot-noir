import eslint from '@eslint/js';
import { flatConfigs as importX } from 'eslint-plugin-import-x';
import prettier from 'eslint-plugin-prettier';
import tsdoc from 'eslint-plugin-tsdoc';
import globals from 'globals';
import tseslint, {
  configs as tsConfigs,
  parser as tsParser,
  plugin as tsPlugin,
} from 'typescript-eslint';

export default tseslint.config(
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
  eslint.configs.recommended,
  tsConfigs.strict,
  tsConfigs.stylistic,
  tsConfigs.strictTypeChecked,
  tsConfigs.stylisticTypeChecked,
  importX.recommended,
  importX.typescript,
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier,
      tsdoc,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        createDefaultProgram: true,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'import-x/no-unresolved': 'error',

      'new-cap': [
        'error',
        {
          capIsNewExceptions: ['ObjectId', 'Fastify'],
          capIsNewExceptionPattern: '^Type\\.',
        },
      ],

      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',
      'tsdoc/syntax': 'error',
      'prettier/prettier': 'error',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tsConfigs.disableTypeChecked],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
