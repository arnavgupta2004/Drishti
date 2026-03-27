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
      className="group relative rounded-xl px-3.5 py-4 cursor-pointer transition-all duration-300 ease-out"
      style={{
        background: '#0D1421',
        border: signal.is_new ? `1px solid ${signalColor}50` : '1px solid #243048',
        boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
      }}
      onClick={() => onCardClick?.(signal)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = '#141E30'
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px rgba(0,0,0,0.5), inset 3px 0 0 ${signalColor}60`
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = '#0D1421'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)'
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
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex-1 min-w-0 mr-2">
          <div className="text-[#E8EDF5] font-semibold text-[13px] leading-tight truncate">
            {signal.company}
          </div>
          <div className="text-[#4A5568] text-[10px] font-mono mt-0.5">{signal.ticker}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-mono font-semibold text-[13px] text-[#E8EDF5]">
            ₹{signal.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div
            className={`text-[11px] font-mono font-semibold ${isUp ? 'glow-green' : 'glow-red'}`}
            style={{ color: isUp ? '#00D4AA' : '#FF4560' }}
          >
            {isUp ? '+' : ''}{signal.change_pct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Signal type pill */}
      <div className="mb-2.5">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${signalColor}12`, color: signalColor }}
        >
          <span className="text-[10px]">{icon}</span>
          {SIGNAL_LABELS[signal.signal_type]}
        </span>
      </div>

      {/* One-line detail */}
      <p className="text-[#4A5568] text-[11px] leading-relaxed mb-3 line-clamp-1">{signal.detail}</p>

      {/* Bottom: score + hover buttons */}
      <div className="flex items-center justify-between">
        <NiveshScoreBadge score={signal.nivesh_score} size="sm" />

        {/* Hover-reveal action buttons */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={e => { e.stopPropagation(); onAnalyse(signal) }}
            className="flex items-center gap-1 text-[11px] font-semibold py-1 px-2.5 rounded-lg transition-colors duration-150"
            style={{ background: 'rgba(59,139,235,0.12)', color: '#3B8BEB' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,139,235,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,139,235,0.12)')}
          >
            Analyse <ArrowRight size={9} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setActiveStock(signal.ticker) }}
            className="flex items-center gap-1 text-[11px] py-1 px-2.5 rounded-lg transition-colors duration-150"
            style={{ background: '#141E30', color: '#8B95A8' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1C2840')}
            onMouseLeave={e => (e.currentTarget.style.background = '#141E30')}
          >
            <BarChart2 size={10} /> Chart
          </button>
        </div>
      </div>
    </motion.div>
  )
}
