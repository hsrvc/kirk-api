/**
 * Endpoint Pricing Configuration
 *
 * 4 tiers of pricing for Kirk API endpoints.
 * Prices are in USDC. $KIRK payments get 30% discount.
 */

export interface EndpointPrice {
  usdcPrice: number;
  tier: "free" | "light" | "standard" | "deep" | "signals";
}

export const ENDPOINT_PRICES: Record<string, EndpointPrice> = {
  // Free ($0)
  health: { usdcPrice: 0, tier: "free" },
  models: { usdcPrice: 0, tier: "free" },
  info: { usdcPrice: 0, tier: "free" },

  // Light ($0.01)
  summary: { usdcPrice: 0.01, tier: "light" },
  "model-info": { usdcPrice: 0.01, tier: "light" },
  leaderboard: { usdcPrice: 0.01, tier: "light" },

  // Standard ($0.05)
  performance: { usdcPrice: 0.05, tier: "standard" },
  holdings: { usdcPrice: 0.05, tier: "standard" },
  "holdings-top": { usdcPrice: 0.05, tier: "standard" },
  holding: { usdcPrice: 0.05, tier: "standard" },
  stats: { usdcPrice: 0.05, tier: "standard" },

  // Deep ($0.10)
  "history-monthly": { usdcPrice: 0.10, tier: "deep" },
  tradebook: { usdcPrice: 0.10, tier: "deep" },
  positions: { usdcPrice: 0.10, tier: "deep" },
  compare: { usdcPrice: 0.10, tier: "deep" },

  // Signals ($0.10)
  "trades-recent": { usdcPrice: 0.10, tier: "signals" },
  "trades-filled": { usdcPrice: 0.10, tier: "signals" },
  "trades-pending": { usdcPrice: 0.10, tier: "signals" },
};
