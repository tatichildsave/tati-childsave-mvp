import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteTailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    // TanStack Router plugin (for route code generation)
    TanStackRouterVite(),
    // TanStack Start Vite plugin (for SSR and dev server)
    tanstackStart(),
    // Vite React plugin for JSX
    react(),
    // Tailwind CSS Vite plugin
    viteTailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
    tsconfigPaths: true,
  },
  server: {
    host: "localhost",
    port: 3000,
    strictPort: true,
    middlewareMode: false,
  },
  build: {
    target: "es2020",
  },
  ssr: {
    external: ["firebase-admin"],
  },
});
