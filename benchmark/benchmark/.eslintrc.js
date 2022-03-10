module.exports = {
    root: true,
    env: {
        node: true
    },
    extends: ["plugin:vue/essential", "@vue/prettier", "@vue/typescript"],
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
        "no-dupe-keys": "error",
        "no-duplicate-case": "error",
        "no-empty": ["error", {"allowEmptyCatch": true}],
        "no-ex-assign": "error",
        "no-extra-boolean-cast": "error",
        "no-extra-semi": "error",
        "curly": "error"
    },
    parserOptions: {
        parser: "@typescript-eslint/parser"
    }
}
