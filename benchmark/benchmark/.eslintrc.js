module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: "latest",
    },
    env: {
        node: true,
        es6: true,
    },
    rules: {
        "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
        "no-dupe-keys": "error",
        "no-duplicate-case": "error",
        "no-empty": ["error", {"allowEmptyCatch": true}],
        "no-ex-assign": "error",
        "no-extra-boolean-cast": "error",
        "no-extra-semi": "error",
        curly: "error",
        quotes: ["error", "double"],
    },
};
