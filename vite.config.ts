import { defineConfig, loadEnv, type UserConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { devtools } from "@tanstack/devtools-vite";

// Plain, fully-owned Vite config — previously this project depended on
// @lovable.dev/vite-tanstack-config, a third-party npm package that silently
// wired up every plugin below (plus Lovable-sandbox-only behavior we never
// use, like their preview asset proxy and build diagnostics). That meant the
// actual build configuration lived outside this repo and outside our
// control. This file reproduces the same plugin pipeline explicitly, minus
// the Lovable-sandbox-only pieces, so every option here is visible and
// editable directly.
export default defineConfig(({ command, mode }) => {
  const isDevBuild = command === "build" && mode === "development";

  // Vite already exposes VITE_* vars via import.meta.env at runtime; this
  // additionally inlines them as define()'d string literals, which is what
  // lets server-side code (outside Vite's client env handling) read them too.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  const config: UserConfig = {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
      watch: {
        // Avoids double-triggering HMR when an editor writes a file in
        // multiple quick flushes (save + formatter, etc.).
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
      },
    },
    plugins: [
      ...(mode === "development"
        ? [
            devtools({
              logging: false,
              eventBusConfig: { enabled: false },
              enhancedLogs: { enabled: false },
              consolePiping: { enabled: false },
              removeDevtoolsOnBuild: false,
              injectSource: { enabled: true },
            }),
          ]
        : []),
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      // Redirects TanStack Start's bundled server entry to src/server.ts
      // (our SSR error-handling wrapper).
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      // Nitro only runs at build time. Its own `defaultPreset` mechanism
      // auto-detects the target platform (Vercel, Netlify, Cloudflare
      // Pages/Workers) from the build environment, falling back to
      // cloudflare-module when nothing is detected (e.g. building locally).
      ...(command === "build" ? [nitro({ defaultPreset: "cloudflare-module" })] : []),
      viteReact(),
    ],
  };

  if (isDevBuild) {
    config.environments = { client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } } };
  }

  return config;
});
