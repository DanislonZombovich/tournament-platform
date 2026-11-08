import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const configs = [...nextVitals, ...nextTs];

for (const config of configs) {
  if (config.plugins?.["react-hooks"]) {
    config.rules = {
      ...config.rules,
      "react-hooks/set-state-in-effect": "warn",
    };
  }
}

const eslintConfig = defineConfig([
  ...configs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dist-tests/**",
    ".data/**",
    ".open-next/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@next/next/no-html-link-for-pages": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
]);

export default eslintConfig;
