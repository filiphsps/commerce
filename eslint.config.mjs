import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import nextVitals from 'eslint-config-next/core-web-vitals';
import jsdoc from 'eslint-plugin-jsdoc';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactCompiler from 'eslint-plugin-react-compiler';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
});

const APP_GLOBS = [
    'apps/admin/**/*.{ts,tsx,js,jsx,mjs,cjs}',
    'apps/landing/**/*.{ts,tsx,js,jsx,mjs,cjs}',
    'apps/storefront/**/*.{ts,tsx,js,jsx,mjs,cjs}',
];

const NON_APP_GLOBS = ['packages/**/*.{ts,tsx,js,jsx,mjs,cjs}', '*.{ts,tsx,js,jsx,mjs,cjs}'];

const tsLanguageOptions = {
    parser: tsParser,
    parserOptions: {
        projectService: {
            allowDefaultProject: [
                'eslint.config.{ts,mts,cts,js,mjs,cjs}',
                'vitest.config.{ts,mts,cts}',
                'vitest.workspace.{ts,mts,cts}',
                'apps/*/vitest.config.{ts,mts,cts}',
                'apps/storefront/sentry.client.config.{ts,mts,cts}',
            ],
        },
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
        ecmaVersion: 'latest',
    },
};

const sharedRules = {
    '@typescript-eslint/consistent-type-exports': ['error', { fixMixedExportsWithInlineTypeSpecifier: false }],
    '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports', prefer: 'type-imports' },
    ],
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'consistent-return': 'error',
    indent: 'off',
    'jsdoc/check-alignment': 'error',
    'jsdoc/check-indentation': 'off',
    'jsdoc/check-line-alignment': 'error',
    'jsdoc/check-param-names': 'error',
    'jsdoc/check-property-names': 'error',
    'jsdoc/check-syntax': 'error',
    'jsdoc/check-types': 'error',
    'jsdoc/require-hyphen-before-param-description': 'error',
    'jsx-a11y/alt-text': 'off',
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/interactive-supports-focus': 'off',
    'no-console': ['error', { allow: ['debug', 'warn', 'error'] }],
    'no-mixed-operators': 'off',
    'no-unused-vars': 'off',
    'no-useless-constructor': 'off',
    'prettier/prettier': 'error',
    'react/jsx-uses-react': 'off',
    'react/no-children-prop': 'off',
    'react/no-find-dom-node': 'off',
    'react/no-string-refs': 'off',
    'react/prop-types': 'error',
    'react/react-in-jsx-scope': 'off',
    'react/display-name': 'off',
    semi: ['error', 'always'],
    'sort-imports': 'off',
    'simple-import-sort/exports': 'error',
    'simple-import-sort/imports': [
        'error',
        {
            groups: [
                ['server-only'],
                ['^\\u0000', 'vitest', '^.+\\.s?css$'],
                ['^node:', '^react', '^/next'],
                ['^@nordcom(/.*|$)'],
                ['^@/\\w', '^'],
                ['^@/components(/.*|$)'],
                ['^\\.\\.(?!/?$)'],
                ['^\\.', '^\\./?$'],
                ['^.+\\u0000$', '^.+\\u0000$\\.'],
            ],
        },
    ],
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
        'warn',
        {
            vars: 'all',
            varsIgnorePattern: '^_',
            args: 'after-used',
            argsIgnorePattern: '^_',
        },
    ],
};

const extraPlugins = {
    jsdoc,
    'simple-import-sort': simpleImportSort,
    'unused-imports': unusedImports,
};

export default [
    {
        ignores: [
            '**/node_modules/**',
            '**/.next/**',
            '**/.turbo/**',
            '**/.vitest/**',
            '**/.now/**',
            '**/build/**',
            '**/coverage/**',
            '**/dist/**',
            '**/storybook-static/**',
            '**/public/**',
            '**/*.lock',
            '**/*.env',
            '**/*.log',
            '**/*.bak',
            '**/*.d.ts',
            '**/vitest.setup.ts',
            '**/next.config.*',
            '**/tailwind.config.*',
            '**/postcss.config.*',
            '**/next-env.d.ts',
        ],
    },

    prettierRecommended,

    // Apps: plugins (react, jsx-a11y, @typescript-eslint, @next/next) come from next vitals.
    ...nextVitals.map((c) => ({ ...c, files: APP_GLOBS })),
    {
        files: APP_GLOBS,
        languageOptions: tsLanguageOptions,
        plugins: extraPlugins,
        settings: { react: { version: 'detect' } },
        rules: { ...sharedRules, '@next/next/no-html-link-for-pages': 'off' },
    },

    // Non-apps: legacy plugin extends provide react + jsx-a11y plugins.
    ...compat
        .extends('plugin:react/recommended', 'plugin:jsx-a11y/recommended')
        .map((c) => ({ ...c, files: NON_APP_GLOBS })),
    {
        files: NON_APP_GLOBS,
        languageOptions: tsLanguageOptions,
        plugins: { '@typescript-eslint': tseslintPlugin, ...extraPlugins },
        settings: { react: { version: 'detect' } },
        rules: sharedRules,
    },

    {
        files: ['apps/admin/**/*.{ts,tsx}'],
        rules: {
            'react/prop-types': 'off',
            'jsx-a11y/heading-has-content': 'off',
        },
    },

    {
        files: ['apps/storefront/**/*.{ts,tsx}'],
        plugins: { 'react-compiler': reactCompiler },
        rules: { 'react-compiler/react-compiler': 'warn' },
    },

    // New strict rules from eslint-plugin-react-hooks v7 / Next 16. The codebase predates them;
    // downgrade to warnings so lint passes while the team migrates incrementally.
    {
        files: APP_GLOBS,
        rules: {
            'react-hooks/error-boundaries': 'warn',
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/purity': 'warn',
            'react-hooks/immutability': 'warn',
            'react-hooks/refs': 'warn',
            'react-hooks/use-memo': 'warn',
        },
    },
];
