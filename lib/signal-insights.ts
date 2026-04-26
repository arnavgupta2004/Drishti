import type { Fundamentals, Holding, Signal, StockPrice } from '@/types'
import { getConcentrationRisks, getSectorAllocation } from '@/lib/portfolio'

export function buildSourceProvenance(signal: Signal, price?: StockPrice | null) {
  const provenance = [
    `Quote: ${price?.source?.state === 'live' ? 'Yahoo Finance live quote' : price?.source?.note ?? 'Latest available quote feed'}`,
  ]

  const signalSourceMap: Record<string, string> = {
    insider_buy: 'Signal: NSE filings or curated insider activity logic',
    insider_sell: 'Signal: NSE filings or curated insider activity logic',
    breakout_52w: 'Signal: Price-action breakout logic on quote history',
    volume_spike: 'Signal: Volume ratio logic over recent trading average',
    fii_accumulation: 'Signal: FII/DII flow plus accumulation heuristics',
    fii_selling: 'Signal: FII/DII flow plus selling heuristics',
    strong_results: 'Signal: Quarterly result and growth filters',
    promoter_pledge: 'Signal: Corporate filing-based promoter pledge logic',
    bulk_deal: 'Signal: NSE bulk/block deal feed enriched with AI sentiment',
    reversal_pattern: 'Signal: Pattern/reversal detection logic',
    management_commentary: 'Signal: Groq-generated management commentary scan',
    regulatory_alert: 'Signal: SEBI circular scrape with AI fallback',
  }

  provenance.push(signalSourceMap[signal.signal_type] ?? 'Signal: Internal signal engine')

  if (signal.groq_sentiment) {
    provenance.push(`AI enrichment: Groq sentiment classification (${signal.groq_sentiment})`)
  }

  return provenance
}

export function buildPortfolioImpact(holdings: Holding[], signal: Signal, price?: StockPrice | null, fund?: Fundamentals | null) {
  if (!price?.price || holdings.length === 0) {
    return [
      'Portfolio impact becomes more useful after adding holdings or loading a valid quote.',
    ]
  }

  const before = getSectorAllocation(holdings)
  const sector = fund?.sector || signal.company || signal.ticker
  const assumedTicketSize = Math.max(price.price * 25, 50000)
  const syntheticQty = Math.max(1, Math.round(assumedTicketSize / price.price))
  const syntheticHolding: Holding = {
    id: 'simulated',
    ticker: signal.ticker,
    company: signal.company,
    qty: syntheticQty,
    avg_buy_price: price.price,
    buy_date: new Date().toISOString().slice(0, 10),
    current_price: price.price,
    sector,
  }
  const afterHoldings = [...holdings, syntheticHolding]
  const after = getSectorAllocation(afterHoldings)
  const beforeSector = before[sector] ?? 0
  const afterSector = after[sector] ?? 0
  const delta = afterSector - beforeSector
  const name = sector
  const impacts: string[] = [
    `If added at a sample ticket size of about ₹${Math.round(syntheticQty * price.price).toLocaleString('en-IN')}, ${name} exposure moves from ${beforeSector.toFixed(1)}% to ${afterSector.toFixed(1)}%.`,
  ]

  const afterRisks = getConcentrationRisks(afterHoldings)
  const newRisks = afterRisks.filter((r) => !getConcentrationRisks(holdings).includes(r))

  if (delta > 6) {
    impacts.push(`This meaningfully increases sector concentration, so sizing discipline matters.`)
  } else if (delta > 0) {
    impacts.push(`This adds controlled exposure without dramatically changing portfolio balance.`)
  }

  if (newRisks.length > 0) {
    impacts.push(`Simulated risk check: ${newRisks[0]}`)
  } else {
    impacts.push('Simulated risk check: no new concentration breach is introduced by this sample position.')
  }

  return impacts
}

export function diffSignals(previous: Signal[], next: Signal[]) {
  const prevMap = new Map(previous.map((s) => [s.id, s]))
  const prevTickerMap = new Map(previous.map((s) => [s.ticker, s]))

  return next.map((signal) => {
    const prev = prevMap.get(signal.id) ?? prevTickerMap.get(signal.ticker)
    const changes: string[] = []
    if (!prev) {
      changes.push('New signal surfaced in the latest scan.')
    } else {
      const priceDelta = signal.price - prev.price
      const scoreDelta = signal.nivesh_score - prev.nivesh_score
      if (Math.abs(priceDelta) >= Math.max(signal.price * 0.003, 1)) {
        changes.push(`Price moved by ₹${Math.abs(priceDelta).toFixed(0)} ${priceDelta >= 0 ? 'higher' : 'lower'} since the previous refresh.`)
      }
      if (scoreDelta !== 0) {
        changes.push(`Nivesh score ${scoreDelta > 0 ? 'improved' : 'softened'} by ${Math.abs(scoreDelta)} points.`)
      }
      if (prev.change_pct * signal.change_pct < 0) {
        changes.push('Momentum direction flipped since the previous snapshot.')
      }
    }
    return { ...signal, what_changed: changes.slice(0, 2) }
  })
}
