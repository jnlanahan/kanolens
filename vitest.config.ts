import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["server/**/*.{test,spec}.ts", "src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".preserve", "tests/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
