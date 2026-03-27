'use client'
import { useEffect, useRef, useState } from 'react'
import type { OHLCV, Technicals, ChartPattern } from '@/types'
import PatternOverlay from './PatternOverlay'

interface Props {
  ohlcv: OHLCV[]
  technicals?: Technicals
  pattern?: ChartPattern | null
  showEMA20?: boolean
  showEMA50?: boolean
  showEMA200?: boolean
  showBB?: boolean
  height?: number
}

export default function CandlestickChart({
  ohlcv,
  technicals,
  pattern = null,
  showEMA20 = true,
  showEMA50 = true,
  showEMA200 = false,
  showBB = false,
  height = 340,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)
  const [dims, setDims] = useState({ width: 0, height })
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    const ob = new ResizeObserver((entries) => {
      const { width, height: h } = entries[0].contentRect
      setDims({ width, height: h })
    })
    ob.observe(containerRef.current)
    return () => ob.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current || dims.width === 0 || ohlcv.length === 0) return

    let cancelled = false

    ;(async () => {
      try {
        const lc = await import('lightweight-charts')
        if (cancelled || !containerRef.current) return

        if (chartRef.current) {
          chartRef.current.remove()
          chartRef.current = null
        }

        // lightweight-charts v5 API
        const chart = lc.createChart(containerRef.current!, {
          width: dims.width,
          height: height - 80,
          layout: {
            background: { type: lc.ColorType.Solid, color: '#0D1421' },
            textColor: '#8B95A8',
          },
          grid: {
            vertLines: { color: '#1E2A3D' },
            horzLines: { color: '#1E2A3D' },
          },
          crosshair: { mode: lc.CrosshairMode.Normal },
          rightPriceScale: { borderColor: '#1E2A3D' },
          timeScale: { borderColor: '#1E2A3D', timeVisible: true },
        })
        chartRef.current = chart

        // v5: addSeries with CandlestickSeries
        const candleSeries = 'addCandlestickSeries' in chart
          ? (chart as any).addCandlestickSeries({
              upColor: '#00D4AA', downColor: '#FF4560',
              borderUpColor: '#00D4AA', borderDownColor: '#FF4560',
              wickUpColor: '#00D4AA', wickDownColor: '#FF4560',
            })
          : (chart as any).addSeries(lc.CandlestickSeries, {
              upColor: '#00D4AA', downColor: '#FF4560',
              borderUpColor: '#00D4AA', borderDownColor: '#FF4560',
              wickUpColor: '#00D4AA', wickDownColor: '#FF4560',
            })

        const candles = ohlcv.map((c) => ({
          time: c.date as `${number}-${number}-${number}`,
          open: c.open, high: c.high, low: c.low, close: c.close,
        }))
        candleSeries.setData(candles)

        const prices = ohlcv.flatMap(c => [c.high, c.low])
        if (prices.length) setPriceRange({ min: Math.min(...prices) * 0.99, max: Math.max(...prices) * 1.01 })

        const addLine = (color: string, title: string, value: number) => {
          const s = 'addLineSeries' in chart
            ? (chart as any).addLineSeries({ color, lineWidth: 1, title })
            : (chart as any).addSeries(lc.LineSeries, { color, lineWidth: 1, title })
          s.setData(candles.map((c) => ({ time: c.time, value })))
        }

        if (technicals && showEMA20) addLine('#FFB800', 'EMA20', technicals.ema20)
        if (technicals && showEMA50) addLine('#3B8BEB', 'EMA50', technicals.ema50)
        if (technicals && showEMA200) addLine('#8B95A8', 'EMA200', technicals.ema200)
        if (technicals && showBB) {
          addLine('rgba(59,139,235,0.4)', 'BB+', technicals.bb_upper)
          addLine('rgba(59,139,235,0.4)', 'BB-', technicals.bb_lower)
        }

        chart.timeScale().fitContent()
      } catch (e) {
        console.error('Chart init error:', e)
      }
    })()

    return () => { cancelled = true }
  }, [ohlcv, technicals, dims.width, height, showEMA20, showEMA50, showEMA200, showBB])

  useEffect(() => {
    if (chartRef.current && dims.width > 0) {
      chartRef.current.applyOptions({ width: dims.width, height: height - 80 })
    }
  }, [dims.width, height])

  return (
    <div className="relative" style={{ height }}>
      <div ref={containerRef} className="relative" style={{ height: height - 80 }}>
        {pattern && dims.width > 0 && (
          <PatternOverlay
            pattern={pattern}
            width={dims.width}
            height={height - 80}
            priceMin={priceRange.min}
            priceMax={priceRange.max}
          />
        )}
      </div>

      {technicals && (
        <div className="h-20 bg-bg-secondary border-t border-border flex items-center px-4 gap-4">
          <RSIPanel rsi={technicals.rsi} />
          <div className="flex gap-4 text-[10px] font-mono">
            <span className="text-text-secondary">MACD: <span className={technicals.macd >= 0 ? 'text-accent-green' : 'text-accent-red'}>{technicals.macd >= 0 ? '+' : ''}{technicals.macd.toFixed(2)}</span></span>
            <span className="text-text-secondary">ADX: <span className="text-text-primary">{technicals.adx.toFixed(0)}</span></span>
            <span className="text-text-secondary">ATR: <span className="text-text-primary">{technicals.atr.toFixed(2)}</span></span>
          </div>
        </div>
      )}
    </div>
  )
}

function RSIPanel({ rsi }: { rsi: number }) {
  const color = rsi > 70 ? '#FF4560' : rsi < 30 ? '#00D4AA' : '#FFB800'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-secondary font-medium">RSI(14)</span>
      <div className="relative w-32 h-2 bg-bg-primary rounded-full overflow-hidden">
        <div className="absolute top-0 bottom-0 bg-accent-green/20" style={{ left: '0%', width: '30%' }} />
        <div className="absolute top-0 bottom-0 bg-accent-red/20" style={{ left: '70%', width: '30%' }} />
        <div className="absolute top-0 h-full w-0.5 bg-accent-green/60" style={{ left: '30%' }} />
        <div className="absolute top-0 h-full w-0.5 bg-accent-red/60" style={{ left: '70%' }} />
        <div className="absolute top-0 h-full w-2 rounded-full" style={{ left: `${Math.min(rsi - 1, 97)}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono font-bold text-xs" style={{ color }}>{rsi.toFixed(1)}</span>
    </div>
  )
}
