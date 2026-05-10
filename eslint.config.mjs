import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // ── TypeScript ────────────────────────────────────────────────────────────
  {
    rules: {
      // Forbid `any`. Use `unknown` or a proper type instead.
      "@typescript-eslint/no-explicit-any": "error",

      // Unused variables are dead weight. Prefix with `_` to opt out.
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
        caughtErrors: "none", // catch (e) {} is fine
      }],

      // Use `import type` for type-only imports — keeps runtime bundles clean.
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "separate-type-imports",
      }],

      // Non-null assertions (`foo!`) hide bugs. Prove safety through types.
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Empty catch blocks swallow errors silently.
      "@typescript-eslint/no-empty-object-type": "error",

      // Avoid unresolved promise floating (common async/await mistake).
      "@typescript-eslint/no-floating-promises": "off", // next.js has many intentional floats

      // ── React ─────────────────────────────────────────────────────────────

      // Hard rule: hooks must follow the rules of hooks.
      "react-hooks/rules-of-hooks": "error",

      // Missing deps cause stale closure bugs.
      "react-hooks/exhaustive-deps": "warn",

      // Unescaped `'` and `"` in JSX are HTML parsing hazards.
      "react/no-unescaped-entities": "error",

      // Fragments with a single child are noise.
      "react/jsx-no-useless-fragment": ["warn", { allowExpressions: true }],

      // Self-closing components are cleaner.
      "react/self-closing-comp": ["warn", { component: true, html: false }],

      // Array index keys cause subtle re-render bugs on reorder/insert.
      "react/no-array-index-key": "warn",

      // ── General JavaScript ────────────────────────────────────────────────

      // `console.*` must not reach production. Use `toast` for user feedback.
      "no-console": "error",

      // Debugger statements must never be committed.
      "no-debugger": "error",

      // Always prefer `const`; use `let` only when reassignment is needed.
      "prefer-const": "error",

      // `var` is banned. Use `const` / `let`.
      "no-var": "error",

      // `==` coercion is a footgun. Always use `===`.
      "eqeqeq": ["error", "always", { null: "ignore" }],

      // Nested ternaries are unreadable. Extract to a variable or condition.
      "no-nested-ternary": "warn",

      // Shadowing outer variables causes confusion in closures.
      "no-shadow": "off", // superseded by @typescript-eslint version
      "@typescript-eslint/no-shadow": ["warn", {
        ignoreTypeValueShadow: true,
        ignoreFunctionTypeParameterNameValueShadow: true,
      }],

      // Duplicate imports should be merged. Use the TypeScript-aware version
      // so `import` + `import type` from the same module is allowed.
      "no-duplicate-imports": "off",
      "@typescript-eslint/no-import-type-side-effects": "error",

      // Unnecessary `else` after a `return` adds nesting for no benefit.
      "no-else-return": ["warn", { allowElseIf: false }],

      // Unreachable code signals a logic error or leftover debug code.
      "no-unreachable": "error",

      // Throw `Error` instances, not raw strings.
      "no-throw-literal": "error",

      // Avoid `alert`, `confirm`, `prompt` — they block the thread.
      "no-alert": "error",
    },
  },

  // ── Lib / pure files (no React, no client-side APIs) ─────────────────────
  {
    files: ["src/**/*.lib.ts"],
    rules: {
      // Lib files must stay pure — no browser globals.
      "no-restricted-globals": ["error",
        { name: "window", message: "Lib files must not access browser globals." },
        { name: "document", message: "Lib files must not access browser globals." },
        { name: "localStorage", message: "Lib files must not access browser globals." },
        { name: "sessionStorage", message: "Lib files must not access browser globals." },
      ],
    },
  },
]);

export default eslintConfig;
