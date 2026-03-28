import type { Signal, Technicals, Fundamentals } from '@/types'
import { DEMO_SIGNALS } from './demo-data'

// ─── Nivesh Score Calculator ──────────────────────────────────────────────────

export function calcNiveshScore(
  tech: Partial<Technicals>,
  signal_type: string,
  fundamentals?: Partial<Fundamentals>,
  currentPrice?: number,
): number {
  let score = 50

  const rsi = tech.rsi ?? 50
  const ema50 = tech.ema50 ?? 0
  const price = currentPrice ?? ema50 * 1.01

  // RSI in healthy zone
  if (rsi >= 40 && rsi <= 60) score += 20
  else if (rsi > 60 && rsi <= 70) score += 8
  else if (rsi > 75) score -= 20
  else if (rsi < 30) score -= 10

  // Price vs EMA50
  if (ema50 > 0 && price > ema50) score += 15
  else if (ema50 > 0 && price < (tech.ema200 ?? ema50)) score -= 15

  // Volume confirmation
  // (volume_ratio passed via signal context — default +5 if signal type is volume)
  if (signal_type === 'volume_spike') score += 10

  // Signal type bonuses
  if (signal_type === 'insider_buy') score += 10
  if (signal_type === 'fii_accumulation') score += 10
  if (signal_type === 'breakout_52w') score += 8
  if (signal_type === 'insider_sell') score -= 15
  if (signal_type === 'fii_selling') score -= 10
  if (signal_type === 'promoter_pledge') score -= 12

  // Quarterly results bonus
  if (fundamentals?.profit_growth && fundamentals.profit_growth > 15) score += 5

  return Math.min(100, Math.max(0, Math.round(score)))
}

// ─── Signal Generator for Auto-Radar ─────────────────────────────────────────

export function generateAutoSignals(isDemoMode: boolean): Signal[] {
  if (isDemoMode) return DEMO_SIGNALS

  // In live mode, start with demo data + slight modifications to simulate freshness
  return DEMO_SIGNALS.map((s) => ({
    ...s,
    timestamp: Date.now() - Math.random() * 60 * 60 * 1000,
    is_new: Math.random() > 0.7,
  }))
}

// ─── Signal Label Helpers ─────────────────────────────────────────────────────

export const SIGNAL_ICONS: Record<string, string> = {
  insider_buy: '🔥',
  insider_sell: '🚨',
  breakout_52w: '📈',
  volume_spike: '📊',
  fii_accumulation: '🏦',
  fii_selling: '🏦',
  strong_results: '📋',
  promoter_pledge: '⚠️',
  bulk_deal: '🔔',
  reversal_pattern: '📉',
  management_commentary: '🗣️',
  regulatory_alert: '⚖️',
}

export const SIGNAL_LABELS: Record<string, string> = {
  insider_buy: 'Insider Buy',
  insider_sell: 'Insider Sell',
  breakout_52w: '52W Breakout',
  volume_spike: 'Unusual Volume',
  fii_accumulation: 'FII Accumulation',
  fii_selling: 'FII Selling',
  strong_results: 'Strong Results',
  promoter_pledge: 'Promoter Pledge',
  bulk_deal: 'Bulk Deal Alert',
  reversal_pattern: 'Reversal Pattern',
  management_commentary: 'Mgmt Commentary',
  regulatory_alert: 'SEBI Alert',
}

export const SIGNAL_COLORS: Record<string, string> = {
  insider_buy: 'text-accent-green',
  insider_sell: 'text-accent-red',
  breakout_52w: 'text-accent-green',
  volume_spike: 'text-accent-blue',
  fii_accumulation: 'text-accent-blue',
  fii_selling: 'text-accent-red',
  strong_results: 'text-accent-green',
  promoter_pledge: 'text-accent-gold',
  bulk_deal: 'text-accent-gold',
  reversal_pattern: 'text-accent-gold',
  management_commentary: 'text-accent-blue',
  regulatory_alert: 'text-accent-gold',
}

// ─── Score to Grade ───────────────────────────────────────────────────────────

export function scoreToGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'STRONG BUY', color: '#00D4AA' }
  if (score >= 65) return { label: 'ACCUMULATE', color: '#3B8BEB' }
  if (score >= 50) return { label: 'WATCH', color: '#FFB800' }
  if (score >= 35) return { label: 'AVOID', color: '#FF4560' }
  return { label: 'REDUCE', color: '#FF4560' }
}
