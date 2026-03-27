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

const DURATION = 45000 // 45 seconds in ms
const W = 960
const H = 540

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3) }
function easeIn(t: number) { return t * t * t }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

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

const MarketWrapAnimation = forwardRef<AnimationHandle, Props>(({ data, onComplete, isPlaying }, ref) => {
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

    // Clear
    ctx.fillStyle = '#070B14'
    ctx.fillRect(0, 0, W, H)

    // ── SCENE 1: Intro (0–8s, t: 0–0.178) ──────────────────────────────────
    const s1End = 0.178
    if (t <= s1End + 0.05) {
      const st = Math.min(t / s1End, 1)
      const fade = st < 0.3 ? easeOut(st / 0.3) : st > 0.85 ? 1 - easeIn((st - 0.85) / 0.15) : 1
      ctx.globalAlpha = fade

      // Glow ring
      const gradient = ctx.createRadialGradient(W / 2, H / 2 - 30, 0, W / 2, H / 2 - 30, 120)
      gradient.addColorStop(0, 'rgba(59,139,235,0.3)')
      gradient.addColorStop(1, 'rgba(59,139,235,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(W / 2, H / 2 - 30, 120, 0, Math.PI * 2)
      ctx.fill()

      // DRISHTI logo text
      ctx.fillStyle = '#E8EDF5'
      ctx.font = `bold ${Math.round(lerp(20, 52, easeOut(Math.min(st * 2, 1))))}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('\u0926\u0943\u0937\u094d\u091f\u093f DRISHTI', W / 2, H / 2 - 40)

      // Market Wrap title
      ctx.fillStyle = '#3B8BEB'
      ctx.font = `bold 28px sans-serif`
      ctx.fillText('MARKET WRAP', W / 2, H / 2 + 20)

      // Date
      ctx.fillStyle = '#4A5568'
      ctx.font = '16px sans-serif'
      ctx.fillText(data.date, W / 2, H / 2 + 60)

      ctx.globalAlpha = 1
    }

    // ── SCENE 2: Index cards (8–20s, t: 0.178–0.444) ───────────────────────
    const s2Start = 0.178
    const s2End = 0.444
    if (t >= s2Start - 0.02 && t <= s2End + 0.05) {
      const st = Math.min(Math.max((t - s2Start) / (s2End - s2Start), 0), 1)
      const fade = st < 0.05 ? easeOut(st / 0.05) : st > 0.9 ? 1 - easeIn((st - 0.9) / 0.1) : 1
      ctx.globalAlpha = fade

      // Section header
      ctx.fillStyle = '#4A5568'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('INDEX PERFORMANCE', W / 2, 60)

      const cardW = 200
      const cardH = 110
      const startX = W / 2 - (data.indices.length * cardW + (data.indices.length - 1) * 16) / 2
      const cardY = 100

      data.indices.forEach((idx, i) => {
        const delay = i * 0.18
        const cardT = easeOut(Math.min(Math.max((st - delay) / 0.4, 0), 1))
        const x = lerp(W + 50, startX + i * (cardW + 16), cardT)

        // Number count-up
        const displayValue = Math.round(lerp(idx.value * 0.97, idx.value, cardT))

        const isUp = idx.change_pct >= 0
        const color = isUp ? '#00D4AA' : '#FF4560'

        // Card background
        ctx.fillStyle = 'rgba(13,20,33,0.9)'
        ctx.strokeStyle = isUp ? 'rgba(0,212,170,0.3)' : 'rgba(255,69,96,0.3)'
        ctx.lineWidth = 1
        roundRect(ctx, x, cardY, cardW, cardH, 8)
        ctx.fill()
        ctx.stroke()

        // Index name
        ctx.fillStyle = '#8B95A8'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(idx.name, x + 12, cardY + 24)

        // Value
        ctx.fillStyle = '#E8EDF5'
        ctx.font = `bold 26px monospace`
        ctx.fillText(displayValue.toLocaleString('en-IN'), x + 12, cardY + 58)

        // Change pct
        ctx.fillStyle = color
        ctx.font = 'bold 15px monospace'
        ctx.fillText(`${isUp ? '+' : ''}${idx.change_pct.toFixed(2)}%`, x + 12, cardY + 82)

        // Mini bar
        ctx.fillStyle = isUp ? 'rgba(0,212,170,0.2)' : 'rgba(255,69,96,0.2)'
        ctx.fillRect(x + 12, cardY + 94, cardW - 24, 6)
        ctx.fillStyle = color
        ctx.fillRect(x + 12, cardY + 94, (cardW - 24) * cardT * Math.abs(idx.change_pct) / 5, 6)
      })

      ctx.globalAlpha = 1
    }

    // ── SCENE 3: Gainers & Losers (20–32s, t: 0.444–0.711) ─────────────────
    const s3Start = 0.444
    const s3End = 0.711
    if (t >= s3Start - 0.02 && t <= s3End + 0.05) {
      const st = Math.min(Math.max((t - s3Start) / (s3End - s3Start), 0), 1)
      const fade = st < 0.05 ? easeOut(st / 0.05) : st > 0.9 ? 1 - easeIn((st - 0.9) / 0.1) : 1
      ctx.globalAlpha = fade

      // Headers
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#00D4AA'
      ctx.fillText('\u25b2 TOP GAINERS', W / 4, 60)
      ctx.fillStyle = '#FF4560'
      ctx.fillText('\u25bc TOP LOSERS', (3 * W) / 4, 60)

      // Divider
      ctx.strokeStyle = '#1C2840'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(W / 2, 40)
      ctx.lineTo(W / 2, H - 40)
      ctx.stroke()

      const barMaxW = W / 2 - 140
      const rowH = 80
      const topY = 90

      data.gainers.slice(0, 3).forEach((g, i) => {
        const delay = i * 0.2
        const barT = easeOut(Math.min(Math.max((st - delay) / 0.5, 0), 1))
        const y = topY + i * rowH

        ctx.fillStyle = '#E8EDF5'
        ctx.font = 'bold 15px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(g.ticker, 40, y + 14)

        ctx.fillStyle = '#00D4AA'
        ctx.font = 'bold 14px monospace'
        ctx.fillText(`+${g.change_pct.toFixed(1)}%`, 40, y + 34)

        // Bar background
        ctx.fillStyle = 'rgba(0,212,170,0.15)'
        ctx.fillRect(40, y + 44, barMaxW, 12)
        // Bar fill
        ctx.fillStyle = '#00D4AA'
        ctx.fillRect(40, y + 44, barT * (barMaxW * g.change_pct / 10), 12)
      })

      data.losers.slice(0, 3).forEach((l, i) => {
        const delay = i * 0.2
        const barT = easeOut(Math.min(Math.max((st - delay) / 0.5, 0), 1))
        const y = topY + i * rowH
        const lx = W / 2 + 40

        ctx.fillStyle = '#E8EDF5'
        ctx.font = 'bold 15px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(l.ticker, lx, y + 14)

        ctx.fillStyle = '#FF4560'
        ctx.font = 'bold 14px monospace'
        ctx.fillText(`${l.change_pct.toFixed(1)}%`, lx, y + 34)

        const barW = barT * (barMaxW * Math.abs(l.change_pct) / 10)
        ctx.fillStyle = 'rgba(255,69,96,0.15)'
        ctx.fillRect(lx, y + 44, barMaxW, 12)
        ctx.fillStyle = '#FF4560'
        ctx.fillRect(lx, y + 44, barW, 12)
      })

      ctx.globalAlpha = 1
    }

    // ── SCENE 4: FII/DII (32–42s, t: 0.711–0.933) ──────────────────────────
    const s4Start = 0.711
    const s4End = 0.933
    if (t >= s4Start - 0.02 && t <= s4End + 0.05) {
      const st = Math.min(Math.max((t - s4Start) / (s4End - s4Start), 0), 1)
      const fade = st < 0.05 ? easeOut(st / 0.05) : st > 0.9 ? 1 - easeIn((st - 0.9) / 0.1) : 1
      ctx.globalAlpha = fade

      ctx.fillStyle = '#4A5568'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('INSTITUTIONAL FLOWS', W / 2, 60)

      const drawFlow = (label: string, value: number, x: number, y: number, barT: number) => {
        const isUp = value >= 0
        const color = isUp ? '#00D4AA' : '#FF4560'
        const arrow = isUp ? '\u25b2' : '\u25bc'

        // Circle glow
        const circleGrad = ctx.createRadialGradient(x, y, 0, x, y, 70)
        circleGrad.addColorStop(0, isUp ? 'rgba(0,212,170,0.2)' : 'rgba(255,69,96,0.2)')
        circleGrad.addColorStop(1, 'rgba(7,11,20,0)')
        ctx.fillStyle = circleGrad
        ctx.beginPath()
        ctx.arc(x, y, 70, 0, Math.PI * 2)
        ctx.fill()

        // Arc progress
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * barT)
        ctx.stroke()

        ctx.fillStyle = color
        ctx.font = 'bold 18px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(label, x, y - 15)

        ctx.fillStyle = '#E8EDF5'
        ctx.font = 'bold 20px monospace'
        ctx.fillText(`${arrow} \u20b9${Math.abs(value).toLocaleString('en-IN')} Cr`, x, y + 18)

        ctx.fillStyle = '#4A5568'
        ctx.font = '12px sans-serif'
        ctx.fillText(isUp ? 'NET BUY' : 'NET SELL', x, y + 40)
      }

      drawFlow('FII', data.fii_net, W / 3, H / 2, easeOut(Math.min(st * 2, 1)))
      drawFlow('DII', data.dii_net, (2 * W) / 3, H / 2, easeOut(Math.min(Math.max((st - 0.2) * 2, 0), 1)))

      ctx.globalAlpha = 1
    }

    // ── SCENE 5: Outro (42–45s, t: 0.933–1.0) ──────────────────────────────
    const s5Start = 0.933
    if (t >= s5Start) {
      const st = Math.min((t - s5Start) / (1 - s5Start), 1)
      ctx.globalAlpha = easeOut(st)

      // Background glow
      const gradient = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 200)
      gradient.addColorStop(0, 'rgba(59,139,235,0.2)')
      gradient.addColorStop(1, 'rgba(7,11,20,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, W, H)

      ctx.fillStyle = '#E8EDF5'
      ctx.font = 'bold 32px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('\u0926\u0943\u0937\u094d\u091f\u093f DRISHTI', W / 2, H / 2 - 25)

      ctx.fillStyle = '#3B8BEB'
      ctx.font = '18px sans-serif'
      ctx.fillText('Powered by DRISHTI AI', W / 2, H / 2 + 20)

      ctx.fillStyle = '#4A5568'
      ctx.font = '13px sans-serif'
      ctx.fillText('Aapka Personal Hedge Fund AI', W / 2, H / 2 + 48)

      ctx.globalAlpha = 1
    }

    // Progress bar at bottom
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(59,139,235,0.3)'
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

  // Draw first frame on mount
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

MarketWrapAnimation.displayName = 'MarketWrapAnimation'
export default MarketWrapAnimation
