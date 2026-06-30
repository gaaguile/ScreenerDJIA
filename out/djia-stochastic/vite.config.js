"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = require("@vitejs/plugin-react");
// In production, Cloudflare Pages routes /api/* to functions/api/*.ts automatically.
// In local dev, run: npx wrangler pages dev dist --port 8788
// Wrangler serves both the built frontend and the Pages Functions together,
// so no manual proxy is needed here.
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    build: {
        outDir: "dist",
    },
});
//# sourceMappingURL=vite.config.js.map