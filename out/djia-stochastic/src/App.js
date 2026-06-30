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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
// ── Constants ────────────────────────────────────────────────────────────────
// DJIA 30 as of June 2026: INTC→NVDA, DOW→SHW, VZ→GOOGL
const DJIA_TICKERS = [
    "AAPL",
    "AMGN",
    "AXP",
    "BA",
    "CAT",
    "CRM",
    "CSCO",
    "CVX",
    "DIS",
    "GS",
    "HD",
    "HON",
    "IBM",
    "JNJ",
    "JPM",
    "KO",
    "MCD",
    "MMM",
    "MRK",
    "MSFT",
    "NKE",
    "NVDA",
    "PG",
    "SHW",
    "TRV",
    "UNH",
    "V",
    "WMT",
    "AMZN",
    "GOOGL",
];
const COMPANY_NAMES = {
    AAPL: "Apple",
    AMGN: "Amgen",
    AXP: "American Express",
    BA: "Boeing",
    CAT: "Caterpillar",
    CRM: "Salesforce",
    CSCO: "Cisco",
    CVX: "Chevron",
    DIS: "Disney",
    GS: "Goldman Sachs",
    HD: "Home Depot",
    HON: "Honeywell",
    IBM: "IBM",
    JNJ: "Johnson & Johnson",
    JPM: "JPMorgan Chase",
    KO: "Coca-Cola",
    MCD: "McDonald's",
    MMM: "3M",
    MRK: "Merck",
    MSFT: "Microsoft",
    NKE: "Nike",
    NVDA: "Nvidia",
    PG: "Procter & Gamble",
    SHW: "Sherwin-Williams",
    TRV: "Travelers",
    UNH: "UnitedHealth",
    V: "Visa",
    WMT: "Walmart",
    AMZN: "Amazon",
    GOOGL: "Alphabet",
};
// ~13 months of daily bars → ~57 weekly candles, well above the 20 needed for (14,3,3)
const FROM_TS = Math.floor(Date.now() / 1000 - 400 * 24 * 3600);
const TO_TS = Math.floor(Date.now() / 1000);
// ── Weekly aggregation from daily bars ───────────────────────────────────────
function aggregateDailyToWeekly(daily) {
    const weeks = new Map();
    for (const bar of daily) {
        const d = new Date(bar.date + "T12:00:00Z");
        const day = d.getUTCDay(); // 0 = Sun
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // rewind to Monday
        const mon = new Date(d);
        mon.setUTCDate(diff);
        const key = mon.toISOString().slice(0, 10);
        if (!weeks.has(key))
            weeks.set(key, { highs: [], lows: [], closes: [], lastDate: bar.date });
        const w = weeks.get(key);
        w.highs.push(bar.high);
        w.lows.push(bar.low);
        w.closes.push(bar.close);
        w.lastDate = bar.date; // last entry = Friday
    }
    return [...weeks.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, w]) => ({
        date: w.lastDate,
        high: Math.max(...w.highs),
        low: Math.min(...w.lows),
        close: w.closes.at(-1),
    }));
}
// ── Full Stochastic (14,3,3) — computed locally ───────────────────────────────
// Raw %K  = (Close − LowestLow₁₄)  / (HighestHigh₁₄ − LowestLow₁₄) × 100
// Slow %K = SMA(rawK, 3)
// %D      = SMA(slowK, 3)
function sma(arr, period) {
    const out = [];
    for (let i = period - 1; i < arr.length; i++) {
        const slice = arr.slice(i - period + 1, i + 1);
        out.push(slice.reduce((a, b) => a + b, 0) / period);
    }
    return out;
}
function computeFullStochastic(bars, kPeriod = 14, kSmooth = 3, dSmooth = 3) {
    if (bars.length < kPeriod + kSmooth + dSmooth - 2)
        return null;
    const rawK = [];
    for (let i = kPeriod - 1; i < bars.length; i++) {
        const window = bars.slice(i - kPeriod + 1, i + 1);
        const hh = Math.max(...window.map((b) => b.high));
        const ll = Math.min(...window.map((b) => b.low));
        rawK.push(hh === ll ? 50 : ((bars[i].close - ll) / (hh - ll)) * 100);
    }
    const slowK = sma(rawK, kSmooth);
    const d = sma(slowK, dSmooth);
    if (!slowK.length || !d.length)
        return null;
    return { k: slowK.at(-1), d: d.at(-1) };
}
// ── Data fetching ─────────────────────────────────────────────────────────────
function fetchTickerStochastic(ticker) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Calls our Express server — no CORS, no API key in the browser
        const res = yield fetch(`/api/candle?symbol=${ticker}&from=${FROM_TS}&to=${TO_TS}`);
        if (!res.ok)
            throw new Error(`Server error ${res.status} for ${ticker}`);
        const data = yield res.json();
        if (data.error)
            throw new Error(data.error);
        if (data.s !== "ok" || !((_a = data.bars) === null || _a === void 0 ? void 0 : _a.length))
            return null;
        const daily = data.bars;
        const weekly = aggregateDailyToWeekly(daily);
        const stoch = computeFullStochastic(weekly, 14, 3, 3);
        if (!stoch)
            return null;
        const last = weekly.at(-1);
        return {
            ticker,
            k: stoch.k,
            d: stoch.d,
            lastClose: last.close,
            lastDate: last.date,
        };
    });
}
// ── Helpers ───────────────────────────────────────────────────────────────────
function getZone(d) {
    if (d < 20)
        return { label: "Oversold", color: "#ef4444" };
    if (d > 80)
        return { label: "Overbought", color: "#10b981" };
    return { label: "Neutral", color: "#94a3b8" };
}
// ── Sub-components ────────────────────────────────────────────────────────────
function MiniSparkline({ k, d }) {
    const pts = [
        [0, 100 - k],
        [50, 100 - (k + d) / 2],
        [100, 100 - d],
    ]
        .map(([x, y]) => `${x},${y}`)
        .join(" ");
    return ((0, jsx_runtime_1.jsx)("svg", { width: "56", height: "26", viewBox: "0 0 100 100", preserveAspectRatio: "none", children: (0, jsx_runtime_1.jsx)("polyline", { points: pts, fill: "none", stroke: "#58a6ff", strokeWidth: "10", strokeLinecap: "round", strokeLinejoin: "round", opacity: "0.55" }) }));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
    root: {
        minHeight: "100vh",
        background: "#0d1117",
        color: "#e6edf3",
        fontFamily: "'IBM Plex Mono','Courier New',monospace",
        padding: "24px 16px",
    },
    wrap: { maxWidth: 720, margin: "0 auto" },
    tag: {
        fontSize: 11,
        color: "#484f58",
        background: "#161b22",
        border: "1px solid #21262d",
        padding: "2px 8px",
        borderRadius: 4,
    },
    btn: (active = false) => ({
        fontSize: 11,
        padding: "4px 12px",
        borderRadius: 4,
        cursor: "pointer",
        fontFamily: "inherit",
        border: active ? "1px solid #58a6ff" : "1px solid #21262d",
        background: active ? "#1f6feb22" : "#161b22",
        color: active ? "#58a6ff" : "#8b949e",
    }),
    row: (isFirst, color) => ({
        background: "#161b22",
        border: `1px solid ${isFirst ? color + "66" : "#21262d"}`,
        borderRadius: 8,
        padding: "12px 18px",
        position: "relative",
        overflow: "hidden",
    }),
    badge: (color) => ({
        width: 80,
        fontSize: 10,
        padding: "3px 0",
        borderRadius: 4,
        background: color + "22",
        color,
        letterSpacing: 1,
        textTransform: "uppercase",
        textAlign: "center",
        flexShrink: 0,
    }),
};
// ── Main component ────────────────────────────────────────────────────────────
function App() {
    const [results, setResults] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [done, setDone] = (0, react_1.useState)(0);
    const [error, setError] = (0, react_1.useState)(null);
    const [showAll, setShowAll] = (0, react_1.useState)(false);
    const [sortBy, setSortBy] = (0, react_1.useState)("d");
    const [fetched, setFetched] = (0, react_1.useState)(false);
    function fetchData() {
        return __awaiter(this, void 0, void 0, function* () {
            setLoading(true);
            setError(null);
            setResults([]);
            setFetched(false);
            setDone(0);
            try {
                // All 30 tickers fetched in parallel — server handles Finnhub calls
                const settled = yield Promise.allSettled(DJIA_TICKERS.map((ticker) => __awaiter(this, void 0, void 0, function* () {
                    const result = yield fetchTickerStochastic(ticker);
                    setDone((n) => n + 1);
                    return result;
                })));
                // If every single call failed, surface the first error
                if (settled.every((r) => r.status === "rejected")) {
                    const first = settled[0];
                    throw new Error(first.reason.message);
                }
                const computed = settled
                    .filter((r) => r.status === "fulfilled" && r.value !== null)
                    .map((r) => r.value)
                    .sort((a, b) => a.d - b.d);
                if (computed.length === 0)
                    throw new Error("No data returned — is the Express server running?");
                setResults(computed);
                setFetched(true);
            }
            catch (e) {
                setError(e instanceof Error ? e.message : String(e));
            }
            finally {
                setLoading(false);
            }
        });
    }
    const sorted = [...results].sort((a, b) => sortBy === "d" ? a.d - b.d : a.k - b.k);
    const displayed = showAll ? sorted : sorted.slice(0, 10);
    const todayStr = new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const pct = Math.round((done / DJIA_TICKERS.length) * 100);
    return ((0, jsx_runtime_1.jsx)("div", { style: S.root, children: (0, jsx_runtime_1.jsxs)("div", { style: S.wrap, children: [(0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 28 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                fontSize: 10,
                                letterSpacing: 4,
                                color: "#58a6ff",
                                marginBottom: 6,
                                textTransform: "uppercase",
                            }, children: "Dow Jones Industrial Average" }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                display: "flex",
                                alignItems: "baseline",
                                gap: 12,
                                flexWrap: "wrap",
                            }, children: [(0, jsx_runtime_1.jsx)("h1", { style: {
                                        fontSize: 20,
                                        fontWeight: 700,
                                        margin: 0,
                                        color: "#f0f6fc",
                                    }, children: "Full Stochastic Screener" }), (0, jsx_runtime_1.jsx)("span", { style: S.tag, children: "14, 3, 3 \u00B7 Weekly" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 11, color: "#8b949e", marginTop: 5 }, children: [todayStr, " \u00B7 Daily \u2192 Weekly aggregation \u00B7 Computed locally"] })] }), !fetched && !loading && ((0, jsx_runtime_1.jsxs)("div", { style: { textAlign: "center", padding: "40px 0" }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                fontSize: 12,
                                color: "#8b949e",
                                marginBottom: 8,
                                lineHeight: 1.9,
                            }, children: ["Fetches daily OHLC for all 30 DJIA tickers in parallel", (0, jsx_runtime_1.jsx)("br", {}), "via the local Express server, aggregates to weekly bars,", (0, jsx_runtime_1.jsx)("br", {}), "then computes Full Stochastic (14,3,3) in the browser."] }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 11, color: "#484f58", marginBottom: 28 }, children: ["Make sure ", (0, jsx_runtime_1.jsx)("code", { style: { color: "#79c0ff" }, children: "npm run server" }), " ", "is running on port 3001."] }), (0, jsx_runtime_1.jsx)("button", { onClick: fetchData, style: {
                                padding: "12px 32px",
                                fontSize: 13,
                                fontWeight: 700,
                                background: "linear-gradient(135deg,#1f6feb,#388bfd)",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                letterSpacing: 1,
                                boxShadow: "0 0 24px #1f6feb44",
                            }, children: "\u25B6 Run Screener" })] })), loading && ((0, jsx_runtime_1.jsxs)("div", { style: { textAlign: "center", padding: "48px 0" }, children: [(0, jsx_runtime_1.jsx)("style", { children: `@keyframes bounce{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1.1);opacity:1}}` }), (0, jsx_runtime_1.jsx)("div", { style: {
                                display: "flex",
                                justifyContent: "center",
                                gap: 6,
                                marginBottom: 20,
                            }, children: [0, 1, 2, 3, 4].map((i) => ((0, jsx_runtime_1.jsx)("div", { style: {
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    background: "#58a6ff",
                                    animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                                } }, i))) }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 13, color: "#c9d1d9", marginBottom: 6 }, children: "Fetching from Yahoo Finance" }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 11, color: "#484f58" }, children: [done, " / ", DJIA_TICKERS.length, " tickers"] }), (0, jsx_runtime_1.jsxs)("div", { style: { maxWidth: 280, margin: "14px auto 0" }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                        background: "#161b22",
                                        borderRadius: 4,
                                        height: 4,
                                        overflow: "hidden",
                                    }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                            height: "100%",
                                            width: `${pct}%`,
                                            background: "linear-gradient(90deg,#1f6feb,#58a6ff)",
                                            transition: "width 0.3s ease",
                                            borderRadius: 4,
                                        } }) }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 11, color: "#484f58", marginTop: 6 }, children: [pct, "%"] })] })] })), error && ((0, jsx_runtime_1.jsxs)("div", { style: {
                        color: "#ef4444",
                        fontSize: 12,
                        padding: 16,
                        background: "#161b22",
                        borderRadius: 8,
                        border: "1px solid #ef444444",
                        marginTop: 12,
                        lineHeight: 1.8,
                    }, children: ["\u26A0 ", error, (0, jsx_runtime_1.jsx)("div", { style: { marginTop: 8 }, children: (0, jsx_runtime_1.jsx)("button", { onClick: fetchData, style: {
                                    color: "#58a6ff",
                                    background: "none",
                                    border: "1px solid #58a6ff44",
                                    borderRadius: 4,
                                    padding: "4px 12px",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    fontSize: 12,
                                }, children: "\u21BB Retry" }) })] })), fetched && results.length > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 14,
                                flexWrap: "wrap",
                            }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 11, color: "#484f58" }, children: "Sort by:" }), ["d", "k"].map((key) => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setSortBy(key), style: S.btn(sortBy === key), children: ["%", key.toUpperCase(), " ", key === "d" ? "(signal)" : "(fast)"] }, key))), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1 } }), (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: 11, color: "#484f58" }, children: [results.length, " tickers"] }), (0, jsx_runtime_1.jsx)("button", { onClick: fetchData, style: S.btn(), children: "\u21BB Refresh" })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "0 18px 8px",
                                fontSize: 10,
                                color: "#484f58",
                                letterSpacing: 1,
                            }, children: [(0, jsx_runtime_1.jsx)("div", { style: { width: 18 }, children: "#" }), (0, jsx_runtime_1.jsx)("div", { style: { width: 52 }, children: "TICKER" }), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1 }, children: "COMPANY" }), (0, jsx_runtime_1.jsx)("div", { style: { width: 56, textAlign: "center" }, children: "TREND" }), (0, jsx_runtime_1.jsx)("div", { style: { width: 60, textAlign: "right" }, children: "CLOSE" }), (0, jsx_runtime_1.jsx)("div", { style: { width: 44, textAlign: "right" }, children: "%K" }), (0, jsx_runtime_1.jsx)("div", { style: { width: 44, textAlign: "right" }, children: "%D" }), (0, jsx_runtime_1.jsx)("div", { style: { width: 80, textAlign: "center" }, children: "ZONE" })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: displayed.map((r, idx) => {
                                var _a;
                                const zone = getZone(r.d);
                                return ((0, jsx_runtime_1.jsxs)("div", { style: S.row(idx === 0, zone.color), children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                position: "absolute",
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: `${Math.min(r.d, 100)}%`,
                                                background: zone.color + "0f",
                                                borderRadius: "8px 0 0 8px",
                                            } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                                position: "relative",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 12,
                                            }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                        fontSize: 11,
                                                        color: idx === 0 ? zone.color : "#484f58",
                                                        width: 18,
                                                        textAlign: "right",
                                                        flexShrink: 0,
                                                    }, children: idx + 1 }), (0, jsx_runtime_1.jsx)("div", { style: {
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        color: "#58a6ff",
                                                        width: 52,
                                                        flexShrink: 0,
                                                    }, children: r.ticker }), (0, jsx_runtime_1.jsx)("div", { style: {
                                                        fontSize: 12,
                                                        color: "#8b949e",
                                                        flex: 1,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }, children: (_a = COMPANY_NAMES[r.ticker]) !== null && _a !== void 0 ? _a : r.ticker }), (0, jsx_runtime_1.jsx)("div", { style: {
                                                        width: 56,
                                                        display: "flex",
                                                        justifyContent: "center",
                                                        flexShrink: 0,
                                                    }, children: (0, jsx_runtime_1.jsx)(MiniSparkline, { k: r.k, d: r.d }) }), (0, jsx_runtime_1.jsxs)("div", { style: { width: 60, textAlign: "right", flexShrink: 0 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                                fontSize: 10,
                                                                color: "#484f58",
                                                                marginBottom: 1,
                                                            }, children: "CLOSE" }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 12, color: "#8b949e" }, children: ["$", r.lastClose.toFixed(2)] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { width: 44, textAlign: "right", flexShrink: 0 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                                fontSize: 10,
                                                                color: "#484f58",
                                                                marginBottom: 1,
                                                            }, children: "%K" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 13, color: "#c9d1d9" }, children: r.k.toFixed(1) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { width: 44, textAlign: "right", flexShrink: 0 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                                fontSize: 10,
                                                                color: "#484f58",
                                                                marginBottom: 1,
                                                            }, children: "%D" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                                                fontSize: 14,
                                                                fontWeight: 700,
                                                                color: zone.color,
                                                            }, children: r.d.toFixed(1) })] }), (0, jsx_runtime_1.jsx)("div", { style: S.badge(zone.color), children: zone.label })] })] }, r.ticker));
                            }) }), results.length > 10 && ((0, jsx_runtime_1.jsx)("button", { onClick: () => setShowAll((v) => !v), style: {
                                marginTop: 12,
                                width: "100%",
                                padding: "10px 0",
                                background: "#161b22",
                                border: "1px solid #21262d",
                                color: "#58a6ff",
                                fontSize: 12,
                                borderRadius: 8,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                letterSpacing: 1,
                            }, children: showAll
                                ? "▲ Show top 10 only"
                                : `▼ Show all ${results.length} components` })), (0, jsx_runtime_1.jsxs)("div", { style: {
                                marginTop: 14,
                                padding: "12px 16px",
                                background: "#161b22",
                                border: "1px solid #21262d",
                                borderRadius: 8,
                                fontSize: 11,
                                color: "#8b949e",
                                lineHeight: 2,
                            }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "0 20px",
                                        marginBottom: 4,
                                    }, children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("span", { style: { color: "#f0f6fc" }, children: "Full Stochastic (14,3,3)" }), " ", "\u00B7 Weekly bars"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("span", { style: { color: "#ef4444" }, children: "\u25A0" }), " <20 Oversold"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("span", { style: { color: "#94a3b8" }, children: "\u25A0" }), " 20\u201380 Neutral"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("span", { style: { color: "#10b981" }, children: "\u25A0" }), " >80 Overbought"] })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                                        fontSize: 10,
                                        color: "#484f58",
                                        borderTop: "1px solid #21262d",
                                        paddingTop: 6,
                                        marginTop: 2,
                                    }, children: "Raw %K = (Close \u2212 LowestLow\u2081\u2084) / (HighestHigh\u2081\u2084 \u2212 LowestLow\u2081\u2084) \u00D7 100 \u00B7 Slow %K = SMA(rawK, 3) \u00B7 %D = SMA(slowK, 3) \u00B7 Source: Using Yahoo Finance Data contact: gabriel@gabrieltekken.com" })] })] }))] }) }));
}
//# sourceMappingURL=App.js.map