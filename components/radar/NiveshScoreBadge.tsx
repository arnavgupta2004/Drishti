'use client'

interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export default function NiveshScoreBadge({ score, size = 'md' }: Props) {
  const color =
    score >= 80 ? '#00D4AA' :
    score >= 65 ? '#3B8BEB' :
    score >= 50 ? '#FFB800' : '#FF4560'

  const cfg = {
    sm: { dim: 44, sw: 3, fs: 13 },
    md: { dim: 54, sw: 3.5, fs: 15 },
    lg: { dim: 68, sw: 4, fs: 20 },
  }[size]

  const r = (cfg.dim - cfg.sw) / 2
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ

  return (
    <div className="relative flex-shrink-0" style={{ width: cfg.dim, height: cfg.dim }}>
      <svg width={cfg.dim} height={cfg.dim} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={cfg.dim / 2} cy={cfg.dim / 2} r={r}
          fill="none" stroke="#1C2840" strokeWidth={cfg.sw}
        />
        <circle
          cx={cfg.dim / 2} cy={cfg.dim / 2} r={r}
          fill="none" stroke={color} strokeWidth={cfg.sw}
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          style={{
            color,
            fontSize: cfg.fs,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {score}
        </span>
      </div>
    </div>
  )
}
