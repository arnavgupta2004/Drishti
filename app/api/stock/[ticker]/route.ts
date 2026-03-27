import { NextRequest, NextResponse } from 'next/server'
import { getStockPrice, getOHLCV, getTechnicals, getFundamentals } from '@/lib/yahoo'
import { getQuarterlyResults } from '@/lib/nse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'   // never cache — different ticker/period = fresh response

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const period = req.nextUrl.searchParams.get('period') ?? '3mo'
  const interval = req.nextUrl.searchParams.get('interval') ?? '1d'

  try {
    const [price, ohlcv, technicals, fundamentals, quarterly] = await Promise.all([
      getStockPrice(ticker),
      getOHLCV(ticker, period, interval),
      getTechnicals(ticker),
      getFundamentals(ticker),
      Promise.resolve(getQuarterlyResults(ticker)),
    ])

    return NextResponse.json({ price, ohlcv, technicals, fundamentals, quarterly })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 })
  }
}
