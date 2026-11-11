import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
// import css from "@eslint/css";
import { defineConfig, includeIgnoreFile } from "eslint/config";
import eslintPluginAstro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { fileURLToPath } from "node:url";

// `studio/` installs separately but is linted from here, so its .gitignore has
// to be read as well: ESLint only knows what this config hands it, and
// `studio/.sanity/` — the runtime Sanity generates — is listed in the Studio's
// file, not in the root one. `gitignoreResolution` resolves each file's
// patterns against its own directory.
const gitignorePaths = [".gitignore", "studio/.gitignore"].map((p) =>
  fileURLToPath(new URL(p, import.meta.url)),
);

export default defineConfig([
  ...includeIgnoreFile(gitignorePaths, { gitignoreResolution: true }),
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  tseslint.configs.recommended,
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.jsonc"],
    plugins: { json },
    language: "json/jsonc",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.json5"],
    plugins: { json },
    language: "json/json5",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },
  // { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
  jsxA11y.flatConfigs.recommended,
  ...eslintPluginAstro.configs.recommended,
]);
