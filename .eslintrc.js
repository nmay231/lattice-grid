// eslint-disable-next-line unicorn/prefer-module
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
        "plugin:sonarjs/recommended-legacy",
        "plugin:unicorn/recommended",
        "eslint-config-prettier",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.json"],
        ecmaFeatures: { jsx: true },
    },
    plugins: ["react", "react-refresh", "sonarjs", "testing-library", "unicorn", "import"],
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
        "no-useless-rename": "error",
        "prefer-const": "warn",
        "prefer-exponentiation-operator": "error",
        "react-refresh/only-export-components": "error",
        "react/prop-types": "off",
        "react/react-in-jsx-scope": "off",
        "sonarjs/no-duplicate-string": "off",
        "sonarjs/no-inverted-boolean-check": "error",
        "sonarjs/prefer-immediate-return": "off",
        "unicorn/catch-error-name": "off",
        "unicorn/consistent-function-scoping": ["error", { checkArrowFunctions: false }],
        "unicorn/filename-case": ["error", { cases: { camelCase: true, pascalCase: true } }],
        "unicorn/no-array-callback-reference": "warn",
        "unicorn/no-array-reduce": "warn",
        "unicorn/no-null": "off",
        "unicorn/prefer-set-has": "off",
        "unicorn/prefer-switch": "off",
        "unicorn/prefer-ternary": ["error", "only-single-line"],
        "unicorn/prevent-abbreviations": "off",
        "vitest/max-expects": "off",
        "vitest/no-alias-methods": "off",
        "vitest/no-conditional-expect": "off", // ditto
        "vitest/no-conditional-in-test": "off", // They should be allowed in property-based testing, otherwise, probably not
        "vitest/no-conditional-tests": "off", // ditto
        "vitest/no-hooks": "off",
        "vitest/prefer-called-with": "off",
        "vitest/prefer-expect-assertions": "off",
        "vitest/prefer-lowercase-title": ["error", { ignoreTopLevelDescribe: true }],
        "vitest/prefer-strict-equal": "off",
        "vitest/prefer-to-be-falsy": "off",
        "vitest/prefer-to-be-truthy": "off",

        // Multiline rules to make sorting lines easier
        "import/no-extraneous-dependencies": [
            "error",
            {
                devDependencies: [
                    "**/*.test.[tj]s",
                    "src/testing-utils/*.ts",
                    "playwright.config.ts",
                ],
            },
        ],
        "@typescript-eslint/no-use-before-define": [
            "error",
            // Setting these to false allow functions of a module or closure to use values that are defined later in the file.
            { variables: false, functions: false, classes: false },
        ],
    },
};
