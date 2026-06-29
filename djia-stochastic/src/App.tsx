// 1. install REACT, REACT-DOM, TYPES-REACT, chancge file extension to .tsx, add in tsconfig.json : "jsx": "react-jsx", import React from "react";
// import React from "react";

import { useState, type CSSProperties } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface OHLCBar {
  date: string;
  high: number;
  low: number;
  close: number;
}

interface TickerResult {
  ticker: string;
  k: number;
  d: number;
  lastClose: number;
  lastDate: string;
}

interface ZoneInfo {
  label: string;
  color: string;
}

// Shape returned by our Express /api/candle endpoint
interface CandleResponse {
  s: string;
  bars: OHLCBar[]; // daily OHLC bars, pre-parsed by server
  error?: string;
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

// ~13 months of daily bars → ~57 weekly candles, well above the 20 needed for (14,3,3)
const FROM_TS = Math.floor(Date.now() / 1000 - 400 * 24 * 3600);
const TO_TS = Math.floor(Date.now() / 1000);

// ── Weekly aggregation from daily bars ───────────────────────────────────────

function aggregateDailyToWeekly(daily: OHLCBar[]): OHLCBar[] {
  const weeks = new Map<
    string,
    { highs: number[]; lows: number[]; closes: number[]; lastDate: string }
  >();

  for (const bar of daily) {
    const d = new Date(bar.date + "T12:00:00Z");
    const day = d.getUTCDay(); // 0 = Sun
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // rewind to Monday
    const mon = new Date(d);
    mon.setUTCDate(diff);
    const key = mon.toISOString().slice(0, 10);

    if (!weeks.has(key))
      weeks.set(key, { highs: [], lows: [], closes: [], lastDate: bar.date });

    const w = weeks.get(key)!;
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
      close: w.closes.at(-1)!,
    }));
}

