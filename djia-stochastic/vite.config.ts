import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In production, Cloudflare Pages routes /api/* to functions/api/*.ts automatically.
// In local dev, run: npx wrangler pages dev dist --port 8788
// Wrangler serves both the built frontend and the Pages Functions together,
// so no manual proxy is needed here.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
