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
    <div className="flex h-full overflow-hidden px-3 py-3 gap-3" style={{ background: '#040710' }}>
      {/* Left: Opportunity Radar */}
      <div className="w-[332px] shrink-0 flex flex-col overflow-hidden rounded-[22px] panel-shell">
        {left}
      </div>

      {/* Center: Chart Intelligence — hero */}
      <div
        className="flex-1 min-w-0 flex flex-col overflow-y-auto relative rounded-[24px] panel-shell"
      >
        {center}

        {/* Toggle button — floats on the right edge of the chart panel */}
        <button
          onClick={() => setChatOpen(o => !o)}
          title={chatOpen ? 'Hide AI Chat' : 'Show AI Chat'}
          className="fixed z-30 flex items-center gap-1.5 text-[11px] font-bold transition-all"
          style={{
            right: chatOpen ? 366 : 14,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(11, 18, 31, 0.96)',
            border: '1px solid rgba(37,55,86,0.9)',
            borderRadius: 12,
            padding: '12px 7px',
            color: chatOpen ? '#69768F' : '#3B8BEB',
            boxShadow: '0 10px 28px rgba(0,0,0,0.34)',
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
        className="shrink-0 flex flex-col overflow-hidden transition-all duration-300 rounded-[22px] panel-shell"
        style={{ width: chatOpen ? 352 : 0, opacity: chatOpen ? 1 : 0, pointerEvents: chatOpen ? 'auto' : 'none' }}
      >
        {right}
      </div>
    </div>
  )
}
