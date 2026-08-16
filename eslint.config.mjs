import nextVitals from "eslint-config-next/core-web-vitals";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = [
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