// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["examples/**/*.ts"],
    rules: {
      // Demo scripts intentionally keep every test callback's signature
      // consistently async, even where a given check happens to be sync.
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      // Test files intentionally cast mock objects loosely.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "off",
      // `expect(http.get).toHaveBeenCalledWith(...)` — a vi.fn() property
      // read off a mocked HttpClient object — is the standard vitest mock
      // pattern used throughout this suite; unbound-method's "this could
      // be unintentionally rebound" warning does not apply to a `vi.fn()`.
      "@typescript-eslint/unbound-method": "off",
      // Mock implementations often must stay `async` to satisfy the mocked
      // method's Promise-returning type, even without an internal `await`.
      "@typescript-eslint/require-await": "off",
    },
  },
);
