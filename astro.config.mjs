import { defineConfig } from "astro/config";

export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  output: "static",
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
  vite: {
    server: {
      strictPort: true,
    },
  },
});
