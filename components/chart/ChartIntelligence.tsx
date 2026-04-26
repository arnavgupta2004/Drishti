'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import SourceBadge from '@/components/shared/SourceBadge'
import { formatSourceTime } from '@/lib/data-source'
import { buildInvestmentCase } from '@/lib/investment-case'
import type { OHLCV, Technicals, ChartPattern, StockPrice, Fundamentals, QuarterlyResult } from '@/types'
import { NSE_TICKERS, searchNSETickers } from '@/lib/nse-tickers'
import CandlestickChart from './CandlestickChart'
import PatternInfoCard from './PatternInfoCard'

const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'] as const
type TF = typeof TIMEFRAMES[number]

const TF_PERIOD: Record<TF, string>   = { '1D': '5d', '1W': '1mo', '1M': '1mo', '3M': '3mo', '1Y': '1y' }
const TF_INTERVAL: Record<TF, string> = { '1D': '1d', '1W': '1d',  '1M': '1d',  '3M': '1d',  '1Y': '1wk' }

const OVERLAYS = [
  { label: 'EMA20', color: '#FFB800' },
  { label: 'EMA50', color: '#3B8BEB' },
  { label: 'EMA200', color: '#8B95A8' },
  { label: 'BB',    color: '#00D4AA' },
] as const

