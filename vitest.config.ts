import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

const stubCss = fileURLToPath(
  new URL("./src/ui/node-graph/__xyflow-stub.css", import.meta.url),
);

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      // Test-only stub for @xyflow/react
      {
        find: /^@xyflow\/react$/,
        replacement: fileURLToPath(
          new URL("./src/ui/node-graph/__xyflow-stub.ts", import.meta.url),
        ),
      },
      // Mock the CSS import that vitest can't resolve
      { find: /^@xyflow\/react\/dist\/style\.css$/, replacement: stubCss },
      // Mock xterm CSS
      { find: /^@xterm\/xterm\/css\/xterm\.css$/, replacement: stubCss },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/testing/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
