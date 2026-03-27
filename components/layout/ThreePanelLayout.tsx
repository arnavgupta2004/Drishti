'use client'
import { ReactNode, useState } from 'react'
import { MessageSquare, ChevronRight } from 'lucide-react'

interface Props {
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

export default function ThreePanelLayout({ left, center, right }: Props) {
  const [chatOpen, setChatOpen] = useState(true)

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#040710' }}>
      {/* Left: Opportunity Radar */}
      <div className="w-[310px] shrink-0 flex flex-col overflow-hidden">
        {left}
      </div>

      {/* Divider — left ↔ center */}
      <div className="shrink-0 w-[3px] self-stretch" style={{ background: '#0A0F1C' }} />

      {/* Center: Chart Intelligence — hero */}
      <div
        className="flex-1 min-w-0 flex flex-col overflow-y-auto relative"
        style={{ borderRight: chatOpen ? '2px solid #0A0F1C' : 'none' }}
      >
        {center}

        {/* Toggle button — floats on the right edge of the chart panel */}
        <button
          onClick={() => setChatOpen(o => !o)}
          title={chatOpen ? 'Hide AI Chat' : 'Show AI Chat'}
          className="fixed z-30 flex items-center gap-1.5 text-[11px] font-bold transition-all"
          style={{
            right: chatOpen ? 388 : 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#0D1421',
            border: '1px solid #1C2840',
            borderRadius: 8,
            padding: '10px 6px',
            color: chatOpen ? '#4A5568' : '#3B8BEB',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            writingMode: 'vertical-rl',
          }}
        >
          <MessageSquare size={13} style={{ transform: 'rotate(90deg)' }} />
          <span style={{ letterSpacing: '0.08em' }}>{chatOpen ? 'HIDE' : 'AI CHAT'}</span>
          <ChevronRight
            size={11}
            style={{ transform: chatOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}
          />
        </button>
      </div>

      {/* Right: DRISHTI Agent — collapsible */}
      <div
        className="shrink-0 flex flex-col overflow-hidden transition-all duration-300"
        style={{ width: chatOpen ? 380 : 0, opacity: chatOpen ? 1 : 0, pointerEvents: chatOpen ? 'auto' : 'none' }}
      >
        {right}
      </div>
    </div>
  )
}
