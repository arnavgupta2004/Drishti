'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Signal, ChatMessage, Holding, MarketPulseData, AgentStep } from '@/types'
import { DEMO_HOLDINGS } from '@/lib/portfolio'

interface AppState {
  // Demo mode
  isDemoMode: boolean
  setDemoMode: (v: boolean) => void

  // Language preference
  language: 'en' | 'hi' | 'hinglish'
  setLanguage: (l: 'en' | 'hi' | 'hinglish') => void

  // Market pulse
  marketPulse: MarketPulseData | null
  setMarketPulse: (d: MarketPulseData) => void

  // Signals
  signals: Signal[]
  setSignals: (s: Signal[]) => void
  addSignal: (s: Signal) => void

  // Active stock / chart
  activeStock: string
  setActiveStock: (ticker: string) => void

  // Agent chat
  messages: ChatMessage[]
  addMessage: (m: ChatMessage) => void
  updateLastSteps: (steps: AgentStep[]) => void
  clearMessages: () => void
  isAgentRunning: boolean
  setAgentRunning: (v: boolean) => void
  currentSteps: AgentStep[]
  setCurrentSteps: (steps: AgentStep[]) => void
  updateStep: (step: number, status: AgentStep['status'], detail?: string) => void

  // Portfolio
  holdings: Holding[]
  setHoldings: (h: Holding[]) => void
  addHolding: (h: Holding) => void
  removeHolding: (id: string) => void
  updateHoldingPrice: (ticker: string, price: number) => void

  // Portfolio panel
  portfolioOpen: boolean
  setPortfolioOpen: (v: boolean) => void
}

const DEFAULT_STEPS: AgentStep[] = [
  { step: 1, label: 'Signal Detection', status: 'pending' },
  { step: 2, label: 'Technical Enrichment', status: 'pending' },
  { step: 3, label: 'Fundamental Check', status: 'pending' },
  { step: 4, label: 'Portfolio Personalization', status: 'pending' },
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isDemoMode: true,
      setDemoMode: (v) => set({ isDemoMode: v }),

      language: 'hinglish',
      setLanguage: (l) => set({ language: l }),

      marketPulse: null,
      setMarketPulse: (d) => set({ marketPulse: d }),

      signals: [],
      setSignals: (s) => set({ signals: s }),
      addSignal: (s) => set((state) => ({
        signals: [{ ...s, is_new: true }, ...state.signals.slice(0, 11)],
      })),

      activeStock: 'RELIANCE',
      setActiveStock: (ticker) => set({ activeStock: ticker }),

      messages: [],
      addMessage: (m) => set((state) => ({ messages: [...state.messages, m] })),
      updateLastSteps: (steps) => set((state) => {
        const msgs = [...state.messages]
        if (msgs.length > 0) {
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], steps }
        }
        return { messages: msgs }
      }),
      clearMessages: () => set({ messages: [] }),
      isAgentRunning: false,
      setAgentRunning: (v) => set({ isAgentRunning: v }),
      currentSteps: DEFAULT_STEPS,
      setCurrentSteps: (steps) => set({ currentSteps: steps }),
      updateStep: (step, status, detail) => set((state) => ({
        currentSteps: state.currentSteps.map((s) =>
          s.step === step ? { ...s, status, detail } : s
        ) as AgentStep[],
      })),

      holdings: DEMO_HOLDINGS,
      setHoldings: (h) => set({ holdings: h }),
      addHolding: (h) => set((state) => ({ holdings: [...state.holdings, h] })),
      removeHolding: (id) => set((state) => ({ holdings: state.holdings.filter((h) => h.id !== id) })),
      updateHoldingPrice: (ticker, price) => set((state) => ({
        holdings: state.holdings.map((h) =>
          h.ticker.toUpperCase() === ticker.toUpperCase() ? { ...h, current_price: price } : h
        ),
      })),

      portfolioOpen: false,
      setPortfolioOpen: (v) => set({ portfolioOpen: v }),
    }),
    {
      name: 'drishti-store',
      partialize: (state) => ({ holdings: state.holdings, isDemoMode: state.isDemoMode, language: state.language }),
    }
  )
)
