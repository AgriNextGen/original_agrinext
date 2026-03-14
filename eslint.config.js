import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "src/integrations/supabase/types.ts",
      "src/components/ui/**",
      "tests/**",
      "supabase/**",
      "tailwind.config.ts",
      "web/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Warn on unused variables (use _ prefix to explicitly ignore: _unused)
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      // TypeScript strict mode is intentionally OFF project-wide; any is used extensively
      "@typescript-eslint/no-explicit-any": "warn",
      // Intentional empty catch blocks are used for localStorage/network error swallowing
      "no-empty": ["error", { "allowEmptyCatch": true }],
    },
  },
);
