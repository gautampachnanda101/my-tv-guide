const stylelintConfig = {
  extends: ["stylelint-config-standard"],
  rules: {
    "alpha-value-notation": null,
    "color-function-alias-notation": null,
    "color-function-notation": null,
    "color-hex-length": null,
    "no-descending-specificity": null,
    // CSS Modules classes are named camelCase throughout this codebase so
    // they match the `styles.someClass` property access used in JS/JSX -
    // kebab-case would break that convention, not fix it.
    "selector-class-pattern": null,
    "keyframes-name-pattern": null,
    // `background-color` is an intentional fallback declared just before a
    // gradient `background` shorthand, not an accidental override.
    "declaration-block-no-shorthand-property-overrides": null
  }
};

export default stylelintConfig;