/**
 * KSVC API Client
 *
 * Fetches KSVC model data. Data is updated daily (end of trading day).
 * KSVC_API_BASE must be set via environment variable.
 */

const KSVC_API_BASE = process.env.KSVC_API_BASE;
if (!KSVC_API_BASE) {
  throw new Error("KSVC_API_BASE environment variable is required");
}

// Available models
export const US_MODELS = [
  "usa-model1",
  "usa-model2",
  "usa-model3",
  "usa-model4",
  "usa-model5",
];

export const TWSE_MODELS = ["twse-model1", "twse-model2"];

export const ALL_MODELS = [...US_MODELS, ...TWSE_MODELS];

// Types
export interface ModelMetric {
  key: string;
  value: number;
}

export interface EquitySeriesPoint {
  date: string;
  value: number;
}

export interface EquitySeries {
  Ticker: string;
  data: EquitySeriesPoint[];
}

export interface MonthlyReturn {
  date: string;
  value: number;
}

export interface KsvcFilledOrder {
  ticker: string;
  action: string;
  quantity: number;
  price: number;
  date: string;
  comment?: string;
  fee?: number;
}

export interface KsvcPendingOrder {
  ticker: string;
  action: string;
  quantity: number;
  orderType: string;
  execute_price: number | null;
  submittedTime: string;
  comment?: string;
}

export interface KsvcTradebookEntry {
  ticker: string | number;
  enterDate: string;
  enterPrice: number;
  exitDate: string | null;
  exitPrice: number | null;
  exitReason: string | null;
  days: number;
  share: number;
  profitPercent: number;
  maxGainPercent: number;
  maxLossPercent: number;
  todayPrice: number;
}

export interface KsvcModelData {
  metric: ModelMetric[];
  equitySeries: Array<{ Title: string; series: EquitySeries[] }>;
  monthlyReturns: Array<{ Title: string; series: MonthlyReturn[] }>;
  filledOrders: KsvcFilledOrder[];
  pendingOrders: KsvcPendingOrder[];
  tradebook: KsvcTradebookEntry[];
  last_date: string;
  timestamp: Record<string, string>;
}

// Simple in-memory cache with 1-hour TTL
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
  return data;
}

/**
 * Parse TWSE numeric tickers like "2330 台積電" → {ticker, code, name}
 */
function parseTwseTicker(raw: string | number): { ticker: string; code: string; name: string } {
  const str = String(raw);
  const match = str.match(/^(\d+)\s*(.*)$/);
  if (match) {
    return { ticker: str, code: match[1], name: match[2] || "" };
  }
  return { ticker: str, code: str, name: "" };
}

/**
 * Fetch raw model data from KSVC API
 */
export async function fetchModelData(model: string): Promise<KsvcModelData> {
  return cachedFetch(`model:${model}`, async () => {
    const response = await fetch(`${KSVC_API_BASE}/${model}`);
    if (!response.ok) {
      throw new Error(`KSVC API error: ${response.status}`);
    }
    return response.json();
  });
}

/**
 * Get list of available models with basic info
 */
export async function getModels() {
  return {
    us: US_MODELS,
    twse: TWSE_MODELS,
    total: ALL_MODELS.length,
  };
}

/**
 * Get performance metrics for a model
 */
