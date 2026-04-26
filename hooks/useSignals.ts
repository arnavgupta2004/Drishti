'use client'
import { useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { diffSignals } from '@/lib/signal-insights'

export function useSignals() {
  const { isDemoMode, signals, previousSignals, signalsMeta, setSignals } = useAppStore()

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch(`/api/signals?demo=${isDemoMode}`)
      if (res.ok) {
        const { signals: fresh, meta } = await res.json()
        setSignals(diffSignals(signals.length ? signals : previousSignals, fresh), meta ?? null)
      }
    } catch { /* silent */ }
  }, [isDemoMode, previousSignals, setSignals, signals])

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchSignals])

  return { signals, signalsMeta }
}
