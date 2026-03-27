import type { OHLCV, ChartPattern } from '@/types'

// Pattern detection using Claude/Groq — this formats data for the API call.
// Actual detection happens in /api/patterns route.

export function formatOHLCVForClaude(data: OHLCV[]): string {
  const last90 = data.slice(-90)
  return last90.map(c => `${c.date},${c.open},${c.high},${c.low},${c.close},${c.volume}`).join('\n')
}

// ─── All known NSE stock base prices for pattern calculation ──────────────────

const BASE_PRICES: Record<string, number> = {
  RELIANCE: 2824,  HDFCBANK: 1762,  TCS: 3842,    INFY: 1876,   TITAN: 3462,
  WIPRO: 318,      ITC: 452,        BAJFINANCE: 6240, TATASTEEL: 136, ONGC: 248,
  ICICIBANK: 1198, KOTAKBANK: 1920, MARUTI: 12680, SUNPHARMA: 1724,
  NTPC: 342,       COALINDIA: 372,  DIVISLAB: 4980, DRREDDY: 5840,
  ADANIENT: 2180,  BAJAJFINSV: 1640, HINDUNILVR: 2280, NESTLEIND: 2120,
  AXISBANK: 1042,  LT: 3480,        ULTRACEMCO: 9840, ASIANPAINT: 2180,
  SBILIFE: 1480,   HCLTECH: 1840,   TATAMOTORS: 724,  POWERGRID: 286,
  JSWSTEEL: 820,   BHARTIARTL: 1680, ADANIPORTS: 1164, APOLLOHOSP: 6480,
  CIPLA: 1420,     EICHERMOT: 4720, GRASIM: 2540,  HEROMOTOCO: 4180,
  HINDALCO: 624,   INDUSINDBK: 980,  M_M: 2840,    SBIN: 762,
  TECHM: 1580,     TRENT: 5820,     VEDL: 442,     ZOMATO: 218,
  BRITANNIA: 4820, BPCL: 312,       SHREECEM: 26480, UPL: 498,
  HDFCLIFE: 682,   TATACONSUM: 1028,
  PERSISTENT: 4820, COFORGE: 7240,  MPHASIS: 2640, LTTS: 4380,   KPIT: 1480,
  IRCTC: 780,       DMART: 3840,    PIDILITIND: 2680, TORNTPHARM: 3120,
  CHOLAFIN: 1380,   MUTHOOTFIN: 2140, HAVELLS: 1620, POLYCAB: 5240,
  MANKIND: 2480,    SHRIRAMFIN: 540, NAUKRI: 6840, PAYTM: 680,
  TATAELXSI: 5840,  SIEMENS: 6420,   ABB: 7280,
  IDFCFIRSTB: 68,   BANKBARODA: 224,  PNB: 98,      CANARABANK: 96,
  FEDERALBNK: 184,  INDIGO: 4280,    GODREJCP: 1180, AMBUJACEM: 624,
  ACC: 1980,        TORNTPOWER: 1680, PVRINOX: 1480, ZEEL: 142,
}

// ─── Pattern library — 12 distinct patterns ───────────────────────────────────

interface PatternDef {
  name: string
  direction: 'bullish' | 'bearish' | 'neutral'
  win_rate: number
  // Multipliers relative to base price
  support_mult: number
  resistance_mult: number
  target_mult: number
  stop_mult: number
  desc_en: (ticker: string, support: number, resistance: number, target: number) => string
  desc_hi: (ticker: string, support: number, resistance: number, target: number) => string
}

