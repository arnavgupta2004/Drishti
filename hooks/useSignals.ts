'use client'
import { useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function useSignals() {
  const { isDemoMode, signals, setSignals } = useAppStore()

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch(`/api/signals?demo=${isDemoMode}`)
      if (res.ok) {
        const { signals: fresh } = await res.json()
        setSignals(fresh)
      }
    } catch { /* silent */ }
  }, [isDemoMode, setSignals])

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchSignals])

  return { signals }
}
