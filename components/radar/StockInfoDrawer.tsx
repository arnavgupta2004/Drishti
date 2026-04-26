'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, BarChart2, Sparkles, Loader2 } from 'lucide-react'
import type { Signal, Technicals, Fundamentals, QuarterlyResult, StockPrice } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import SourceBadge from '@/components/shared/SourceBadge'
import { formatSourceTime } from '@/lib/data-source'
import { buildInvestmentCase } from '@/lib/investment-case'

interface StockData {
  price: StockPrice
  technicals: Technicals
  fundamentals: Fundamentals
  quarterly: QuarterlyResult[]
}

interface Props {
  signal: Signal
  onClose: () => void
  onAnalyse: (signal: Signal) => void
}

function MetricPill({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div
      className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl"
      style={{ background: '#0D1421', border: '1px solid #1C2840' }}
    >
      <span className="text-[15px] text-[#4A5568] uppercase tracking-wider font-bold">{label}</span>
      <span
        className="font-mono font-bold text-[15px]"
        style={{ color: positive === undefined ? '#E8EDF5' : positive ? '#00D4AA' : '#FF4560' }}
      >
        {value}
      </span>
      {sub && <span className="text-[16px] text-[#4A5568]">{sub}</span>}
    </div>
  )
}

function QuarterBar({ q }: { q: QuarterlyResult }) {
  const isUp = q.pat_yoy >= 0
  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-lg"
      style={{ background: '#0D1421', border: '1px solid #1C2840' }}
    >
      <span className="text-[14px] font-mono text-[#8B95A8] w-14 shrink-0">{q.quarter}</span>
      <div className="flex-1 px-2">
        <div className="text-[16px] text-[#4A5568]">Rev ₹{(q.revenue / 1000).toFixed(0)}Cr</div>
        <div className="text-[16px] text-[#4A5568]">PAT ₹{(q.pat / 1000).toFixed(0)}Cr</div>
      </div>
      <div className="text-right">
        <div
          className="text-[14px] font-mono font-bold"
          style={{ color: isUp ? '#00D4AA' : '#FF4560' }}
        >
          {isUp ? '+' : ''}{q.pat_yoy.toFixed(1)}%
        </div>
        <div className="text-[15px] text-[#4A5568]">PAT YoY</div>
      </div>
    </div>
  )
}

