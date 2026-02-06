/**
 * Static A2A Agent Card
 *
 * Serves agent discovery metadata at /.well-known/agent.json.
 * Replaces lucid-agents agent card with a simple static response.
 */

import type { Context } from "hono";
import { ENDPOINT_PRICES } from "../config/pricing";
import { KIRK_TOKEN_ADDRESS, USDC_ADDRESS, NETWORK } from "../config/tokens";

const FACILITATOR_URL =
  process.env.FACILITATOR_URL || "https://facilitator.daydreams.systems";

const API_BASE_URL =
  process.env.API_BASE_URL || "https://kirk-api.ksvc.xyz";

export function serveAgentCard(c: Context) {
  return c.json({
    name: "kirk",
    version: "0.2.0",
    description:
      "KSVC's AI Intern - Quant model data API. 7 models, 170 tickers. Pay per query.",
    url: API_BASE_URL,
    payment: {
      network: NETWORK,
      tokens: [
        { symbol: "USDC", address: USDC_ADDRESS, decimals: 6 },
        { symbol: "KIRK", address: KIRK_TOKEN_ADDRESS, decimals: 18 },
      ],
      facilitator: FACILITATOR_URL,
      discount: "30% off when paying with $KIRK",
    },
    endpoints: Object.entries(ENDPOINT_PRICES).map(
      ([key, { usdcPrice, tier }]) => ({
        key,
        tier,
        price:
          usdcPrice > 0
            ? `$${usdcPrice} USDC (30% off in $KIRK)`
            : "free",
      })
    ),
  });
}
