import type { Signal, MarketPulseData, OHLCV, ChartPattern, AgentAlert, PortfolioHealthScore } from '@/types'

// ─── Demo Signals (March 2026) ────────────────────────────────────────────────

export const DEMO_SIGNALS: Signal[] = [
  {
    id: 'sig_1',
    ticker: 'TITAN',
    company: 'Titan Company Ltd',
    signal_type: 'insider_buy',
    headline: '🔥 Insider Buy — Promoter bought 2.3L shares',
    detail: 'Tata Sons bought 2,30,000 shares at ₹3,462. Strong promoter conviction at current levels.',
    price: 3462,
    change_pct: 2.1,
    nivesh_score: 84,
    timestamp: Date.now() - 2 * 60 * 1000,
    is_new: true,
  },
  {
    id: 'sig_2',
    ticker: 'ICICIBANK',
    company: 'ICICI Bank Ltd',
    signal_type: 'breakout_52w',
    headline: '📈 52W Breakout — Above ₹1,180 resistance zone',
    detail: 'ICICI Bank crossed key resistance with 3.8x average volume. Institutional accumulation visible.',
    price: 1198,
    change_pct: 2.3,
    nivesh_score: 82,
    timestamp: Date.now() - 6 * 60 * 1000,
    is_new: true,
  },
  {
    id: 'sig_3',
    ticker: 'HDFCBANK',
    company: 'HDFC Bank Ltd',
    signal_type: 'fii_accumulation',
    headline: '🏦 FII Accumulation — ₹3,140 Cr net buy this week',
    detail: 'Foreign institutions have been consistently accumulating HDFC Bank over 6 sessions. Macro tailwind from RBI rate cut expectations.',
    price: 1762,
    change_pct: 0.9,
    nivesh_score: 74,
    timestamp: Date.now() - 15 * 60 * 1000,
    is_new: false,
  },
  {
    id: 'sig_4',
    ticker: 'INFY',
    company: 'Infosys Ltd',
    signal_type: 'strong_results',
    headline: '📋 Strong Q3FY26 — PAT +19% YoY, Large deal wins $4.1B',
    detail: 'Infosys beat street estimates on all metrics. Revenue guidance raised for FY26. AI-led services driving margin expansion.',
    price: 1876,
    change_pct: 3.4,
    nivesh_score: 81,
    timestamp: Date.now() - 22 * 60 * 1000,
    is_new: false,
  },
  {
    id: 'sig_5',
    ticker: 'ZOMATO',
    company: 'Zomato Ltd',
    signal_type: 'volume_spike',
    headline: '📊 Unusual Volume — 5.2x average volume spike',
    detail: 'Heavy buying detected after quick commerce unit Blinkit reported 82% YoY GMV growth. Possible pre-results institutional entry.',
    price: 218,
    change_pct: 4.8,
    nivesh_score: 73,
    timestamp: Date.now() - 35 * 60 * 1000,
    is_new: false,
  },
  {
    id: 'sig_6',
    ticker: 'BAJFINANCE',
    company: 'Bajaj Finance Ltd',
    signal_type: 'reversal_pattern',
    headline: '📉 Reversal Pattern — Double Bottom at ₹6,080 support',
    detail: 'Classic double bottom confirmed with RSI divergence. Volume on second bottom 40% lower. Textbook reversal setup.',
    price: 6240,
    change_pct: 1.5,
    nivesh_score: 69,
    timestamp: Date.now() - 48 * 60 * 1000,
    is_new: false,
  },
  {
    id: 'sig_7',
    ticker: 'TCS',
    company: 'Tata Consultancy Services',
    signal_type: 'bulk_deal',
    headline: '🔔 Bulk Deal — LIC bought 80L shares at ₹3,842',
    detail: 'Life Insurance Corporation acquired 80 lakh shares. LIC has a history of buying at multi-month lows.',
    price: 3842,
    change_pct: 0.7,
    nivesh_score: 71,
    timestamp: Date.now() - 65 * 60 * 1000,
    is_new: false,
  },
  {
    id: 'sig_8',
    ticker: 'SUNPHARMA',
    company: 'Sun Pharmaceutical Ltd',
    signal_type: 'strong_results',
    headline: '💊 Record Q3FY26 — US specialty biz up 34% YoY',
    detail: 'Sun Pharma US specialty segment hit record revenues. EBITDA margin expanded 280bps. Analyst upgrades pouring in.',
    price: 1724,
    change_pct: 5.2,
    nivesh_score: 87,
    timestamp: Date.now() - 90 * 60 * 1000,
    is_new: false,
  },
  {
    id: 'sig_9',
    ticker: 'ADANIPORTS',
    company: 'Adani Ports & SEZ',
    signal_type: 'fii_accumulation',
    headline: '🚢 FII Buy — ₹1,820 Cr inflow over 3 sessions',
    detail: 'Foreign funds re-entering Adani Ports after completing MSCI rebalance. Cargo volume growth at 14% YoY.',
    price: 1164,
    change_pct: 1.8,
    nivesh_score: 68,
    timestamp: Date.now() - 110 * 60 * 1000,
    is_new: false,
  },
  {
    id: 'sig_10',
    ticker: 'MARUTI',
    company: 'Maruti Suzuki India Ltd',
    signal_type: 'breakout_52w',
    headline: '🚗 Volume Surge — Monthly sales record in Feb 2026',
    detail: 'Maruti reported best-ever monthly sales of 2.38L units. EV launch catalyst + festive season carryover demand.',
    price: 12680,
    change_pct: 2.9,
    nivesh_score: 76,
    timestamp: Date.now() - 130 * 60 * 1000,
    is_new: false,
  },
  {
    id: 'sig_11',
    ticker: 'WIPRO',
    company: 'Wipro Ltd',
    signal_type: 'reversal_pattern',
    headline: '🔄 Cup & Handle Pattern — 8-month base breakout',
    detail: 'Wipro forming textbook cup & handle on weekly chart. Agentic AI contracts pipeline growing. RSI at 54 — not overbought.',
    price: 318,
    change_pct: 1.2,
    nivesh_score: 62,
    timestamp: Date.now() - 150 * 60 * 1000,
    is_new: false,
  },
  {
    id: 'sig_12',
    ticker: 'NTPC',
    company: 'NTPC Ltd',
    signal_type: 'insider_buy',
    headline: '⚡ DII Buying — Govt RE capex story intact',
    detail: 'Mutual funds accumulated ₹940 Cr in NTPC over 5 sessions. Green energy capacity target at 60 GW by FY30 on track.',
    price: 342,
    change_pct: 0.8,
    nivesh_score: 66,
    timestamp: Date.now() - 170 * 60 * 1000,
    is_new: false,
  },
]

