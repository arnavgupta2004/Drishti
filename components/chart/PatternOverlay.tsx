'use client'
import type { ChartPattern } from '@/types'

interface Props {
  pattern: ChartPattern | null
  width: number
  height: number
  priceMin: number
  priceMax: number
}

export default function PatternOverlay({ pattern, width, height, priceMin, priceMax }: Props) {
  if (!pattern) return null

  const priceToY = (p: number) => height - ((p - priceMin) / Math.max(priceMax - priceMin, 1)) * height

  const lines = [
    { price: pattern.support_level, label: `Support ₹${pattern.support_level.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#00D4AA', dash: '6,3' },
    { price: pattern.resistance_level, label: `Resistance ₹${pattern.resistance_level.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#FFB800', dash: '6,3' },
    { price: pattern.target_price, label: `Target ₹${pattern.target_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#3B8BEB', dash: '4,4' },
    { price: pattern.stop_loss, label: `Stop ₹${pattern.stop_loss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#FF4560', dash: '4,4' },
  ].filter(l => l.price > priceMin && l.price < priceMax)

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ zIndex: 10 }}
    >
      {/* Shaded zone between support and resistance */}
      {lines.length >= 2 && (
        <rect
          x={0}
          y={priceToY(pattern.resistance_level)}
          width={width}
          height={priceToY(pattern.support_level) - priceToY(pattern.resistance_level)}
          fill={pattern.direction === 'bullish' ? 'rgba(0,212,170,0.05)' : 'rgba(255,69,96,0.05)'}
        />
      )}

      {lines.map((line) => {
        const y = priceToY(line.price)
        if (isNaN(y) || y < 0 || y > height) return null
        return (
          <g key={line.price}>
            <line
              x1={0} y1={y} x2={width} y2={y}
              stroke={line.color}
              strokeWidth={1.5}
              strokeDasharray={line.dash}
              opacity={0.8}
            />
            {/* Label pill */}
            <rect x={4} y={y - 10} width={120} height={18} rx={3} fill="#0D1421" fillOpacity={0.9} />
            <text x={8} y={y + 3} fill={line.color} fontSize={9} fontFamily="JetBrains Mono, monospace" fontWeight="600">
              {line.label}
            </text>
          </g>
        )
      })}

      {/* Pattern name label */}
      <g>
        <rect x={width - 170} y={8} width={162} height={22} rx={4} fill="#141E30" stroke="#1E2A3D" />
        <text x={width - 84} y={23} fill={pattern.direction === 'bullish' ? '#00D4AA' : '#FF4560'}
          fontSize={10} fontFamily="Inter, sans-serif" fontWeight="700" textAnchor="middle">
          {pattern.pattern_name} • {pattern.confidence}% conf.
        </text>
      </g>
    </svg>
  )
}
