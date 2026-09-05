import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      include: ["src/lib/**", "src/components/**", "src/routes/**", "src/hooks/**"],
      exclude: ["src/test-setup.ts", "src/main.tsx"],
      thresholds: {
        lines: 35,
        statements: 35,
      },
    },
  },
});