// ─── Demo Market Pulse (March 2026) ──────────────────────────────────────────

export const DEMO_MARKET_PULSE: MarketPulseData = {
  indices: [
    { name: 'NIFTY 50',   ticker: 'NIFTY',     value: 22897,  change: 138.4,  change_pct: 0.61 },
    { name: 'SENSEX',     ticker: 'SENSEX',     value: 75342,  change: 462.1,  change_pct: 0.62 },
    { name: 'NIFTY BANK', ticker: 'BANKNIFTY',  value: 49182,  change: -184.6, change_pct: -0.37 },
    { name: 'NIFTY IT',   ticker: 'NIFTYIT',    value: 34587,  change: 620.4,  change_pct: 1.83 },
    { name: 'INDIA VIX',  ticker: 'VIX',        value: 13.48,  change: -0.62,  change_pct: -4.40 },
  ],
  fii_net: 3140,
  dii_net: -620,
  gainers: [
    { ticker: 'SUNPHARMA', company: 'Sun Pharma',  change_pct: 5.2 },
    { ticker: 'ZOMATO',    company: 'Zomato',       change_pct: 4.8 },
    { ticker: 'INFY',      company: 'Infosys',      change_pct: 3.4 },
  ],
  losers: [
    { ticker: 'COALINDIA',  company: 'Coal India',  change_pct: -2.4 },
    { ticker: 'ONGC',       company: 'ONGC',         change_pct: -1.9 },
    { ticker: 'TATASTEEL',  company: 'Tata Steel',   change_pct: -1.3 },
  ],
  timestamp: Date.now(),
}

// ─── Demo OHLCV ───────────────────────────────────────────────────────────────

function generateOHLCV(basePrice: number, days: number, seed: number): OHLCV[] {
  const data: OHLCV[] = []
  let price = basePrice * (0.88 + (seed % 25) / 100)
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const r1 = (Math.sin(seed * 0.001 + i * 0.613) + 1) / 2
    const r2 = (Math.sin(seed * 0.002 + i * 1.414) + 1) / 2
    const r3 = (Math.sin(seed * 0.003 + i * 0.271) + 1) / 2
    const r4 = (Math.sin(seed * 0.004 + i * 1.732) + 1) / 2
    const vol = basePrice * 0.014
    const drift = (seed % 3 === 0) ? 0.0003 : (seed % 3 === 1) ? -0.0001 : 0.0002
    price = Math.max(price * (1 + drift) + (r1 - 0.48) * vol, basePrice * 0.45)
    const open  = price
    const close = Math.max(open + (r2 - 0.5) * vol * 0.8, basePrice * 0.45)
    const high  = Math.max(open, close) + r3 * vol * 0.4
    const low   = Math.min(open, close) - r4 * vol * 0.4
    data.push({
      date:   d.toISOString().split('T')[0],
      open:   Math.round(open  * 100) / 100,
      high:   Math.round(high  * 100) / 100,
      low:    Math.round(low   * 100) / 100,
      close:  Math.round(close * 100) / 100,
      volume: Math.round(500_000 + r1 * 3_000_000),
    })
  }
  return data
}

