'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Video, Play, Download, RefreshCw, Clapperboard } from 'lucide-react'
import MarketWrapAnimation, { type AnimationHandle as WrapHandle } from './MarketWrapAnimation'
import RaceChartAnimation, { type AnimationHandle as RaceHandle } from './RaceChartAnimation'
import FIIDIIFlow, { type AnimationHandle as FlowHandle } from './FIIDIIFlow'
import IPOTracker, { type AnimationHandle as IPOHandle } from './IPOTracker'

type VideoType = 'market_wrap' | 'race_chart' | 'fii_dii' | 'ipo_tracker'

interface VideoData {
  script: string
  marketData: {
    indices: { name: string; value: number; change_pct: number }[]
    gainers: { ticker: string; change_pct: number }[]
    losers: { ticker: string; change_pct: number }[]
    fii_net: number
    dii_net: number
    date: string
  }
  sectorData: { name: string; days: number[]; color: string }[]
  ipoData: {
    company: string
    issueSize: string
    priceBand: string
    gmp: number
    subscription: number
    status: string
    sector: string
  }[]
  generatedAt: number
}

const TEMPLATES = [
  {
    id: 'market_wrap' as VideoType,
    icon: '\uD83D\uDCCA',
    title: 'Daily Market Wrap',
    duration: '45 sec',
    desc: 'NIFTY, SENSEX, top gainers/losers & FII/DII flows',
  },
  {
    id: 'race_chart' as VideoType,
    icon: '\uD83C\uDFC1',
    title: 'Sector Race Chart',
    duration: '30 sec',
    desc: '8 sectors racing over 5 trading days',
  },
  {
    id: 'fii_dii' as VideoType,
    icon: '\uD83C\uDFE6',
    title: 'FII/DII Flow',
    duration: '30 sec',
    desc: 'Animated institutional money flow visualization',
  },
  {
    id: 'ipo_tracker' as VideoType,
    icon: '\uD83D\uDE80',
    title: 'IPO Tracker',
    duration: '45 sec',
    desc: 'Upcoming IPOs with subscription & GMP data',
  },
]

const DURATIONS: Record<VideoType, number> = {
  market_wrap: 45000,
  race_chart: 30000,
  fii_dii: 30000,
  ipo_tracker: 45000,
}

