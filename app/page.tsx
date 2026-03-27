'use client'
import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { usePortfolio } from '@/hooks/usePortfolio'
import type { Signal, AgentStep, ChatMessage } from '@/types'

import MarketPulse from '@/components/layout/MarketPulse'
import ThreePanelLayout from '@/components/layout/ThreePanelLayout'
import OpportunityRadar from '@/components/radar/OpportunityRadar'
import ChartIntelligence from '@/components/chart/ChartIntelligence'
import DrishtiAgent from '@/components/agent/DrishtiAgent'
import PortfolioPanel from '@/components/portfolio/PortfolioPanel'

export default function HomePage() {
  const { portfolioOpen, setPortfolioOpen, isDemoMode, addMessage, setAgentRunning, isAgentRunning } = useAppStore()
  const { holdings } = usePortfolio()

  const runAgentQuery = useCallback(async (query: string) => {
    if (isAgentRunning) return

    const initialSteps: AgentStep[] = [
      { step: 1, label: 'Signal Detection', status: 'pending' },
      { step: 2, label: 'Technical Enrichment', status: 'pending' },
      { step: 3, label: 'Fundamental Check', status: 'pending' },
      { step: 4, label: 'Portfolio Personalization', status: 'pending' },
    ]

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    }
    addMessage(userMsg)

    const assistantMsg: ChatMessage = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      content: '',
      steps: initialSteps,
      timestamp: Date.now(),
    }
    addMessage(assistantMsg)
    setAgentRunning(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, portfolio: holdings, isDemoMode }),
      })

      if (!res.body) throw new Error('No stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let finalContent = ''
      const steps: AgentStep[] = [...initialSteps]
      const routingTrail: import('@/types').RoutingEvent[] = []

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
                if (si > 0 && steps[si - 1].status === 'running') {
                  steps[si - 1] = { ...steps[si - 1], status: 'done' }
                }
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
            }
            if (p.type === 'error') {
              finalContent = `⚠️ ${p.error ?? 'Something went wrong. Please try again.'}`
            }
          } catch { /**/ }
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
  }, [isAgentRunning, holdings, isDemoMode, addMessage, setAgentRunning])

  const handleAnalyseSignal = useCallback((signal: Signal) => {
    const query = `Analyse ${signal.ticker} — ${signal.headline}. Signal type: ${signal.signal_type}. Should I take a position?`
    runAgentQuery(query)
  }, [runAgentQuery])

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      {/* Top bar */}
      <MarketPulse />

      {/* Main content */}
      <div className="flex-1 min-h-0">
        <ThreePanelLayout
          left={<OpportunityRadar onAnalyseSignal={handleAnalyseSignal} />}
          center={<ChartIntelligence />}
          right={<DrishtiAgent />}
        />
      </div>

      {/* Portfolio overlay */}
      <AnimatePresence>
        {portfolioOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPortfolioOpen(false)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <PortfolioPanel />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