export const DEMO_OHLCV: Record<string, OHLCV[]> = {
  'RELIANCE.NS':  generateOHLCV(2824, 120, 1001),
  'HDFCBANK.NS':  generateOHLCV(1762, 120, 2002),
  'INFY.NS':      generateOHLCV(1876, 120, 3003),
  'TCS.NS':       generateOHLCV(3842, 120, 4004),
  'TITAN.NS':     generateOHLCV(3462, 120, 5005),
  'ICICIBANK.NS': generateOHLCV(1198, 120, 6006),
  'WIPRO.NS':     generateOHLCV(318,  120, 7007),
  'BAJFINANCE.NS':generateOHLCV(6240, 120, 8008),
  'SUNPHARMA.NS': generateOHLCV(1724, 120, 9009),
  'ZOMATO.NS':    generateOHLCV(218,  120, 1010),
}

// ─── Demo Pattern ─────────────────────────────────────────────────────────────

export const DEMO_PATTERN: ChartPattern = {
  pattern_name: 'Ascending Triangle',
  confidence: 87,
  support_level: 2780,
  resistance_level: 2860,
  target_price: 2980,
  stop_loss: 2720,
  description: 'An ascending triangle pattern is forming with higher lows and flat resistance at ₹2,860. This is a bullish continuation pattern indicating accumulation. A breakout above resistance with volume confirmation could target ₹2,980.',
  description_hi: 'Yeh pattern ek bullish continuation signal hai. Stock consolidate karke upar jaane ki taiyari kar raha hai. ₹2,860 resistance break hone ke baad strong move expected hai. Stop loss ₹2,720 ke neeche rakhein.',
  historical_win_rate: 71,
  key_levels: [2780, 2860, 2980],
  direction: 'bullish',
}

// ─── Demo Agent Alert ─────────────────────────────────────────────────────────

export const DEMO_ALERT_TITAN: AgentAlert = {
  ticker: 'TITAN',
  company: 'Titan Company Ltd',
  action: 'BUY',
  nivesh_score: 84,
  entry_zone: { low: 3420, high: 3480 },
  stop_loss: 3340,
  target: 3820,
  verdict_en: 'Titan Company shows strong insider buying by Tata Sons. Technically bullish above 50 EMA at ₹3,380. Fundamentals solid with 18% profit growth YoY and expanding jewellery market share. Volume confirmation present on breakout.',
  verdict_hi: 'Titan mein promoter ki strong buying aa rahi hai. RSI 56 hai — overbought nahi. Technically acha setup hai. Entry zone ₹3,420-3,480 mein consider karein, stop loss ₹3,340 ke neeche. Target ₹3,820.',
  sources: ['NSE Insider Filing Mar-2026', 'Q3FY26 Results', 'Yahoo Finance Live', 'NSE Bulk Deal Data'],
  steps: [
    { step: 1, label: 'Signal Detection',        status: 'done', detail: 'Promoter buying 2.3L shares at ₹3,462 detected' },
    { step: 2, label: 'Technical Enrichment',    status: 'done', detail: 'RSI: 56 | Above 50EMA | MACD positive crossover' },
    { step: 3, label: 'Fundamental Check',       status: 'done', detail: 'Q3 PAT +18% YoY | ROE 28% | Promoter holding 52%' },
    { step: 4, label: 'Portfolio Personalization', status: 'done', detail: 'Not in your portfolio — fresh entry opportunity' },
  ],
  timestamp: Date.now(),
}

// ─── Demo Portfolio Score ─────────────────────────────────────────────────────

export const DEMO_PORTFOLIO_SCORE: PortfolioHealthScore = {
  score: 72,
  grade: 'Good',
  issues: [
    'Over-concentrated in Banking sector (52%)',
    'No international or global ETF exposure',
    'IT sector under-weight at 12%',
  ],
  suggestions: [
    'Reduce HDFC Bank allocation below 25% of portfolio',
    'Add 10-15% IT sector exposure (INFY or TCS)',
    'Consider NIFTY Pharma ETF for defensive allocation',
    'Add Nifty BeES or Motilal NASDAQ ETF for diversification',
  ],
  sector_allocation: {
    Banking: 52,
    IT: 12,
    FMCG: 18,
    Auto: 8,
    Pharma: 0,
    Others: 10,
  },
  concentration_risk: ['HDFC Bank at 38% of portfolio exceeds 25% single-stock limit'],
}
