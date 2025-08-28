import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import pluginSecurity from 'eslint-plugin-security';

export default [

  //  TypeScript rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.test.js',
      '**/*.spec.js',
    ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json', // enables type-aware linting
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      security: pluginSecurity,
    },
    rules: {
      // TypeScript recommended + strict
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs.strict.rules,

      // Strong safety checks
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',

      // General JS best practices
      'prefer-const': 'error',
      'no-var': 'error',
      'no-undef': 'off', // handled by TS

      //  Security checks
      'security/detect-eval-with-expression': 'error',
      'security/detect-object-injection': 'warn',
      'security/detect-child-process': 'error',
    },
  },

  // Looser rules for scripts
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },

  // Ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.js',
      'logs/**',
      'uploads/**',
      'coverage/**',
      '**/*.d.ts',
    ],
  },

  // ✅ Prettier last to disable conflicting rules
  prettier,
];
