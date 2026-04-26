'use client'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart2 } from 'lucide-react'
import type { Signal } from '@/types'
import { SIGNAL_ICONS, SIGNAL_LABELS, SIGNAL_COLORS } from '@/lib/signals'
import NiveshScoreBadge from './NiveshScoreBadge'
import { useAppStore } from '@/store/useAppStore'

const COLOR_HEX: Record<string, string> = {
  'text-accent-green': '#00D4AA',
  'text-accent-red':   '#FF4560',
  'text-accent-gold':  '#FFB800',
  'text-accent-blue':  '#3B8BEB',
}

interface Props {
  signal: Signal
  index: number
  onAnalyse: (signal: Signal) => void
  onCardClick?: (signal: Signal) => void
}

export default function SignalCard({ signal, index, onAnalyse, onCardClick }: Props) {
  const { setActiveStock } = useAppStore()
  const isUp = signal.change_pct >= 0
  const icon = SIGNAL_ICONS[signal.signal_type] ?? '📌'
  const colorClass = SIGNAL_COLORS[signal.signal_type] ?? 'text-accent-blue'
  const signalColor = COLOR_HEX[colorClass] ?? '#3B8BEB'

  return (
    <motion.div
      initial={{ x: -12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.05, duration: 0.28, ease: 'easeOut' }}
      className="group relative rounded-[18px] cursor-pointer transition-all duration-300 ease-out premium-card"
      style={{
        padding: '15px 16px 14px 16px',
        border: signal.is_new ? `1px solid ${signalColor}44` : '1px solid rgba(38,56,85,0.92)',
      }}
      onClick={() => onCardClick?.(signal)}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 16px 36px rgba(0,0,0,0.34), inset 2px 0 0 ${signalColor}52`
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = ''
      }}
    >
      {/* Active left border glow on new signals */}
      {signal.is_new && (
        <div
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: signalColor, boxShadow: `0 0 6px ${signalColor}` }}
        />
      )}

      {/* Top row: company + price */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-2">
          <div className="text-[#F2F6FB] font-bold text-[15px] leading-tight truncate">
            {signal.company}
          </div>
          <div className="text-[#5E6C86] text-[12px] font-mono mt-1 tracking-[0.14em] uppercase">{signal.ticker}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-mono font-semibold text-[15px] text-[#E8EDF5]">
            ₹{signal.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div
            className={`text-[12px] font-mono font-semibold mt-1 ${isUp ? 'glow-green' : 'glow-red'}`}
            style={{ color: isUp ? '#00D4AA' : '#FF4560' }}
          >
            {isUp ? '+' : ''}{signal.change_pct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Signal type pill */}
      <div className="mb-3">
        <span
          className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full tracking-wide"
          style={{ background: `${signalColor}14`, color: signalColor, border: `1px solid ${signalColor}20` }}
        >
          <span className="text-[13px]">{icon}</span>
          {SIGNAL_LABELS[signal.signal_type]}
        </span>
      </div>

      {/* One-line detail */}
      <p className="text-[#71809B] text-[12px] leading-[1.65] mb-4 line-clamp-2">{signal.detail}</p>

      {/* Bottom: hover buttons + score */}
      <div className="flex items-center justify-between">
        {/* Hover-reveal action buttons */}
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={e => { e.stopPropagation(); onAnalyse(signal) }}
            className="flex items-center gap-1 text-[11px] font-semibold py-1.5 px-3 rounded-full transition-colors duration-150"
            style={{ background: 'rgba(59,139,235,0.12)', color: '#3B8BEB', border: '1px solid rgba(59,139,235,0.18)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,139,235,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,139,235,0.12)')}
          >
            Analyse <ArrowRight size={9} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setActiveStock(signal.ticker) }}
            className="flex items-center gap-1 text-[11px] py-1.5 px-3 rounded-full transition-colors duration-150"
            style={{ background: '#141E30', color: '#8B95A8', border: '1px solid rgba(38,56,85,0.92)' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#19243A')}
            onMouseLeave={e => (e.currentTarget.style.background = '#141E30')}
          >
            <BarChart2 size={10} /> Chart
          </button>
        </div>
        <NiveshScoreBadge score={signal.nivesh_score} size="sm" />
      </div>
    </motion.div>
  )
}
