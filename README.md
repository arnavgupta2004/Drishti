# दृष्टि · DRISHTI

**Autonomous Investment Intelligence for Indian Markets**

DRISHTI is an AI-powered stock market analysis platform for NSE/BSE listed stocks. It combines real-time market data, multi-model AI reasoning, and technical chart analysis to deliver institutional-grade insights for retail investors.

---

## Features

- **Live Market Pulse** — NIFTY, SENSEX, BANK NIFTY, VIX, FII/DII flows, top gainers & losers in a continuously scrolling ticker
- **Opportunity Radar** — Real-time signal cards (insider buys, bulk deals, breakouts, quarterly results) sourced from NSE bulk deal data
- **Chart Intelligence** — Interactive candlestick charts with EMA20/50/200, Bollinger Bands, RSI, MACD, ADX, ATR, and AI-powered pattern detection
- **DRISHTI Agent** — Conversational AI for stock analysis using a 4-step pipeline: Signal Detection → Technical Enrichment → Fundamental Check → Portfolio Personalization
- **Portfolio Tracker** — Add holdings, track P&L live, and get AI-generated health scores with sector analysis
- **Stock Info Drawer** — Click any signal to see full company details: technicals, fundamentals, quarterly results

---

## AI Architecture

DRISHTI uses a cost-efficient multi-model routing strategy:

| Task | Primary | Fallback |
|------|---------|----------|
| Stock analysis chat | Claude Sonnet | Groq llama-3.3-70b |
| Intent / ticker extraction | Groq llama-3.1-8b | Local regex |
| Chart pattern detection | Claude Sonnet | Groq llama-3.3-70b → seeded demo |
| Portfolio health score | Claude Sonnet | Groq → rule-based calculator |
| Signal sentiment | Groq llama-3.1-8b | Rule-based |

---

## Tech Stack

- **Framework** — Next.js 14 (App Router, SSR)
- **Language** — TypeScript
- **State** — Zustand with persistent store
- **UI** — Tailwind CSS + Framer Motion
- **Charts** — Lightweight Charts (TradingView)
- **Market Data** — Yahoo Finance 2, NSE India APIs
- **AI** — Anthropic Claude API, Groq API

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/arnavgupta2004/Drishti.git
cd Drishti
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

- Get Anthropic key at [console.anthropic.com](https://console.anthropic.com)
- Get Groq key at [console.groq.com](https://console.groq.com) (free tier available)

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
drishti/
├── app/
│   ├── api/
│   │   ├── agent/          # DRISHTI conversational AI (SSE streaming)
│   │   ├── market/pulse/   # Live indices, FII/DII, movers
│   │   ├── patterns/       # Chart pattern detection
│   │   ├── portfolio/score/# Portfolio health scoring
│   │   ├── signals/        # NSE bulk deal signals
│   │   └── stock/[ticker]/ # Stock price, OHLCV, technicals, fundamentals
│   ├── globals.css
│   └── page.tsx
├── components/
│   ├── chart/              # ChartIntelligence, CandlestickChart, PatternInfoCard
│   ├── layout/             # MarketPulse (topbar), ThreePanelLayout
│   ├── portfolio/          # PortfolioPanel, HealthScore
│   └── radar/              # OpportunityRadar, SignalCard, StockInfoDrawer
├── lib/
│   ├── aiRouter.ts         # Groq intent extraction & signal sentiment
│   ├── claude.ts           # Claude + Groq agent loop with SSE streaming
│   ├── demo-data.ts        # Seeded demo signals, OHLCV, market pulse
│   ├── nse.ts              # NSE bulk deals, quarterly results
│   ├── nse-tickers.ts      # 100+ NSE tickers for validation & autocomplete
│   ├── patterns.ts         # 12-pattern library with seeded demo generator
│   ├── portfolio.ts        # P&L calculation, portfolio scoring
│   ├── tools.ts            # Claude tool definitions (get_stock_price, etc.)
│   └── yahoo.ts            # Yahoo Finance wrapper with seeded fallbacks
├── hooks/
│   ├── useMarketData.ts    # Market pulse polling
│   └── usePortfolio.ts     # Portfolio live price refresh
├── store/
│   └── useAppStore.ts      # Zustand global state
└── types/
    └── index.ts            # TypeScript type definitions
```

---

## Demo Mode

When no API keys are configured, DRISHTI runs in **Demo Mode** with:
- 12 realistic signals with March 2026 price levels
- Seeded deterministic OHLCV data (stable, no flicker on reload)
- 12 distinct chart patterns per stock (not random — derived from ticker name)
- Groq-based AI analysis (only requires `GROQ_API_KEY`)

---

## Deployment

Deploy to Vercel in one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/arnavgupta2004/Drishti)

Set `ANTHROPIC_API_KEY` and `GROQ_API_KEY` in your Vercel project environment variables.

---

## License

MIT License

---

*Built for the ET Gen AI Hackathon 2025 · "Aapka Personal Hedge Fund AI" 🇮🇳*
