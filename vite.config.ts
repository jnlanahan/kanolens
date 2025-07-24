import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Get directory path with fallback for older Node.js versions
const getDirname = () => {
  try {
    // Try using import.meta.dirname (Node.js 20.11+)
    if (import.meta.dirname) {
      return import.meta.dirname;
    }
  } catch (e) {
    // Ignore error and fall through to alternative methods
  }
  
  try {
    // Fallback: Use import.meta.url with fileURLToPath
    if (import.meta.url) {
      const __filename = fileURLToPath(import.meta.url);
      return path.dirname(__filename);
    }
  } catch (e) {
    console.warn('Failed to get dirname from import.meta.url:', e);
  }
  
  // Last resort: use process.cwd() 
  // This should work in Railway where the build runs from /app
  return process.cwd();
};

const __dirname = getDirname();

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
