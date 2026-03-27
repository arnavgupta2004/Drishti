'use client'
import { useMemo, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { calcPortfolio, getSectorAllocation, getConcentrationRisks } from '@/lib/portfolio'

const PRICE_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function usePortfolio() {
  const { holdings, setHoldings, addHolding, removeHolding, updateHoldingPrice } = useAppStore()
  const refreshingRef = useRef(false)

  const portfolio = useMemo(() => calcPortfolio(holdings), [holdings])
  const sectorAllocation = useMemo(() => getSectorAllocation(holdings), [holdings])
  const concentrationRisks = useMemo(() => getConcentrationRisks(holdings), [holdings])

  // Auto-refresh live prices for all holdings
  useEffect(() => {
    async function refreshPrices() {
      if (refreshingRef.current || holdings.length === 0) return
      refreshingRef.current = true
      try {
        await Promise.all(
          holdings.map(async (h) => {
            try {
              const res = await fetch(`/api/stock/${h.ticker}?period=5d&interval=1d`)
              if (!res.ok) return
              const data = await res.json()
              const price = data?.price?.price
              if (price && price > 0) {
                updateHoldingPrice(h.ticker, price)
              }
            } catch { /* silent */ }
          })
        )
      } finally {
        refreshingRef.current = false
      }
    }

    // Fetch immediately on mount
    refreshPrices()
    const interval = setInterval(refreshPrices, PRICE_REFRESH_INTERVAL)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount only — updateHoldingPrice is stable

  return {
    holdings: portfolio.holdings, // always enriched with pnl/pnl_pct/current_value
    rawHoldings: holdings,
    portfolio,
    sectorAllocation,
    concentrationRisks,
    setHoldings,
    addHolding,
    removeHolding,
    updateHoldingPrice,
  }
}
