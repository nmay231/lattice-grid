module.exports = {
    root: true,
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
        "eslint-config-prettier",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.json"],
        ecmaFeatures: { jsx: true },
    },
    plugins: ["react", "testing-library"],
    settings: {
        react: {
            createClass: "createReactClass", // Regex for Component Factory to use,
            // default to "createReactClass"
            pragma: "React", // Pragma to use, default to "React"
            fragment: "Fragment", // Fragment to use (may be a property of <pragma>), default to "Fragment"
            version: "detect", // React version. "detect" automatically picks the version you have installed.
            // You can also use `16.0`, `16.3`, etc, if you want to override the detected value.
            // It will default to "latest" and warn if missing, and to "detect" in the future
            flowVersion: "0.53", // Flow version
        },
        // propWrapperFunctions: [
        //     // The names of any function used to wrap propTypes, e.g. `forbidExtraProps`. If this isn't set, any propTypes wrapped in a function will be skipped.
        //     "forbidExtraProps",
        //     { property: "freeze", object: "Object" },
        //     { property: "myFavoriteWrapper" },
        //     // for rules that check exact prop wrappers
        //     { property: "forbidExtraProps", exact: true },
        // ],
        // componentWrapperFunctions: [
        //     // The name of any function used to wrap components, e.g. Mobx `observer` function. If this isn't set, components wrapped by these functions will be skipped.
        //     "observer", // `property`
        //     { property: "styled" }, // `object` is optional
        //     { property: "observer", object: "Mobx" },
        //     { property: "observer", object: "<pragma>" }, // sets `object` to whatever value `settings.react.pragma` is set to
        // ],
        // formComponents: [
        //     // Components used as alternatives to <form> for forms, eg. <Form endpoint={ url } />
        //     "CustomForm",
        //     { name: "Form", formAttribute: "endpoint" },
        // ],
        // linkComponents: [
        //     // Components used as alternatives to <a> for linking, eg. <Link to={ url } />
        //     "Hyperlink",
        //     { name: "Link", linkAttribute: "to" },
        // ],
    },
    rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-use-before-define": "error",
        "@typescript-eslint/require-array-sort-compare": "error",
        "@typescript-eslint/restrict-template-expressions": "off",
        "no-trailing-spaces": "error",
        "no-unreachable": "error",
        "no-use-before-define": "off",
        "prefer-const": "warn",
        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off",
    },
};
