import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import type { Holding } from '@/types'
import { getStockPrice, getOHLCV, getTechnicals, getFundamentals } from './yahoo'
import { getBulkDeals, getFIIDII, getQuarterlyResults } from './nse'
import { calcNiveshScore } from './signals'
import { getDemoPattern } from './patterns'

// ─── Tool Definitions (passed to Claude) ─────────────────────────────────────

export const DRISHTI_TOOLS: Tool[] = [
  {
    name: 'get_stock_price',
    description: 'Get live NSE/BSE stock price, volume and volume ratio for a ticker',
    input_schema: {
      type: 'object',
      properties: { ticker: { type: 'string', description: 'NSE ticker symbol e.g. RELIANCE, HDFCBANK' } },
      required: ['ticker'],
    },
  },
  {
    name: 'get_technicals',
    description: 'Get technical indicators: RSI, MACD, EMAs (20/50/200), Bollinger Bands, ATR, ADX',
    input_schema: {
      type: 'object',
      properties: {
        ticker: { type: 'string' },
        period: { type: 'string', enum: ['1mo', '3mo', '6mo'], description: 'Lookback period' },
      },
      required: ['ticker'],
    },
  },
  {
    name: 'get_ohlcv',
    description: 'Get OHLCV candlestick data for a stock',
    input_schema: {
      type: 'object',
      properties: {
        ticker: { type: 'string' },
        period: { type: 'string', description: '1d, 1w, 1mo, 3mo, 6mo, 1y' },
        interval: { type: 'string', description: '1d, 1wk, 1mo' },
      },
      required: ['ticker'],
    },
  },
  {
    name: 'get_fundamentals',
    description: 'Get fundamental data: PE, PB, ROE, debt/equity, revenue/profit growth, promoter/FII/DII holdings',
    input_schema: {
      type: 'object',
      properties: { ticker: { type: 'string' } },
      required: ['ticker'],
    },
  },
  {
    name: 'get_bulk_deals',
    description: 'Get recent NSE bulk/block deals showing institutional activity',
    input_schema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'Optional date YYYY-MM-DD' } },
    },
  },
  {
    name: 'get_fii_dii',
    description: 'Get FII and DII buy/sell/net data for the current day',
    input_schema: {
      type: 'object',
      properties: { date: { type: 'string' } },
    },
  },
  {
    name: 'get_quarterly_results',
    description: 'Get last 4 quarters of revenue, PAT, EBITDA and YoY growth for a stock',
    input_schema: {
      type: 'object',
      properties: { ticker: { type: 'string' } },
      required: ['ticker'],
    },
  },
  {
    name: 'detect_chart_patterns',
    description: 'Detect technical chart patterns from OHLCV data using AI pattern recognition',
    input_schema: {
      type: 'object',
      properties: { ticker: { type: 'string', description: 'Ticker to analyze' } },
      required: ['ticker'],
    },
  },
  {
    name: 'get_user_portfolio',
    description: 'Get the user portfolio holdings with current P&L and sector allocation',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'calculate_nivesh_score',
    description: 'Calculate the DRISHTI Nivesh Score (0-100) combining technicals, signal type and fundamentals',
    input_schema: {
      type: 'object',
      properties: {
        ticker: { type: 'string' },
        signal_type: { type: 'string' },
      },
      required: ['ticker', 'signal_type'],
    },
  },
]

// ─── Tool Executor ────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  portfolio: Holding[],
  isDemoMode = false,
): Promise<unknown> {
  switch (name) {
    case 'get_stock_price':
      return getStockPrice(input.ticker as string)

    case 'get_technicals':
      return getTechnicals(input.ticker as string)

    case 'get_ohlcv':
      return getOHLCV(input.ticker as string, input.period as string, input.interval as string)

    case 'get_fundamentals':
      return getFundamentals(input.ticker as string)

    case 'get_bulk_deals':
      return getBulkDeals()

    case 'get_fii_dii':
      return getFIIDII()

    case 'get_quarterly_results':
      return getQuarterlyResults(input.ticker as string)

    case 'detect_chart_patterns': {
      if (isDemoMode) return getDemoPattern(input.ticker as string)
      return getDemoPattern(input.ticker as string)
    }

    case 'get_user_portfolio': {
      const { calcPortfolio, getSectorAllocation, getConcentrationRisks } = await import('./portfolio')
      const p = calcPortfolio(portfolio)
      const sectors = getSectorAllocation(portfolio)
      const risks = getConcentrationRisks(portfolio)
      return { ...p, sector_allocation: sectors, concentration_risks: risks }
    }

    case 'calculate_nivesh_score': {
      const tech = await getTechnicals(input.ticker as string)
      const fund = await getFundamentals(input.ticker as string)
      const price = await getStockPrice(input.ticker as string)
      const score = calcNiveshScore(tech, input.signal_type as string, fund, price.price)
      return { ticker: input.ticker, signal_type: input.signal_type, nivesh_score: score }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