function BulletList({ items, tone }: { items: string[]; tone: 'bull' | 'risk' | 'watch' }) {
  const colors = tone === 'bull'
    ? { dot: '#00D4AA', text: '#C9FCEB' }
    : tone === 'risk'
    ? { dot: '#FF8A65', text: '#FFD7CC' }
    : { dot: '#3B8BEB', text: '#D4E6FF' }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: colors.dot }} />
          <div className="text-[13px] leading-relaxed" style={{ color: colors.text }}>
            {item}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function StockInfoDrawer({ signal, onClose, onAnalyse }: Props) {
  const { setActiveStock } = useAppStore()
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/stock/${signal.ticker}?period=3mo&interval=1d`)
        if (!res.ok) throw new Error()
        const d = await res.json()
        if (!cancelled) setData(d)
      } catch {
        // Fallback: just show signal data without enrichment
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [signal.ticker])

  const price = data?.price ?? { price: signal.price, change_pct: signal.change_pct, change: 0 }
  const tech  = data?.technicals
  const fund  = data?.fundamentals
  const quarterly = data?.quarterly ?? []

  const isUp = price.change_pct >= 0
  const investmentCase = buildInvestmentCase(signal, data?.price ?? null, tech, fund)

  // RSI status label
  const rsiStatus = tech
    ? tech.rsi >= 70 ? 'Overbought' : tech.rsi <= 30 ? 'Oversold' : tech.rsi >= 55 ? 'Bullish' : tech.rsi <= 45 ? 'Bearish' : 'Neutral'
    : null
  const rsiColor = tech
    ? tech.rsi >= 70 ? '#FF4560' : tech.rsi <= 30 ? '#00D4AA' : tech.rsi >= 55 ? '#00D4AA' : tech.rsi <= 45 ? '#FF4560' : '#FFB800'
    : '#8B95A8'

  // EMA trend
  const emaStatus = tech
    ? (tech.ema20 > tech.ema50 && tech.ema50 > tech.ema200) ? 'Full Uptrend' :
      (tech.ema20 < tech.ema50 && tech.ema50 < tech.ema200) ? 'Full Downtrend' :
      tech.ema20 > tech.ema50 ? 'Short Bullish' : 'Mixed'
    : null
  const emaPositive = tech ? tech.ema20 > tech.ema50 : undefined

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)' }} />

        {/* Drawer — slides from left */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="relative w-[340px] h-full flex flex-col z-10"
          style={{ background: '#0A1020', borderRight: '1px solid #1C2840', boxShadow: '4px 0 40px rgba(0,0,0,0.6)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid #1C2840' }}
          >
            <div className="flex items-center gap-2.5">
              <div>
                <div className="text-[#E8EDF5] font-bold text-[15px] leading-tight">{signal.company}</div>
                <div className="text-[16px] font-mono text-[#4A5568] mt-0.5">{signal.ticker} · NSE</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#4A5568' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E8EDF5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4A5568')}
            >
              <X size={15} />
            </button>
          </div>

          {/* Price Hero */}
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #1C2840' }}>
            <div className="flex items-baseline gap-3">
              <span className="font-mono font-black text-2xl text-[#E8EDF5]">
                ₹{price.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span
                className="flex items-center gap-1 font-mono font-bold text-[16px]"
                style={{ color: isUp ? '#00D4AA' : '#FF4560' }}
              >
                {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {isUp ? '+' : ''}{price.change_pct.toFixed(2)}%
              </span>
            </div>
            {fund?.sector && (
              <span
                className="inline-block text-[16px] font-semibold px-2 py-0.5 rounded-full mt-1.5"
                style={{ background: 'rgba(59,139,235,0.1)', color: '#3B8BEB', border: '1px solid rgba(59,139,235,0.2)' }}
              >
                {fund.sector}
              </span>
            )}
            {data?.price?.source ? (
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <SourceBadge source={data.price.source} compact />
                <span className="text-[12px] text-[#4A5568]">As of {formatSourceTime(data.price.source.as_of)}</span>
              </div>
            ) : null}
            {data?.price?.source?.note ? (
              <div className="text-[12px] text-[#4A5568] mt-1">{data.price.source.note}</div>
            ) : null}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 size={18} className="animate-spin" style={{ color: '#3B8BEB' }} />
                <span className="text-[14px] text-[#4A5568]">Fetching latest available data...</span>
              </div>
            ) : (
              <>
                {/* Signal that triggered this */}
                <div>
                  <div className="text-[15px] font-bold uppercase tracking-wider text-[#4A5568] mb-1.5">Signal</div>
                  <div
                    className="px-3 py-2.5 rounded-xl"
                    style={{ background: '#0D1421', border: '1px solid #1C2840' }}
                  >
                    <div className="text-[15px] font-semibold text-[#E8EDF5] mb-0.5">{signal.headline}</div>
                    <div className="text-[14px] text-[#8B95A8] leading-relaxed">{signal.detail}</div>
                  </div>
                </div>

                {/* Technicals */}
                {tech && (
                  <div>
                    <div className="text-[15px] font-bold uppercase tracking-wider text-[#4A5568] mb-1.5">Technicals</div>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricPill
                        label="RSI (14)"
                        value={tech.rsi.toFixed(1)}
                        sub={rsiStatus ?? undefined}
                        positive={tech.rsi >= 40 && tech.rsi <= 65}
                      />
                      <MetricPill
                        label="EMA Trend"
                        value={emaStatus ?? '—'}
                        positive={emaPositive}
                      />
                      <MetricPill
                        label="EMA 20"
                        value={`₹${tech.ema20.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                        positive={price.price > tech.ema20}
                      />
                      <MetricPill
                        label="EMA 50"
                        value={`₹${tech.ema50.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                        positive={price.price > tech.ema50}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[15px] font-bold uppercase tracking-wider text-[#4A5568]">Confidence & Evidence</div>
                    <div
                      className="px-2.5 py-1 rounded-full text-[12px] font-bold"
                      style={{
                        background: investmentCase.confidence >= 75 ? 'rgba(0,212,170,0.12)' : investmentCase.confidence >= 58 ? 'rgba(59,139,235,0.12)' : 'rgba(255,138,101,0.12)',
                        color: investmentCase.confidence >= 75 ? '#00D4AA' : investmentCase.confidence >= 58 ? '#3B8BEB' : '#FF8A65',
                        border: `1px solid ${investmentCase.confidence >= 75 ? 'rgba(0,212,170,0.24)' : investmentCase.confidence >= 58 ? 'rgba(59,139,235,0.24)' : 'rgba(255,138,101,0.24)'}`,
                      }}
                    >
                      {investmentCase.confidenceLabel} Confidence · {investmentCase.confidence}/100
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="px-3 py-3 rounded-xl" style={{ background: '#0D1421', border: '1px solid #1C2840' }}>
                      <div className="text-[12px] font-bold uppercase tracking-wider text-[#00D4AA] mb-2">Bull Case</div>
                      <BulletList items={investmentCase.thesis} tone="bull" />
                    </div>
                    <div className="px-3 py-3 rounded-xl" style={{ background: '#0D1421', border: '1px solid #1C2840' }}>
                      <div className="text-[12px] font-bold uppercase tracking-wider text-[#FF8A65] mb-2">Key Risks</div>
                      <BulletList items={investmentCase.risks} tone="risk" />
                    </div>
                    <div className="px-3 py-3 rounded-xl" style={{ background: '#0D1421', border: '1px solid #1C2840' }}>
                      <div className="text-[12px] font-bold uppercase tracking-wider text-[#3B8BEB] mb-2">What To Watch Next</div>
                      <BulletList items={investmentCase.watchlist} tone="watch" />
                    </div>
                  </div>
                </div>

                {/* Fundamentals */}
                {fund && (
                  <div>
                    <div className="text-[15px] font-bold uppercase tracking-wider text-[#4A5568] mb-1.5">Fundamentals</div>
                    <div className="grid grid-cols-2 gap-2">
                      {fund.pe > 0 && (
                        <MetricPill label="P/E Ratio" value={fund.pe.toFixed(1)} />
                      )}
                      {fund.pb > 0 && (
                        <MetricPill label="P/B Ratio" value={fund.pb.toFixed(1)} />
                      )}
                      {fund.roe > 0 && (
                        <MetricPill
                          label="ROE"
                          value={`${fund.roe.toFixed(1)}%`}
                          positive={fund.roe > 15}
                        />
                      )}
                      {fund.revenue_growth !== 0 && (
                        <MetricPill
                          label="Rev Growth"
                          value={`${fund.revenue_growth > 0 ? '+' : ''}${fund.revenue_growth.toFixed(1)}%`}
                          positive={fund.revenue_growth > 0}
                        />
                      )}
                      {fund.profit_growth !== 0 && (
                        <MetricPill
                          label="PAT Growth"
                          value={`${fund.profit_growth > 0 ? '+' : ''}${fund.profit_growth.toFixed(1)}%`}
                          positive={fund.profit_growth > 0}
                        />
                      )}
                      {fund.market_cap > 0 && (
                        <MetricPill
                          label="Mkt Cap"
                          value={fund.market_cap >= 100000
                            ? `₹${(fund.market_cap / 100000).toFixed(1)}L Cr`
                            : `₹${Math.round(fund.market_cap).toLocaleString('en-IN')} Cr`}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Quarterly results */}
                {quarterly.length > 0 && (
                  <div>
                    <div className="text-[15px] font-bold uppercase tracking-wider text-[#4A5568] mb-1.5">
                      Quarterly Results
                    </div>
                    <div className="space-y-1.5">
                      {quarterly.slice(0, 4).map(q => (
                        <QuarterBar key={q.quarter} q={q} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action buttons */}
          <div
            className="px-4 py-3 flex gap-2 shrink-0"
            style={{ borderTop: '1px solid #1C2840' }}
          >
            <button
              onClick={() => { onAnalyse(signal); onClose() }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[15px] transition-all duration-200"
              style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', color: '#00D4AA' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,170,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,212,170,0.1)')}
            >
              <Sparkles size={12} /> Ask DRISHTI AI
            </button>
            <button
              onClick={() => { setActiveStock(signal.ticker); onClose() }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-[15px] transition-all duration-200"
              style={{ background: '#141E30', border: '1px solid #1C2840', color: '#8B95A8' }}
              onMouseEnter={e => { (e.currentTarget.style.background = '#1C2840'); (e.currentTarget.style.color = '#E8EDF5') }}
              onMouseLeave={e => { (e.currentTarget.style.background = '#141E30'); (e.currentTarget.style.color = '#8B95A8') }}
            >
              <BarChart2 size={12} /> Chart
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
