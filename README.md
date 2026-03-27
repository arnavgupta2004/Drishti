# दृष्टि · DRISHTI

**Autonomous Investment Intelligence for Indian Retail Investors**

DRISHTI is an AI-powered investment analysis platform that combines real-time NSE/BSE market data with Claude and Groq LLMs to give retail investors institutional-grade insights. Ask questions in English, Hindi, or Hinglish — get a reasoned, multi-step investment recommendation in seconds.

---

## Features

### AI Investment Agent
- Powered by **Claude Sonnet 4.5** with a mandatory 4-step agentic workflow:
  1. **Signal Detection** — identifies relevant market signals for the query
  2. **Technical Enrichment** — fetches RSI, MACD, EMAs, ADX, ATR, Bollinger Bands
  3. **Fundamental Check** — analyses PE, PB, ROE, revenue/PAT growth, promoter holding
  4. **Portfolio Personalization** — contextualises recommendation against your actual holdings
- Streams results in real-time via **Server-Sent Events**
- Supports **English, Hindi, and Hinglish** responses
- Graceful fallback chain: Claude → Groq llama-3.3-70b → demo data

### Opportunity Radar
- Surfaces 12 live investment signals: insider buys, FII accumulation, 52-week breakouts, volume spikes, bulk deals, reversal patterns, strong quarterly results
- Groq-powered sentiment classification for each signal
- **Nivesh Score** (0–100) combining signal type, technicals, and fundamentals
- Click any signal card to view a full company detail drawer

### Chart Intelligence
- Interactive candlestick chart with **EMA 20/50/200** and **Bollinger Bands** overlays
- Timeframes: 1D · 1W · 1M · 3M · 1Y
- **AI Pattern Detection** (Claude → Groq fallback): identifies chart patterns with confidence %, support/resistance levels, target price, and stop loss
- Below-chart company panel: sector, market cap, 6 key metrics grid, last 4 quarters of results

### Market Pulse Topbar
- Live scrolling ticker: Nifty 50, Sensex, Nifty Bank, Nifty IT, India VIX
- FII & DII net flow indicators
- Top gainers and losers
- Live / Demo mode toggle

### Portfolio Management
- Track holdings with real-time P&L calculation
- Two-pass ticker validation (NSE list check + live price check)
- **Portfolio Health Score**: rule-based analyser + Claude/Groq AI refinement
  - Diversification score (stock count, sector spread)
  - Single-stock concentration limit (25%)
  - Sector concentration limit (35%)
  - Quarterly performance tracking
  - Specific, actionable suggestions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + Framer Motion |