export async function getPerformance(model: string) {
  const data = await fetchModelData(model);
  const metrics: Record<string, number> = {};

  for (const m of data.metric) {
    metrics[m.key] = m.value;
  }

  return {
    model,
    mtdReturn: metrics["Return %"] || 0,
    dailyChange: metrics["Change %"] || 0,
    activePositions: metrics["Active Positions"] || 0,
    winRate: metrics["Win Rate %"] || 0,
    maxDrawdown: metrics["Max Drawdown %"] || 0,
    last_date: data.last_date || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get all holdings for a model
 */
export async function getHoldings(model: string) {
  const data = await fetchModelData(model);
  const series = data.equitySeries?.[0]?.series || [];
  const isTwse = TWSE_MODELS.includes(model);

  const holdings = series.map((s) => {
    const latestData = s.data[s.data.length - 1];
    const tickerInfo = isTwse
      ? parseTwseTicker(s.Ticker)
      : { ticker: s.Ticker, code: s.Ticker, name: "" };
    return {
      ticker: tickerInfo.ticker,
      code: tickerInfo.code,
      name: tickerInfo.name,
      return: latestData?.value || 0,
      pctReturn: `${((latestData?.value || 0) * 100).toFixed(2)}%`,
    };
  });

  // Sort by return descending
  holdings.sort((a, b) => b.return - a.return);

  // Add rank after sorting
  const ranked = holdings.map((h, i) => ({ ...h, rank: i + 1 }));

  return {
    model,
    holdings: ranked,
    count: ranked.length,
    last_date: data.last_date || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get top N holdings
 */
export async function getTopHoldings(model: string, limit = 10) {
  const data = await getHoldings(model);
  return {
    model,
    topHoldings: data.holdings.slice(0, limit),
    count: Math.min(limit, data.holdings.length),
    totalHoldings: data.count,
    timestamp: data.timestamp,
  };
}

/**
 * Get specific holding by ticker
 */
export async function getHolding(model: string, ticker: string) {
  const data = await fetchModelData(model);
  const series = data.equitySeries?.[0]?.series || [];
  const isTwse = TWSE_MODELS.includes(model);

  const holding = series.find(
    (s) => s.Ticker.toLowerCase() === ticker.toLowerCase()
  );

  if (!holding) {
    return null;
  }

  const tickerInfo = isTwse
    ? parseTwseTicker(holding.Ticker)
    : { ticker: holding.Ticker, code: holding.Ticker, name: "" };

  return {
    model,
    ticker: tickerInfo.ticker,
    code: tickerInfo.code,
    name: tickerInfo.name,
    history: holding.data,
    latestReturn: holding.data[holding.data.length - 1]?.value || 0,
    last_date: data.last_date || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get monthly returns history
 */
export async function getMonthlyHistory(model: string) {
  const data = await fetchModelData(model);
  const returns = data.monthlyReturns?.[0]?.series || [];

  // Calculate statistics
  const values = returns.map((r) => r.value);
  const cumulative = values.reduce((a, b) => a + b, 0);
  const avg = values.length > 0 ? cumulative / values.length : 0;
  const winMonths = values.filter((v) => v > 0).length;

  return {
    model,
    monthlyReturns: returns.map((r) => ({
      month: r.date.substring(0, 7), // YYYY-MM
      return: r.value,
    })),
    statistics: {
      totalMonths: returns.length,
      cumulativeReturn: cumulative,
      avgMonthlyReturn: avg,
      winMonths,
      loseMonths: returns.length - winMonths,
      winRate: returns.length > 0 ? (winMonths / returns.length) * 100 : 0,
    },
    last_date: data.last_date || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get daily equity history for a model
 */
export async function getDailyHistory(model: string) {
  const data = await fetchModelData(model);
  const series = data.equitySeries?.[0]?.series || [];

  // Aggregate all tickers' daily data into portfolio value
  const dateMap = new Map<string, number[]>();

  for (const ticker of series) {
    for (const point of ticker.data) {
      const values = dateMap.get(point.date) || [];
      values.push(point.value);
      dateMap.set(point.date, values);
    }
  }

  // Calculate average return per day
  const dailyReturns = Array.from(dateMap.entries())
    .map(([date, values]) => ({
      date,
      avgReturn: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    model,
    dailyReturns,
    count: dailyReturns.length,
    last_date: data.last_date || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get full position ledger (tradebook)
 */
export async function getTradebook(model: string) {
  const data = await fetchModelData(model);
  const isTwse = TWSE_MODELS.includes(model);

  const entries = (data.tradebook || []).map((entry) => {
    const tickerInfo = isTwse
      ? parseTwseTicker(entry.ticker)
      : { ticker: String(entry.ticker), code: String(entry.ticker), name: "" };
    return {
      ticker: tickerInfo.ticker,
      code: tickerInfo.code,
      name: tickerInfo.name,
      side: entry.share >= 0 ? ("long" as const) : ("short" as const),
      enterDate: entry.enterDate,
      enterPrice: entry.enterPrice,
      exitDate: entry.exitDate,
      exitPrice: entry.exitPrice,
      exitReason: entry.exitReason,
      daysHeld: entry.days,
      shares: Math.abs(entry.share),
      profitPct: entry.profitPercent,
      maxGainPct: entry.maxGainPercent,
      maxLossPct: entry.maxLossPercent,
      todayPrice: entry.todayPrice,
      isOpen: entry.exitDate === null,
    };
  });

  return {
    model,
    tradebook: entries,
    count: entries.length,
    openPositions: entries.filter((e) => e.isOpen).length,
    last_date: data.last_date || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get open positions only
 */
export async function getPositions(model: string) {
  const { tradebook, last_date } = await getTradebook(model);
  const open = tradebook.filter((e) => e.isOpen);
  return {
    model,
    positions: open,
    count: open.length,
    last_date,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get quick summary snapshot for a model
 */
export async function getSummary(model: string) {
  const [perf, holdings] = await Promise.all([
    getPerformance(model),
    getHoldings(model),
  ]);

  return {
    model,
    mtdReturn: perf.mtdReturn,
    dailyChange: perf.dailyChange,
    activePositions: perf.activePositions,
    winRate: perf.winRate,
    topPerformer: holdings.holdings[0]?.ticker || null,
    topReturn: holdings.holdings[0]?.return || 0,
    worstPerformer: holdings.holdings[holdings.count - 1]?.ticker || null,
    worstReturn: holdings.holdings[holdings.count - 1]?.return || 0,
    last_date: perf.last_date,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get model statistics
 */
export async function getStats(model: string) {
  const [perf, holdings] = await Promise.all([
    getPerformance(model),
    getHoldings(model),
  ]);

  const returns = holdings.holdings.map((h) => h.return);
  const avgReturn = returns.length > 0
    ? returns.reduce((a, b) => a + b, 0) / returns.length
    : 0;

  return {
    model,
    stats: {
      holdingsCount: holdings.count,
      avgHoldingReturn: avgReturn,
      topPerformer: holdings.holdings[0]?.ticker || null,
      topReturn: holdings.holdings[0]?.return || 0,
      worstPerformer: holdings.holdings[holdings.count - 1]?.ticker || null,
      worstReturn: holdings.holdings[holdings.count - 1]?.return || 0,
      mtdReturn: perf.mtdReturn,
      winRate: perf.winRate,
    },
    last_date: perf.last_date,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get recent trades (filled orders)
 */
export async function getRecentTrades(model: string) {
  const data = await fetchModelData(model);
  const filled = data.filledOrders || [];

  return {
    model,
    recentTrades: filled.slice(0, 20),
    count: Math.min(20, filled.length),
    last_date: data.last_date || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get filled trades
 */
export async function getFilledTrades(model: string) {
  const data = await fetchModelData(model);
  return {
    model,
    filledTrades: data.filledOrders || [],
    count: (data.filledOrders || []).length,
    last_date: data.last_date || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get pending trades
 */
export async function getPendingTrades(model: string) {
  const data = await fetchModelData(model);
  return {
    model,
    pendingTrades: data.pendingOrders || [],
    count: (data.pendingOrders || []).length,
    last_date: data.last_date || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Compare multiple models
 */
export async function compareModels(models: string[]) {
  const results = await Promise.all(
    models.map(async (model) => {
      const perf = await getPerformance(model);
      return {
        model,
        mtdReturn: perf.mtdReturn,
        dailyChange: perf.dailyChange,
        activePositions: perf.activePositions,
        winRate: perf.winRate,
      };
    })
  );

  results.sort((a, b) => b.mtdReturn - a.mtdReturn);

  return {
    models: results,
    bestPerformer: results[0]?.model || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get leaderboard of all models
 */
export async function getLeaderboard() {
  return compareModels(ALL_MODELS);
}