const PATTERN_LIBRARY: PatternDef[] = [
  {
    name: 'Ascending Triangle', direction: 'bullish', win_rate: 71,
    support_mult: 0.960, resistance_mult: 1.028, target_mult: 1.095, stop_mult: 0.938,
    desc_en: (t, s, r, tgt) => `${t} is forming an ascending triangle with higher lows converging towards flat resistance at ₹${r.toLocaleString('en-IN')}. Breakout above resistance targets ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} mein ascending triangle ban raha hai. ₹${r.toLocaleString('en-IN')} resistance break hone ke baad ₹${tgt.toLocaleString('en-IN')} tak jaane ki ummeed hai.`,
  },
  {
    name: 'Bull Flag', direction: 'bullish', win_rate: 68,
    support_mult: 0.968, resistance_mult: 1.018, target_mult: 1.082, stop_mult: 0.950,
    desc_en: (t, s, r, tgt) => `${t} showing a bull flag consolidation after a strong impulse move. Price is compressing between ₹${s.toLocaleString('en-IN')}–₹${r.toLocaleString('en-IN')} before the next leg up to ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} bull flag pattern mein hai. Strong move ke baad consolidation chal raha hai. ₹${r.toLocaleString('en-IN')} cross hone pe ₹${tgt.toLocaleString('en-IN')} target milega.`,
  },
  {
    name: 'Cup & Handle', direction: 'bullish', win_rate: 74,
    support_mult: 0.945, resistance_mult: 1.015, target_mult: 1.110, stop_mult: 0.930,
    desc_en: (t, s, r, tgt) => `${t} has completed a cup formation and is now in the handle phase near ₹${r.toLocaleString('en-IN')}. Breakout above the rim targets ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} mein cup & handle pattern complete ho raha hai. ₹${r.toLocaleString('en-IN')} rim break karne ke baad ₹${tgt.toLocaleString('en-IN')} tak strong move expected hai.`,
  },
  {
    name: 'Double Bottom', direction: 'bullish', win_rate: 76,
    support_mult: 0.930, resistance_mult: 1.045, target_mult: 1.120, stop_mult: 0.918,
    desc_en: (t, s, r, tgt) => `${t} has formed a double bottom at ₹${s.toLocaleString('en-IN')} — a classic reversal signal. Neckline break at ₹${r.toLocaleString('en-IN')} confirms the pattern and targets ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} mein double bottom pattern hai ₹${s.toLocaleString('en-IN')} pe. Yeh strong reversal signal hai. ₹${r.toLocaleString('en-IN')} neckline cross karne ke baad ₹${tgt.toLocaleString('en-IN')} target hai.`,
  },
  {
    name: 'Breakout & Retest', direction: 'bullish', win_rate: 80,
    support_mult: 0.975, resistance_mult: 1.010, target_mult: 1.078, stop_mult: 0.960,
    desc_en: (t, s, r, tgt) => `${t} has broken above ₹${r.toLocaleString('en-IN')} and is now retesting it as support — a high-probability continuation setup. Target: ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} ₹${r.toLocaleString('en-IN')} resistance tod ke ab usse support le raha hai. Classic breakout retest setup. ₹${tgt.toLocaleString('en-IN')} tak jaane ki probability zyada hai.`,
  },
  {
    name: 'Morning Star', direction: 'bullish', win_rate: 69,
    support_mult: 0.955, resistance_mult: 1.032, target_mult: 1.098, stop_mult: 0.942,
    desc_en: (t, s, r, tgt) => `${t} printed a Morning Star candlestick reversal at ₹${s.toLocaleString('en-IN')} support. The three-candle pattern signals strong buying pressure returning. Target: ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} mein morning star candle pattern bana hai ₹${s.toLocaleString('en-IN')} ke paas. Buyers wapas aa rahe hain. ₹${tgt.toLocaleString('en-IN')} tak move expected hai.`,
  },
  {
    name: 'Head & Shoulders', direction: 'bearish', win_rate: 72,
    support_mult: 1.010, resistance_mult: 1.065, target_mult: 0.915, stop_mult: 1.078,
    desc_en: (t, s, r, tgt) => `${t} has completed a Head & Shoulders pattern with neckline at ₹${s.toLocaleString('en-IN')}. This bearish reversal pattern targets a move down to ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} mein head & shoulders pattern complete ho gaya hai. ₹${s.toLocaleString('en-IN')} neckline toot gayi to ₹${tgt.toLocaleString('en-IN')} tak girne ka chance hai.`,
  },
  {
    name: 'Descending Triangle', direction: 'bearish', win_rate: 67,
    support_mult: 0.980, resistance_mult: 1.020, target_mult: 0.928, stop_mult: 1.035,
    desc_en: (t, s, r, tgt) => `${t} is forming a descending triangle — lower highs pressing against flat support at ₹${s.toLocaleString('en-IN')}. A break below support targets ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} mein descending triangle ban raha hai. ₹${s.toLocaleString('en-IN')} support toot gaya to ₹${tgt.toLocaleString('en-IN')} tak downside hai.`,
  },
  {
    name: 'Double Top', direction: 'bearish', win_rate: 70,
    support_mult: 0.958, resistance_mult: 1.042, target_mult: 0.910, stop_mult: 1.055,
    desc_en: (t, s, r, tgt) => `${t} has formed a double top at ₹${r.toLocaleString('en-IN')} resistance — a classic reversal pattern. Neckline at ₹${s.toLocaleString('en-IN')} and target on breakdown is ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} mein double top hai ₹${r.toLocaleString('en-IN')} pe. Bearish reversal signal hai. ₹${s.toLocaleString('en-IN')} support toot gaya to ₹${tgt.toLocaleString('en-IN')} tak gira sakta hai.`,
  },
  {
    name: 'Symmetrical Triangle', direction: 'neutral', win_rate: 62,
    support_mult: 0.962, resistance_mult: 1.038, target_mult: 1.088, stop_mult: 0.945,
    desc_en: (t, s, r, tgt) => `${t} is consolidating in a symmetrical triangle between ₹${s.toLocaleString('en-IN')}–₹${r.toLocaleString('en-IN')}. A breakout in either direction will be significant. Bullish resolution targets ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} symmetrical triangle mein consolidate kar raha hai. ₹${s.toLocaleString('en-IN')}-₹${r.toLocaleString('en-IN')} range mein hai. Breakout hone par bada move aayega.`,
  },
  {
    name: 'Bullish Engulfing', direction: 'bullish', win_rate: 66,
    support_mult: 0.965, resistance_mult: 1.025, target_mult: 1.072, stop_mult: 0.952,
    desc_en: (t, s, r, tgt) => `${t} printed a strong Bullish Engulfing candle at ₹${s.toLocaleString('en-IN')} support, signaling a reversal of short-term bearish momentum. Target: ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} mein bullish engulfing candle bana hai ₹${s.toLocaleString('en-IN')} support pe. Bears ka momentum khatam ho raha hai. ₹${tgt.toLocaleString('en-IN')} target hai.`,
  },
  {
    name: 'Rounding Bottom', direction: 'bullish', win_rate: 73,
    support_mult: 0.938, resistance_mult: 1.020, target_mult: 1.105, stop_mult: 0.922,
    desc_en: (t, s, r, tgt) => `${t} has been forming a rounding bottom over several weeks, now approaching the breakout zone near ₹${r.toLocaleString('en-IN')}. A sustained close above confirms a move to ₹${tgt.toLocaleString('en-IN')}.`,
    desc_hi: (t, s, r, tgt) => `${t} mein rounding bottom pattern hai. Kai hafte mein base ban gaya hai. ₹${r.toLocaleString('en-IN')} ke upar close hone pe ₹${tgt.toLocaleString('en-IN')} tak strong move hoga.`,
  },
]

