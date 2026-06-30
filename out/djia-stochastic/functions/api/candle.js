"use strict";
// functions/api/candle.ts
// Cloudflare Pages Function — runs on the edge, no CORS issues.
// Replaces the Express server entirely.
//
// Route: GET /api/candle?symbol=AAPL
// Returns: { s: "ok" | "no_data", bars: OHLCBar[] }
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRequest = void 0;
// ~13 months of daily bars → ~57 weekly candles
// More than enough for Full Stochastic (14,3,3) which needs ≥20 weekly bars
const FROM_TS = () => Math.floor(Date.now() / 1000 - 400 * 24 * 3600);
const TO_TS = () => Math.floor(Date.now() / 1000);
const onRequest = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const url = new URL(ctx.request.url);
    const symbol = url.searchParams.get("symbol");
    // ── Validation ──────────────────────────────────────────────────────────────
    if (!symbol) {
        return Response.json({ error: "symbol query param is required" }, { status: 400 });
    }
    // ── Fetch from Yahoo Finance ─────────────────────────────────────────────────
    // Node.js / edge fetch → no CORS restriction
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
        `?interval=1d&period1=${FROM_TS()}&period2=${TO_TS()}&events=none`;
    let upstream;
    try {
        upstream = yield fetch(yahooUrl, {
            headers: {
                // Yahoo sometimes blocks headless requests without a User-Agent
                "User-Agent": "Mozilla/5.0 (compatible; DJIA-Screener/1.0)",
            },
        });
    }
    catch (_f) {
        return Response.json({ error: "Failed to reach Yahoo Finance" }, { status: 502 });
    }
    if (!upstream.ok) {
        return Response.json({ error: `Yahoo Finance returned ${upstream.status}` }, { status: upstream.status });
    }
    // ── Parse Yahoo response ─────────────────────────────────────────────────────
    const json = yield upstream.json();
    const result = (_a = json === null || json === void 0 ? void 0 : json.chart) === null || _a === void 0 ? void 0 : _a.result;
    if (!(result === null || result === void 0 ? void 0 : result[0])) {
        return Response.json({ s: "no_data", bars: [] });
    }
    const r = result[0];
    const timestamps = ((_b = r.timestamp) !== null && _b !== void 0 ? _b : []);
    const q = (_e = (_d = (_c = r.indicators) === null || _c === void 0 ? void 0 : _c.quote) === null || _d === void 0 ? void 0 : _d[0]) !== null && _e !== void 0 ? _e : {};
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
    return Response.json({ s: "ok", bars });
});
exports.onRequest = onRequest;
//# sourceMappingURL=candle.js.map