// cat > /home/claude/djia-stochastic.tsx << 'EOF'
import { useState, useEffect } from "react";

// 1. install REACT, REACT-DOM, TYPES-REACT, chancge file extension to .tsx, add in tsconfig.json : "jsx": "react-jsx"

// ── Types ────────────────────────────────────────────────────────────────────

interface DailyBar {
  t: number; // Unix ms
  h: number;
  l: number;
  c: number;
}

interface WeeklyBar {
  t: string; // ISO date of Monday
  h: number;
  l: number;
  c: number;
}

interface StochasticResult {
  ticker: string;
  k: number;
  d: number;
}

interface TickerResult extends StochasticResult {
  err?: false;
}

interface TickerError {
  ticker: string;
  k: null;
  d: null;
  err: true;
}

type TickerOutcome = TickerResult | TickerError;

interface ZoneInfo {
  label: string;
  color: string;
}

// Yahoo Finance chart API response shape (partial)
interface YahooChartResult {
  timestamp: number[];
  indicators: {
    quote: Array<{
      high: (number | null)[];
      low: (number | null)[];
      close: (number | null)[];
    }>;
  };
}

interface YahooChartResponse {
  chart: {
    result?: YahooChartResult[];
  };
}

// ── Constants ────────────────────────────────────────────────────────────────

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
  "DOW",
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
  "TRV",
  "UNH",
  "V",
  "VZ",
  "WMT",
  "AMZN",
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
  DOW: "Dow Inc.",
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
  TRV: "Travelers",
  UNH: "UnitedHealth",
  V: "Visa",
  VZ: "Verizon",
  WMT: "Walmart",
  AMZN: "Amazon",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function sma(arr: number[], n: number): number[] {
  const out: number[] = [];
  for (let i = n - 1; i < arr.length; i++) {
    const slice = arr.slice(i - n + 1, i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / n);
  }
  return out;
}

function calcFullStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
  kSmooth = 3,
  dSmooth = 3,
): { k: number; d: number } {
  const rawK: number[] = [];
  for (let i = period - 1; i < closes.length; i++) {
    const hh = Math.max(...highs.slice(i - period + 1, i + 1));
    const ll = Math.min(...lows.slice(i - period + 1, i + 1));
    rawK.push(hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100);
  }
  const kArr = sma(rawK, kSmooth);
  const dArr = sma(kArr, dSmooth);
  return { k: kArr[kArr.length - 1]!, d: dArr[dArr.length - 1]! };
}

function aggregateWeekly(bars: DailyBar[]): WeeklyBar[] {
  const weeks = new Map<
    string,
    { highs: number[]; lows: number[]; closes: number[] }
  >();

  for (const b of bars) {
    const d = new Date(b.t);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d);
    mon.setDate(diff);
    const key = mon.toISOString().slice(0, 10);

    if (!weeks.has(key)) weeks.set(key, { highs: [], lows: [], closes: [] });
    const w = weeks.get(key)!;
    w.highs.push(b.h);
    w.lows.push(b.l);
    w.closes.push(b.c);
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, w]) => ({
      t,
      h: Math.max(...w.highs),
      l: Math.min(...w.lows),
      c: w.closes[w.closes.length - 1]!,
    }));
}

async function fetchStochastic(ticker: string): Promise<StochasticResult> {
  const endMs = Date.now();
  const startMs = endMs - 2 * 365 * 24 * 3600 * 1000;
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}` +
    `?interval=1d&period1=${Math.floor(startMs / 1000)}&period2=${Math.floor(endMs / 1000)}&events=none`;

  const res = await fetch(url);
  const json: YahooChartResponse = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${ticker}`);

  const q = result.indicators.quote[0];
  const dailyBars: DailyBar[] = result.timestamp
    .map((t, i) => ({
      t: t * 1000,
      h: q.high[i]!,
      l: q.low[i]!,
      c: q.close[i]!,
    }))
    .filter((b) => b.h != null && b.l != null && b.c != null);

  const weekly = aggregateWeekly(dailyBars);
  if (weekly.length < 30)
    throw new Error(`Insufficient weekly bars for ${ticker}`);

  const { k, d } = calcFullStochastic(
    weekly.map((w) => w.h),
    weekly.map((w) => w.l),
    weekly.map((w) => w.c),
  );

  return { ticker, k, d };
}

