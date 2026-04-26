'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Bot, Trash2, Sparkles } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { usePortfolio } from '@/hooks/usePortfolio'
import type { ChatMessage, AgentStep, RoutingEvent } from '@/types'
import AgentMessage from './AgentMessage'

const QUICK_QUERIES: Record<'en' | 'hi' | 'hinglish', string[]> = {
  en: [
    'Should I buy HDFC Bank now?',
    'What is the IT sector outlook?',
    'Any signals on RELIANCE?',
    'Analyse my portfolio health',
  ],
  hi: [
    'क्या अभी HDFC Bank खरीदना चाहिए?',
    'IT सेक्टर का outlook क्या है?',
    'RELIANCE में कोई signal है?',
    'मेरा portfolio analyse करें',
  ],
  hinglish: [
    'Should I buy HDFC Bank now?',
    'IT sector ka kya outlook hai?',
    'RELIANCE mein koi signal hai?',
    'Mera portfolio analyze karo',
  ],
}

const LANG_LABELS: Record<'en' | 'hi' | 'hinglish', string> = {
  en: 'EN',
  hi: 'हिं',
  hinglish: 'Hinglish',
}

const PLACEHOLDERS: Record<'en' | 'hi' | 'hinglish', string> = {
  en: 'Ask anything about any NSE/BSE stock...',
  hi: 'कोई भी NSE/BSE स्टॉक के बारे में पूछें...',
  hinglish: 'Koi bhi NSE stock ke baare mein poochho...',
}

