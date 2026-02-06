# Kirk API

KSVC's AI Intern — pay-per-query quant trading model data API with X-402 micropayments.

- **7 quant models, 170 tickers** across US and Taiwan markets
- **Dual-token payments** — USDC or $KIRK on Base
- **30% discount** when paying with $KIRK
- **A2A compatible** — agent card at `/.well-known/agent.json`

## Live API

| Environment | URL |
|---|---|
| **Mainnet** | `https://kirk-api-production.up.railway.app` |
| **Testnet** | `https://kirk-api-testnet-production.up.railway.app` |
| **Docs** | `https://kirk-api-production.up.railway.app/docs` |

## Endpoints

### Free ($0)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/models` | List all 7 models |
| GET | `/info` | API info, pricing, token addresses |
| GET | `/.well-known/agent.json` | A2A agent discovery card |
| GET | `/docs` | Swagger UI |

### Light ($0.01 USDC)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/models/:model/summary` | Quick snapshot — MTD return, top/worst performer |
| GET | `/models/:model/info` | Model metadata and performance |
| GET | `/leaderboard` | All models ranked by MTD return |

### Standard ($0.05 USDC)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/models/:model/performance` | Full performance metrics |
| GET | `/models/:model/holdings` | All holdings sorted by return |
| GET | `/models/:model/holdings/top` | Top N holdings (default 10) |
| GET | `/models/:model/holdings/:ticker` | Single holding detail with equity series |
| GET | `/models/:model/stats` | Aggregate statistics |

### Deep ($0.10 USDC)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/models/:model/history/monthly` | Monthly return history with win/loss stats |
| GET | `/models/:model/tradebook` | Full position ledger with entry/exit P&L |
| GET | `/models/:model/positions` | Currently open positions |
| GET | `/compare` | Compare models (query: `?models=usa-model1,usa-model2`) |

### Signals ($0.10 USDC)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/models/:model/trades/recent` | Last 20 filled orders |
| GET | `/models/:model/trades/filled` | All filled orders |
| GET | `/models/:model/trades/pending` | Open/pending orders |

## Payment

All paid endpoints use the [X-402 protocol](https://x402.org). Without payment, they return `402 Payment Required` with two options:

| Token | Scheme | Contract | Discount |
|-------|--------|----------|----------|
| USDC | `exact` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | — |
| $KIRK | `upto` | `0x73b83F8553480e8A8bb56B53618d5e70C8051e37` | 30% off |

Payment is facilitated by [Daydreams](https://daydreams.systems). Treasury: `0x54376e042acd7cf3bea1a40aff9c33b47e7ec5de`

## Available Models

| Region | Models |
|--------|--------|
| US | `usa-model1` through `usa-model5` (~130 equities) |
| Taiwan | `twse-model1`, `twse-model2` (~40 stocks) |

## Quick Start

```bash
bun install
cp .env.example .env
# Set KSVC_API_BASE in .env
bun run dev
```

## Testing

```bash
# Health check
curl https://kirk-api-production.up.railway.app/health

# List models (free)
curl https://kirk-api-production.up.railway.app/models

# Paid endpoint (returns 402 with payment options)
curl https://kirk-api-production.up.railway.app/models/usa-model1/summary
```

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Framework:** [Hono](https://hono.dev)
- **Payments:** [X-402](https://x402.org) via [Daydreams](https://daydreams.systems)
- **Network:** Base (EIP-155:8453)

## Links

- [Interactive API Docs](https://kirk-api-production.up.railway.app/docs)
- [$KIRK on DexScreener](https://dexscreener.com/base/0xbd0f29d4b6b61d2231e22388ff8fcc6ecd0d8a81f6376672eed4a076d703bf0a)
- [X-402 Payment Protocol](https://x402.org)