function getZone(d: number): ZoneInfo {
  if (d < 30) return { label: "Oversold", color: "#ef4444" };
  if (d > 70) return { label: "Overbought", color: "#10b981" };
  return { label: "Neutral", color: "#94a3b8" };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function App(): React.JSX.Element {
  const [results, setResults] = useState<TickerResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let done = 0;
    const all: TickerOutcome[] = [];

    const run = async (): Promise<void> => {
      await Promise.all(
        DJIA_TICKERS.map(async (ticker) => {
          try {
            const r = await fetchStochastic(ticker);
            all.push(r);
          } catch {
            all.push({ ticker, k: null, d: null, err: true });
          } finally {
            done++;
            setProgress(Math.round((done / DJIA_TICKERS.length) * 100));
          }
        }),
      );

      const valid = all
        .filter((r): r is TickerResult => r.d != null)
        .sort((a, b) => a.d - b.d);

      setResults(valid);
      setLoading(false);
    };

    run().catch((e: Error) => {
      setError(e.message);
      setLoading(false);
    });
  }, []);

  const top10 = results.slice(0, 10);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d1117",
        color: "#e6edf3",
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 4,
              color: "#58a6ff",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            DJIA · Weekly Full Stochastic (14,3,3)
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              color: "#f0f6fc",
            }}
          >
            10 Most Oversold Components
          </h1>
          <div style={{ fontSize: 12, color: "#8b949e", marginTop: 6 }}>
            Ranked by %D (slow signal line) ·{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 13, color: "#8b949e", marginBottom: 16 }}>
              Fetching weekly price data for all 30 components…
            </div>
            <div
              style={{
                background: "#161b22",
                borderRadius: 4,
                height: 6,
                overflow: "hidden",
                maxWidth: 300,
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "#58a6ff",
                  transition: "width 0.3s ease",
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: "#58a6ff", marginTop: 10 }}>
              {progress}%
            </div>
          </div>
        ) : error ? (
          <div style={{ color: "#ef4444", fontSize: 13 }}>Error: {error}</div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {top10.map((r, idx) => {
                const zone = getZone(r.d);
                return (
                  <div
                    key={r.ticker}
                    style={{
                      background: "#161b22",
                      border: "1px solid #21262d",
                      borderRadius: 8,
                      padding: "14px 18px",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${r.d}%`,
                        background: zone.color + "18",
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
                          color: "#484f58",
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
                      <div style={{ fontSize: 12, color: "#8b949e", flex: 1 }}>
                        {COMPANY_NAMES[r.ticker] ?? r.ticker}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 20,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#484f58",
                              marginBottom: 1,
                            }}
                          >
                            %K
                          </div>
                          <div style={{ fontSize: 13, color: "#e6edf3" }}>
                            {r.k.toFixed(1)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
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
                              fontSize: 15,
                              fontWeight: 700,
                              color: zone.color,
                            }}
                          >
                            {r.d.toFixed(1)}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: zone.color + "22",
                            color: zone.color,
                            letterSpacing: 1,
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                            width: 72,
                            textAlign: "center",
                          }}
                        >
                          {zone.label}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 24,
                padding: "12px 16px",
                background: "#161b22",
                border: "1px solid #21262d",
                borderRadius: 8,
                fontSize: 11,
                color: "#8b949e",
                lineHeight: 1.8,
              }}
            >
              <span style={{ color: "#f0f6fc", fontWeight: 600 }}>
                Full Stochastic (14,3,3)
              </span>{" "}
              · %D is the signal line (3-period SMA of smoothed %K) ·{" "}
              <span style={{ color: "#ef4444" }}>Below 20 = Oversold</span> ·{" "}
              <span style={{ color: "#10b981" }}>Above 80 = Overbought</span> ·{" "}
              Data via Yahoo Finance · Ranked ascending by %D
            </div>
          </>
        )}
      </div>
    </div>
  );
}
