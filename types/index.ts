// ─── Market Data ─────────────────────────────────────────────────────────────

export type DataSourceState = 'live' | 'cached' | 'fallback' | 'demo' | 'reference'

export interface DataSourceMeta {
  state: DataSourceState
  label: string
  as_of: number
  note?: string
}

export interface StockPrice {
  ticker: string
  price: number
  change: number
  change_pct: number
  volume: number
  avg_volume_30d: number
  volume_ratio: number
  timestamp: number
  source: DataSourceMeta
}

export interface OHLCV {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Technicals {
  ticker: string
  rsi: number
  macd: number
  macd_signal: number
  ema20: number
  ema50: number
  ema200: number
  atr: number
  bb_upper: number
  bb_lower: number
  adx: number
}

export interface Fundamentals {
  ticker: string
  pe: number
  pb: number
  roe: number
  debt_equity: number
  revenue_growth: number
  profit_growth: number
  promoter_holding: number
  fii_holding: number
  dii_holding: number
  market_cap: number
  sector: string
}

export interface QuarterlyResult {
  quarter: string
  revenue: number
  pat: number
  ebitda: number
  ebitda_margin: number
  pat_margin: number
  revenue_yoy: number
  pat_yoy: number
}

// ─── NSE Data ────────────────────────────────────────────────────────────────

export interface BulkDeal {
  symbol: string
  clientName: string
  dealType: 'BUY' | 'SELL'
  quantity: number
  price: number
  date: string
  source_state?: DataSourceState
}

export interface FIIDIIData {
  date: string
  fii_buy: number
  fii_sell: number
  fii_net: number
  dii_buy: number
  dii_sell: number
  dii_net: number
  source_state?: DataSourceState
}

// ─── Signals ─────────────────────────────────────────────────────────────────

export type SignalType =
  | 'insider_buy'
  | 'insider_sell'
  | 'breakout_52w'
  | 'volume_spike'
  | 'fii_accumulation'
  | 'fii_selling'
  | 'strong_results'
  | 'promoter_pledge'
  | 'bulk_deal'
  | 'reversal_pattern'
  | 'management_commentary'
  | 'regulatory_alert'

export interface Signal {
  id: string
  ticker: string
  company: string
  signal_type: SignalType
  headline: string
  detail: string
  price: number
  change_pct: number
  nivesh_score: number
  timestamp: number
  raw_data?: Record<string, unknown>
  is_new?: boolean
  source_state?: DataSourceState
  // Groq-enriched fields
  groq_sentiment?: 'bullish' | 'bearish' | 'neutral'
  groq_reason?: string
  groq_confidence?: number
}

// ─── Patterns ────────────────────────────────────────────────────────────────

export interface ChartPattern {
  pattern_name: string
  confidence: number
  support_level: number
  resistance_level: number
  target_price: number
  stop_loss: number
  description: string
  description_hi: string
  historical_win_rate: number
  key_levels: number[]
  direction: 'bullish' | 'bearish' | 'neutral'
}

// ─── Portfolio ───────────────────────────────────────────────────────────────

export interface Holding {
  id: string
  ticker: string
  company: string
  qty: number
  avg_buy_price: number
  buy_date: string
  current_price?: number
  current_value?: number
  pnl?: number
  pnl_pct?: number
  sector?: string
}

export interface Portfolio {
  holdings: Holding[]
  total_invested: number
  current_value: number
  total_pnl: number
  total_pnl_pct: number
}

export interface PortfolioHealthScore {
  score: number
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  issues: string[]
  suggestions: string[]
  sector_allocation: Record<string, number>
  concentration_risk: string[]
}

// ─── Agent Types ─────────────────────────────────────────────────────────────

export type AgentStep =
  | { step: 1; label: 'Signal Detection'; status: 'pending' | 'running' | 'done'; detail?: string }
  | { step: 2; label: 'Technical Enrichment'; status: 'pending' | 'running' | 'done'; detail?: string }
  | { step: 3; label: 'Fundamental Check'; status: 'pending' | 'running' | 'done'; detail?: string }
  | { step: 4; label: 'Portfolio Personalization'; status: 'pending' | 'running' | 'done'; detail?: string }

export interface AgentAlert {
  ticker: string
  company: string
  action: 'BUY' | 'ACCUMULATE' | 'WATCH' | 'AVOID' | 'REDUCE' | 'HOLD'
  nivesh_score: number
  entry_zone?: { low: number; high: number }
  stop_loss?: number
  target?: number
  verdict_en: string
  verdict_hi: string
  sources: string[]
  steps: AgentStep[]
  timestamp: number
}

export interface RoutingEvent {
  task: string
  model: 'groq' | 'claude'
  model_label: string
  detail?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: AgentStep[]
  alert?: AgentAlert
  routing?: RoutingEvent[]   // Visible model routing trail
  timestamp: number
}

// ─── Market Pulse ────────────────────────────────────────────────────────────

export interface IndexData {
  name: string
  ticker: string
  value: number
  change: number
  change_pct: number
}

export interface MarketPulseData {
  indices: IndexData[]
  fii_net: number
  dii_net: number
  gainers: { ticker: string; company: string; change_pct: number }[]
  losers: { ticker: string; company: string; change_pct: number }[]
  timestamp: number
  source: DataSourceMeta
}

// ─── SSE Events ──────────────────────────────────────────────────────────────

export interface SSEEvent {
  type: 'step' | 'tool_result' | 'final' | 'error' | 'routing'
  step?: number
  label?: string
  // routing fields
  task?: string
  model?: 'groq' | 'claude'
  model_label?: string
  detail?: string
  alert?: AgentAlert
  error?: string
}
