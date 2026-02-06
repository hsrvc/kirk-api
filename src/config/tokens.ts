/**
 * Token Configuration
 *
 * Single source of truth for all token addresses used in Kirk API.
 * All code should import from here instead of hardcoding addresses.
 *
 * Token Registry: /token/KIRK-TOKEN-REGISTRY.md
 */

// =============================================================================
// $KIRK Token (Clawnch deployment - ACTIVE)
// =============================================================================

/**
 * $KIRK token contract address on Base
 *
 * Deployed: 2026-02-01 via Clawnch
 * Platform: Clanker
 * Fee split: 80% to agent, 20% to Clawnch
 */
export const KIRK_TOKEN_ADDRESS =
  process.env.KIRK_TOKEN_ADDRESS ||
  "0x73b83F8553480e8A8bb56B53618d5e70C8051e37";

export const KIRK_TOKEN_DECIMALS = 18;
export const KIRK_TOKEN_SYMBOL = "KIRK";
export const KIRK_TOKEN_NAME = "Kirk";

// =============================================================================
// USDC (Base)
// =============================================================================

export const USDC_ADDRESS =
  process.env.USDC_ADDRESS ||
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const USDC_DECIMALS = 6;

// =============================================================================
// Payment Addresses
// =============================================================================

/**
 * Kirk's wallet that receives payments and fee revenue
 * Same wallet used for Bankr deployment
 */
export const KIRK_TREASURY_ADDRESS =
  process.env.KIRK_TREASURY_ADDRESS ||
  "0x54376e042acd7cf3bea1a40aff9c33b47e7ec5de";

// =============================================================================
// Network
// =============================================================================

export const BASE_CHAIN_ID = parseInt(process.env.BASE_CHAIN_ID || "8453");
export const NETWORK = (process.env.NETWORK || `eip155:${BASE_CHAIN_ID}`) as `${string}:${string}`;
export const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";

// =============================================================================
// DexScreener
// =============================================================================

// Note: Pool address may change - check DexScreener for current pool
export const KIRK_DEXSCREENER_POOL = process.env.KIRK_DEXSCREENER_POOL || "";

// =============================================================================
// Fee Collection (Clanker)
// =============================================================================

export const CLANKER_FEE_LOCKER = "0xF3622742b1E446D92e45E22923Ef11C2fcD55D68";

// =============================================================================
// Deprecated Addresses (DO NOT USE)
// =============================================================================

/**
 * @deprecated Bankr deployment - abandoned 2026-02-01
 * Kept for reference only
 */
export const DEPRECATED_BANKR_KIRK_ADDRESS = "0xa7fcF83397765a87c00C293eCA432Ca5A2d02B07";
