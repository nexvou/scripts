module.exports = {
    root: true,
    env: {
        node: true,
        es2021: true,
        browser: true,
    },
    extends: ['eslint:recommended'],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    rules: {
        'no-console': 'off',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'prefer-const': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'prefer-arrow-callback': 'error',
        quotes: ['error', 'single', { avoidEscape: true }],
        semi: ['error', 'always'],
        'comma-dangle': ['error', 'always-multiline'],
        indent: ['error', 2],
        'max-len': ['error', { code: 100, ignoreUrls: true, ignoreStrings: true }],
    },
};