export default function VideoEngine({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<VideoType | null>(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recording, setRecording] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [autoMode, setAutoMode] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null)

  const wrapRef = useRef<WrapHandle>(null)
  const raceRef = useRef<RaceHandle>(null)
  const flowRef = useRef<FlowHandle>(null)
  const ipoRef = useRef<IPOHandle>(null)
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Update "seconds ago" ticker
  useEffect(() => {
    if (lastUpdated) {
      tickTimerRef.current = setInterval(() => {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000))
      }, 1000)
    }
    return () => { if (tickTimerRef.current) clearInterval(tickTimerRef.current) }
  }, [lastUpdated])

  const generate = useCallback(async (type: VideoType) => {
    setGenerating(true)
    setProgress(0)
    setDownloadUrl(null)
    setIsPlaying(false)

    const interval = setInterval(() => setProgress(p => Math.min(p + 12, 90)), 200)

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      clearInterval(interval)
      setProgress(100)
      if (res.ok) {
        const data: VideoData = await res.json()
        setVideoData(data)
        setLastUpdated(Date.now())
        setSecondsAgo(0)
        setTimeout(() => {
          setGenerating(false)
          setIsPlaying(true)
        }, 400)
      } else {
        setGenerating(false)
      }
    } catch {
      clearInterval(interval)
      setGenerating(false)
    }
  }, [])

  const handleGenerate = useCallback((type: VideoType) => {
    setSelected(type)
    generate(type)
  }, [generate])

  const getActiveHandle = useCallback(() => {
    if (!selected) return null
    if (selected === 'market_wrap') return wrapRef.current
    if (selected === 'race_chart') return raceRef.current
    if (selected === 'fii_dii') return flowRef.current
    if (selected === 'ipo_tracker') return ipoRef.current
    return null
  }, [selected])

  const startRecording = useCallback(() => {
    if (!selected || !videoData) return

    const canvas = getActiveHandle()?.getCanvas()
    if (!canvas) return

    const stream = canvas.captureStream(30)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setRecording(false)
    }

    recorderRef.current = recorder
    recorder.start(100)
    setRecording(true)

    // Reset and play animation
    const handle = getActiveHandle()
    handle?.reset()
    setIsPlaying(true)

    setTimeout(() => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }
    }, DURATIONS[selected] + 500)
  }, [selected, videoData, getActiveHandle])

  const handlePlay = useCallback(() => {
    const handle = getActiveHandle()
    handle?.reset()
    setIsPlaying(true)
  }, [getActiveHandle])

  // Auto mode
  useEffect(() => {
    if (autoMode) {
      const run = () => {
        setSelected('market_wrap')
        generate('market_wrap')
      }
      run()
      autoTimerRef.current = setInterval(run, 60000)
    } else {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    }
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current) }
  }, [autoMode, generate])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#070B14' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 shrink-0"
        style={{ height: 52, background: '#070B14', borderBottom: '1px solid #1C2840' }}
      >
        <div className="flex items-center gap-3">
          <Clapperboard size={18} style={{ color: '#3B8BEB' }} />
          <span className="text-[13px] font-bold text-[#E8EDF5] tracking-wide">VIDEO ENGINE</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{
              background: 'rgba(59,139,235,0.1)',
              color: '#3B8BEB',
              border: '1px solid rgba(59,139,235,0.2)',
            }}
          >
            AI-POWERED
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Auto mode status */}
          {autoMode && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FF4560' }} />
              <span className="text-[10px] font-bold" style={{ color: '#FF4560' }}>
                LIVE — Auto every 60s
              </span>
              {secondsAgo !== null && (
                <span className="text-[9px]" style={{ color: '#4A5568' }}>
                  &middot; updated {secondsAgo}s ago
                </span>
              )}
            </div>
          )}

          {/* Auto mode toggle */}
          <button
            onClick={() => setAutoMode(v => !v)}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
            style={{
              background: autoMode ? 'rgba(255,69,96,0.15)' : 'rgba(59,139,235,0.08)',
              border: `1px solid ${autoMode ? 'rgba(255,69,96,0.4)' : 'rgba(59,139,235,0.2)'}`,
              color: autoMode ? '#FF4560' : '#3B8BEB',
            }}
          >
            {autoMode ? '\u23F9 Stop Auto' : '\uD83D\uDD34 Auto Mode'}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
          >
            <X size={16} style={{ color: '#4A5568' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex gap-0" style={{ minHeight: 0 }}>
        {/* Left: Template grid */}
        <div
          className="shrink-0 overflow-y-auto p-4"
          style={{ width: 320, borderRight: '1px solid #1C2840' }}
        >
          <p className="text-[11px] font-bold text-[#4A5568] uppercase tracking-wider mb-4">
            Choose Template
          </p>
          <div className="flex flex-col gap-3">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => handleGenerate(tpl.id)}
                disabled={generating}
                className="text-left rounded-xl p-4 transition-all"
                style={{
                  background: selected === tpl.id ? 'rgba(59,139,235,0.12)' : 'rgba(13,20,33,0.8)',
                  border: `1px solid ${selected === tpl.id ? 'rgba(59,139,235,0.4)' : '#1C2840'}`,
                  opacity: generating && selected !== tpl.id ? 0.5 : 1,
                  cursor: generating ? 'not-allowed' : 'pointer',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{tpl.icon}</span>
                    <span className="text-[12px] font-bold text-[#E8EDF5]">{tpl.title}</span>
                  </div>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'rgba(59,139,235,0.1)', color: '#3B8BEB' }}
                  >
                    {tpl.duration}
                  </span>
                </div>
                <p className="text-[10px] text-[#4A5568] mb-3">{tpl.desc}</p>
                <div
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={{
                    background: 'rgba(59,139,235,0.15)',
                    color: '#3B8BEB',
                    border: '1px solid rgba(59,139,235,0.25)',
                  }}
                >
                  {selected === tpl.id && generating ? (
                    <>
                      <RefreshCw size={11} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play size={11} />
                      Generate
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Preview + controls */}
        <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
          {/* Generation progress */}
          {generating && (
            <div
              className="rounded-xl p-4 shrink-0"
              style={{
                background: 'rgba(59,139,235,0.05)',
                border: '1px solid rgba(59,139,235,0.15)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-[#3B8BEB]">
                  \uD83E\uDD16 AI is generating your market update...
                </span>
                <span className="text-[11px] font-mono text-[#4A5568]">{progress}%</span>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{ height: 4, background: 'rgba(59,139,235,0.15)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: '#3B8BEB' }}
                />
              </div>
            </div>
          )}

          {/* Canvas + controls */}
          {videoData && selected && !generating && (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Canvas */}
              <div
                className="rounded-xl overflow-hidden relative shrink-0"
                style={{ background: '#070B14', border: '1px solid #1C2840' }}
              >
                {recording && (
                  <div
                    className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold"
                    style={{ background: 'rgba(255,69,96,0.9)', color: 'white' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    REC
                  </div>
                )}

                {selected === 'market_wrap' && (
                  <MarketWrapAnimation
                    ref={wrapRef}
                    data={videoData.marketData}
                    isPlaying={isPlaying}
                    onComplete={() => setIsPlaying(false)}
                  />
                )}
                {selected === 'race_chart' && (
                  <RaceChartAnimation
                    ref={raceRef}
                    data={videoData.sectorData}
                    isPlaying={isPlaying}
                    onComplete={() => setIsPlaying(false)}
                  />
                )}
                {selected === 'fii_dii' && (
                  <FIIDIIFlow
                    ref={flowRef}
                    data={videoData.marketData}
                    isPlaying={isPlaying}
                    onComplete={() => setIsPlaying(false)}
                  />
                )}
                {selected === 'ipo_tracker' && (
                  <IPOTracker
                    ref={ipoRef}
                    data={videoData.ipoData}
                    isPlaying={isPlaying}
                    onComplete={() => setIsPlaying(false)}
                  />
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handlePlay}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all"
                  style={{
                    background: 'rgba(0,212,170,0.1)',
                    color: '#00D4AA',
                    border: '1px solid rgba(0,212,170,0.2)',
                  }}
                >
                  <Play size={13} />
                  Play
                </button>

                <button
                  onClick={startRecording}
                  disabled={recording}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all"
                  style={{
                    background: recording ? 'rgba(255,69,96,0.2)' : 'rgba(255,69,96,0.1)',
                    color: '#FF4560',
                    border: '1px solid rgba(255,69,96,0.2)',
                    opacity: recording ? 0.7 : 1,
                    cursor: recording ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Video size={13} />
                  {recording ? 'Recording...' : 'Record WebM'}
                </button>

                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={`drishti-${selected}-${Date.now()}.webm`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all"
                    style={{
                      background: 'rgba(59,139,235,0.15)',
                      color: '#3B8BEB',
                      border: '1px solid rgba(59,139,235,0.3)',
                      textDecoration: 'none',
                    }}
                  >
                    <Download size={13} />
                    Download WebM
                  </a>
                )}
              </div>

              {/* AI Script */}
              <div
                className="rounded-xl p-4 shrink-0"
                style={{ background: 'rgba(13,20,33,0.8)', border: '1px solid #1C2840' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-bold text-[#3B8BEB] uppercase tracking-wider">
                    \uD83E\uDD16 AI Voiceover Script
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                    style={{
                      background: 'rgba(0,212,170,0.1)',
                      color: '#00D4AA',
                      border: '1px solid rgba(0,212,170,0.2)',
                    }}
                  >
                    Generated by DRISHTI Demo
                  </span>
                </div>
                <pre
                  className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono"
                  style={{ color: '#8B95A8' }}
                >
                  {videoData.script}
                </pre>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!videoData && !generating && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="text-5xl">\uD83C\uDFAC</div>
              <p className="text-[14px] font-bold text-[#E8EDF5]">Select a template to generate</p>
              <p className="text-[12px] text-[#4A5568] text-center max-w-xs">
                AI will fetch live market data, write a voiceover script, and render the animation
                — fully autonomous.
              </p>
              <div className="text-[11px] text-[#4A5568] text-center">
                Powered by Groq + DRISHTI AI &middot; Pure Canvas 2D &middot; WebM export
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
