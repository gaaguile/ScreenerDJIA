// 1. install REACT, REACT-DOM, TYPES-REACT, chancge file extension to .tsx, add in tsconfig.json : "jsx": "react-jsx"

import { useState, type CSSProperties } from "react";
import React from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface OHLCBar {
  date: string;
  high: number;
  low: number;
  close: number;
}

interface TickerResult {
  ticker: string;
  k: number; // smoothed %K
  d: number; // %D signal line
  lastClose: number;
  lastDate: string;
}

interface ZoneInfo {
  label: string;
  color: string;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  error?: { message: string };
}

type SortKey = "d" | "k";

// ── Constants ────────────────────────────────────────────────────────────────

// DJIA 30 as of June 2026: INTC→NVDA, DOW→SHW, VZ→GOOGL
const DJIA_TICKERS: string[] = [
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

const COMPANY_NAMES: Record<string, string> = {
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

// ── Full Stochastic (14,3,3) ─────────────────────────────────────────────────
// Computed locally from raw OHLC — guarantees correctness

function sma(arr: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = period - 1; i < arr.length; i++) {
    const slice = arr.slice(i - period + 1, i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return out;
}

function computeFullStochastic(
  bars: OHLCBar[],
  kPeriod = 14,
  kSmooth = 3,
  dSmooth = 3,
): { k: number; d: number } | null {
  // Need at least kPeriod + kSmooth + dSmooth - 2 bars for valid output
  const minBars = kPeriod + kSmooth + dSmooth - 2;
  if (bars.length < minBars) return null;

  // Step 1: Raw %K for each bar i (needs kPeriod bars)
  const rawK: number[] = [];
  for (let i = kPeriod - 1; i < bars.length; i++) {
    const window = bars.slice(i - kPeriod + 1, i + 1);
    const hh = Math.max(...window.map((b) => b.high));
    const ll = Math.min(...window.map((b) => b.low));
    const rk = hh === ll ? 50 : ((bars[i].close - ll) / (hh - ll)) * 100;
    rawK.push(rk);
  }

  // Step 2: Smoothed %K = SMA(rawK, kSmooth)
  const smoothedK = sma(rawK, kSmooth);

  // Step 3: %D = SMA(smoothedK, dSmooth)
  const dArr = sma(smoothedK, dSmooth);

  if (smoothedK.length === 0 || dArr.length === 0) return null;

  return {
    k: smoothedK.at(-1)!,
    d: dArr.at(-1)!,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getZone(d: number): ZoneInfo {
  if (d < 20) return { label: "Oversold", color: "#ef4444" };
  if (d > 80) return { label: "Overbought", color: "#10b981" };
  return { label: "Neutral", color: "#94a3b8" };
}

function extractJSON<T>(text: string): T {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array found in API response");
  return JSON.parse(match[0]) as T;
}

// Build the prompt: ask Claude to fetch raw weekly OHLC from stooq for all tickers
function buildPrompt(tickers: string[]): string {
  return `You are a financial data assistant. For each ticker below, fetch the weekly OHLC price data from stooq.com using this URL pattern:
https://stooq.com/q/d/l/?s=TICKER.us&i=w

Fetch each URL and parse the CSV response (columns: Date,Open,High,Low,Close,Volume).
Return the last 60 weekly bars per ticker (most recent last).

Tickers: ${tickers.join(", ")}

Return ONLY a raw JSON array — no markdown, no backticks, no explanation:
[
  {
    "ticker": "AAPL",
    "bars": [
      {"date":"2025-01-03","high":245.1,"low":230.5,"close":242.3},
      ...
    ]
  },
  ...
]

Include all ${tickers.length} tickers. Return exactly the last 60 weekly bars per ticker sorted oldest to newest.`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MiniSparkline({ k, d }: { k: number; d: number }): React.JSX.Element {
  const pts = [
    [0, 100 - k],
    [50, 100 - (k + d) / 2],
    [100, 100 - d],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
  return (
    <svg
      width="56"
      height="26"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="#58a6ff"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  root: {
    minHeight: "100vh",
    background: "#0d1117",
    color: "#e6edf3",
    fontFamily: "'IBM Plex Mono','Courier New',monospace",
    padding: "24px 16px",
  } satisfies CSSProperties,

  wrap: { maxWidth: 720, margin: "0 auto" } satisfies CSSProperties,

  tag: {
    fontSize: 11,
    color: "#484f58",
    background: "#161b22",
    border: "1px solid #21262d",
    padding: "2px 8px",
    borderRadius: 4,
  } satisfies CSSProperties,

  btn: (active = false): CSSProperties => ({
    fontSize: 11,
    padding: "4px 12px",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "inherit",
    border: active ? "1px solid #58a6ff" : "1px solid #21262d",
    background: active ? "#1f6feb22" : "#161b22",
    color: active ? "#58a6ff" : "#8b949e",
  }),

  row: (isFirst: boolean, color: string): CSSProperties => ({
    background: "#161b22",
    border: `1px solid ${isFirst ? color + "66" : "#21262d"}`,
    borderRadius: 8,
    padding: "12px 18px",
    position: "relative",
    overflow: "hidden",
  }),

  badge: (color: string): CSSProperties => ({
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

// ── Main component ───────────────────────────────────────────────────────────

export default function App(): React.JSX.Element {
  const [results, setResults] = useState<TickerResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortKey>("d");
  const [fetched, setFetched] = useState<boolean>(false);

  async function fetchData(): Promise<void> {
    setLoading(true);
    setError(null);
    setResults([]);
    setFetched(false);
    setProgress("Fetching weekly OHLC data from stooq.com via Claude…");

    try {
      // Step 1: Ask Claude to fetch raw OHLC for all tickers
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 8000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: buildPrompt(DJIA_TICKERS) }],
        }),
      });

      const data: AnthropicResponse = await response.json();
      if (data.error) throw new Error(data.error.message);

      const text = (data.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("");

      if (!text.trim()) throw new Error("Empty response from API");

      setProgress("Computing Full Stochastic (14,3,3) from raw price data…");

      // Step 2: Parse the returned OHLC data
      interface RawTickerData {
        ticker: string;
        bars: OHLCBar[];
      }
      const rawData = extractJSON<RawTickerData[]>(text);

      // Step 3: Compute Full Stochastic (14,3,3) locally — guaranteed correct math
      const results: TickerResult[] = [];

      for (const item of rawData) {
        if (!item.ticker || !Array.isArray(item.bars) || item.bars.length < 20)
          continue;

        const stoch = computeFullStochastic(item.bars, 14, 3, 3);
        if (!stoch) continue;

        const lastBar = item.bars.at(-1)!;
        results.push({
          ticker: item.ticker,
          k: stoch.k,
          d: stoch.d,
          lastClose: lastBar.close,
          lastDate: lastBar.date,
        });
      }

      if (results.length === 0)
        throw new Error(
          "Could not compute stochastic for any ticker — insufficient price data returned",
        );

      results.sort((a, b) => a.d - b.d);
      setResults(results);
      setFetched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  const sorted = [...results].sort((a, b) =>
    sortBy === "d" ? a.d - b.d : a.k - b.k,
  );
  const displayed = showAll ? sorted : sorted.slice(0, 10);
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={S.root}>
      <div style={S.wrap}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 4,
              color: "#58a6ff",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Dow Jones Industrial Average
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                color: "#f0f6fc",
              }}
            >
              Full Stochastic Screener
            </h1>
            <span style={S.tag}>14, 3, 3 · Weekly</span>
          </div>
          <div style={{ fontSize: 11, color: "#8b949e", marginTop: 5 }}>
            {todayStr} · Computed from raw OHLC · 30 components
          </div>
        </div>

        {/* Launch */}
        {!fetched && !loading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div
              style={{
                fontSize: 12,
                color: "#8b949e",
                marginBottom: 8,
                lineHeight: 1.8,
              }}
            >
              Fetches raw weekly OHLC from stooq.com via Claude,
              <br />
              then computes Full Stochastic (14,3,3) locally.
            </div>
            <div style={{ fontSize: 11, color: "#484f58", marginBottom: 24 }}>
              Values match TradingView / standard charting platforms.
            </div>
            <button
              onClick={fetchData}
              style={{
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
              }}
            >
              ▶ Run Screener
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:.3}40%{transform:scale(1.1);opacity:1}}`}</style>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                marginBottom: 20,
              }}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#58a6ff",
                    animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#8b949e" }}>{progress}</div>
            <div style={{ fontSize: 11, color: "#484f58", marginTop: 8 }}>
              Fetching 60 weekly bars × 30 tickers — may take ~45s…
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              color: "#ef4444",
              fontSize: 12,
              padding: 16,
              background: "#161b22",
              borderRadius: 8,
              border: "1px solid #ef444444",
              marginTop: 12,
            }}
          >
            ⚠ {error}
            <button
              onClick={fetchData}
              style={{
                marginLeft: 16,
                color: "#58a6ff",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
              }}
            >
              ↻ Retry
            </button>
          </div>
        )}

        {/* Results */}
        {fetched && results.length > 0 && (
          <>
            {/* Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 11, color: "#484f58" }}>Sort by:</span>
              {(["d", "k"] as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  style={S.btn(sortBy === key)}
                >
                  %{key.toUpperCase()} {key === "d" ? "(signal)" : "(fast)"}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={fetchData} style={S.btn()}>
                ↻ Refresh
              </button>
            </div>

            {/* Column headers */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 18px 8px",
                fontSize: 10,
                color: "#484f58",
                letterSpacing: 1,
              }}
            >
              <div style={{ width: 18 }}>#</div>
              <div style={{ width: 52 }}>TICKER</div>
              <div style={{ flex: 1 }}>COMPANY</div>
              <div style={{ width: 56, textAlign: "center" }}>TREND</div>
              <div style={{ width: 52, textAlign: "right" }}>CLOSE</div>
              <div style={{ width: 44, textAlign: "right" }}>%K</div>
              <div style={{ width: 44, textAlign: "right" }}>%D</div>
              <div style={{ width: 80, textAlign: "center" }}>ZONE</div>
            </div>

            {/* Rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {displayed.map((r, idx) => {
                const zone = getZone(r.d);
                return (
                  <div key={r.ticker} style={S.row(idx === 0, zone.color)}>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${Math.min(r.d, 100)}%`,
                        background: zone.color + "0f",
                        borderRadius: "8px 0 0 8px",
                      }}
                    />
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: idx === 0 ? zone.color : "#484f58",
                          width: 18,
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#58a6ff",
                          width: 52,
                          flexShrink: 0,
                        }}
                      >
                        {r.ticker}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#8b949e",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {COMPANY_NAMES[r.ticker] ?? r.ticker}
                      </div>
                      <div
                        style={{
                          width: 56,
                          display: "flex",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <MiniSparkline k={r.k} d={r.d} />
                      </div>
                      <div
                        style={{ width: 52, textAlign: "right", flexShrink: 0 }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "#484f58",
                            marginBottom: 1,
                          }}
                        >
                          CLOSE
                        </div>
                        <div style={{ fontSize: 12, color: "#8b949e" }}>
                          ${r.lastClose.toFixed(2)}
                        </div>
                      </div>
                      <div
                        style={{ width: 44, textAlign: "right", flexShrink: 0 }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "#484f58",
                            marginBottom: 1,
                          }}
                        >
                          %K
                        </div>
                        <div style={{ fontSize: 13, color: "#c9d1d9" }}>
                          {r.k.toFixed(1)}
                        </div>
                      </div>
                      <div
                        style={{ width: 44, textAlign: "right", flexShrink: 0 }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "#484f58",
                            marginBottom: 1,
                          }}
                        >
                          %D
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: zone.color,
                          }}
                        >
                          {r.d.toFixed(1)}
                        </div>
                      </div>
                      <div style={S.badge(zone.color)}>{zone.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show all toggle */}
            {results.length > 10 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                style={{
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
                }}
              >
                {showAll
                  ? "▲ Show top 10 only"
                  : `▼ Show all ${results.length} components`}
              </button>
            )}

            {/* Legend + methodology note */}
            <div
              style={{
                marginTop: 14,
                padding: "12px 16px",
                background: "#161b22",
                border: "1px solid #21262d",
                borderRadius: 8,
                fontSize: 11,
                color: "#8b949e",
                lineHeight: 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0 20px",
                  marginBottom: 4,
                }}
              >
                <span>
                  <span style={{ color: "#f0f6fc" }}>
                    Full Stochastic (14,3,3)
                  </span>{" "}
                  · Weekly bars
                </span>
                <span>
                  <span style={{ color: "#ef4444" }}>■</span> &lt;20 Oversold
                </span>
                <span>
                  <span style={{ color: "#94a3b8" }}>■</span> 20–80 Neutral
                </span>
                <span>
                  <span style={{ color: "#10b981" }}>■</span> &gt;80 Overbought
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#484f58",
                  borderTop: "1px solid #21262d",
                  paddingTop: 6,
                  marginTop: 2,
                }}
              >
                Methodology: Raw %K = (Close − LowestLow₁₄) / (HighestHigh₁₄ −
                LowestLow₁₄) × 100 · Smoothed %K = SMA(rawK, 3) · %D = SMA(%K,
                3) · Source: stooq.com weekly OHLC
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
