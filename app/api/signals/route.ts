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

// Separate 30-min cache for SEBI regulatory alerts
let sebiCache: Signal[] = []
let sebiLastRefresh = 0
const SEBI_CACHE_TTL = 30 * 60 * 1000

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
    const [bulkDeals, baseSignals, mgmtSignals, sebiSignals] = await Promise.all([
      getBulkDeals().catch(() => []),
      Promise.resolve(generateAutoSignals(false)),
      generateManagementCommentarySignals().catch(() => []),
      generateRegulatoryAlertSignals().catch(() => []),
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

    // Prepend mgmt commentary and SEBI alerts (max 1 each to avoid crowding)
    if (mgmtSignals.length > 0) freshSignals.unshift(mgmtSignals[0])
    if (sebiSignals.length > 0) freshSignals.unshift(sebiSignals[0])

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

// ─── Management Commentary Signals ────────────────────────────────────────────
// Ask Groq to surface any recent significant management commentary language
// shifts for top Nifty 50 stocks (guidance cuts, margin warnings, capex plans).

const MGMT_WATCH_TICKERS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'BAJFINANCE', 'BHARTIARTL', 'ZOMATO', 'TATAMOTORS', 'SUNPHARMA',
]

async function generateManagementCommentarySignals(): Promise<Signal[]> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return []

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `You are a financial analyst monitoring Indian stock market management commentary.

Identify ONE significant recent management commentary signal from these stocks: ${MGMT_WATCH_TICKERS.join(', ')}.

Look for language shifts like: guidance cuts, margin warnings, expansion announcements, order wins, CEO changes, or capex plans announced in recent quarterly earnings calls or investor presentations.

Respond ONLY with this JSON (no markdown):
{
  "ticker": "<NSE_SYMBOL>",
  "company": "<Full Company Name>",
  "headline": "<concise 1-line headline under 80 chars>",
  "detail": "<2-sentence detail explaining the commentary shift and investor impact>",
  "sentiment": "<bullish|bearish|neutral>",
  "nivesh_score": <40-85>
}`,
        }],
        max_tokens: 300,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return []
    const data = await res.json() as { choices: { message: { content: string } }[] }
    const raw = data.choices?.[0]?.message?.content ?? ''
    const match = raw.match(/\{[\s\S]*?\}/)
    if (!match) return []

    const parsed = JSON.parse(match[0]) as {
      ticker?: string; company?: string; headline?: string
      detail?: string; sentiment?: string; nivesh_score?: number
    }
    if (!parsed.ticker || !parsed.headline) return []

    let priceData = { price: 0, change_pct: 0 }
    try { priceData = await getStockPrice(parsed.ticker) } catch { /* ok */ }

    return [{
      id: `mgmt_${parsed.ticker}_${Date.now()}`,
      ticker: parsed.ticker,
      company: parsed.company ?? parsed.ticker,
      signal_type: 'management_commentary',
      headline: `🗣️ ${parsed.headline}`,
      detail: parsed.detail ?? '',
      price: priceData.price,
      change_pct: priceData.change_pct,
      nivesh_score: Math.round(Math.min(100, Math.max(0, parsed.nivesh_score ?? 60))),
      timestamp: Date.now(),
      is_new: true,
      groq_sentiment: (['bullish', 'bearish', 'neutral'].includes(parsed.sentiment ?? '') ? parsed.sentiment : 'neutral') as 'bullish' | 'bearish' | 'neutral',
      groq_reason: 'Management language shift detected',
      groq_confidence: 0.75,
    }]
  } catch {
    return []
  }
}

// ─── Regulatory Alert Signals ──────────────────────────────────────────────────
// Fetch latest SEBI circulars from SEBI website; fall back to Groq knowledge.

async function generateRegulatoryAlertSignals(): Promise<Signal[]> {
  const now = Date.now()
  if (sebiCache.length > 0 && now - sebiLastRefresh < SEBI_CACHE_TTL) {
    return sebiCache
  }

  const signals = await fetchSebiSignals()
  if (signals.length > 0) {
    sebiCache = signals
    sebiLastRefresh = now
  }
  return signals
}

async function fetchSebiSignals(): Promise<Signal[]> {
  // Try to fetch SEBI circulars page
  try {
    const res = await fetch(
      'https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecent=yes',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) },
    )
    if (res.ok) {
      const html = await res.text()
      // Extract circular titles from HTML table rows — SEBI uses <td> for titles
      const titleMatches = [...html.matchAll(/<td[^>]*>([^<]{20,200})<\/td>/gi)]
        .map(m => m[1].trim().replace(/\s+/g, ' '))
        .filter(t => /circular|order|direction|guideline|framework|amendment/i.test(t))
        .slice(0, 3)

      if (titleMatches.length > 0) {
        return titleMatches.slice(0, 1).map((title, i) => ({
          id: `sebi_${Date.now()}_${i}`,
          ticker: 'SEBI',
          company: 'SEBI — Securities Regulator',
          signal_type: 'regulatory_alert' as const,
          headline: `⚖️ SEBI: ${title.slice(0, 80)}`,
          detail: `New SEBI circular issued. Review the regulatory update for potential impact on your holdings. Check SEBI website for full text.`,
          price: 0,
          change_pct: 0,
          nivesh_score: 55,
          timestamp: Date.now(),
          is_new: true,
          groq_sentiment: 'neutral' as const,
          groq_reason: 'SEBI regulatory update',
          groq_confidence: 0.8,
        }))
      }
    }
  } catch { /* fall through to Groq */ }

  // Groq fallback — ask for the most recent notable SEBI circular
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return []

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `What is the most recent significant SEBI circular or regulatory order in 2025 that affects Indian retail investors or listed companies? Give one example.

Respond ONLY with this JSON (no markdown):
{
  "title": "<circular title under 80 chars>",
  "detail": "<2-sentence plain English explanation of what this circular means for investors>",
  "affected_sector": "<sector name or 'All Segments'>"
}`,
        }],
        max_tokens: 200,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return []
    const data = await res.json() as { choices: { message: { content: string } }[] }
    const raw = data.choices?.[0]?.message?.content ?? ''
    const match = raw.match(/\{[\s\S]*?\}/)
    if (!match) return []

    const parsed = JSON.parse(match[0]) as { title?: string; detail?: string; affected_sector?: string }
    if (!parsed.title) return []

    return [{
      id: `sebi_groq_${Date.now()}`,
      ticker: 'SEBI',
      company: `SEBI — ${parsed.affected_sector ?? 'All Segments'}`,
      signal_type: 'regulatory_alert',
      headline: `⚖️ SEBI: ${parsed.title.slice(0, 80)}`,
      detail: parsed.detail ?? 'New regulatory circular. Check SEBI website for details.',
      price: 0,
      change_pct: 0,
      nivesh_score: 55,
      timestamp: Date.now(),
      is_new: true,
      groq_sentiment: 'neutral',
      groq_reason: 'SEBI regulatory update',
      groq_confidence: 0.7,
    }]
  } catch {
    return []
  }
}
