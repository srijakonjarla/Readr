import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat();

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Apostrophes and quotes inside JSX text are fine as-is.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
