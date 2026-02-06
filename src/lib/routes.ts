/**
 * Route Handlers
 *
 * Clean REST routes for all Kirk API endpoints.
 * Payment middleware runs before paid routes (returns 402 if unpaid).
 */

import { Hono } from "hono";
import * as ksvc from "./ksvc-client";
import { ENDPOINT_PRICES } from "../config/pricing";
import {
  KIRK_TOKEN_ADDRESS,
  USDC_ADDRESS,
  KIRK_TREASURY_ADDRESS,
  NETWORK,
} from "../config/tokens";
import { fetchKirkPrice, KIRK_DISCOUNT } from "./payments";

const app = new Hono();

// =============================================================================
// Free routes
// =============================================================================

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.get("/models", async (c) => c.json(await ksvc.getModels()));

app.get("/info", async (c) => {
  const kirkPriceUsd = await fetchKirkPrice();

  return c.json({
    name: "Kirk API",
    description:
      "KSVC's AI Intern - Quant model data. 7 models, 170 tickers. Pay per query.",
    network: NETWORK,
    tokens: {
      usdc: { address: USDC_ADDRESS, decimals: 6 },
      kirk: {
        address: KIRK_TOKEN_ADDRESS,
        decimals: 18,
        priceUsd: kirkPriceUsd,
        discount: `${KIRK_DISCOUNT * 100}%`,
      },
    },
    treasury: KIRK_TREASURY_ADDRESS,
    pricing: Object.entries(ENDPOINT_PRICES).map(
      ([key, { usdcPrice, tier }]) => ({
        endpoint: key,
        tier,
        usdcPrice,
        kirkDiscount: `${KIRK_DISCOUNT * 100}%`,
      })
    ),
  });
});

// =============================================================================
// Light tier ($0.01)
// =============================================================================

app.get("/models/:model/summary", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getSummary(model);
  return c.json(result);
});

app.get("/models/:model/info", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getPerformance(model);
  return c.json(result);
});

app.get("/leaderboard", async (c) => {
  const result = await ksvc.getLeaderboard();
  return c.json(result);
});

// =============================================================================
// Standard tier ($0.05)
// =============================================================================

app.get("/models/:model/performance", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getPerformance(model);
  return c.json(result);
});

app.get("/models/:model/holdings", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getHoldings(model);
  return c.json(result);
});

app.get("/models/:model/holdings/top", async (c) => {
  const model = c.req.param("model");
  const limit = parseInt(c.req.query("limit") || "10");
  const result = await ksvc.getTopHoldings(model, limit);
  return c.json(result);
});

app.get("/models/:model/holdings/:ticker", async (c) => {
  const model = c.req.param("model");
  const ticker = c.req.param("ticker");
  const result = await ksvc.getHolding(model, ticker);
  if (!result) {
    return c.json({ error: `Ticker ${ticker} not found in model ${model}` }, 404);
  }
  return c.json(result);
});

app.get("/models/:model/stats", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getStats(model);
  return c.json(result);
});

// =============================================================================
// Deep tier ($0.10)
// =============================================================================

app.get("/models/:model/history/monthly", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getMonthlyHistory(model);
  return c.json(result);
});

app.get("/models/:model/tradebook", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getTradebook(model);
  return c.json(result);
});

app.get("/models/:model/positions", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getPositions(model);
  return c.json(result);
});

app.get("/compare", async (c) => {
  const modelsParam = c.req.query("models");
  const models = modelsParam ? modelsParam.split(",") : ksvc.ALL_MODELS;
  const result = await ksvc.compareModels(models);
  return c.json(result);
});

// =============================================================================
// Signals tier ($0.10)
// =============================================================================

app.get("/models/:model/trades/recent", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getRecentTrades(model);
  return c.json(result);
});

app.get("/models/:model/trades/filled", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getFilledTrades(model);
  return c.json(result);
});

app.get("/models/:model/trades/pending", async (c) => {
  const model = c.req.param("model");
  const result = await ksvc.getPendingTrades(model);
  return c.json(result);
});

export { app };
