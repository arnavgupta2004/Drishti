'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Activity, Loader2, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { usePortfolio } from '@/hooks/usePortfolio'
import { isValidNSETicker } from '@/lib/nse-tickers'
import type { Holding, PortfolioHealthScore } from '@/types'
import { DEMO_PORTFOLIO_SCORE } from '@/lib/demo-data'
import HoldingRow from './HoldingRow'
import HealthScore from './HealthScore'

const SECTORS = ['Banking', 'IT', 'FMCG', 'Auto', 'Pharma', 'Energy', 'Metals', 'Telecom', 'Others']

type TickerState = 'idle' | 'checking' | 'valid' | 'invalid'

export default function PortfolioPanel() {
  const { portfolioOpen, setPortfolioOpen, isDemoMode } = useAppStore()
  const { holdings, portfolio, addHolding, removeHolding } = usePortfolio()
  const [tab, setTab] = useState<'holdings' | 'health'>('holdings')
  const [healthScore, setHealthScore] = useState<PortfolioHealthScore | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [form, setForm] = useState({ ticker: '', company: '', qty: '', avg: '', date: '', sector: 'Banking' })
  const [tickerState, setTickerState] = useState<TickerState>('idle')
  const [tickerError, setTickerError] = useState('')

  const totalPnl = portfolio.total_pnl
  const totalPnlPct = portfolio.total_pnl_pct

  // Validate ticker: instant check against known list, then API for unknowns
  const validateTicker = async (ticker: string) => {
    const t = ticker.trim().toUpperCase()
    if (!t || t.length < 2) { setTickerState('idle'); return }

    setTickerState('checking')
    setTickerError('')

    // Step 1: Instant client-side check against known NSE ticker list
    const knownValid = isValidNSETicker(t)

    try {
      const res = await fetch(`/api/stock/${t}?period=5d&interval=1d`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const price = data?.price?.price ?? 0

      if (price > 0) {
        setTickerState('valid')
        // Auto-fill sector from fundamentals if available
        const sector = data?.fundamentals?.sector
        if (sector && sector !== '' && form.sector === 'Banking') {
          setForm(f => ({ ...f, sector }))
        }
        // Auto-fill avg price if not yet typed
        if (!form.avg) {
          setForm(f => ({ ...f, avg: String(Math.round(price)) }))
        }
      } else if (knownValid) {
        // Known valid ticker but API returned no price (Yahoo may be down)
        setTickerState('valid')
      } else {
        setTickerState('invalid')
        setTickerError(`"${t}" is not a valid NSE ticker symbol.`)
      }
    } catch {
      if (knownValid) {
        // If API fails but we know it's valid from our list, accept it
        setTickerState('valid')
      } else {
        setTickerState('invalid')
        setTickerError(`"${t}" not found. Use a valid NSE ticker like RELIANCE, TCS, INFY.`)
      }
    }
  }

  const handleAdd = () => {
    if (!form.ticker || !form.qty || !form.avg) return
    if (tickerState === 'invalid') return
    const holding: Holding = {
      id: `h_${Date.now()}`,
      ticker: form.ticker.trim().toUpperCase(),
      company: form.company || form.ticker.trim().toUpperCase(),
      qty: Number(form.qty),
      avg_buy_price: Number(form.avg),
      buy_date: form.date || new Date().toISOString().split('T')[0],
      sector: form.sector,
      current_price: Number(form.avg),
    }
    addHolding(holding)
    setForm({ ticker: '', company: '', qty: '', avg: '', date: '', sector: 'Banking' })
    setTickerState('idle')
    setTickerError('')
  }

  const runHealthCheck = async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/portfolio/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings, isDemoMode }),
      })
      if (res.ok) {
        const { score } = await res.json()
        setHealthScore(score)
        setTab('health')
      }
    } catch {
      setHealthScore(DEMO_PORTFOLIO_SCORE)
      setTab('health')
    } finally {
      setHealthLoading(false)
    }
  }

  if (!portfolioOpen) return null

  const tickerIcon = tickerState === 'checking'
    ? <Loader2 size={11} className="animate-spin text-[#8B95A8]" />
    : tickerState === 'valid'
    ? <CheckCircle2 size={11} className="text-[#00D4AA]" />
    : tickerState === 'invalid'
    ? <AlertCircle size={11} className="text-[#FF4560]" />
    : null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-[400px] z-50 flex flex-col"
        style={{ background: '#0D1421', borderLeft: '1px solid #1C2840', boxShadow: '0 0 60px rgba(0,0,0,0.7)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-accent-gold" />
            <span className="font-bold text-sm text-text-primary">My Portfolio</span>
          </div>
          <button onClick={() => setPortfolioOpen(false)} className="text-text-secondary hover:text-text-primary p-1">
            <X size={16} />
          </button>
        </div>

        {/* P&L Summary */}
        <div className="px-4 py-3 border-b border-border bg-bg-tertiary shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-text-secondary uppercase">Invested</div>
              <div className="font-mono font-bold text-sm text-text-primary">
                ₹{portfolio.total_invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-text-secondary uppercase">Current Value</div>
              <div className="font-mono font-bold text-sm text-text-primary">
                ₹{portfolio.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-text-secondary">Overall P&L:</span>
            <span className={`font-mono font-bold text-lg ${totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {totalPnl >= 0 ? '+' : ''}₹{Math.abs(totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-xs font-mono ${totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {(['holdings', 'health'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-bold uppercase transition-colors ${
                tab === t ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t === 'holdings' ? 'Holdings' : '🩺 Health Check'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'holdings' ? (
            <div className="p-4 space-y-2">
              {/* Holdings list — uses portfolio.holdings which has pnl computed */}
              {holdings.map((h) => (
                <HoldingRow key={h.id} holding={h} onRemove={removeHolding} />
              ))}

              {/* Add holding form */}
              <div className="border-t border-border pt-3 mt-2">
                <div className="text-[10px] font-bold text-text-secondary uppercase mb-2">Add Holding</div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Ticker field with validation */}
                  <div className="col-span-2 relative">
                    <input
                      value={form.ticker}
                      onChange={e => {
                        const v = e.target.value.toUpperCase().replace(/[^A-Z0-9_&]/g, '')
                        setForm(f => ({ ...f, ticker: v }))
                        setTickerState('idle')
                        setTickerError('')
                      }}
                      onBlur={() => form.ticker && validateTicker(form.ticker)}
                      placeholder="Ticker (e.g. RELIANCE, TCS)"
                      className="w-full bg-bg-tertiary border rounded px-2 py-1.5 pr-7 text-xs text-text-primary placeholder-text-secondary outline-none transition-colors"
                      style={{
                        borderColor: tickerState === 'valid' ? '#00D4AA50'
                          : tickerState === 'invalid' ? '#FF456050'
                          : '#1C2840',
                      }}
                    />
                    {tickerIcon && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">{tickerIcon}</div>
                    )}
                  </div>

                  {tickerError && (
                    <div className="col-span-2 flex items-center gap-1.5 text-[10px] text-[#FF4560]">
                      <AlertCircle size={10} />
                      {tickerError}
                    </div>
                  )}

                  <input
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="Company name (optional)"
                    className="col-span-2 bg-bg-tertiary border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-secondary outline-none focus:border-accent-blue/50"
                  />
                  <input
                    value={form.qty}
                    onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                    placeholder="Quantity"
                    type="number"
                    min="1"
                    className="bg-bg-tertiary border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-secondary outline-none focus:border-accent-blue/50"
                  />
                  <input
                    value={form.avg}
                    onChange={e => setForm(f => ({ ...f, avg: e.target.value }))}
                    placeholder="Avg buy price (₹)"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="bg-bg-tertiary border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-secondary outline-none focus:border-accent-blue/50"
                  />
                  <select
                    value={form.sector}
                    onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                    className="bg-bg-tertiary border border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none col-span-2"
                  >
                    {SECTORS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!form.ticker || !form.qty || !form.avg || tickerState === 'invalid' || tickerState === 'checking'}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded transition-all border disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: (tickerState === 'valid' || tickerState === 'idle')
                      ? 'rgba(0,212,170,0.15)'
                      : 'rgba(0,212,170,0.05)',
                    color: '#00D4AA',
                    borderColor: 'rgba(0,212,170,0.3)',
                  }}
                >
                  <Plus size={12} />
                  {tickerState === 'checking' ? 'Verifying ticker...' : 'Add Holding'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {!healthScore ? (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <Activity size={32} className="text-accent-blue opacity-50" />
                  <p className="text-text-secondary text-xs text-center">
                    Get an AI-powered health analysis of your portfolio with specific suggestions.
                  </p>
                  <button
                    onClick={runHealthCheck}
                    disabled={healthLoading}
                    className="flex items-center gap-2 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue text-sm font-bold py-2.5 px-6 rounded-lg border border-accent-blue/30 transition-colors disabled:opacity-50"
                  >
                    {healthLoading ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                    Run Health Check
                  </button>
                </div>
              ) : (
                <HealthScore healthScore={healthScore} />
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
