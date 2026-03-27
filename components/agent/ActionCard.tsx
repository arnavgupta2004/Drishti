'use client'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Target, Shield, ArrowRight } from 'lucide-react'
import type { AgentAlert } from '@/types'
import NiveshScoreBadge from '@/components/radar/NiveshScoreBadge'

interface Props {
  alert: AgentAlert
}

const ACTION_CONFIG = {
  BUY: { color: '#00D4AA', bg: '#00D4AA20', icon: <TrendingUp size={14} />, label: 'BUY' },
  ACCUMULATE: { color: '#3B8BEB', bg: '#3B8BEB20', icon: <TrendingUp size={14} />, label: 'ACCUMULATE' },
  WATCH: { color: '#FFB800', bg: '#FFB80020', icon: <Minus size={14} />, label: 'WATCH' },
  AVOID: { color: '#FF4560', bg: '#FF456020', icon: <TrendingDown size={14} />, label: 'AVOID' },
  REDUCE: { color: '#FF4560', bg: '#FF456020', icon: <TrendingDown size={14} />, label: 'REDUCE' },
  HOLD: { color: '#3B8BEB', bg: '#3B8BEB20', icon: <Minus size={14} />, label: 'HOLD' },
}

export default function ActionCard({ alert }: Props) {
  const cfg = ACTION_CONFIG[alert.action] ?? ACTION_CONFIG.WATCH

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-bg-tertiary border border-border rounded-lg p-3 mt-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-sm text-text-primary">{alert.company}</div>
          <div className="text-text-secondary text-[11px] font-mono">{alert.ticker}</div>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs"
          style={{ color: cfg.color, backgroundColor: cfg.bg }}
        >
          {cfg.icon}
          {cfg.label}
        </div>
      </div>

      {/* Nivesh Score */}
      <div className="mb-3">
        <NiveshScoreBadge score={alert.nivesh_score} size="sm" />
      </div>

      {/* Entry/Stop/Target */}
      {(alert.entry_zone || alert.stop_loss || alert.target) && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {alert.entry_zone && (
            <div className="bg-bg-secondary rounded p-1.5 text-center">
              <div className="text-[9px] text-text-secondary uppercase mb-0.5">Entry Zone</div>
              <div className="font-mono text-[10px] font-bold text-accent-green">
                ₹{alert.entry_zone.low.toLocaleString('en-IN', { maximumFractionDigits: 0 })}–{alert.entry_zone.high.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          )}
          {alert.stop_loss && (
            <div className="bg-bg-secondary rounded p-1.5 text-center">
              <div className="text-[9px] text-text-secondary uppercase mb-0.5">Stop Loss</div>
              <div className="font-mono text-[10px] font-bold text-accent-red">
                ₹{alert.stop_loss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          )}
          {alert.target && (
            <div className="bg-bg-secondary rounded p-1.5 text-center">
              <div className="text-[9px] text-text-secondary uppercase mb-0.5">Target</div>
              <div className="font-mono text-[10px] font-bold text-accent-blue">
                ₹{alert.target.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verdict */}
      <div className="bg-bg-secondary rounded p-2.5 mb-2">
        <p className="text-text-secondary text-[11px] leading-relaxed italic">"{alert.verdict_hi}"</p>
      </div>

      {/* Sources */}
      {alert.sources.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {alert.sources.map((src, i) => (
            <span key={i} className="text-[9px] bg-bg-secondary text-text-secondary px-1.5 py-0.5 rounded border border-border">
              {src}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
