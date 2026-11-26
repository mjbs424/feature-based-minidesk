import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, lazyPlugins } from "vite-plus";
import { fileURLToPath } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    open: true,
    proxy: { "/api": "http://127.0.0.1:3100" },
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["src/routes/routeTree.gen.ts", ".agents/skills/**"],
  },
  lint: {
    ignorePatterns: [".agents/skills/**"],
    plugins: ["react", "typescript", "oxc"],
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "boundaries", specifier: "eslint-plugin-boundaries" },
    ],
    settings: {
      // Resolved package files must be included so they are not mistaken for ignored local files.
      "boundaries/include": ["src/**/*", "node_modules/**/*", "node_modules/.pnpm/**/*"],
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
      "boundaries/no-ignored-dependencies": "error",
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
  plugins: lazyPlugins(() => [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      generatedRouteTree: "./src/routes/routeTree.gen.ts",
      routeFileIgnorePattern: "routeTree.gen.ts",
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    ...(!process.env.CI && !process.env.VERCEL
      ? [
          visualizer({
            filename: ".bundle-analysis/report.html",
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ]),
});
