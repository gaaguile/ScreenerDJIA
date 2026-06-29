// functions/api/candle.ts
// Cloudflare Pages Function — runs on the edge, no CORS issues.
// Replaces the Express server entirely.
//
// Route: GET /api/candle?symbol=AAPL
// Returns: { s: "ok" | "no_data", bars: OHLCBar[] }

interface OHLCBar {
  date: string;
  high: number;
  low: number;
  close: number;
}

interface CandleResponse {
  s: "ok" | "no_data";
  bars: OHLCBar[];
}

// ~13 months of daily bars → ~57 weekly candles
// More than enough for Full Stochastic (14,3,3) which needs ≥20 weekly bars
const FROM_TS = () => Math.floor(Date.now() / 1000 - 400 * 24 * 3600);
const TO_TS   = () => Math.floor(Date.now() / 1000);

export const onRequest: PagesFunction = async (ctx) => {
  const url    = new URL(ctx.request.url);
  const symbol = url.searchParams.get("symbol");

  // ── Validation ──────────────────────────────────────────────────────────────

  if (!symbol) {
    return Response.json({ error: "symbol query param is required" }, { status: 400 });
  }

  // ── Fetch from Yahoo Finance ─────────────────────────────────────────────────
  // Node.js / edge fetch → no CORS restriction

  const yahooUrl =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&period1=${FROM_TS()}&period2=${TO_TS()}&events=none`;

  let upstream: Response;
  try {
    upstream = await fetch(yahooUrl, {
      headers: {
        // Yahoo sometimes blocks headless requests without a User-Agent
        "User-Agent": "Mozilla/5.0 (compatible; DJIA-Screener/1.0)",
      },
    });
  } catch {
    return Response.json({ error: "Failed to reach Yahoo Finance" }, { status: 502 });
  }

  if (!upstream.ok) {
    return Response.json(
      { error: `Yahoo Finance returned ${upstream.status}` },
      { status: upstream.status },
    );
  }

  // ── Parse Yahoo response ─────────────────────────────────────────────────────

  const json   = await upstream.json() as Record<string, unknown>;
  const result = (json?.chart as Record<string, unknown>)?.result as unknown[];

  if (!result?.[0]) {
    return Response.json({ s: "no_data", bars: [] } satisfies CandleResponse);
  }

  const r          = result[0] as Record<string, unknown>;
  const timestamps = (r.timestamp ?? []) as number[];
  const q          = ((r.indicators as Record<string, unknown>)?.quote as unknown[])?.[0] as Record<string, number[]> ?? {};

  const bars: OHLCBar[] = timestamps
    .map((ts, i) => ({
      date:  new Date(ts * 1000).toISOString().slice(0, 10),
      high:  q.high?.[i],
      low:   q.low?.[i],
      close: q.close?.[i],
    }))
    .filter((b): b is OHLCBar => b.high != null && b.low != null && b.close != null);

  return Response.json({ s: "ok", bars } satisfies CandleResponse);
};
