import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import topLevelAwait from "vite-plugin-top-level-await";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tsconfigPaths(), topLevelAwait()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host ?? false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    // Enhanced code splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor libraries
          "vendor-core": ["react", "react-dom"],
          
          // UI component library (radix-ui)
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-select"],
          
          // Workspace-specific heavy modules — split from main bundle
          "workspace-surfaces": [
            "./src/ui/workspace/surfaces/dashboard",
            "./src/ui/workspace/surfaces/memory-browser",
            "./src/ui/workspace/surfaces/worker-explorer",
            "./src/ui/workspace/surfaces/session-viewer",
            "./src/ui/workspace/surfaces/runtime-monitor",
            "./src/ui/workspace/surfaces/cost-dashboard",
            "./src/ui/workspace/surfaces/metrics",
            "./src/ui/workspace/surfaces/prompt-inspector",
            "./src/ui/workspace/surfaces/plugin-manager",
            "./src/ui/workspace/surfaces/task-board",
            "./src/ui/workspace/surfaces/template-gallery",
          ],
          
          // Canvas view panels — lazy loaded surfaces
          "workspace-panels": [
            "./src/ui/workspace/canvas-views/panels/unified-search",
            "./src/ui/workspace/canvas-views/panels/workspace-dashboard",
            "./src/ui/workspace/canvas-views/panels/memory-graph",
            "./src/ui/workspace/canvas-views/panels/knowledge-graph",
            "./src/ui/workspace/canvas-views/panels/causal-trace",
            "./src/ui/workspace/canvas-views/panels/session-timeline",
            "./src/ui/workspace/canvas-views/panels/vector-explorer",
            "./src/ui/workspace/canvas-views/panels/query-playground",
          ],
        },
      },
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
});

