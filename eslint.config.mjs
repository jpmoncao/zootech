import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".ai-context/**",
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/next-env.d.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
