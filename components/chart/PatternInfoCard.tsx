'use client'
import { motion } from 'framer-motion'
import type { ChartPattern } from '@/types'

interface Props { pattern: ChartPattern }

export default function PatternInfoCard({ pattern }: Props) {
  const color =
    pattern.direction === 'bullish' ? '#00D4AA' :
    pattern.direction === 'bearish' ? '#FF4560' : '#FFB800'

  const levels = [
    { label: 'Support',    value: pattern.support_level,    color: '#00D4AA' },
    { label: 'Resistance', value: pattern.resistance_level, color: '#FFB800' },
    { label: 'Target',     value: pattern.target_price,     color: '#3B8BEB' },
    { label: 'Stop Loss',  value: pattern.stop_loss,        color: '#FF4560' },
  ]

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="rounded-xl p-4 mt-1"
      style={{
        background: '#0D1421',
        border: '1px solid #1C2840',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[#E8EDF5] font-bold text-[15px]">{pattern.pattern_name}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ color, background: `${color}12`, border: `1px solid ${color}30` }}
            >
              {pattern.direction}
            </span>
          </div>
          <p className="text-[#4A5568] text-[11px] italic">"{pattern.description}"</p>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-[20px]" style={{ color }}>{pattern.confidence}%</div>
          <div className="text-[9px] text-[#4A5568] uppercase tracking-wide">confidence</div>
          <div className="text-[9px] text-[#4A5568] mt-0.5">Win {pattern.historical_win_rate}%</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1C2840', marginBottom: '12px' }} />

      {/* 4-column price grid */}
      <div className="grid grid-cols-4 gap-3">
        {levels.map(lvl => (
          <div key={lvl.label} className="text-center">
            <div className="text-[9px] text-[#4A5568] uppercase tracking-wider mb-1.5 font-semibold">
              {lvl.label}
            </div>
            <div className="font-mono font-bold text-[14px]" style={{ color: lvl.color }}>
              ₹{lvl.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
