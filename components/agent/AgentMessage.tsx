'use client'
import { motion } from 'framer-motion'
import type { ChatMessage, RoutingEvent } from '@/types'
import ThinkingChain from './ThinkingChain'
import ActionCard from './ActionCard'

const ACTION_COLORS: Record<string, string> = {
  BUY:        '#00D4AA',
  ACCUMULATE: '#3B8BEB',
  WATCH:      '#FFB800',
  AVOID:      '#FF4560',
  REDUCE:     '#FF4560',
  HOLD:       '#8B95A8',
}

function RoutingBadge({ event }: { event: RoutingEvent }) {
  const isGroq = event.model === 'groq'
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{
        color:   isGroq ? '#00D4AA' : '#FFB800',
        background: isGroq ? 'rgba(0,212,170,0.07)' : 'rgba(255,184,0,0.07)',
        border: `1px solid ${isGroq ? 'rgba(0,212,170,0.18)' : 'rgba(255,184,0,0.18)'}`,
      }}
    >
      {event.model_label}
      {event.detail && (
        <span className="font-normal opacity-50 truncate max-w-[120px] ml-0.5">— {event.detail}</span>
      )}
    </div>
  )
}

export default function AgentMessage({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-end"
      >
        <div
          className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 premium-card"
          style={{ background: 'rgba(59,139,235,0.12)', border: '1px solid rgba(59,139,235,0.2)' }}
        >
          <p className="text-[#E8EDF5] text-[13px] leading-[1.75]">{message.content}</p>
        </div>
      </motion.div>
    )
  }

  // Parse action, sources, and clean body
  const action = message.content?.match(/ACTION:\s*(BUY|ACCUMULATE|WATCH|AVOID|REDUCE|HOLD)/i)?.[1]?.toUpperCase()
  const sourcesMatch = message.content?.match(/\nSources?:\s*(.+?)$/im)
  const sources = sourcesMatch?.[1]?.trim()

  const bodyContent = message.content
    // Strip sources line
    ?.replace(/\nSources?:\s*.+$/im, '')
    // Strip redundant "X Analysis — DRISHTI Verdict:" header
    ?.replace(/^.+Analysis\s*[—–-]+\s*DRISHTI Verdict:\s*\n*/i, '')
    // Strip "ACTION: X" line — match with optional preceding newlines + full line
    ?.replace(/\n*📍?\s*ACTION:\s*(BUY|ACCUMULATE|WATCH|AVOID|REDUCE|HOLD)[^\n]*/gi, '')
    // Strip Groq's verbose process preambles
    ?.replace(/^(To initiate|I'll follow|I will follow|Let me follow|Following the|To analyze|To begin).+?\.\s*\n*/i, '')
    ?.replace(/^\*\*Step\s+\d+\s*[—–-]+\s*\w+\*\*:?\s*\n*/gim, '')
    // Strip all markdown bold (**text** → text)
    ?.replace(/\*\*([^*\n]+)\*\*/g, '$1')
    // Strip markdown headers (## Header)
    ?.replace(/^#{1,3}\s+/gm, '')
    // Strip "X: Not applicable" lines (Groq shouldn't produce these now, but safety net)
    ?.replace(/\n(Entry Zone|Stop Loss|Target):\s*Not applicable[^\n]*/gi, '')
    // Collapse 3+ newlines to 2
    ?.replace(/\n{3,}/g, '\n\n')
    ?.trim()

  return (
    <motion.div
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex flex-col gap-2"
    >
      {/* Thinking chain */}
      {message.steps && message.steps.length > 0 && (
        <div
          className="premium-card rounded-[18px] px-4 py-3.5"
        >
          {/* Routing trail */}
          {message.routing && message.routing.length > 0 && (
            <div className="mb-2.5">
              <span className="text-[9px] text-[#4A5568] uppercase tracking-[0.12em] font-bold block mb-1.5">
                AI Routing
              </span>
              <div className="flex flex-wrap gap-1">
                {message.routing.map((r, i) => <RoutingBadge key={i} event={r} />)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFB800] animate-pulse" />
            <span className="text-[10px] text-[#FFB800] font-bold uppercase tracking-wide">
              DRISHTI is analysing...
            </span>
          </div>
          <ThinkingChain steps={message.steps} />
        </div>
      )}

      {/* Verdict */}
      {message.content && (
        <div
          className="rounded-[20px] rounded-tl-sm px-4 py-4 premium-card"
          style={{
            background: '#0F1928',
            border: '1px solid #1C2840',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">🤖</span>
              <span className="text-[11px] font-bold text-[#FFB800] uppercase tracking-wide">DRISHTI Verdict</span>
            </div>
            <span
              className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
              style={{ color: '#FFB800', background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.15)' }}
            >
              🧠 Claude
            </span>
          </div>

          {/* ACTION pill */}
          {action && (
            <div className="mb-3">
              <span
                className="inline-flex items-center gap-1.5 text-sm font-black px-4 py-1.5 rounded-full tracking-wider"
                style={{
                  color:      ACTION_COLORS[action] ?? '#8B95A8',
                  background: `${ACTION_COLORS[action] ?? '#8B95A8'}14`,
                  border:     `1px solid ${ACTION_COLORS[action] ?? '#8B95A8'}35`,
                }}
              >
                {action}
              </span>
            </div>
          )}

          {/* Clean divider before body */}
          <div style={{ borderTop: '1px solid #1C2840', marginBottom: '12px' }} />

          {/* Body text */}
          <div
            className="text-[#C8D3E0] whitespace-pre-line"
            style={{ fontSize: 13, lineHeight: 1.8 }}
          >
            {bodyContent}
          </div>

          {/* Sources */}
          {sources && (
            <div
              className="mt-3 pt-2.5 flex items-start gap-1.5"
              style={{ borderTop: '1px solid #1C2840' }}
            >
              <span className="text-[10px] text-[#4A5568] leading-relaxed">
                <span className="text-[#8B95A8] font-medium">Sources:</span> {sources}
              </span>
            </div>
          )}
        </div>
      )}

      {message.alert && <ActionCard alert={message.alert} />}
    </motion.div>
  )
}
