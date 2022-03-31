module.exports = {
    root: true,
    env: {
        es6: true,
        node: true
    },
    extends: [
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
    ],
    plugins: ['prettier', 'import'],
    rules: {
        'prettier/prettier': 'error',
        'no-unused-vars': 'off',
        'import/order': ['warn', { alphabetize: { order: 'asc' } }],
    },
    parserOptions: {
        parser: "@typescript-eslint/parser",
        ecmaVersion: 2022
    }
}

