"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = require("@vitejs/plugin-react");
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    server: {
        port: 5173,
        proxy: {
            // All /api/* requests are forwarded to the Express server.
            // The browser never touches the Express server directly — no CORS.
            "/api": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
        },
    },
});
//# sourceMappingURL=vite.config.js.map