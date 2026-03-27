'use client'
import { Trash2 } from 'lucide-react'
import type { Holding } from '@/types'

interface Props {
  holding: Holding
  onRemove: (id: string) => void
}

export default function HoldingRow({ holding, onRemove }: Props) {
  const pnl = holding.pnl ?? 0
  const pnl_pct = holding.pnl_pct ?? 0
  const isUp = pnl >= 0

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 py-2 border-b border-border group">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-text-primary">{holding.ticker}</span>
          <span className="text-[10px] text-text-secondary">{holding.qty} shares</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-text-secondary font-mono">
            Avg: ₹{holding.avg_buy_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          {holding.current_price && (
            <span className="text-[10px] font-mono text-text-primary">
              LTP: ₹{holding.current_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          )}
          <span className={`text-[10px] font-mono font-bold ${isUp ? 'text-accent-green' : 'text-accent-red'}`}>
            {isUp ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isUp ? '+' : ''}{pnl_pct.toFixed(1)}%)
          </span>
        </div>
      </div>
      <button
        onClick={() => onRemove(holding.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-secondary hover:text-accent-red"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
