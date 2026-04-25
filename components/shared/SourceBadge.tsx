'use client'

import type { DataSourceMeta } from '@/types'
import { getSourceTone } from '@/lib/data-source'

interface Props {
  source: DataSourceMeta
  compact?: boolean
}

export default function SourceBadge({ source, compact = false }: Props) {
  const tone = getSourceTone(source.state)

  return (
    <span
      className="inline-flex items-center rounded-full font-bold tracking-wide uppercase"
      style={{
        color: tone.text,
        background: tone.background,
        border: `1px solid ${tone.border}`,
        fontSize: compact ? 10 : 11,
        padding: compact ? '3px 8px' : '4px 10px',
      }}
      title={source.note}
    >
      {source.label}
    </span>
  )
}
