'use client'
import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'

export interface IPOData {
  company: string
  issueSize: string
  priceBand: string
  gmp: number
  subscription: number
  status: string
  sector: string
}

interface Props {
  data: IPOData[]
  onComplete?: () => void
  isPlaying: boolean
}

export interface AnimationHandle {
  getCanvas: () => HTMLCanvasElement | null
  reset: () => void
}

const DURATION = 45000 // 45 seconds
const W = 960
const H = 540

function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3) }
function easeInOut(t: number): number { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'open': return '#00D4AA'
    case 'closed': return '#FFB800'
    case 'listed': return '#3B8BEB'
    case 'upcoming': return '#A78BFA'
    default: return '#4A5568'
  }
}

function getSubscriptionColor(sub: number): string {
  if (sub >= 10) return '#00D4AA'   // hot
  if (sub >= 1) return '#FFB800'    // ok
  if (sub > 0) return '#FF6B35'     // weak
  return '#4A5568'                   // not yet open
}

const IPOTracker = forwardRef<AnimationHandle, Props>(({ data, onComplete, isPlaying }, ref) => {
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

    // ── Header (fades in over first 1s) ────────────────────────────────────
    const headerFade = easeOut(Math.min(t * 20, 1))
    ctx.globalAlpha = headerFade

    ctx.fillStyle = '#E8EDF5'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('\uD83D\uDE80 IPO TRACKER', W / 2, 38)

    ctx.fillStyle = '#4A5568'
    ctx.font = '11px sans-serif'
    ctx.fillText('Live Subscription & Grey Market Premium Data', W / 2, 56)

    // ── Cards layout: 3 top + 2 bottom ─────────────────────────────────────
    const cardW = 280
    const cardH = 150
    const colGap = 20
    const rowGap = 18

    // Row 1: 3 cards, Row 2: 2 cards centered
    const row1Cards = data.slice(0, 3)
    const row2Cards = data.slice(3, 5)

    const row1TotalW = row1Cards.length * cardW + (row1Cards.length - 1) * colGap
    const row1StartX = W / 2 - row1TotalW / 2
    const row1Y = 72

    const row2TotalW = row2Cards.length * cardW + (row2Cards.length - 1) * colGap
    const row2StartX = W / 2 - row2TotalW / 2
    const row2Y = row1Y + cardH + rowGap

    const allCards = [
      ...row1Cards.map((ipo, i) => ({ ipo, x: row1StartX + i * (cardW + colGap), y: row1Y, index: i })),
      ...row2Cards.map((ipo, i) => ({ ipo, x: row2StartX + i * (cardW + colGap), y: row2Y, index: i + row1Cards.length })),
    ]

    allCards.forEach(({ ipo, x, y, index }) => {
      // Card stagger: each card animates in with a delay
      const cardDelay = index * 0.08
      const cardT = easeOut(Math.min(Math.max((t - cardDelay) / 0.15, 0), 1))

      if (cardT <= 0) return

      // Slide up from below
      const slideY = lerp(y + 40, y, cardT)
      ctx.globalAlpha = headerFade * cardT

      const statusColor = getStatusColor(ipo.status)
      const subColor = getSubscriptionColor(ipo.subscription)

      // Card background
      ctx.fillStyle = 'rgba(13,20,33,0.95)'
      ctx.strokeStyle = `${statusColor}44`
      ctx.lineWidth = 1
      roundRect(ctx, x, slideY, cardW, cardH, 10)
      ctx.fill()
      ctx.stroke()

      // Status badge top-right
      const badgeW = 58
      const badgePad = 5
      ctx.fillStyle = `${statusColor}22`
      roundRect(ctx, x + cardW - badgeW - badgePad, slideY + badgePad, badgeW, 18, 4)
      ctx.fill()
      ctx.fillStyle = statusColor
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ipo.status.toUpperCase(), x + cardW - badgeW / 2 - badgePad, slideY + badgePad + 9)

      // Sector badge top-left
      ctx.fillStyle = 'rgba(59,139,235,0.1)'
      roundRect(ctx, x + 8, slideY + 8, 70, 16, 4)
      ctx.fill()
      ctx.fillStyle = '#3B8BEB'
      ctx.font = '8px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ipo.sector.toUpperCase(), x + 43, slideY + 16)

      // Company name
      ctx.fillStyle = '#E8EDF5'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      // Truncate long names
      const maxNameW = cardW - 24
      let name = ipo.company
      ctx.font = 'bold 12px sans-serif'
      while (ctx.measureText(name).width > maxNameW && name.length > 10) {
        name = name.slice(0, -4) + '...'
      }
      ctx.fillText(name, x + 10, slideY + 44)

      // Issue size
      ctx.fillStyle = '#8B95A8'
      ctx.font = '10px sans-serif'
      ctx.fillText(`Size: \u20b9${ipo.issueSize}`, x + 10, slideY + 60)

      // Price band
      ctx.fillStyle = '#8B95A8'
      ctx.fillText(`Band: \u20b9${ipo.priceBand}`, x + cardW / 2 + 4, slideY + 60)

      // GMP
      const gmpColor = ipo.gmp > 0 ? '#00D4AA' : ipo.gmp < 0 ? '#FF4560' : '#4A5568'
      ctx.fillStyle = '#4A5568'
      ctx.font = '9px sans-serif'
      ctx.fillText('GMP', x + 10, slideY + 76)
      ctx.fillStyle = gmpColor
      ctx.font = 'bold 13px monospace'
      ctx.fillText(
        ipo.gmp !== 0 ? `${ipo.gmp > 0 ? '+' : ''}\u20b9${ipo.gmp}` : 'N/A',
        x + 10, slideY + 90
      )

      // Subscription section
      ctx.fillStyle = '#4A5568'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('SUBSCRIPTION', x + 10, slideY + 108)

      const subBarY = slideY + 112
      const subBarW = cardW - 20
      const subBarH = 10

      // Background bar
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      roundRect(ctx, x + 10, subBarY, subBarW, subBarH, 3)
      ctx.fill()

      if (ipo.subscription > 0) {
        // Cap visually at 50x for bar width
        const subFillT = easeInOut(Math.min(Math.max((t - cardDelay - 0.15) / 0.3, 0), 1))
        const fillFraction = Math.min(ipo.subscription / 50, 1) * subFillT
        ctx.fillStyle = subColor
        roundRect(ctx, x + 10, subBarY, subBarW * fillFraction, subBarH, 3)
        ctx.fill()

        // Subscription text
        const displaySub = lerp(0, ipo.subscription, easeOut(subFillT))
        ctx.fillStyle = subColor
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(`${displaySub.toFixed(1)}x`, x + cardW - 10, slideY + 108)
      } else {
        ctx.fillStyle = '#4A5568'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('Not Open', x + cardW - 10, slideY + 108)
      }

      // Fire emoji for hot IPOs
      if (ipo.subscription >= 20) {
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('\uD83D\uDD25', x + cardW - 32, slideY + 90)
      }
    })

    ctx.globalAlpha = 1

    // ── Summary bar at bottom ──────────────────────────────────────────────
    const summaryFade = easeOut(Math.min(Math.max((t - 0.5) * 4, 0), 1))
    ctx.globalAlpha = summaryFade

    const summaryY = H - 32
    ctx.fillStyle = 'rgba(13,20,33,0.6)'
    ctx.fillRect(0, summaryY - 12, W, 28)

    const openIPOs = data.filter(d => d.status === 'open').length
    const hotIPOs = data.filter(d => d.subscription >= 10).length

    ctx.fillStyle = '#4A5568'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${openIPOs} Open  \u2022  ${hotIPOs} Hot (\u226510x)  \u2022  Total: ${data.length} IPOs tracked`, 20, summaryY + 2)

    ctx.fillStyle = 'rgba(59,139,235,0.5)'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('DRISHTI AI \u2014 Aapka Personal Hedge Fund AI', W - 20, summaryY + 2)

    ctx.globalAlpha = 1

    // Progress bar
    ctx.fillStyle = 'rgba(59,139,235,0.25)'
    ctx.fillRect(0, H - 3, W, 3)
    ctx.fillStyle = '#3B8BEB'
    ctx.fillRect(0, H - 3, W * t, 3)
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

IPOTracker.displayName = 'IPOTracker'
export default IPOTracker
