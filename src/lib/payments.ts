/**
 * Unified Dual-Token Payment Middleware
 *
 * Serves both USDC (exact scheme) and $KIRK (upto scheme, 30% discount)
 * on the same routes via Daydreams facilitator.
 */

import { HTTPFacilitatorClient } from "@x402/core/http";
import { createHonoPaymentMiddleware } from "@daydreamsai/facilitator/hono";
import { createResourceServer } from "@daydreamsai/facilitator/server";
import { createUptoModule } from "@daydreamsai/facilitator/upto";

import { ENDPOINT_PRICES } from "../config/pricing";
import {
  KIRK_TOKEN_ADDRESS,
  KIRK_TOKEN_DECIMALS,
  KIRK_TREASURY_ADDRESS,
  KIRK_DEXSCREENER_POOL,
  USDC_ADDRESS,
  USDC_DECIMALS,
  NETWORK,
} from "../config/tokens";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FACILITATOR_URL =
  process.env.FACILITATOR_URL || "https://facilitator.daydreams.systems";

const DEXSCREENER_API = KIRK_DEXSCREENER_POOL
  ? `https://api.dexscreener.com/latest/dex/pairs/base/${KIRK_DEXSCREENER_POOL}`
  : `https://api.dexscreener.com/latest/dex/tokens/${KIRK_TOKEN_ADDRESS}`;

const KIRK_DISCOUNT = 0.3; // 30% off USDC price

const PAY_TO = KIRK_TREASURY_ADDRESS;

// ---------------------------------------------------------------------------
// DexScreener price feed (5-min cache) — reused from kirk-payments.ts
// ---------------------------------------------------------------------------

let kirkPriceCache: { priceUsd: number; fetchedAt: number } | null = null;
const PRICE_CACHE_TTL = 5 * 60 * 1000;

async function fetchKirkPrice(): Promise<number> {
  const now = Date.now();
  if (kirkPriceCache && now - kirkPriceCache.fetchedAt < PRICE_CACHE_TTL) {
    return kirkPriceCache.priceUsd;
  }

  try {
    const response = await fetch(DEXSCREENER_API);
    const data = await response.json();
    const priceUsd = parseFloat(data.pair?.priceUsd || "0");

    if (priceUsd > 0) {
      kirkPriceCache = { priceUsd, fetchedAt: now };
      console.log(`[KIRK] Fetched price: $${priceUsd}`);
      return priceUsd;
    }
  } catch (error) {
    console.error("[KIRK] Failed to fetch price:", error);
  }

  return kirkPriceCache?.priceUsd || 0.0000003;
}

function calculateKirkAmount(usdcPrice: number, kirkPriceUsd: number): number {
  if (kirkPriceUsd <= 0) return 0;
  const discountedUsd = usdcPrice * (1 - KIRK_DISCOUNT);
  return Math.ceil(discountedUsd / kirkPriceUsd);
}

function kirkToRaw(kirkAmount: number): string {
  return BigInt(
    Math.floor(kirkAmount * 10 ** KIRK_TOKEN_DECIMALS)
  ).toString();
}

function usdcToRaw(usdcAmount: number): string {
  return BigInt(Math.round(usdcAmount * 10 ** USDC_DECIMALS)).toString();
}

// ---------------------------------------------------------------------------
// Dual-token accepts builder
// ---------------------------------------------------------------------------

