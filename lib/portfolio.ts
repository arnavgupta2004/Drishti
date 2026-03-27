import type { Holding, Portfolio } from '@/types'

export function calcPortfolio(holdings: Holding[]): Portfolio {
  const total_invested = holdings.reduce((s, h) => s + h.qty * h.avg_buy_price, 0)
  const current_value = holdings.reduce((s, h) => s + h.qty * (h.current_price ?? h.avg_buy_price), 0)
  const total_pnl = current_value - total_invested
  const total_pnl_pct = total_invested > 0 ? (total_pnl / total_invested) * 100 : 0
  return {
    holdings: holdings.map((h) => {
      const cp = h.current_price ?? h.avg_buy_price
      const pnl = h.qty * (cp - h.avg_buy_price)
      const pnl_pct = ((cp - h.avg_buy_price) / h.avg_buy_price) * 100
      return { ...h, current_value: h.qty * cp, pnl, pnl_pct }
    }),
    total_invested,
    current_value,
    total_pnl,
    total_pnl_pct,
  }
}

export function getSectorAllocation(holdings: Holding[]): Record<string, number> {
  const total = holdings.reduce((s, h) => s + h.qty * (h.current_price ?? h.avg_buy_price), 0)
  const sectors: Record<string, number> = {}
  for (const h of holdings) {
    const sector = h.sector ?? 'Others'
    const val = h.qty * (h.current_price ?? h.avg_buy_price)
    sectors[sector] = (sectors[sector] ?? 0) + val
  }
  return Object.fromEntries(Object.entries(sectors).map(([k, v]) => [k, total > 0 ? (v / total) * 100 : 0]))
}

export function getConcentrationRisks(holdings: Holding[]): string[] {
  const risks: string[] = []
  const total = holdings.reduce((s, h) => s + h.qty * (h.current_price ?? h.avg_buy_price), 0)
  for (const h of holdings) {
    const pct = total > 0 ? (h.qty * (h.current_price ?? h.avg_buy_price) / total) * 100 : 0
    if (pct > 25) risks.push(`${h.company || h.ticker} at ${pct.toFixed(1)}% exceeds 25% single-stock limit`)
  }
  const sectors = getSectorAllocation(holdings)
  for (const [sector, pct] of Object.entries(sectors)) {
    if (pct > 40) risks.push(`${sector} sector at ${pct.toFixed(1)}% — consider diversifying`)
  }
  return risks
}

export const DEMO_HOLDINGS: Holding[] = [
  { id: 'h1', ticker: 'HDFCBANK',  company: 'HDFC Bank Ltd',             qty: 200, avg_buy_price: 1590, buy_date: '2024-06-15', current_price: 1762, sector: 'Banking' },
  { id: 'h2', ticker: 'TCS',       company: 'Tata Consultancy Services', qty: 50,  avg_buy_price: 3820, buy_date: '2024-03-10', current_price: 3842, sector: 'IT' },
  { id: 'h3', ticker: 'ITC',       company: 'ITC Ltd',                   qty: 300, avg_buy_price: 440,  buy_date: '2024-09-01', current_price: 452,  sector: 'FMCG' },
  { id: 'h4', ticker: 'RELIANCE',  company: 'Reliance Industries',       qty: 30,  avg_buy_price: 2820, buy_date: '2024-01-20', current_price: 2824, sector: 'Energy' },
  { id: 'h5', ticker: 'INFY',      company: 'Infosys Ltd',               qty: 100, avg_buy_price: 1680, buy_date: '2024-11-05', current_price: 1876, sector: 'IT' },
  { id: 'h6', ticker: 'KOTAKBANK', company: 'Kotak Mahindra Bank',       qty: 80,  avg_buy_price: 1720, buy_date: '2024-08-12', current_price: 1920, sector: 'Banking' },
]
