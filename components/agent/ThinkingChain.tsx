'use client'
import { motion } from 'framer-motion'
import { Check, Loader2, Zap, BarChart2, BookOpen, User } from 'lucide-react'
import type { AgentStep } from '@/types'

const STEP_ICONS = [
  <Zap      size={10} key="z" />,
  <BarChart2 size={10} key="b" />,
  <BookOpen size={10} key="bk" />,
  <User     size={10} key="u" />,
]
const STEP_COLORS = ['#00D4AA', '#3B8BEB', '#FFB800', '#8B95A8']

interface Props { steps: AgentStep[] }

export default function ThinkingChain({ steps }: Props) {
  return (
    <div className="space-y-1.5 py-0.5">
      {steps.map((step, i) => {
        const color     = STEP_COLORS[i] ?? '#8B95A8'
        const isDone    = step.status === 'done'
        const isRunning = step.status === 'running'
        const isPending = step.status === 'pending'

        return (
          <motion.div
            key={step.step}
            initial={{ x: -6, opacity: 0 }}
            animate={{ x: 0, opacity: isPending ? 0.25 : 1 }}
            transition={{ delay: i * 0.06, duration: 0.18 }}
            className="flex items-center gap-2"
          >
            {/* Status indicator */}
            <div className="flex-shrink-0 w-4 flex items-center justify-center">
              {isDone    ? <Check   size={11} style={{ color }} /> :
               isRunning ? <Loader2 size={10} style={{ color }} className="animate-spin" /> :
               <div className="w-1 h-1 rounded-full" style={{ background: '#1C2840' }} />}
            </div>

            {/* Step icon */}
            <div className="flex-shrink-0" style={{ color: isDone || isRunning ? color : '#4A5568' }}>
              {STEP_ICONS[i]}
            </div>

            {/* Label */}
            <span
              className="flex-1 text-[11px] font-medium"
              style={{ color: isDone ? color : isRunning ? color : '#4A5568' }}
            >
              {step.label}
            </span>

            {/* Inline snippet */}
            {isDone && step.detail && (
              <span className="text-[10px] text-[#4A5568] truncate max-w-[100px]">
                {step.detail.split('|')[0].trim()}
              </span>
            )}
            {isRunning && (
              <span className="text-[9px] text-[#4A5568] animate-pulse">…</span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
