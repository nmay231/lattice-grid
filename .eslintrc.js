module.exports = {
    root: true,
    reportUnusedDisableDirectives: true,
    env: { browser: true, node: true },
    extends: [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        // TODO
        // "plugin:jest/recommended",
        // "plugin:jsx-a11y/recommended",
        "plugin:react-hooks/recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:valtio/recommended",
        "plugin:vitest/all",
        "eslint-config-prettier",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.json"],
        ecmaFeatures: { jsx: true },
    },
    plugins: ["react", "testing-library", "react-refresh"],
    settings: {
        react: { version: "detect" },
    },
    rules: {
        // TODO: Update to the new eslint files so I can restrict vitest lints to only testing files
        // TODO: Besides one or two false positives, I also don't care right now...
        "vitest/require-hook": "off",

        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-empty-interface": ["error", { allowSingleExtends: true }],
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/require-array-sort-compare": "error",
        "@typescript-eslint/restrict-template-expressions": "off",
        "no-trailing-spaces": "error",
        "no-unreachable": "error",
        "no-use-before-define": "off",
        "prefer-const": "warn",
        "react-refresh/only-export-components": "error",
        "react/prop-types": "off",
        "react/react-in-jsx-scope": "off",
        "vitest/max-expects": "off",
        "vitest/no-alias-methods": "off",
        "vitest/no-conditional-expect": "off", // ditto
        "vitest/no-conditional-in-test": "off", // They should be allowed in property-based testing, otherwise, probably not
        "vitest/no-conditional-tests": "off", // ditto
        "vitest/no-hooks": "off",
        "vitest/prefer-called-with": "off",
        "vitest/prefer-lowercase-title": ["error", { ignoreTopLevelDescribe: true }],
        "vitest/prefer-strict-equal": "off",
        "vitest/prefer-to-be-falsy": "off",
        "vitest/prefer-to-be-truthy": "off",
        "@typescript-eslint/no-use-before-define": [
            "error",
            // Setting these to false allow functions of a module or closure to use values that are defined later in the file.
            { variables: false, functions: false, classes: false },
        ],
    },
};
