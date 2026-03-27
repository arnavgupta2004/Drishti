'use client'
import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'

interface MarketData {
  indices: { name: string; value: number; change_pct: number }[]
  gainers: { ticker: string; change_pct: number }[]
  losers: { ticker: string; change_pct: number }[]
  fii_net: number
  dii_net: number
  date: string
}

interface Props {
  data: MarketData
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
const NUM_PARTICLES = 40

function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3) }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }

interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  originX: number
  originY: number
  speed: number
  size: number
  color: string
  progress: number
  delay: number
  // Whether the particle loops continuously
  loop: boolean
}

function createParticles(
  fiiNet: number,
  diiNet: number,
  fiiX: number,
  fiiY: number,
  diiX: number,
  diiY: number,
  nseX: number,
  nseY: number
): Particle[] {
  const particles: Particle[] = []

  // FII particles
  for (let i = 0; i < NUM_PARTICLES / 2; i++) {
    const buying = fiiNet >= 0
    const angle = (Math.random() * Math.PI * 2)
    const r = 50 + Math.random() * 20
    particles.push({
      x: fiiX + Math.cos(angle) * r,
      y: fiiY + Math.sin(angle) * r,
      targetX: buying ? nseX + (Math.random() - 0.5) * 40 : fiiX + Math.cos(angle + Math.PI) * (80 + Math.random() * 60),
      targetY: buying ? nseY + (Math.random() - 0.5) * 40 : fiiY + Math.sin(angle + Math.PI) * (80 + Math.random() * 60),
      originX: fiiX + Math.cos(angle) * r,
      originY: fiiY + Math.sin(angle) * r,
      speed: 0.003 + Math.random() * 0.004,
      size: 2 + Math.random() * 3,
      color: buying ? '#00D4AA' : '#FF4560',
      progress: Math.random(),
      delay: Math.random() * 0.5,
      loop: true,
    })
  }

  // DII particles
  for (let i = 0; i < NUM_PARTICLES / 2; i++) {
    const buying = diiNet >= 0
    const angle = (Math.random() * Math.PI * 2)
    const r = 50 + Math.random() * 20
    particles.push({
      x: diiX + Math.cos(angle) * r,
      y: diiY + Math.sin(angle) * r,
      targetX: buying ? nseX + (Math.random() - 0.5) * 40 : diiX + Math.cos(angle + Math.PI) * (80 + Math.random() * 60),
      targetY: buying ? nseY + (Math.random() - 0.5) * 40 : diiY + Math.sin(angle + Math.PI) * (80 + Math.random() * 60),
      originX: diiX + Math.cos(angle) * r,
      originY: diiY + Math.sin(angle) * r,
      speed: 0.003 + Math.random() * 0.004,
      size: 2 + Math.random() * 3,
      color: buying ? '#3B8BEB' : '#FF6B35',
      progress: Math.random(),
      delay: Math.random() * 0.5,
      loop: true,
    })
  }

  return particles
}

// Simulated last 5 sessions data
const SESSION_DATA = [
  { fii: -1200, dii: 800 },
  { fii: 2300, dii: -400 },
  { fii: -800, dii: 1200 },
  { fii: 4100, dii: -900 },
  { fii: 3140, dii: -620 },
]

