import { NextRequest, NextResponse } from 'next/server'
import { getStockPrice } from '@/lib/yahoo'
import { getFIIDII } from '@/lib/nse'
import { DEMO_MARKET_PULSE } from '@/lib/demo-data'
import type { MarketPulseData, IndexData } from '@/types'

export const runtime = 'nodejs'

const INDEX_TICKERS = [
  { name: 'NIFTY 50', ticker: '^NSEI' },
  { name: 'SENSEX', ticker: '^BSESN' },
  { name: 'NIFTY BANK', ticker: '^NSEBANK' },
  { name: 'NIFTY IT', ticker: 'NIFTYIT.NS' },
  { name: 'INDIA VIX', ticker: '^INDIAVIX' },
]

const MOVER_TICKERS = [
  'RELIANCE', 'HDFCBANK', 'TCS', 'INFY', 'ICICIBANK',
  'WIPRO', 'TITAN', 'COALINDIA', 'ONGC', 'NTPC',
]

let cache: MarketPulseData | null = null
let cacheTime = 0
const TTL = 30 * 1000 // 30 seconds

export async function GET(req: NextRequest) {
  const isDemoMode = req.nextUrl.searchParams.get('demo') === 'true'
  if (isDemoMode) return NextResponse.json(DEMO_MARKET_PULSE)

  const now = Date.now()
  if (cache && now - cacheTime < TTL) return NextResponse.json(cache)

  try {
    const [indicesData, fiidii, moversData] = await Promise.all([
      Promise.all(INDEX_TICKERS.map((i) => getStockPrice(i.ticker).then(p => ({ ...p, name: i.name })).catch(() => null))),
      getFIIDII().catch(() => null),
      Promise.all(MOVER_TICKERS.map((t) => getStockPrice(t).catch(() => null))),
    ])

    const indices: IndexData[] = indicesData.map((d, i) => {
      const def = INDEX_TICKERS[i]
      // If live price is 0 or missing, use demo fallback for that index
      if (!d || d.price <= 0) {
        return DEMO_MARKET_PULSE.indices.find(di => di.name === def.name) ?? null
      }
      return { name: def.name, ticker: def.ticker, value: d.price, change: d.change, change_pct: d.change_pct }
    }).filter(Boolean) as IndexData[]

    const validMovers = moversData.filter(m => m && m.price > 0)
    const sorted = [...validMovers].sort((a, b) => (b?.change_pct ?? 0) - (a?.change_pct ?? 0))
    const gainers = sorted.slice(0, 3).map(m => ({ ticker: m!.ticker.replace('.NS', ''), company: m!.ticker.replace('.NS', ''), change_pct: m!.change_pct }))
    const losers  = sorted.slice(-3).reverse().map(m => ({ ticker: m!.ticker.replace('.NS', ''), company: m!.ticker.replace('.NS', ''), change_pct: m!.change_pct }))

    cache = {
      indices: indices.length ? indices : DEMO_MARKET_PULSE.indices,
      fii_net: fiidii?.fii_net ?? DEMO_MARKET_PULSE.fii_net,
      dii_net: fiidii?.dii_net ?? DEMO_MARKET_PULSE.dii_net,
      gainers: gainers.length ? gainers : DEMO_MARKET_PULSE.gainers,
      losers: losers.length ? losers : DEMO_MARKET_PULSE.losers,
      timestamp: now,
    }
    cacheTime = now
    return NextResponse.json(cache)
  } catch {
    return NextResponse.json(DEMO_MARKET_PULSE)
  }
}
