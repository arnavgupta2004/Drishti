import type { DataSourceMeta, DataSourceState } from '@/types'

const LABELS: Record<DataSourceState, string> = {
  live: 'Live',
  cached: 'Cached',
  fallback: 'Fallback',
  demo: 'Demo',
  reference: 'Reference',
}

export function makeSourceMeta(
  state: DataSourceState,
  asOf = Date.now(),
  note?: string,
  label = LABELS[state],
): DataSourceMeta {
  return { state, label, as_of: asOf, note }
}

export function formatSourceTime(timestamp?: number): string {
  if (!timestamp) return 'Time unavailable'
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(timestamp)
}

export function getSourceTone(state: DataSourceState) {
  switch (state) {
    case 'live':
      return {
        text: '#00D4AA',
        background: 'rgba(0,212,170,0.10)',
        border: 'rgba(0,212,170,0.25)',
      }
    case 'cached':
      return {
        text: '#3B8BEB',
        background: 'rgba(59,139,235,0.10)',
        border: 'rgba(59,139,235,0.25)',
      }
    case 'demo':
      return {
        text: '#FFB800',
        background: 'rgba(255,184,0,0.10)',
        border: 'rgba(255,184,0,0.25)',
      }
    case 'fallback':
      return {
        text: '#FF8A65',
        background: 'rgba(255,138,101,0.10)',
        border: 'rgba(255,138,101,0.25)',
      }
    case 'reference':
    default:
      return {
        text: '#8B95A8',
        background: 'rgba(139,149,168,0.10)',
        border: 'rgba(139,149,168,0.25)',
      }
  }
}
