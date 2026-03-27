'use client'
import { useAppStore } from '@/store/useAppStore'
import { useMarketData } from '@/hooks/useMarketData'
import { Wallet } from 'lucide-react'
import type { MarketPulseData } from '@/types'

// ─── Build ticker items from market pulse data ────────────────────────────────

function buildTickerItems(pulse: MarketPulseData) {
  const items: { label: string; value: string; change: string; up: boolean }[] = []

  // All indices
  for (const idx of pulse.indices) {
    const val = idx.value >= 1000
      ? idx.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
      : idx.value.toFixed(2)
    const isUp = idx.change_pct >= 0
    items.push({
      label: idx.name,
      value: val,
      change: `${isUp ? '+' : ''}${idx.change_pct.toFixed(2)}%`,
      up: isUp,
    })
  }

  // FII / DII flows
  if (pulse.fii_net !== undefined) {
    const fiiUp = pulse.fii_net >= 0
    items.push({
      label: 'FII',
      value: `₹${Math.abs(pulse.fii_net).toLocaleString('en-IN')} Cr`,
      change: fiiUp ? '▲ INFLOW' : '▼ OUTFLOW',
      up: fiiUp,
    })
  }
  if (pulse.dii_net !== undefined) {
    const diiUp = pulse.dii_net >= 0
    items.push({
      label: 'DII',
      value: `₹${Math.abs(pulse.dii_net).toLocaleString('en-IN')} Cr`,
      change: diiUp ? '▲ INFLOW' : '▼ OUTFLOW',
      up: diiUp,
    })
  }

  // Top gainers — ticker + % only, no company name
  for (const g of pulse.gainers ?? []) {
    items.push({
      label: '▲',
      value: g.ticker,
      change: `+${g.change_pct.toFixed(1)}%`,
      up: true,
    })
  }

  // Top losers — ticker + % only
  for (const l of pulse.losers ?? []) {
    items.push({
      label: '▼',
      value: l.ticker,
      change: `${l.change_pct.toFixed(1)}%`,
      up: false,
    })
  }

  return items
}

// ─── Single ticker item ───────────────────────────────────────────────────────

function TickerItem({ label, value, change, up }: { label: string; value: string; change: string; up: boolean }) {
  return (
    <div className="flex items-center gap-2.5 shrink-0" style={{ padding: '0 20px' }}>
      <span className="text-[10px] font-bold tracking-widest uppercase whitespace-nowrap" style={{ color: '#4A5568' }}>
        {label}
      </span>
      <span className="font-mono text-[12px] font-semibold whitespace-nowrap" style={{ color: '#E8EDF5' }}>
        {value}
      </span>
      <span
        className={`text-[11px] font-mono font-bold whitespace-nowrap ${up ? 'glow-green' : 'glow-red'}`}
        style={{ color: up ? '#00D4AA' : '#FF4560' }}
      >
        {change}
      </span>
    </div>
  )
}

// ─── Separator — visible pipe between items ───────────────────────────────────

function Separator() {
  return (
    <div className="shrink-0 flex items-center" style={{ padding: '0 4px' }}>
      <div style={{ width: 1, height: 16, background: '#1C2840' }} />
    </div>
  )
}

// ─── Static fallback items for skeleton state ────────────────────────────────

const FALLBACK_LABELS = [
  'NIFTY 50','SENSEX','NIFTY BANK','NIFTY IT','INDIA VIX','FII NET','NIFTY MID','NIFTY NEXT'
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function MarketPulse() {
  const { marketPulse, isDemoMode, setDemoMode, setPortfolioOpen, portfolioOpen } = useAppStore()
  useMarketData()

  const tickerItems = marketPulse ? buildTickerItems(marketPulse) : []
  const hasData = tickerItems.length > 0

  return (
    <div
      className="flex items-center shrink-0 overflow-hidden"
      style={{ height: 52, background: '#070B14', borderBottom: '1px solid #1C2840' }}
    >
      {/* ── LEFT: Brand ─────────────────────────────────────── */}
      <div
        className="flex flex-col justify-center px-5 h-full shrink-0 gap-1"
        style={{ borderRight: '1px solid #1C2840', minWidth: 220 }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-bold tracking-tight leading-none"
            style={{ color: '#E8EDF5', fontSize: 22 }}
          >
            दृष्टि
          </span>
          <span
            className="font-black tracking-[0.18em] leading-none"
            style={{ color: '#3B8BEB', fontSize: 13 }}
          >
            DRISHTI
          </span>
        </div>
        <span
          className="font-medium tracking-wider whitespace-nowrap"
          style={{ color: '#4A5568', fontSize: 9, lineHeight: 1 }}
        >
          AUTONOMOUS INVESTMENT INTELLIGENCE
        </span>
      </div>

      {/* ── CENTER: Continuous scrolling ticker ─────────────── */}
      <div className="flex-1 overflow-hidden h-full relative" style={{ borderRight: '1px solid #1C2840' }}>
        {/* Fade edges */}
        <div
          className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #070B14, transparent)' }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #070B14, transparent)' }}
        />

        <div className="flex items-center h-full">
          {hasData ? (
            <div className="ticker-track">
              {/* First copy */}
              {tickerItems.map((item, i) => (
                <div key={`a-${i}`} className="flex items-center h-full">
                  <TickerItem {...item} />
                  <Separator />
                </div>
              ))}
              {/* Duplicate for seamless loop */}
              {tickerItems.map((item, i) => (
                <div key={`b-${i}`} className="flex items-center h-full">
                  <TickerItem {...item} />
                  <Separator />
                </div>
              ))}
            </div>
          ) : (
            /* Skeleton marquee while loading */
            <div className="ticker-track">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 shrink-0" style={{ padding: '0 20px' }}>
                  <div className="skeleton h-2 w-14" />
                  <div className="skeleton h-2.5 w-18" />
                  <div className="skeleton h-2 w-10" />
                </div>
              ))}
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={`sk2-${i}`} className="flex items-center gap-3 shrink-0" style={{ padding: '0 20px' }}>
                  <div className="skeleton h-2 w-14" />
                  <div className="skeleton h-2.5 w-18" />
                  <div className="skeleton h-2 w-10" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Controls ──────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 h-full shrink-0">
        {/* Live pulse indicator */}
        <div className="flex items-center gap-1.5 mr-1">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: isDemoMode ? '#FFB800' : '#00D4AA' }}
          />
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{ color: isDemoMode ? '#FFB800' : '#00D4AA' }}
          >
            {isDemoMode ? 'DEMO' : 'LIVE'}
          </span>
        </div>

        {/* Demo / Live toggle */}
        <button
          onClick={() => setDemoMode(!isDemoMode)}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: isDemoMode ? 'rgba(255,184,0,0.08)' : 'rgba(0,212,170,0.08)',
            border: `1px solid ${isDemoMode ? 'rgba(255,184,0,0.25)' : 'rgba(0,212,170,0.25)'}`,
            color: isDemoMode ? '#FFB800' : '#00D4AA',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {isDemoMode ? 'Go Live' : 'Go Demo'}
        </button>

        {/* Portfolio button */}
        <button
          onClick={() => setPortfolioOpen(!portfolioOpen)}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: portfolioOpen ? 'rgba(255,184,0,0.15)' : 'rgba(255,184,0,0.07)',
            border: '1px solid rgba(255,184,0,0.25)',
            color: '#FFB800',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,184,0,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = portfolioOpen ? 'rgba(255,184,0,0.15)' : 'rgba(255,184,0,0.07)')}
        >
          <Wallet size={11} />
          Portfolio
        </button>
      </div>
    </div>
  )
}