function dualTokenAccepts(endpointKey: string, kirkPriceUsd: number) {
  const ep = ENDPOINT_PRICES[endpointKey];
  if (!ep || ep.usdcPrice === 0) return [];

  const kirkAmount = calculateKirkAmount(ep.usdcPrice, kirkPriceUsd);

  return [
    // USDC via exact scheme
    {
      scheme: "exact" as const,
      network: NETWORK,
      payTo: PAY_TO,
      price: {
        asset: USDC_ADDRESS,
        amount: usdcToRaw(ep.usdcPrice),
        extra: { name: "USD Coin", symbol: "USDC", decimals: USDC_DECIMALS },
      },
    },
    // $KIRK via upto scheme (30% discount)
    {
      scheme: "upto" as const,
      network: NETWORK,
      payTo: PAY_TO,
      price: {
        asset: KIRK_TOKEN_ADDRESS,
        amount: kirkToRaw(kirkAmount),
        extra: { name: "Kirk", symbol: "KIRK", decimals: KIRK_TOKEN_DECIMALS },
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Build full routes config for payment middleware
// ---------------------------------------------------------------------------

function buildRoutesConfig(kirkPriceUsd: number) {
  return {
    // Light tier ($0.01)
    "GET /models/[model]/summary": {
      accepts: dualTokenAccepts("summary", kirkPriceUsd),
      description: "Quick model snapshot",
      mimeType: "application/json",
    },
    "GET /models/[model]/info": {
      accepts: dualTokenAccepts("model-info", kirkPriceUsd),
      description: "Model metadata",
      mimeType: "application/json",
    },
    "GET /leaderboard": {
      accepts: dualTokenAccepts("leaderboard", kirkPriceUsd),
      description: "Model performance leaderboard",
      mimeType: "application/json",
    },

    // Standard tier ($0.05)
    "GET /models/[model]/performance": {
      accepts: dualTokenAccepts("performance", kirkPriceUsd),
      description: "Full performance metrics",
      mimeType: "application/json",
    },
    "GET /models/[model]/holdings": {
      accepts: dualTokenAccepts("holdings", kirkPriceUsd),
      description: "All holdings with returns",
      mimeType: "application/json",
    },
    "GET /models/[model]/holdings/top": {
      accepts: dualTokenAccepts("holdings-top", kirkPriceUsd),
      description: "Top N holdings by return",
      mimeType: "application/json",
    },
    "GET /models/[model]/holdings/[ticker]": {
      accepts: dualTokenAccepts("holding", kirkPriceUsd),
      description: "Single holding detail + daily history",
      mimeType: "application/json",
    },
    "GET /models/[model]/stats": {
      accepts: dualTokenAccepts("stats", kirkPriceUsd),
      description: "Best/worst performers, averages",
      mimeType: "application/json",
    },

    // Deep tier ($0.10)
    "GET /models/[model]/history/monthly": {
      accepts: dualTokenAccepts("history-monthly", kirkPriceUsd),
      description: "Monthly returns + win/lose stats",
      mimeType: "application/json",
    },
    "GET /models/[model]/tradebook": {
      accepts: dualTokenAccepts("tradebook", kirkPriceUsd),
      description: "Full position ledger",
      mimeType: "application/json",
    },
    "GET /models/[model]/positions": {
      accepts: dualTokenAccepts("positions", kirkPriceUsd),
      description: "Open positions only",
      mimeType: "application/json",
    },
    "GET /compare": {
      accepts: dualTokenAccepts("compare", kirkPriceUsd),
      description: "Multi-model comparison",
      mimeType: "application/json",
    },

    // Signals tier ($0.10)
    "GET /models/[model]/trades/recent": {
      accepts: dualTokenAccepts("trades-recent", kirkPriceUsd),
      description: "Recent filled orders",
      mimeType: "application/json",
    },
    "GET /models/[model]/trades/filled": {
      accepts: dualTokenAccepts("trades-filled", kirkPriceUsd),
      description: "All filled orders",
      mimeType: "application/json",
    },
    "GET /models/[model]/trades/pending": {
      accepts: dualTokenAccepts("trades-pending", kirkPriceUsd),
      description: "Pending orders",
      mimeType: "application/json",
    },
  };
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

export async function createPaymentMiddleware() {
  // Fetch initial $KIRK price
  const kirkPriceUsd = await fetchKirkPrice();
  console.log(`[payments] Initial KIRK price: $${kirkPriceUsd}`);

  const facilitatorClient = new HTTPFacilitatorClient({
    url: FACILITATOR_URL,
  });

  const resourceServer = createResourceServer(facilitatorClient, {
    exactEvm: true,
    uptoEvm: true,
    exactSvm: false,
  });

  const upto = createUptoModule({
    facilitatorClient,
    sweeperConfig: {
      intervalMs: 30_000,
      idleSettleMs: 120_000,
    },
  });

  const routes = buildRoutesConfig(kirkPriceUsd);

  // Refresh $KIRK prices every 5 minutes (rebuild routes config)
  // The middleware reads routes once at creation, so we log the refresh
  // for monitoring. Dynamic pricing would need routesResolver instead.
  setInterval(async () => {
    await fetchKirkPrice();
    console.log(
      `[payments] KIRK price refreshed: $${kirkPriceCache?.priceUsd}`
    );
  }, PRICE_CACHE_TTL);

  return createHonoPaymentMiddleware({
    resourceServer,
    routes,
    upto,
  });
}

// Export for use in info endpoint
export { fetchKirkPrice, KIRK_DISCOUNT, ENDPOINT_PRICES };