const FIIDIIFlow = forwardRef<AnimationHandle, Props>(({ data, onComplete, isPlaying }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const completedRef = useRef(false)
  const particlesRef = useRef<Particle[]>([])

  // Circle centers
  const fiiX = W * 0.22
  const fiiY = H * 0.42
  const diiX = W * 0.78
  const diiY = H * 0.42
  const nseX = W / 2
  const nseY = H * 0.42

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    reset: () => {
      completedRef.current = false
      startRef.current = 0
      particlesRef.current = createParticles(data.fii_net, data.dii_net, fiiX, fiiY, diiX, diiY, nseX, nseY)
    },
  }))

  // Initialize particles on mount
  useEffect(() => {
    particlesRef.current = createParticles(data.fii_net, data.dii_net, fiiX, fiiY, diiX, diiY, nseX, nseY)
  }, [data, fiiX, fiiY, diiX, diiY, nseX, nseY])

  const draw = useCallback((elapsed: number, dt: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const t = Math.min(elapsed / DURATION, 1)
    const introFade = easeOut(Math.min(t * 8, 1))

    // Background
    ctx.fillStyle = '#070B14'
    ctx.fillRect(0, 0, W, H)

    ctx.globalAlpha = introFade

    // ── Connection lines (flow paths) ──────────────────────────────────────
    const drawFlowLine = (x1: number, y1: number, x2: number, y2: number, color: string) => {
      const grad = ctx.createLinearGradient(x1, y1, x2, y2)
      grad.addColorStop(0, `${color}33`)
      grad.addColorStop(0.5, `${color}11`)
      grad.addColorStop(1, `${color}33`)
      ctx.strokeStyle = grad
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 8])
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      // Curved path via NSE
      ctx.quadraticCurveTo(nseX, nseY - 60, x2, y2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    drawFlowLine(fiiX + 80, fiiY, nseX - 80, nseY, data.fii_net >= 0 ? '#00D4AA' : '#FF4560')
    drawFlowLine(diiX - 80, diiY, nseX + 80, nseY, data.dii_net >= 0 ? '#3B8BEB' : '#FF6B35')

    // ── Update & draw particles ─────────────────────────────────────────────
    const dtSec = Math.min(dt / 1000, 0.05)
    particlesRef.current.forEach(p => {
      p.progress += p.speed * (dtSec * 60)
      if (p.progress > 1) {
        p.progress = 0
        // Reset to origin
        p.x = p.originX
        p.y = p.originY
      }

      const pp = easeOut(Math.min(p.progress, 1))
      const cx = lerp(p.originX, p.targetX, pp)
      const cy = lerp(p.originY, p.targetY, pp)

      const alpha = Math.sin(p.progress * Math.PI) * 0.85
      ctx.globalAlpha = introFade * alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(cx, cy, p.size * (1 - p.progress * 0.3), 0, Math.PI * 2)
      ctx.fill()

      // Tail
      if (p.progress > 0.05) {
        const prevPP = easeOut(Math.max(p.progress - 0.08, 0))
        const tx = lerp(p.originX, p.targetX, prevPP)
        const ty = lerp(p.originY, p.targetY, prevPP)
        ctx.globalAlpha = introFade * alpha * 0.3
        ctx.strokeStyle = p.color
        ctx.lineWidth = p.size * 0.5
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(cx, cy)
        ctx.stroke()
      }
    })
    ctx.globalAlpha = introFade

    // ── Draw circles ───────────────────────────────────────────────────────
    const drawCircle = (x: number, y: number, label: string, value: number, colorBuy: string, colorSell: string, animT: number) => {
      const isUp = value >= 0
      const color = isUp ? colorBuy : colorSell
      const radius = 75

      // Outer glow
      const glow = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 1.5)
      glow.addColorStop(0, `${color}1A`)
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2)
      ctx.fill()

      // Circle background
      ctx.fillStyle = 'rgba(13,20,33,0.95)'
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()

      // Border arc (animated)
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * easeOut(Math.min(animT * 2, 1)))
      ctx.stroke()

      // Label
      ctx.fillStyle = '#8B95A8'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(label, x, y - 28)

      // Arrow + value
      const arrow = isUp ? '\u25b2' : '\u25bc'
      ctx.fillStyle = color
      ctx.font = 'bold 16px monospace'
      ctx.fillText(`${arrow} \u20b9${(Math.abs(value) / 100).toFixed(0)}Cr`, x, y + 2)

      // Net buy/sell label
      ctx.fillStyle = color
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(isUp ? 'NET BUY' : 'NET SELL', x, y + 20)

      // Full amount small
      ctx.fillStyle = '#4A5568'
      ctx.font = '10px monospace'
      ctx.fillText(`\u20b9${Math.abs(value).toLocaleString('en-IN')} Cr`, x, y + 38)
    }

    drawCircle(fiiX, fiiY, 'FII', data.fii_net, '#00D4AA', '#FF4560', t)
    drawCircle(diiX, diiY, 'DII', data.dii_net, '#3B8BEB', '#FF6B35', t)

    // ── NSE center circle ──────────────────────────────────────────────────
    const nseRadius = 55
    ctx.fillStyle = 'rgba(13,20,33,0.95)'
    ctx.strokeStyle = 'rgba(59,139,235,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(nseX, nseY, nseRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // NSE label
    ctx.fillStyle = '#3B8BEB'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('NSE', nseX, nseY - 8)
    ctx.fillStyle = '#4A5568'
    ctx.font = '9px sans-serif'
    ctx.fillText('MARKET', nseX, nseY + 8)

    // ── Title ──────────────────────────────────────────────────────────────
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#E8EDF5'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('INSTITUTIONAL MONEY FLOW', W / 2, 34)

    ctx.fillStyle = '#4A5568'
    ctx.font = '11px sans-serif'
    ctx.fillText(`FII & DII Net Activity \u2014 ${data.date}`, W / 2, 54)

    // ── Bottom timeline: last 5 sessions ──────────────────────────────────
    const timelineY = H - 90
    const barW = 40
    const barGap = 20
    const numSessions = SESSION_DATA.length
    const totalW = numSessions * (barW * 2 + barGap) + (numSessions - 1) * 30
    const startX = W / 2 - totalW / 2

    ctx.fillStyle = '#2D3748'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('LAST 5 SESSIONS', W / 2, timelineY - 8)

    const timelineFade = easeOut(Math.min((t - 0.15) * 4, 1))
    ctx.globalAlpha = introFade * timelineFade

    SESSION_DATA.forEach((session, i) => {
      const sessionDelay = i * 0.12
      const sessionT = easeOut(Math.min(Math.max((t - sessionDelay) * 3, 0), 1))
      const bx = startX + i * (barW * 2 + barGap + 30)

      // FII bar
      const fiiColor = session.fii >= 0 ? '#00D4AA' : '#FF4560'
      const fiiH = Math.abs(session.fii) / 6000 * 45 * sessionT
      ctx.fillStyle = fiiColor
      ctx.fillRect(bx, timelineY + (session.fii >= 0 ? -fiiH : 0), barW, fiiH)

      // DII bar
      const diiColor = session.dii >= 0 ? '#3B8BEB' : '#FF6B35'
      const diiH = Math.abs(session.dii) / 6000 * 45 * sessionT
      ctx.fillStyle = diiColor
      ctx.fillRect(bx + barW + 4, timelineY + (session.dii >= 0 ? -diiH : 0), barW - 4, diiH)

      // Session label
      ctx.fillStyle = '#4A5568'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`D-${numSessions - i}`, bx + barW / 2, timelineY + 14)
    })

    // Legend
    ctx.globalAlpha = introFade
    const legendY = H - 20
    const legendItems = [
      { color: '#00D4AA', label: 'FII Buy' },
      { color: '#FF4560', label: 'FII Sell' },
      { color: '#3B8BEB', label: 'DII Buy' },
      { color: '#FF6B35', label: 'DII Sell' },
    ]
    const legendW = legendItems.length * 80
    let lx = W / 2 - legendW / 2

    legendItems.forEach(item => {
      ctx.fillStyle = item.color
      ctx.fillRect(lx, legendY - 7, 10, 7)
      ctx.fillStyle = '#4A5568'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(item.label, lx + 13, legendY)
      lx += 80
    })

    // Progress bar
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(59,139,235,0.25)'
    ctx.fillRect(0, H - 3, W, 3)
    ctx.fillStyle = '#3B8BEB'
    ctx.fillRect(0, H - 3, W * t, 3)

    // DRISHTI watermark
    ctx.fillStyle = 'rgba(59,139,235,0.2)'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('DRISHTI AI', W - 12, H - 10)

    ctx.globalAlpha = 1
  }, [data, fiiX, fiiY, diiX, diiY, nseX, nseY])

  useEffect(() => {
    if (!isPlaying) return
    completedRef.current = false
    let prevTs = 0

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const dt = prevTs ? ts - prevTs : 16
      prevTs = ts

      draw(elapsed, dt)

      if (elapsed >= DURATION) {
        if (!completedRef.current) {
          completedRef.current = true
          draw(DURATION, 0)
          onComplete?.()
        }
        return
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, draw, onComplete])

  useEffect(() => { draw(0, 0) }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: '100%', height: 'auto', borderRadius: 8, background: '#070B14' }}
    />
  )
})

FIIDIIFlow.displayName = 'FIIDIIFlow'
export default FIIDIIFlow
