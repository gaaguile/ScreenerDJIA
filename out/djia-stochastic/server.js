"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dotenv_1 = require("dotenv");
dotenv_1.default.config();
// ── Config ───────────────────────────────────────────────────────────────────
const PORT = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3001;
// ~13 months of daily bars → ~57 weekly candles (well above 20 needed for 14,3,3)
const FROM_TS = Math.floor(Date.now() / 1000 - 400 * 24 * 3600);
const TO_TS = Math.floor(Date.now() / 1000);
// ── Server ───────────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
// Allow requests from the Vite dev server
app.use((_, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    next();
});
/**
 * GET /api/candle?symbol=AAPL
 *
 * Fetches daily OHLC from Yahoo Finance — no API key required,
 * no CORS issue (Node.js talks to Yahoo directly, browser never does).
 *
 * Returns: { s: "ok"|"no_data", bars: OHLCBar[] }
 */
app.get("/api/candle", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const { symbol } = req.query;
    if (!symbol) {
        res.status(400).json({ error: "symbol query param is required" });
        return;
    }
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
        `?interval=1d&period1=${FROM_TS}&period2=${TO_TS}&events=none`;
    try {
        const upstream = yield fetch(url, {
            headers: {
                // Yahoo sometimes blocks requests without a User-Agent header
                "User-Agent": "Mozilla/5.0 (compatible; DJIA-Screener/1.0)",
            },
        });
        if (!upstream.ok) {
            res
                .status(upstream.status)
                .json({ error: `Yahoo Finance returned ${upstream.status}` });
            return;
        }
        const json = yield upstream.json();
        const result = (_b = (_a = json === null || json === void 0 ? void 0 : json.chart) === null || _a === void 0 ? void 0 : _a.result) === null || _b === void 0 ? void 0 : _b[0];
        if (!result) {
            res.json({ s: "no_data", bars: [] });
            return;
        }
        const timestamps = (_c = result.timestamp) !== null && _c !== void 0 ? _c : [];
        const q = (_f = (_e = (_d = result.indicators) === null || _d === void 0 ? void 0 : _d.quote) === null || _e === void 0 ? void 0 : _e[0]) !== null && _f !== void 0 ? _f : {};
        const bars = timestamps
            .map((ts, i) => {
            var _a, _b, _c;
            return ({
                date: new Date(ts * 1000).toISOString().slice(0, 10),
                high: (_a = q.high) === null || _a === void 0 ? void 0 : _a[i],
                low: (_b = q.low) === null || _b === void 0 ? void 0 : _b[i],
                close: (_c = q.close) === null || _c === void 0 ? void 0 : _c[i],
            });
        })
            .filter((b) => b.high != null && b.low != null && b.close != null);
        res.json({ s: "ok", bars });
    }
    catch (err) {
        console.error(`[${symbol}] fetch error:`, err);
        res.status(502).json({ error: "Failed to reach Yahoo Finance" });
    }
}));
// Health check
app.get("/api/health", (_, res) => res.json({ ok: true }));
app.listen(PORT, () => {
    console.log(`✅  API server running at http://localhost:${PORT}`);
    console.log(`    No API key needed — using Yahoo Finance`);
});
//# sourceMappingURL=server.js.map