// ── Full Stochastic (14,3,3) — computed locally ───────────────────────────────
// Raw %K  = (Close − LowestLow₁₄)  / (HighestHigh₁₄ − LowestLow₁₄) × 100
// Slow %K = SMA(rawK, 3)
// %D      = SMA(slowK, 3)

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
  if (bars.length < kPeriod + kSmooth + dSmooth - 2) return null;

  const rawK: number[] = [];
  for (let i = kPeriod - 1; i < bars.length; i++) {
    const window = bars.slice(i - kPeriod + 1, i + 1);
    const hh = Math.max(...window.map((b) => b.high));
    const ll = Math.min(...window.map((b) => b.low));
    rawK.push(hh === ll ? 50 : ((bars[i].close - ll) / (hh - ll)) * 100);
  }

  const slowK = sma(rawK, kSmooth);
  const d = sma(slowK, dSmooth);

  if (!slowK.length || !d.length) return null;
  return { k: slowK.at(-1)!, d: d.at(-1)! };
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchTickerStochastic(
  ticker: string,
): Promise<TickerResult | null> {
  // Calls our Express server — no CORS, no API key in the browser
  const res = await fetch(
    `/api/candle?symbol=${ticker}&from=${FROM_TS}&to=${TO_TS}`,
  );

  if (!res.ok) throw new Error(`Server error ${res.status} for ${ticker}`);

  const data: CandleResponse = await res.json();
  if (data.error) throw new Error(data.error);
  if (data.s !== "ok" || !data.bars?.length) return null;

  const daily: OHLCBar[] = data.bars;

  const weekly = aggregateDailyToWeekly(daily);
  const stoch = computeFullStochastic(weekly, 14, 3, 3);
  if (!stoch) return null;

  const last = weekly.at(-1)!;
  return {
    ticker,
    k: stoch.k,
    d: stoch.d,
    lastClose: last.close,
    lastDate: last.date,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getZone(d: number): ZoneInfo {
  if (d < 20) return { label: "Oversold", color: "#ef4444" };
  if (d > 80) return { label: "Overbought", color: "#10b981" };
  return { label: "Neutral", color: "#94a3b8" };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniSparkline({ k, d }: { k: number; d: number }): JSX.Element {
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

// ── Styles ────────────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export default function App(): JSX.Element {
  const [results, setResults] = useState<TickerResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [done, setDone] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortKey>("d");
  const [fetched, setFetched] = useState<boolean>(false);

  async function fetchData(): Promise<void> {
    setLoading(true);
    setError(null);
    setResults([]);
    setFetched(false);
    setDone(0);

    try {
      // All 30 tickers fetched in parallel — server handles Finnhub calls
      const settled = await Promise.allSettled(
        DJIA_TICKERS.map(async (ticker) => {
          const result = await fetchTickerStochastic(ticker);
          setDone((n) => n + 1);
          return result;
        }),
      );

      // If every single call failed, surface the first error
      if (settled.every((r) => r.status === "rejected")) {
        const first = settled[0] as PromiseRejectedResult;
        throw new Error((first.reason as Error).message);
      }

      const computed: TickerResult[] = settled
        .filter(
          (r): r is PromiseFulfilledResult<TickerResult> =>
            r.status === "fulfilled" && r.value !== null,
        )
        .map((r) => r.value)
        .sort((a, b) => a.d - b.d);

      if (computed.length === 0)
        throw new Error("No data returned — is the Express server running?");

      setResults(computed);
      setFetched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
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
  const pct = Math.round((done / DJIA_TICKERS.length) * 100);

  return (
    <div style={S.root}>
      <div style={S.wrap}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
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
            {todayStr} · Daily → Weekly aggregation · Computed locally
          </div>
        </div>

        {/* Launch */}
        {!fetched && !loading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div
              style={{
                fontSize: 12,
                color: "#8b949e",
                marginBottom: 8,
                lineHeight: 1.9,
              }}
            >
              Fetches daily OHLC for all 30 DJIA tickers in parallel
              <br />
              via the local Express server, aggregates to weekly bars,
              <br />
              then computes Full Stochastic (14,3,3) in the browser.
            </div>
            <div style={{ fontSize: 11, color: "#484f58", marginBottom: 28 }}>
              Make sure <code style={{ color: "#79c0ff" }}>npm run server</code>{" "}
              is running on port 3001.
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
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <style>{`@keyframes bounce{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1.1);opacity:1}}`}</style>
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
            <div style={{ fontSize: 13, color: "#c9d1d9", marginBottom: 6 }}>
              Fetching from Finnhub via Express…
            </div>
            <div style={{ fontSize: 11, color: "#484f58" }}>
              {done} / {DJIA_TICKERS.length} tickers
            </div>
            <div style={{ maxWidth: 280, margin: "14px auto 0" }}>
              <div
                style={{
                  background: "#161b22",
                  borderRadius: 4,
                  height: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: "linear-gradient(90deg,#1f6feb,#58a6ff)",
                    transition: "width 0.3s ease",
                    borderRadius: 4,
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "#484f58", marginTop: 6 }}>
                {pct}%
              </div>
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
              lineHeight: 1.8,
            }}
          >
            ⚠ {error}
            <div style={{ marginTop: 8 }}>
              <button
                onClick={fetchData}
                style={{
                  color: "#58a6ff",
                  background: "none",
                  border: "1px solid #58a6ff44",
                  borderRadius: 4,
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                }}
              >
                ↻ Retry
              </button>
            </div>
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
              <span style={{ fontSize: 11, color: "#484f58" }}>
                {results.length} tickers
              </span>
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
              <div style={{ width: 60, textAlign: "right" }}>CLOSE</div>
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
                        style={{ width: 60, textAlign: "right", flexShrink: 0 }}
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

            {/* Legend */}
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
                Raw %K = (Close − LowestLow₁₄) / (HighestHigh₁₄ − LowestLow₁₄) ×
                100 · Slow %K = SMA(rawK, 3) · %D = SMA(slowK, 3) · Source:
                Finnhub via Express
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
