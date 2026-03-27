import { NextRequest, NextResponse } from 'next/server'
import { generateAutoSignals } from '@/lib/signals'
import { getBulkDeals } from '@/lib/nse'
import { getStockPrice } from '@/lib/yahoo'
import { classifySignalSentiment } from '@/lib/aiRouter'
import { DEMO_SIGNALS } from '@/lib/demo-data'
import type { Signal } from '@/types'

export const runtime = 'nodejs'

// In-memory signal cache
let signalCache: Signal[] = []
let lastRefresh = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(req: NextRequest) {
  const isDemoMode = req.nextUrl.searchParams.get('demo') === 'true'

  if (isDemoMode) {
    // In demo mode still run Groq sentiment on the static signals (shows routing live)
    const enriched = await enrichSignalsWithGroq(DEMO_SIGNALS.slice(0, 4))
    const rest = DEMO_SIGNALS.slice(4)
    return NextResponse.json({ signals: [...enriched, ...rest], cached: false })
  }

  const now = Date.now()
  if (signalCache.length > 0 && now - lastRefresh < CACHE_TTL) {
    return NextResponse.json({ signals: signalCache, cached: true })
  }

  try {
    const [bulkDeals, baseSignals] = await Promise.all([
      getBulkDeals().catch(() => []),
      Promise.resolve(generateAutoSignals(false)),
    ])

    const freshSignals = [...baseSignals]

    // Add bulk deal signals with Groq sentiment
    const bulkSignals: Signal[] = []
    for (const deal of bulkDeals.slice(0, 3)) {
      // Skip invalid / malformed bulk deal records
      if (!deal.symbol || !deal.clientName || deal.quantity <= 0 || deal.price <= 0) continue
      // Skip tiny deals (less than 10k shares — noise)
      if (deal.quantity < 10000) continue
      try {
        const priceData = await getStockPrice(deal.symbol)
        // Skip if we couldn't get a real price
        if (!priceData.price || priceData.price <= 0) continue

        const qtyLabel = deal.quantity >= 100000
          ? `${(deal.quantity / 100000).toFixed(1)}L`
          : `${(deal.quantity / 1000).toFixed(0)}K`
        const headline = `🔔 Bulk Deal — ${deal.clientName} ${deal.dealType === 'BUY' ? 'bought' : 'sold'} ${qtyLabel} shares`
        const detail = `${deal.clientName} ${deal.dealType === 'BUY' ? 'bought' : 'sold'} ${deal.quantity.toLocaleString('en-IN')} shares at ₹${deal.price.toLocaleString('en-IN')}`

        bulkSignals.push({
          id: `bulk_${deal.symbol}_${Date.now()}`,
          ticker: deal.symbol,
          company: deal.symbol,
          signal_type: 'bulk_deal',
          headline,
          detail,
          price: priceData.price,
          change_pct: priceData.change_pct,
          nivesh_score: Math.round(deal.dealType === 'BUY' ? 65 + Math.random() * 20 : 30 + Math.random() * 20),
          timestamp: Date.now(),
          is_new: true,
        })
      } catch { /* skip */ }
    }

    // Enrich bulk signals with Groq sentiment in parallel
    const enrichedBulk = await enrichSignalsWithGroq(bulkSignals)
    freshSignals.unshift(...enrichedBulk)

    signalCache = freshSignals.slice(0, 12)
    lastRefresh = now

    return NextResponse.json({ signals: signalCache, cached: false })
  } catch {
    return NextResponse.json({ signals: DEMO_SIGNALS, cached: false })
  }
}

// ─── Enrich signals with Groq sentiment ───────────────────────────────────────

async function enrichSignalsWithGroq(signals: Signal[]): Promise<Signal[]> {
  return Promise.all(
    signals.map(async (signal) => {
      try {
        const sent = await classifySignalSentiment(
          signal.headline,
          signal.detail,
          signal.signal_type,
        )
        return {
          ...signal,
          groq_sentiment: sent.sentiment,
          groq_reason: sent.reason,
          groq_confidence: sent.confidence,
        } as Signal & { groq_sentiment: string; groq_reason: string; groq_confidence: number }
      } catch {
        return signal
      }
    })
  )
}