export default function ChartIntelligence() {
  const { activeStock, setActiveStock, isDemoMode } = useAppStore()
  const [timeframe, setTimeframe] = useState<TF>('3M')
  const [showEMA20,  setShowEMA20]  = useState(true)
  const [showEMA50,  setShowEMA50]  = useState(true)
  const [showEMA200, setShowEMA200] = useState(false)
  const [showBB,     setShowBB]     = useState(false)
  const overlayStates: Record<string, boolean> = { EMA20: showEMA20, EMA50: showEMA50, EMA200: showEMA200, BB: showBB }
  const overlaySetters: Record<string, (v: boolean) => void> = {
    EMA20: setShowEMA20, EMA50: setShowEMA50, EMA200: setShowEMA200, BB: setShowBB,
  }

  const [ohlcv,          setOhlcv]          = useState<OHLCV[]>([])
  const [technicals,     setTechnicals]     = useState<Technicals | undefined>()
  const [price,          setPrice]          = useState<StockPrice | null>(null)
  const [fundamentals,   setFundamentals]   = useState<Fundamentals | null>(null)
  const [quarterly,      setQuarterly]      = useState<QuarterlyResult[]>([])
  const [pattern,        setPattern]        = useState<ChartPattern | null>(null)
  const [loading,        setLoading]        = useState(false)
  const [patternLoading, setPatternLoading] = useState(false)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState<string[]>([])
  const investmentCase = buildInvestmentCase({
    id: `chart_${activeStock}`,
    ticker: activeStock,
    company: activeStock,
    signal_type: 'breakout_52w',
    headline: `${activeStock} chart setup`,
    detail: 'Derived from current chart, technical, and fundamental context.',
    price: price?.price ?? 0,
    change_pct: price?.change_pct ?? 0,
    nivesh_score: 60,
    timestamp: Date.now(),
    source_state: price?.source?.state ?? 'reference',
  }, price, technicals, fundamentals)

  const fetchStockData = useCallback(async (ticker: string, tf: TF) => {
    setLoading(true)
    setPattern(null)
    try {
      const res = await fetch(`/api/stock/${ticker}?period=${TF_PERIOD[tf]}&interval=${TF_INTERVAL[tf]}`)
      if (!res.ok) return
      const data = await res.json()
      setOhlcv(data.ohlcv ?? [])
      setTechnicals(data.technicals)
      setPrice(data.price)
      setFundamentals(data.fundamentals ?? null)
      setQuarterly(data.quarterly ?? [])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStockData(activeStock, timeframe) }, [activeStock, timeframe, fetchStockData])

  const handleDetectPatterns = async () => {
    setPatternLoading(true)
    try {
      const res = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: activeStock, isDemoMode }),
      })
      if (res.ok) setPattern((await res.json()).pattern)
    } catch { /* silent */ } finally {
      setPatternLoading(false)
    }
  }

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    const upper = q.trim().toUpperCase()
    const matched = searchNSETickers(upper, 8)
    // Allow free-type entry for tickers not in list (user may know a valid ticker we don't list)
    if (matched.length === 0 && upper.length >= 2) {
      setSearchResults([upper])
    } else {
      setSearchResults(matched)
    }
  }

  const selectTicker = (t: string) => { setActiveStock(t); setSearchQuery(''); setSearchResults([]) }

  return (
    <div className="flex flex-col min-h-full bg-transparent">
      {/* Hero header */}
      <div className="px-6 pt-4 pb-4 border-b border-[rgba(37,55,86,0.9)] shrink-0">
        <div className="flex items-start justify-between gap-4">
          {/* Stock identity */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-[#F2F6FB] font-extrabold text-[24px] tracking-tight truncate">{activeStock}</span>
              {price ? (
                <>
                  <span className="font-mono font-bold text-[18px] text-[#E8EDF5] truncate">
                    ₹{price.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`text-[12px] font-mono font-semibold whitespace-nowrap ${price.change_pct >= 0 ? 'text-[#00D4AA] glow-green' : 'text-[#FF4560] glow-red'}`}>
                    {price.change_pct >= 0 ? '+' : ''}{price.change_pct.toFixed(2)}%
                  </span>
                </>
              ) : loading ? (
                <div className="skeleton h-6 w-32 mt-1" />
              ) : null}
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[12px] text-[#92A0B9]">NSE · Chart Intelligence</span>
              {price?.source ? <SourceBadge source={price.source} compact /> : null}
              {price?.source?.as_of ? (
                <span className="text-[10px] text-[#5E6C86] whitespace-nowrap">As of {formatSourceTime(price.source.as_of)}</span>
              ) : null}
            </div>
            {price?.source?.note ? (
              <div className="text-[10px] text-[#5E6C86] mt-1.5 leading-relaxed break-words max-w-[520px]">{price.source.note}</div>
            ) : null}
          </div>

          {/* Search + Detect */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Search */}
            <div className="relative">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-200"
                style={{ background: '#0D1421', border: '1px solid #1C2840' }}
              >
                <Search size={11} className="text-[#8B95A8]" />
                <input
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search ticker..."
                className="bg-transparent text-[11px] text-[#E8EDF5] placeholder-[#8B95A8] outline-none w-20"
              />
              </div>
              {searchResults.length > 0 && (
                <div
                  className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden z-50 min-w-full"
                  style={{ background: '#0D1421', border: '1px solid #1C2840', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                >
                  {searchResults.map(t => (
                    <button key={t} onClick={() => selectTicker(t)}
                      className="block w-full text-left px-3 py-2 text-[13px] text-[#8B95A8] hover:text-[#3B8BEB] font-mono transition-colors duration-150"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#141E30')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detect patterns */}
            <button
              onClick={handleDetectPatterns}
              disabled={patternLoading}
              className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all duration-200 disabled:opacity-50 whitespace-nowrap"
              style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', color: '#00D4AA' }}
            >
              {patternLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              Detect Patterns
            </button>
          </div>
        </div>

        {/* Timeframes + overlays */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-0.5 min-w-0">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-full transition-all duration-200"
                style={{
                  background:   timeframe === tf ? '#141E30' : 'transparent',
                  color:        timeframe === tf ? '#E8EDF5' : '#77839C',
                  fontWeight:   timeframe === tf ? 600 : 400,
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex gap-1 min-w-0">
            {OVERLAYS.map(({ label, color }) => {
              const active = overlayStates[label]
              return (
                <button
                  key={label}
                  onClick={() => overlaySetters[label](!active)}
                  className="px-2 py-1 text-[10px] font-semibold rounded-full transition-all duration-200 tracking-wide whitespace-nowrap"
                  style={{
                    background:   active ? `${color}18` : 'transparent',
                    color:        active ? color : '#8B95A8',
                    border:       `1px solid ${active ? `${color}40` : '#1C2840'}`,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="shrink-0 relative" style={{ height: 420 }}>
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 size={22} className="animate-spin text-[#3B8BEB] opacity-60" />
            <span className="text-[14px] text-[#8B95A8]">Loading chart data...</span>
          </div>
        ) : (
          <CandlestickChart
            ohlcv={ohlcv}
            technicals={technicals}
            pattern={pattern}
            showEMA20={showEMA20}
            showEMA50={showEMA50}
            showEMA200={showEMA200}
            showBB={showBB}
            height={420}
          />
        )}
      </div>

      {/* ── Company Info Strip ─────────────────────────────── */}
      {fundamentals && !loading && (
        <div className="shrink-0 px-5 pb-5" style={{ borderTop: '1px solid rgba(37,55,86,0.9)' }}>
          {/* Sector + Market Cap row */}
          <div className="flex items-center gap-2 pt-4 pb-3">
            {fundamentals.sector && (
              <span
                className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.16em]"
                style={{ background: 'rgba(59,139,235,0.12)', border: '1px solid rgba(59,139,235,0.25)', color: '#3B8BEB' }}
              >
                {fundamentals.sector}
              </span>
            )}
            {fundamentals.market_cap > 0 && (
              <span className="text-[12px] text-[#62708B] font-medium min-w-0">
                Market Cap: <span className="text-[#B7C3D9] font-semibold">
                  ₹{fundamentals.market_cap >= 100000
                    ? `${(fundamentals.market_cap / 100000).toFixed(1)}L Cr`
                    : `${Math.round(fundamentals.market_cap).toLocaleString('en-IN')} Cr`}
                </span>
              </span>
            )}
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: 'P/E',       value: fundamentals.pe > 0  ? fundamentals.pe.toFixed(1)  : '—', neutral: true },
              { label: 'P/B',       value: fundamentals.pb > 0  ? fundamentals.pb.toFixed(2)  : '—', neutral: true },
              { label: 'ROE',       value: fundamentals.roe > 0 ? `${fundamentals.roe.toFixed(1)}%` : '—', up: fundamentals.roe > 15 },
              { label: 'Rev Growth',value: fundamentals.revenue_growth !== 0 ? `${fundamentals.revenue_growth > 0 ? '+' : ''}${fundamentals.revenue_growth.toFixed(1)}%` : '—', up: fundamentals.revenue_growth > 0 },
              { label: 'PAT Growth',value: fundamentals.profit_growth !== 0  ? `${fundamentals.profit_growth > 0 ? '+' : ''}${fundamentals.profit_growth.toFixed(1)}%`  : '—', up: fundamentals.profit_growth > 0 },
              { label: 'D/E',       value: fundamentals.debt_equity > 0 ? fundamentals.debt_equity.toFixed(2) : '—', up: fundamentals.debt_equity < 0.5 },
            ].map(m => (
              <div key={m.label} className="premium-card rounded-[16px] p-2.5 text-center min-w-0">
                <div className="text-[10px] text-[#65748E] uppercase tracking-[0.16em] mb-1.5 font-bold">{m.label}</div>
                <div
                  className="font-mono font-bold text-[15px] break-all"
                  style={{ color: m.neutral ? '#E8EDF5' : m.up ? '#00D4AA' : m.value === '—' ? '#4A5568' : '#FF4560' }}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Quarterly results mini-table */}
          {quarterly.length > 0 && (
            <div className="mt-4">
              <div className="section-eyebrow mb-2.5">Quarterly Results</div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(quarterly.length, 4)}, minmax(0, 1fr))` }}>
                {quarterly.slice(0, 4).map(q => (
                  <div key={q.quarter} className="premium-card rounded-[16px] p-2.5 min-w-0">
                    <div className="text-[11px] font-bold text-[#6B7890] uppercase tracking-[0.14em] mb-2">{q.quarter}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-[#61708A]">Rev</span>
                        <span className="text-[11px] font-mono font-semibold text-[#C1CCE0] break-all text-right">
                          ₹{q.revenue >= 10000 ? `${(q.revenue / 1000).toFixed(0)}K` : q.revenue.toLocaleString('en-IN')} Cr
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-[#61708A]">PAT</span>
                        <span className="text-[11px] font-mono font-semibold break-all text-right" style={{ color: q.pat >= 0 ? '#00D4AA' : '#FF4560' }}>
                          ₹{Math.abs(q.pat) >= 10000 ? `${(Math.abs(q.pat) / 1000).toFixed(0)}K` : Math.abs(q.pat).toLocaleString('en-IN')} Cr
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-[#61708A]">YoY</span>
                        <div className="flex items-center gap-0.5">
                          {q.pat_yoy > 0
                            ? <TrendingUp size={8} style={{ color: '#00D4AA' }} />
                            : q.pat_yoy < 0
                            ? <TrendingDown size={8} style={{ color: '#FF4560' }} />
                            : <Minus size={8} style={{ color: '#4A5568' }} />}
                          <span
                            className="text-[11px] font-mono font-bold"
                            style={{ color: q.pat_yoy > 0 ? '#00D4AA' : q.pat_yoy < 0 ? '#FF4560' : '#4A5568' }}
                          >
                            {q.pat_yoy > 0 ? '+' : ''}{q.pat_yoy.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="premium-card rounded-[18px] p-4 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00D4AA] mb-2">Why It Matters</div>
              <div className="text-[11px] text-[#C9FCEB] leading-[1.6] break-words">{investmentCase.thesis[0]}</div>
            </div>
            <div className="premium-card rounded-[18px] p-4 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF8A65] mb-2">Primary Risk</div>
              <div className="text-[11px] text-[#FFD7CC] leading-[1.6] break-words">{investmentCase.risks[0]}</div>
            </div>
            <div className="premium-card rounded-[18px] p-4 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3B8BEB] mb-2">Next Check</div>
              <div className="text-[11px] text-[#D4E6FF] leading-[1.6] break-words">{investmentCase.watchlist[0]}</div>
            </div>
          </div>
        </div>
      )}

      {/* Pattern card */}
      <AnimatePresence>
        {pattern && (
          <div className="px-4 pb-4 shrink-0">
            <PatternInfoCard pattern={pattern} />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
