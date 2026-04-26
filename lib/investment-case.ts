import type { DataSourceState, Fundamentals, Signal, StockPrice, Technicals } from '@/types'

export interface InvestmentCase {
  confidence: number
  confidenceLabel: 'High' | 'Medium' | 'Low'
  thesis: string[]
  risks: string[]
  watchlist: string[]
}

function sourcePenalty(state?: DataSourceState) {
  switch (state) {
    case 'live':
      return 0
    case 'cached':
      return 6
    case 'reference':
      return 10
    case 'fallback':
      return 15
    case 'demo':
      return 25
    default:
      return 12
  }
}

export function buildInvestmentCase(
  signal: Signal,
  price?: StockPrice | null,
  tech?: Technicals,
  fund?: Fundamentals | null,
): InvestmentCase {
  const thesis: string[] = []
  const risks: string[] = []
  const watchlist: string[] = []

  let confidence = 58 + Math.round((signal.nivesh_score - 50) * 0.45)
  confidence -= sourcePenalty(price?.source?.state ?? signal.source_state)

  if (signal.change_pct > 0) {
    thesis.push(`Price momentum is supportive with the stock up ${signal.change_pct.toFixed(2)}% on the latest move.`)
    confidence += 4
  } else if (signal.change_pct < -2) {
    risks.push(`Recent price action is weak at ${signal.change_pct.toFixed(2)}%, so timing risk is elevated.`)
    confidence -= 5
  }

  if (tech) {
    if (price && price.price > tech.ema20 && price.price > tech.ema50) {
      thesis.push(`Price is holding above EMA20 and EMA50, which supports trend continuation.`)
      confidence += 8
    } else if (price && price.price < tech.ema50) {
      risks.push(`Price is below EMA50, so trend confirmation is still incomplete.`)
      confidence -= 8
    }

    if (tech.rsi >= 45 && tech.rsi <= 65) {
      thesis.push(`RSI at ${tech.rsi.toFixed(1)} sits in a healthy zone without obvious overbought stress.`)
      confidence += 6
    } else if (tech.rsi > 70) {
      risks.push(`RSI at ${tech.rsi.toFixed(1)} suggests near-term overheating after the recent move.`)
      confidence -= 7
    } else if (tech.rsi < 35) {
      watchlist.push(`Watch for RSI recovery above 40 before treating this as a stronger trend confirmation.`)
    }

    if (tech.adx >= 25) {
      thesis.push(`ADX at ${tech.adx.toFixed(1)} indicates a meaningful directional trend rather than pure noise.`)
      confidence += 4
    }
  }

  if (fund) {
    if (fund.profit_growth > 10) {
      thesis.push(`Profit growth of ${fund.profit_growth.toFixed(1)}% strengthens the fundamental side of the setup.`)
      confidence += 6
    } else if (fund.profit_growth < 0) {
      risks.push(`Profit growth is negative, so market excitement may be running ahead of fundamentals.`)
      confidence -= 7
    }

    if (fund.revenue_growth > 8) {
      thesis.push(`Revenue growth of ${fund.revenue_growth.toFixed(1)}% shows business momentum beyond price action.`)
      confidence += 4
    }

    if (fund.roe >= 15) {
      thesis.push(`ROE at ${fund.roe.toFixed(1)}% points to solid capital efficiency.`)
      confidence += 4
    } else if (fund.roe > 0 && fund.roe < 10) {
      risks.push(`ROE at ${fund.roe.toFixed(1)}% is modest, which lowers conviction on quality.`)
      confidence -= 4
    }

    if (fund.debt_equity >= 1) {
      risks.push(`Debt-to-equity at ${fund.debt_equity.toFixed(2)} is high enough to matter if the cycle weakens.`)
      confidence -= 5
    } else if (fund.debt_equity > 0 && fund.debt_equity <= 0.5) {
      thesis.push(`Debt-to-equity at ${fund.debt_equity.toFixed(2)} keeps balance-sheet risk contained.`)
      confidence += 3
    }
  }

  if (signal.source_state === 'reference') {
    watchlist.push('This signal is reference-driven, so confirm with fresh filings or market context before acting.')
  }
  if (price?.source?.state && price.source.state !== 'live') {
    watchlist.push(`Quote source is marked ${price.source.label.toLowerCase()}, so treat levels as latest available rather than guaranteed tick-accurate.`)
  }
  if (signal.signal_type === 'reversal_pattern') {
    watchlist.push('Reversal setups need follow-through above resistance; one good candle is not enough.')
  }
  if (signal.signal_type === 'bulk_deal') {
    watchlist.push('Bulk deals help with discovery, but follow-on price and volume confirmation matter more than the headline alone.')
  }

  const dedupe = (items: string[]) => [...new Set(items)].slice(0, 4)
  const finalConfidence = Math.max(32, Math.min(92, confidence))

  return {
    confidence: finalConfidence,
    confidenceLabel: finalConfidence >= 75 ? 'High' : finalConfidence >= 58 ? 'Medium' : 'Low',
    thesis: dedupe(thesis.length ? thesis : ['The setup has some supportive signals, but conviction improves when technical and fundamental confirmations align.']),
    risks: dedupe(risks.length ? risks : ['No major red flag is obvious yet, but position sizing should still respect market volatility and source freshness.']),
    watchlist: dedupe(watchlist.length ? watchlist : ['Track the next earnings update, price behavior near key moving averages, and whether the current signal keeps attracting confirmation.']),
  }
}
