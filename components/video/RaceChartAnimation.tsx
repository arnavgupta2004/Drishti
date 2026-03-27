'use client'
import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'

export interface SectorData {
  name: string
  days: number[] // 5 daily returns in %
  color: string
}

interface Props {
  data: SectorData[]
  onComplete?: () => void
  isPlaying: boolean
}

export interface AnimationHandle {
  getCanvas: () => HTMLCanvasElement | null
  reset: () => void
}

const DURATION = 30000 // 30 seconds
const W = 960
const H = 540
const NUM_DAYS = 5
const DAY_DURATION = DURATION / NUM_DAYS // 6000ms per day transition

function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3) }
function easeInOut(t: number): number { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }

// Compute cumulative returns up to a given day (0-indexed)
function getCumulative(sector: SectorData, upToDay: number): number {
  let cum = 0
  for (let d = 0; d <= upToDay; d++) {
    cum += sector.days[d] ?? 0
  }
  return cum
}

const RaceChartAnimation = forwardRef<AnimationHandle, Props>(({ data, onComplete, isPlaying }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const completedRef = useRef(false)

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    reset: () => {
      completedRef.current = false
      startRef.current = 0
    },
  }))

  const draw = useCallback((elapsed: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const t = Math.min(elapsed / DURATION, 1)

    // Background
    ctx.fillStyle = '#070B14'
    ctx.fillRect(0, 0, W, H)

    // Header
    ctx.fillStyle = '#E8EDF5'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('SECTOR RACE CHART', W / 2, 36)

    ctx.fillStyle = '#4A5568'
    ctx.font = '11px sans-serif'
    ctx.fillText('5-Day Cumulative Performance', W / 2, 54)

    // Day counter
    const currentDayFloat = t * NUM_DAYS
    const currentDay = Math.min(Math.floor(currentDayFloat), NUM_DAYS - 1)
    const dayProgress = currentDayFloat - Math.floor(currentDayFloat)

    const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5']

    // Day indicator pills
    const pillW = 70
    const pillGap = 12
    const totalPillW = NUM_DAYS * pillW + (NUM_DAYS - 1) * pillGap
    const pillStartX = W / 2 - totalPillW / 2

    for (let d = 0; d < NUM_DAYS; d++) {
      const px = pillStartX + d * (pillW + pillGap)
      const isActive = d === currentDay
      const isPast = d < currentDay

      ctx.fillStyle = isActive
        ? 'rgba(255,184,0,0.2)'
        : isPast
          ? 'rgba(59,139,235,0.15)'
          : 'rgba(255,255,255,0.04)'
      ctx.strokeStyle = isActive ? '#FFB800' : isPast ? 'rgba(59,139,235,0.4)' : '#1C2840'
      ctx.lineWidth = 1

      // Pill shape
      ctx.beginPath()
      ctx.roundRect(px, 62, pillW, 22, 4)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = isActive ? '#FFB800' : isPast ? '#3B8BEB' : '#4A5568'
      ctx.font = `${isActive ? 'bold' : 'normal'} 10px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(dayNames[d], px + pillW / 2, 77)
    }

    // Compute current bar values (interpolated between days)
    const prevDay = currentDay - 1
    const values = data.map(sector => {
      const prev = prevDay < 0 ? 0 : getCumulative(sector, prevDay)
      const curr = getCumulative(sector, currentDay)
      const interp = easeInOut(Math.min(dayProgress, 1))
      return lerp(prev, curr, interp)
    })

    // Sort by current value descending (for ranking)
    const ranked = data
      .map((sector, i) => ({ sector, value: values[i], origIndex: i }))
      .sort((a, b) => b.value - a.value)

    // Find max absolute value for scaling
    const maxAbs = Math.max(...ranked.map(r => Math.abs(r.value)), 3)

    // Bar layout
    const chartTop = 100
    const chartBottom = H - 60
    const chartH = chartBottom - chartTop
    const barH = Math.min(36, (chartH / data.length) - 8)
    const rowSpacing = chartH / data.length
    const labelW = 80
    const valueW = 90
    const barAreaLeft = labelW + 20
    const barAreaRight = W - valueW - 20
    const barAreaW = barAreaRight - barAreaLeft
    const zeroX = barAreaLeft + barAreaW / 2

    // Grid line at zero
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(zeroX, chartTop - 10)
    ctx.lineTo(zeroX, chartBottom + 10)
    ctx.stroke()
    ctx.setLineDash([])

    // Zero label
    ctx.fillStyle = '#2D3748'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('0%', zeroX, chartBottom + 22)

    // Draw bars in rank order
    ranked.forEach((item, rank) => {
      const targetY = chartTop + rank * rowSpacing + (rowSpacing - barH) / 2
      const isLeader = rank === 0
      const value = item.value
      const isPositive = value >= 0

      const barColor = isLeader ? '#FFB800' : item.sector.color
      const barW = Math.abs(value) / maxAbs * (barAreaW / 2)

      // Bar fill
      ctx.fillStyle = isLeader
        ? 'rgba(255,184,0,0.15)'
        : `${item.sector.color}22`
      const barX = isPositive ? zeroX : zeroX - barW
      ctx.fillRect(barAreaLeft, targetY, barAreaW, barH)

      ctx.fillStyle = barColor
      ctx.fillRect(barX, targetY, barW, barH)

      // Leader glow
      if (isLeader) {
        ctx.shadowColor = '#FFB800'
        ctx.shadowBlur = 12
        ctx.fillStyle = '#FFB800'
        ctx.fillRect(barX, targetY, barW, barH)
        ctx.shadowBlur = 0
      }

      // Sector name label
      ctx.fillStyle = isLeader ? '#FFB800' : '#E8EDF5'
      ctx.font = `${isLeader ? 'bold' : 'normal'} 12px sans-serif`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.sector.name, barAreaLeft - 8, targetY + barH / 2)

      // Rank badge
      if (isLeader) {
        ctx.fillStyle = '#FFB800'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('#1', 4, targetY + barH / 2)
      }

      // Value label
      ctx.fillStyle = isLeader ? '#FFB800' : (isPositive ? '#00D4AA' : '#FF4560')
      ctx.font = `bold 12px monospace`
      ctx.textAlign = 'left'
      ctx.fillText(
        `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
        barAreaRight + 8,
        targetY + barH / 2
      )
    })

    // Leader annotation
    if (ranked.length > 0) {
      const leader = ranked[0]
      const leaderY = chartTop + (rankOf(leader.origIndex, ranked) * rowSpacing) + rowSpacing / 2
      ctx.fillStyle = 'rgba(255,184,0,0.08)'
      ctx.fillRect(0, chartTop, W, rowSpacing)

      ctx.fillStyle = '#FFB800'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`\uD83C\uDFC6 Leading: ${leader.sector.name}`, W - 20, chartTop - 5)
    }

    // Progress bar
    ctx.fillStyle = 'rgba(255,184,0,0.25)'
    ctx.fillRect(0, H - 3, W, 3)
    ctx.fillStyle = '#FFB800'
    ctx.fillRect(0, H - 3, W * t, 3)

    // DRISHTI watermark
    ctx.fillStyle = 'rgba(59,139,235,0.2)'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('DRISHTI AI', W - 12, H - 10)
  }, [data])

  useEffect(() => {
    if (!isPlaying) return
    completedRef.current = false

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      draw(elapsed)

      if (elapsed >= DURATION) {
        if (!completedRef.current) {
          completedRef.current = true
          draw(DURATION)
          onComplete?.()
        }
        return
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, draw, onComplete])

  useEffect(() => { draw(0) }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: '100%', height: 'auto', borderRadius: 8, background: '#070B14' }}
    />
  )
})

RaceChartAnimation.displayName = 'RaceChartAnimation'
export default RaceChartAnimation

function rankOf(origIndex: number, ranked: { origIndex: number }[]): number {
  return ranked.findIndex(r => r.origIndex === origIndex)
}
