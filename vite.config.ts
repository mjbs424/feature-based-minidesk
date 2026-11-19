import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig, lazyPlugins } from "vite-plus";

// https://vite.dev/config/
export default defineConfig({
  server: {
    open: true,
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    plugins: ["react", "typescript", "oxc"],
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "boundaries", specifier: "eslint-plugin-boundaries" },
    ],
    settings: {
      "boundaries/include": ["src/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app", partialMatch: false },
        { type: "routes", pattern: "src/routes", partialMatch: false },
        {
          type: "feature",
          pattern: "src/features/*",
          partialMatch: false,
          capture: ["feature"],
        },
        { type: "shared", pattern: "src/shared", partialMatch: false },
        { type: "i18n", pattern: "src/i18n", partialMatch: false },
        { type: "styles", pattern: "src/styles", partialMatch: false },
      ],
      "import/resolver": { typescript: { project: "./tsconfig.app.json" } },
    },
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
      "boundaries/no-unknown-files": "error",
      "boundaries/no-unknown-dependencies": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: {
                to: { element: { type: ["app", "routes", "feature", "shared", "i18n", "styles"] } },
              },
            },
            {
              from: { element: { type: "routes" } },
              allow: {
                to: { element: { type: ["routes", "feature", "shared", "i18n", "styles"] } },
              },
            },
            {
              from: { element: { type: "feature" } },
              allow: {
                to: [
                  {
                    element: {
                      type: "feature",
                      captured: { feature: "{{ from.element.captured.feature }}" },
                    },
                  },
                  { element: { type: ["shared", "i18n", "styles"] } },
                ],
              },
            },
            {
              from: { element: { type: ["shared", "i18n", "styles"] } },
              allow: { to: { element: { type: ["shared", "i18n", "styles"] } } },
            },
          ],
        },
      ],
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  plugins: lazyPlugins(() => [react(), babel({ presets: [reactCompilerPreset()] })]),
});
