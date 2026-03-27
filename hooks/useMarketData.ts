'use client'
import { useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function useMarketData() {
  const { isDemoMode, setMarketPulse, marketPulse } = useAppStore()

  const fetchPulse = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/pulse?demo=${isDemoMode}`)
      if (res.ok) {
        const data = await res.json()
        setMarketPulse(data)
      }
    } catch { /* silent */ }
  }, [isDemoMode, setMarketPulse])

  useEffect(() => {
    fetchPulse()
    const interval = setInterval(fetchPulse, 30000)
    return () => clearInterval(interval)
  }, [fetchPulse])

  return { marketPulse }
}
