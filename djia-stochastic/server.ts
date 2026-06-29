import express, { type Request, type Response } from "express";
import dotenv from "dotenv";

dotenv.config();

// ── Types ────────────────────────────────────────────────────────────────────

interface YahooBar {
  date: string;
  high: number;
  low: number;
  close: number;
}

interface CandleQuery {
  symbol?: string;
}

// ── Config ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3001;

// ~13 months of daily bars → ~57 weekly candles (well above 20 needed for 14,3,3)
const FROM_TS = Math.floor(Date.now() / 1000 - 400 * 24 * 3600);
const TO_TS = Math.floor(Date.now() / 1000);

// ── Server ───────────────────────────────────────────────────────────────────

const app = express();

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
app.get(
  "/api/candle",
  async (req: Request<{}, {}, {}, CandleQuery>, res: Response) => {
    const { symbol } = req.query;

    if (!symbol) {
      res.status(400).json({ error: "symbol query param is required" });
      return;
    }

    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
      `?interval=1d&period1=${FROM_TS}&period2=${TO_TS}&events=none`;

    try {
      const upstream = await fetch(url, {
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

      const json = await upstream.json();
      const result = json?.chart?.result?.[0];

      if (!result) {
        res.json({ s: "no_data", bars: [] });
        return;
      }

      const timestamps: number[] = result.timestamp ?? [];
      const q = result.indicators?.quote?.[0] ?? {};

      const bars: YahooBar[] = timestamps
        .map((ts: number, i: number) => ({
          date: new Date(ts * 1000).toISOString().slice(0, 10),
          high: q.high?.[i] as number,
          low: q.low?.[i] as number,
          close: q.close?.[i] as number,
        }))
        .filter((b) => b.high != null && b.low != null && b.close != null);

      res.json({ s: "ok", bars });
    } catch (err) {
      console.error(`[${symbol}] fetch error:`, err);
      res.status(502).json({ error: "Failed to reach Yahoo Finance" });
    }
  },
);

// Health check
app.get("/api/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅  API server running at http://localhost:${PORT}`);
  console.log(`    No API key needed — using Yahoo Finance`);
});
