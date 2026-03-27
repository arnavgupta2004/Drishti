'use client'
import { ReactNode } from 'react'

interface Props {
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

export default function ThreePanelLayout({ left, center, right }: Props) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Opportunity Radar */}
      <div
        className="w-[310px] shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid #1C2840' }}
      >
        {left}
      </div>

      {/* Center: Chart Intelligence — hero */}
      <div
        className="flex-1 min-w-0 flex flex-col overflow-y-auto"
        style={{ borderRight: '1px solid #1C2840' }}
      >
        {center}
      </div>

      {/* Right: DRISHTI Agent */}
      <div className="w-[380px] shrink-0 flex flex-col overflow-hidden">
        {right}
      </div>
    </div>
  )
}
