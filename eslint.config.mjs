import { createRequire } from "node:module";
const require = createRequire(
  new URL("./frontend/package.json", import.meta.url),
);
const js = require("@eslint/js");
const ts = require("typescript-eslint");
const angular = require("angular-eslint");
const globals = require("globals");

export default ts.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.angular/**",
      "**/bin/**",
      "**/obj/**",
      "**/.idea/**",
      "artifacts/**",
      "output/**",
      "tmp/**",
    ],
  },
  {
    files: ["**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ["frontend/**/*.ts"],
    extends: [
      js.configs.recommended,
      ...ts.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
  },
  {
    files: ["frontend/**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
  },
);
