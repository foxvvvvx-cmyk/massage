import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: projectRoot,
});

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".netlify/**",
      ".npm-cache/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**",
      "supabase/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "@next/next/no-assign-module-variable": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/prefer-as-const": "warn",
      "prefer-const": "warn",
      "react/jsx-no-comment-textnodes": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default eslintConfig;