| Charts | Lightweight Charts + Recharts |
| State | Zustand (with localStorage persistence) |
| Primary AI | Anthropic Claude Sonnet 4.5 |
| Fallback AI | Groq llama-3.3-70b-versatile |
| Market Data | yahoo-finance2 (NSE/BSE live prices & OHLCV) |
| NSE Data | NSE India API (bulk deals, FII/DII flows) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/) (for Claude)
- A [Groq API key](https://console.groq.com/) (for the fast fallback)

### Installation

```bash
git clone https://github.com/your-username/drishti.git
cd drishti
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

> Both keys are optional — the app will fall back to demo data if they are absent. For the full AI experience, both keys are recommended.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

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
│   │   ├── agent/          # Main agentic analysis endpoint (SSE streaming)
│   │   ├── signals/        # Signal discovery + Groq enrichment
│   │   ├── patterns/       # AI chart pattern detection
│   │   ├── portfolio/
│   │   │   └── score/      # Portfolio health scoring
│   │   ├── market/
│   │   │   └── pulse/      # Live indices + FII/DII flows
│   │   └── stock/[ticker]/ # Per-ticker price, OHLCV, technicals, fundamentals
│   ├── layout.tsx
│   ├── page.tsx            # Three-panel layout orchestrator
│   └── globals.css
├── components/
│   ├── agent/
│   │   └── DrishtiAgent.tsx        # Chat interface + streaming renderer
│   ├── chart/
│   │   ├── ChartIntelligence.tsx   # Chart panel with company info strip
│   │   ├── CandlestickChart.tsx    # Lightweight Charts wrapper
│   │   └── PatternInfoCard.tsx     # Pattern result card
│   ├── layout/
│   │   └── MarketPulse.tsx         # Topbar ticker
│   ├── portfolio/
│   │   ├── PortfolioPanel.tsx      # Holdings management + health check
│   │   ├── HealthScore.tsx         # Score visualisation
│   │   └── HoldingRow.tsx
│   └── radar/
│       ├── OpportunityRadar.tsx    # Signal list + drawer trigger
│       ├── SignalCard.tsx          # Individual signal card
│       └── StockInfoDrawer.tsx     # Company detail slide-in panel
├── hooks/
│   ├── useMarketData.ts    # Polling hook for market pulse
│   └── usePortfolio.ts     # Portfolio state + live price refresh
├── lib/
│   ├── claude.ts           # Claude client + all tool implementations
│   ├── yahoo.ts            # Yahoo Finance wrapper + fallback prices
│   ├── nse.ts              # NSE bulk deals, FII/DII, quarterly results
│   ├── nse-tickers.ts      # 120+ NSE tickers for validation + search
│   ├── patterns.ts         # 12-pattern library + seeded demo generator
│   ├── portfolio.ts        # Portfolio calculations + DEMO_HOLDINGS
│   └── demo-data.ts        # Full demo dataset (signals, market pulse, etc.)
├── store/
│   └── useAppStore.ts      # Zustand store definition
└── types/
    └── index.ts            # All TypeScript interfaces
```

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/agent` | Agentic analysis with SSE streaming |
| `GET` | `/api/signals` | Investment signal list |
| `GET` | `/api/market/pulse` | Live indices, FII/DII, movers |
| `GET` | `/api/stock/[ticker]` | Price, OHLCV, technicals, fundamentals, quarterly |
| `POST` | `/api/patterns` | Chart pattern detection |
| `POST` | `/api/portfolio/score` | Portfolio health score |

---

## AI Agent Tools

The Claude agent has access to 10 tools it calls autonomously during analysis:

| Tool | Description |
|---|---|
| `get_stock_price` | Live NSE/BSE price + volume ratio |
| `get_technicals` | RSI, MACD, EMAs, Bollinger Bands, ATR, ADX |
| `get_ohlcv` | Candlestick data for charting |
| `get_fundamentals` | PE, PB, ROE, debt/equity, growth, holding % |
| `get_bulk_deals` | NSE institutional bulk deal activity |
| `get_fii_dii` | Foreign & domestic institutional flows |
| `get_quarterly_results` | Last 4 quarters revenue, PAT, EBITDA, YoY |
| `detect_chart_patterns` | AI-identified chart pattern with levels |
| `get_user_portfolio` | Holdings, P&L, sector allocation, risks |
| `calculate_nivesh_score` | Investment quality score (0–100) |

---

## Fallback Architecture

Every AI-dependent feature has a full fallback chain so the app always works:

```
Claude Sonnet 4.5
      ↓ (on failure / rate limit)
Groq llama-3.3-70b-versatile
      ↓ (on failure / missing key)
Rule-based / Seeded demo data
```

Market data likewise falls back:
```
Yahoo Finance live prices
      ↓ (on failure)
TICKER_BASE_PRICES table (120+ NSE stocks, March 2026 levels)
      ↓ (truly unknown ticker)
Seeded deterministic price derived from ticker name
```

This means the app **never shows ₹0** for a valid NSE ticker and never crashes if an API key is missing.

---

## Demo Mode

Toggle **"Go Demo"** in the topbar to switch to fully offline demo data — no API keys required. Demo mode uses:
- 12 hardcoded signals with realistic March 2026 prices
- Pre-seeded OHLCV charts (unique per ticker, stable across reloads)
- DEMO_HOLDINGS portfolio (HDFCBANK, TCS, ITC, RELIANCE, INFY, KOTAKBANK)
- Computed health score against demo holdings (not hardcoded)

---

## License

MIT