export default function DrishtiAgent() {
  const {
    messages, addMessage, clearMessages,
    isAgentRunning, setAgentRunning, setCurrentSteps,
    isDemoMode, language, setLanguage,
  } = useAppStore()
  const { holdings } = usePortfolio()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim() || isAgentRunning) return

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    }
    addMessage(userMsg)
    setInput('')
    setAgentRunning(true)

    const initialSteps: AgentStep[] = [
      { step: 1, label: 'Signal Detection',         status: 'pending' },
      { step: 2, label: 'Technical Enrichment',     status: 'pending' },
      { step: 3, label: 'Fundamental Check',        status: 'pending' },
      { step: 4, label: 'Portfolio Personalization', status: 'pending' },
    ]
    setCurrentSteps(initialSteps)

    const assistantMsg: ChatMessage = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      steps: initialSteps,
      timestamp: Date.now(),
    }
    addMessage(assistantMsg)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, portfolio: holdings, isDemoMode, language }),
      })
      if (!res.ok || !res.body) throw new Error('Agent request failed')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let finalContent = ''
      const steps: AgentStep[]           = [...initialSteps]
      const routingTrail: RoutingEvent[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)

        for (const line of text.split('\n').filter(l => l.startsWith('data: '))) {
          if (line.trim() === 'data: [DONE]') break
          try {
            const p = JSON.parse(line.slice(6))

            if (p.type === 'step') {
              const si = p.step - 1
              if (si >= 0 && si < steps.length) {
                if (si > 0 && steps[si - 1].status === 'running')
                  steps[si - 1] = { ...steps[si - 1], status: 'done' }
                steps[si] = { ...steps[si], status: p.status, detail: p.detail }
                useAppStore.setState(state => ({
                  messages: state.messages.map((m, i) =>
                    i === state.messages.length - 1 ? { ...m, steps: [...steps] } : m
                  ),
                }))
              }
            }

            if (p.type === 'routing') {
              routingTrail.push({ task: p.task, model: p.model, model_label: p.model_label, detail: p.detail })
              useAppStore.setState(state => ({
                messages: state.messages.map((m, i) =>
                  i === state.messages.length - 1 ? { ...m, routing: [...routingTrail] } : m
                ),
              }))
            }

            if (p.type === 'final') {
              finalContent = p.content
              steps.forEach((s, i) => { steps[i] = { ...s, status: 'done' } })
            }

            if (p.type === 'error') {
              finalContent = `⚠️ ${p.error ?? 'Something went wrong. Please try again.'}`
            }
          } catch { /* skip */ }
        }
      }

      useAppStore.setState(state => ({
        messages: state.messages.map((m, i) =>
          i === state.messages.length - 1
            ? { ...m, content: finalContent, routing: routingTrail, steps: steps.map(s => ({ ...s, status: 'done' as const })) }
            : m
        ),
      }))
    } catch {
      useAppStore.setState(state => ({
        messages: state.messages.map((m, i) =>
          i === state.messages.length - 1
            ? { ...m, content: 'Network error. Please check your connection and try again.' }
            : m
        ),
      }))
    } finally {
      setAgentRunning(false)
    }
  }, [isAgentRunning, holdings, isDemoMode, language, addMessage, setAgentRunning, setCurrentSteps])

  const langs: Array<'en' | 'hi' | 'hinglish'> = ['en', 'hi', 'hinglish']

  return (
    <div className="flex flex-col h-full" style={{ background: 'transparent' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 54, borderBottom: '1px solid rgba(37,55,86,0.9)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Bot size={12} className="text-[#FFB800]" />
          <span className="text-[10px] font-extrabold text-[#8B95A8] uppercase tracking-[0.14em] whitespace-nowrap">Drishti Agent</span>
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
            style={{ background: 'rgba(255,184,0,0.08)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.15)' }}
          >
            4-AGENT AI
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAgentRunning && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFB800] animate-pulse" />
          )}
          <button
            onClick={clearMessages}
            className="text-[#8B95A8] hover:text-[#FF4560] transition-colors duration-150 p-1 rounded"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center h-full gap-5 text-center px-4"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.12)', boxShadow: '0 10px 24px rgba(0,0,0,0.2)' }}
            >
              <Sparkles size={18} className="text-[#FFB800]" />
            </div>
            <div>
              <p className="text-[#F2F6FB] text-[22px] leading-[1.25] font-extrabold mb-2 tracking-tight max-w-[260px] mx-auto text-balance">
                Namaskar! Main DRISHTI hoon 🇮🇳
              </p>
              <p className="text-[#94A1BA] text-[14px] leading-relaxed max-w-[250px] mx-auto">
                Your personal hedge fund AI.
                <br />
                Ask about any NSE/BSE stock.
              </p>
            </div>
            <div className="w-full space-y-2">
              <p className="section-eyebrow mb-1">Quick queries</p>
              {QUICK_QUERIES[language].map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left text-[12px] leading-[1.4] text-[#A8B4C9] hover:text-[#E8EDF5] rounded-[16px] px-3.5 py-2.5 transition-all duration-200 premium-card break-words"
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,139,235,0.25)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(38,56,85,0.92)'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map(msg => <AgentMessage key={msg.id} message={msg} />)}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pt-3 pb-4 shrink-0" style={{ borderTop: '1px solid rgba(37,55,86,0.9)' }}>
        {/* Language selector — full width, clearly visible */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] text-[#65748E] font-bold tracking-[0.16em] uppercase shrink-0">
            Lang:
          </span>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {langs.map(l => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className="flex-1 py-2 rounded-full text-[10px] font-semibold transition-all duration-200 min-w-0 whitespace-nowrap"
                style={{
                  background: language === l ? '#3B8BEB' : '#0D1421',
                  color:      language === l ? '#fff'    : '#8B95A8',
                  border:     language === l ? '1px solid #3B8BEB' : '1px solid #1C2840',
                  boxShadow:  language === l ? '0 0 8px rgba(59,139,235,0.3)' : 'none',
                }}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full"
          style={{ background: '#0D1421', border: '1px solid rgba(38,56,85,0.92)', transition: 'border-color 200ms' }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(59,139,235,0.4)')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(38,56,85,0.92)')}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={PLACEHOLDERS[language]}
            disabled={isAgentRunning}
            className="flex-1 bg-transparent text-[13px] text-[#E8EDF5] placeholder-[#5E6C86] outline-none disabled:opacity-40 min-w-0"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isAgentRunning || !input.trim()}
            className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-200 disabled:opacity-25"
            style={{ background: '#3B8BEB' }}
          >
            <ArrowUp size={13} className="text-white" />
          </button>
        </div>
        <p className="text-[11px] text-[#5E6C86] mt-2 text-center tracking-[0.06em]">
          Detect · Enrich · Personalize · Recommend
        </p>
      </div>
    </div>
  )
}
