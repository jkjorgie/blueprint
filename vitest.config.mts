import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      // fileURLToPath, not URL.pathname: the latter percent-encodes spaces in
      // the project path and the alias silently stops resolving.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
