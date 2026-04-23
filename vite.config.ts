import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

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
    
    // Bundle optimization settings
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Core vendor libraries
          vendor: ['react', 'react-dom'],
          // UI component libraries
          'ui-core': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'ui-extras': ['@radix-ui/react-tooltip', '@radix-ui/react-popover', '@radix-ui/react-toast'],
          // Routing and state management
          routing: ['wouter'],
          query: ['@tanstack/react-query'],
          // Form handling
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Utilities
          utils: ['clsx', 'tailwind-merge', 'date-fns'],
          // Heavy libraries (only loaded when needed)
          charts: ['recharts'],
          export: ['xlsx', 'pptxgenjs'],
          // Icons
          icons: ['lucide-react', 'react-icons']
        },
        // Add hash to chunk names for cache busting
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType ?? '')) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType ?? '')) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    
    // Build performance settings
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug'] : []
      }
    },
    
    // Size warnings
    chunkSizeWarningLimit: 512, // Warn for chunks over 512KB
    
    // Source maps for production debugging (optional)
    sourcemap: process.env.NODE_ENV !== 'production'
  },
});
