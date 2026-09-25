import nextVitals from "eslint-config-next/core-web-vitals";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = [
  {
    // Generated/vendored output, not project source - `eslint .` has no
    // default ignores for these, so it was linting minified Playwright
    // trace-viewer bundles as if they were our code.
    ignores: ["playwright-report/**", "test-results/**", ".playwright-mcp/**"]
  },
  ...nextVitals,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      ...jsxA11y.configs.recommended.rules
    }
  }
];

export default eslintConfig;