// ─── Seeded demo pattern generator ───────────────────────────────────────────
// Produces a unique, stable pattern for every ticker — not random on reload.

export function getDemoPattern(ticker: string): ChartPattern {
  const sym = ticker.replace('.NS', '').replace('.BO', '').toUpperCase()

  // Deterministic seed from ticker name
  const seed = sym.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0)

  // Pick a pattern deterministically
  const patternIndex = seed % PATTERN_LIBRARY.length
  const p = PATTERN_LIBRARY[patternIndex]

  // Get base price — use known price or derive from seed
  const basePrice = BASE_PRICES[sym] ?? (800 + (seed % 4200))

  // Round price to 2 decimal places, sensible for the stock's range
  const round = (v: number) => Math.round(v * 20) / 20

  const support    = round(basePrice * p.support_mult)
  const resistance = round(basePrice * p.resistance_mult)
  const target     = round(basePrice * p.target_mult)
  const stop_loss  = round(basePrice * p.stop_mult)

  // Win rate with a small per-ticker variation (±5%)
  const win_rate = Math.min(92, Math.max(55, p.win_rate + (seed % 10) - 5))

  // Confidence: 72–93% range, stable per ticker
  const confidence = 72 + (seed % 22)

  return {
    pattern_name: p.name,
    confidence,
    support_level: support,
    resistance_level: resistance,
    target_price: target,
    stop_loss,
    description: p.desc_en(sym, support, resistance, target),
    description_hi: p.desc_hi(sym, support, resistance, target),
    historical_win_rate: win_rate,
    key_levels: [support, resistance, target],
    direction: p.direction,
  }
}

// ─── SVG annotation helpers ───────────────────────────────────────────────────

export interface PatternAnnotation {
  type: 'hline' | 'arrow' | 'zone' | 'label'
  price?: number
  price1?: number
  price2?: number
  label?: string
  color?: string
  x?: number
  y?: number
}

export function buildAnnotations(
  pattern: ChartPattern,
  chartHeight: number,
  priceMin: number,
  priceMax: number,
): PatternAnnotation[] {
  const priceToY = (p: number) =>
    chartHeight - ((p - priceMin) / (priceMax - priceMin)) * chartHeight
  return [
    { type: 'hline', price: pattern.support_level,    label: `Support ₹${pattern.support_level.toLocaleString('en-IN')}`,    color: '#00D4AA', y: priceToY(pattern.support_level) },
    { type: 'hline', price: pattern.resistance_level, label: `Resistance ₹${pattern.resistance_level.toLocaleString('en-IN')}`, color: '#FFB800', y: priceToY(pattern.resistance_level) },
    { type: 'hline', price: pattern.target_price,     label: `Target ₹${pattern.target_price.toLocaleString('en-IN')}`,     color: '#3B8BEB', y: priceToY(pattern.target_price) },
    { type: 'hline', price: pattern.stop_loss,        label: `Stop ₹${pattern.stop_loss.toLocaleString('en-IN')}`,          color: '#FF4560', y: priceToY(pattern.stop_loss) },
  ]
}
