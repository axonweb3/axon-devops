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
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
        "no-unused-vars": 2,
        "no-use-before-define": 2,
        "linebreak-style": [2, "unix"],
        "quotes": ["error", "single"],
        "semi": ["error", "always"],
        "curly": ["error", "all"],
        "no-dupe-keys": "error",
        "no-duplicate-case": "error",
        "no-empty": ["error", {"allowEmptyCatch": true}],
        "no-ex-assign": "error",
        "no-extra-boolean-cast": "error",
        "no-extra-semi": "error",
        "curly": "error"
    },
    parserOptions: {
        parser: "@typescript-eslint/parser",
        ecmaVersion: 2018
    }
}

