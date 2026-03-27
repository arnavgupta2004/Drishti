'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useSignals } from '@/hooks/useSignals'
import SignalCard from './SignalCard'
import StockInfoDrawer from './StockInfoDrawer'
import type { Signal } from '@/types'

interface Props {
  onAnalyseSignal: (signal: Signal) => void
}

export default function OpportunityRadar({ onAnalyseSignal }: Props) {
  const { signals, isDemoMode } = useAppStore()
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null)
  useSignals()

  return (
    <div className="flex flex-col h-full" style={{ background: '#070B14' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 44, borderBottom: '1px solid #1C2840' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#8B95A8] uppercase tracking-[0.14em]">
            Opportunity Radar
          </span>
          {signals.length > 0 && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(0,212,170,0.08)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.15)' }}
            >
              {signals.length} signals
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: isDemoMode ? '#FFB800' : '#00D4AA' }}
          />
          <span className="text-[10px] text-[#4A5568]">{isDemoMode ? 'Demo' : 'Live'}</span>
        </div>
      </div>

      {/* Signal feed */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence>
          {signals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-40 gap-3"
            >
              <RefreshCw size={16} className="animate-spin" style={{ color: '#4A5568' }} />
              <span className="text-[11px] text-[#4A5568]">Scanning markets...</span>
            </motion.div>
          ) : (
            signals.map((signal, i) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                index={i}
                onAnalyse={onAnalyseSignal}
                onCardClick={setSelectedSignal}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 shrink-0" style={{ borderTop: '1px solid #1C2840' }}>
        <p className="text-[9px] text-[#4A5568] text-center tracking-wide">
          Tap a signal to view company details · Auto-refresh 5 min
        </p>
      </div>

      {/* Stock Info Drawer */}
      <AnimatePresence>
        {selectedSignal && (
          <StockInfoDrawer
            signal={selectedSignal}
            onClose={() => setSelectedSignal(null)}
            onAnalyse={onAnalyseSignal}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
