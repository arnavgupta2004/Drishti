# दृष्टि · DRISHTI

**Autonomous Investment Intelligence for Indian Markets**

🌐 **Live Demo:** [bharat-nivesh.vercel.app](https://bharat-nivesh.vercel.app)

DRISHTI is an AI-powered stock market analysis platform for NSE/BSE listed stocks. It combines real-time market data, multi-model AI reasoning, and technical chart analysis to deliver institutional-grade insights for retail investors.

---

## Features

- **Live Market Pulse** — NIFTY, SENSEX, BANK NIFTY, VIX, FII/DII flows, top gainers & losers in a continuously scrolling ticker
- **Opportunity Radar** — Real-time signal cards sourced from NSE bulk deal data and AI-generated intelligence. 12 signal types including insider buys, breakouts, bulk deals, volume spikes, FII accumulation, quarterly results, **management commentary** (🗣️), and **SEBI regulatory alerts** (⚖️)
- **Chart Intelligence** — Interactive candlestick charts with EMA20/50/200, Bollinger Bands, RSI, MACD, ADX, ATR, and AI-powered pattern detection
- **DRISHTI Agent** — Conversational AI for stock analysis using a 4-step pipeline: Signal Detection → Technical Enrichment → Fundamental Check → Portfolio Personalization. Understands any Indian company name, brand, or product — maps to the correct NSE ticker automatically
- **Portfolio Tracker** — Add holdings, track P&L live, and get AI-generated health scores with sector analysis
- **Stock Info Drawer** — Click any signal to see full company details: technicals, fundamentals, quarterly results
- **AI Video Engine** — Autonomous pipeline that generates animated market update videos (WebM) from live data — zero human editing. 4 templates: Daily Market Wrap, Sector Race Chart, FII/DII Flow, IPO Tracker. Auto Mode regenerates every 60 seconds.

---

## AI Architecture

DRISHTI uses a cost-efficient multi-model routing strategy:

| Task | Primary | Fallback |
|------|---------|----------|
| Stock analysis chat | Claude Sonnet | Groq llama-3.3-70b |
| Intent / ticker extraction | Groq llama-3.1-8b | Local regex (100+ names) |
| Unlisted company detection | Groq llama-3.1-8b | `UNLISTED:<name>` prefix handling |
| Chart pattern detection | Claude Sonnet | Groq llama-3.3-70b → seeded demo |
| Portfolio health score | Claude Sonnet | Groq → rule-based calculator |
| Signal sentiment | Groq llama-3.1-8b | Rule-based |
| Management commentary signal | Groq llama-3.3-70b | Skipped gracefully |
| SEBI regulatory alerts | SEBI website scrape | Groq llama-3.1-8b knowledge |
| Video voiceover script | Groq llama-3.3-70b | Seeded Hinglish templates |

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
│   │   ├── stock/[ticker]/ # Stock price, OHLCV, technicals, fundamentals
│   │   └── video/generate/ # AI video script generation (Groq + demo fallback)
│   ├── globals.css
│   └── page.tsx
├── components/
│   ├── chart/              # ChartIntelligence, CandlestickChart, PatternInfoCard
│   ├── layout/             # MarketPulse (topbar), ThreePanelLayout
│   ├── portfolio/          # PortfolioPanel, HealthScore
│   ├── radar/              # OpportunityRadar, SignalCard, StockInfoDrawer
│   └── video/              # VideoEngine, MarketWrapAnimation, RaceChartAnimation,
│                           #   FIIDIIFlow, IPOTracker (Canvas 2D + WebM export)
├── lib/
│   ├── aiRouter.ts         # Groq intent extraction, sentiment, & UNLISTED handling
│   ├── claude.ts           # Claude + Groq agent loop with SSE streaming
│   ├── demo-data.ts        # Seeded demo signals, OHLCV, market pulse
│   ├── nse.ts              # NSE bulk deals, quarterly results
│   ├── nse-tickers.ts      # 100+ NSE tickers for validation & autocomplete
│   ├── patterns.ts         # 12-pattern library with seeded demo generator
│   ├── portfolio.ts        # P&L calculation, portfolio scoring
│   ├── signals.ts          # Signal helpers: icons, labels, colors, Nivesh score calc
│   ├── tools.ts            # Claude tool definitions (get_stock_price, etc.)
│   └── yahoo.ts            # Yahoo Finance wrapper + exported TICKER_BASE_PRICES
├── hooks/
│   ├── useMarketData.ts    # Market pulse polling
│   └── usePortfolio.ts     # Portfolio live price refresh
├── store/
│   └── useAppStore.ts      # Zustand global state
└── types/
    └── index.ts            # TypeScript type definitions
```

---

## AI Video Engine

Click **🎬 Video** in the top bar to open the Video Engine — a fully autonomous pipeline that goes from raw market data to a downloadable animated video with zero human editing.

### Templates

| Template | Duration | Description |
|---|---|---|
| 📊 Daily Market Wrap | 45s | 5-scene animation: DRISHTI intro → index cards with count-up numbers → gainers/losers bar race → FII/DII arc circles → outro |
| 🏁 Sector Race Chart | 30s | 8 sectors (IT, Banking, Pharma, Auto, FMCG, Realty, Metal, Energy) racing over 5 trading days, leader highlighted in gold |
| 🏦 FII/DII Flow | 30s | Particle streams between FII/DII circles and NSE center — green = buying, red = selling |
| 🚀 IPO Tracker | 45s | IPO cards animating in with subscription fill bars, GMP, sector tags, and status badges |

### How it works

1. Click **Generate** on any template
2. `/api/video/generate` fetches live market data and calls **Groq llama-3.3-70b** to write a Hinglish voiceover script
3. The animation renders on **HTML5 Canvas 2D** using `requestAnimationFrame` (no video libraries)
4. Click **Record WebM** → `MediaRecorder` captures the canvas at 30fps → **Download WebM** button appears
5. The AI-generated voiceover script is displayed below the animation

### Auto Mode

Toggle **🔴 Auto Mode** to enable fully autonomous operation: every 60 seconds, DRISHTI automatically fetches fresh market data, regenerates the AI script, and re-renders the Market Wrap animation. A live indicator shows when the last update occurred.

---

## Signal Types

The Opportunity Radar surfaces 12 distinct signal types, all enriched with Groq sentiment:

| Icon | Type | Source |
|------|------|--------|
| 🔥 | Insider Buy | NSE filings |
| 🚨 | Insider Sell | NSE filings |
| 📈 | 52-Week Breakout | Yahoo Finance price data |
| 📊 | Unusual Volume | Volume ratio > 2× 30-day avg |
| 🏦 | FII Accumulation | NSE bulk deals + FII flow data |
| 🏦 | FII Selling | NSE bulk deals + FII flow data |
| 📋 | Strong Results | Quarterly PAT growth > 15% |
| ⚠️ | Promoter Pledge | NSE corporate filings |
| 🔔 | Bulk Deal Alert | NSE bulk deal API (live) |
| 📉 | Reversal Pattern | Chart pattern detection |
| 🗣️ | Mgmt Commentary | Groq analysis of language shifts in earnings calls |
| ⚖️ | SEBI Alert | SEBI circulars page (30-min cache) + Groq fallback |

---

## Demo Mode

When no API keys are configured, DRISHTI runs in **Demo Mode** with:
- 12 realistic signals with March 2026 price levels
- Seeded deterministic OHLCV data (stable, no flicker on reload)
- 12 distinct chart patterns per stock (not random — derived from ticker name)
- Groq-based AI analysis (only requires `GROQ_API_KEY`)

---

## Deployment

**Live deployment:** [bharat-nivesh.vercel.app](https://bharat-nivesh.vercel.app)

Deploy your own copy to Vercel in one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/arnavgupta2004/Drishti)

Set `ANTHROPIC_API_KEY` and `GROQ_API_KEY` in your Vercel project environment variables.

---

## License

MIT License

---

*Built for the ET Gen AI Hackathon 2025 · "Aapka Personal Hedge Fund AI" 🇮🇳*
