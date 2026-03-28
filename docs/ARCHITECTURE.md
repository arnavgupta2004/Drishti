# DRISHTI — Architecture Document

**Autonomous Investment Intelligence for Indian Retail Investors**  
*ET Gen AI Hackathon 2025*

---

## System Overview

DRISHTI is a multi-agent AI system built on Next.js 14 that gives Indian retail investors institutional-grade stock analysis. It routes tasks across two AI providers based on cost, latency, and capability — using Claude for deep reasoning and Groq for fast classification.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                                  │
│                                                                       │
│  ┌──────────────┐  ┌────────────────────────┐  ┌─────────────────┐  │
│  │  Opportunity │  │   Chart Intelligence   │  │  DRISHTI Agent  │  │
│  │    Radar     │  │  (Candlestick + AI)    │  │  (Chat + SSE)   │  │
│  └──────┬───────┘  └───────────┬────────────┘  └────────┬────────┘  │
│         │                      │                         │           │
└─────────┼──────────────────────┼─────────────────────────┼───────────┘
          │                      │                         │
          ▼                      ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 14 API LAYER (Edge/Node)                  │
│                                                                       │
│  /api/signals    /api/stock/[ticker]   /api/agent     /api/patterns  │
│  /api/market/pulse                     /api/portfolio/score          │
└───────┬──────────────────┬─────────────────────┬────────────────────┘
        │                  │                     │
        ▼                  ▼                     ▼
┌───────────────┐  ┌───────────────┐   ┌────────────────────────────┐
│  DATA LAYER   │  │  AI ROUTER    │   │     AGENT PIPELINE         │
│               │  │               │   │                            │
│ Yahoo Finance │  │ Groq          │   │  Step 1: Intent Extract    │
│ (prices,OHLCV │  │ llama-3.1-8b  │   │  (Groq llama-3.1-8b)      │
│  technicals)  │  │ ┌─────────────┤   │          ↓                 │
│               │  │ │ Intent      │   │  Step 2: Signal Detect     │
│ NSE India API │  │ │ Extraction  │   │  (Claude tool call)        │
│ (bulk deals,  │  │ │ Sentiment   │   │          ↓                 │
│  filings)     │  │ │ Classify    │   │  Step 3: Enrich            │
│               │  │ └─────────────┤   │  (Claude tool call)        │
│ Seeded Demo   │  │               │   │          ↓                 │
│ Fallback      │  │ Claude        │   │  Step 4: Personalize       │
│ (deterministic│  │ Sonnet        │   │  (Claude tool call)        │
│  per-ticker)  │  │ ┌─────────────┤   │          ↓                 │
└───────────────┘  │ │ Deep        │   │  Step 5: Recommend         │
                   │ │ Reasoning   │   │  (Claude final response)   │
                   │ │ Tool Use    │   │                            │
                   │ └─────────────┤   │  FALLBACK CHAIN:           │
                   │               │   │  Claude → Groq 70b         │
                   │ Groq          │   │  → Rule-based              │
                   │ llama-3.3-70b │   └────────────────────────────┘
                   │ (fallback)    │
                   └───────────────┘
```

---

## Agent Roles

### Agent 1 — Intent Extractor (Groq llama-3.1-8b-instant)
**Latency:** ~200ms | **Cost:** ~$0.0001/call

Runs on every user query before Claude. Extracts:
- **Ticker** — maps "Analyze Zomato" → `ZOMATO`, "Reliance ka scene" → `RELIANCE`
- **Intent** — clean English reformulation of Hinglish/Hindi queries
- **Language** — detects if user is writing in Hindi/Hinglish

Falls back to a 100+ entry local `NAME_TO_TICKER` regex map if Groq is unavailable.

**Unlisted company handling:** If the company is not listed on NSE/BSE (e.g., Zerodha, boAt), Groq returns `UNLISTED:<company_name>`. The agent route intercepts this prefix and emits a friendly explanation instead of attempting a fake stock lookup — preventing ₹0 data or hallucinated analysis.

---

### Agent 2 — Stock Analyst (Claude Sonnet — Primary)
**Latency:** 3–8s | **Cost:** ~$0.003/call

Executes the 4-step agentic loop via tool use:

| Step | Tool | Data Fetched |
|------|------|-------------|
| Signal Detection | `get_stock_price`, `get_bulk_deals` | Live price, volume ratio, NSE filings |
| Technical Enrichment | `get_technicals`, `get_quarterly_results` | RSI, MACD, EMAs, quarterly PAT growth |
| Fundamental Check | `get_fundamentals`, `get_fii_dii` | PE, ROE, debt/equity, FII/DII flows |
| Portfolio Personalization | `get_user_portfolio`, `calculate_nivesh_score` | Holdings, P&L, correlation, Nivesh Score |

Streams response via **Server-Sent Events (SSE)** — users see step completion in real time.

---

### Agent 3 — Groq Fallback (llama-3.3-70b-versatile)
**Latency:** ~1.5s | **Cost:** ~$0.0009/call

Activates when Claude API is unavailable (credit exhaustion, network timeout). Receives the same enriched query and portfolio context. Uses a specialized prompt with strict output format rules (no markdown, no step narration) to produce clean verdicts directly.

---

### Agent 4 — Pattern Detector (Claude → Groq → Seeded Demo)
**Endpoint:** `POST /api/patterns`

Three-tier fallback:
1. **Claude Sonnet** — analyzes 90-candle OHLCV CSV, returns JSON with pattern name, support/resistance/target, confidence, win rate
2. **Groq llama-3.3-70b** — same prompt, English-only output enforced
3. **Seeded Demo** — 12 distinct patterns deterministically assigned per ticker (`seed = sum(charCodeAt) % 12`) — same ticker always gets the same pattern, no randomness

---

### Agent 5 — Portfolio Health Scorer (Claude → Groq → Rule-Based)
**Endpoint:** `POST /api/portfolio/score`

Three-tier fallback:
1. **Claude** — full qualitative analysis with specific stock/sector insights
2. **Groq** — structured JSON score with issues and suggestions
3. **Rule-based calculator** — always runs in parallel as a safety net:
   - Penalizes < 5 stocks (−15pts), < 8 stocks (−7pts)
   - Penalizes sector > 50% (−12pts), > 40% (−6pts)
   - Penalizes single stock > 35% (−12pts), > 25% (−6pts)
   - Penalizes portfolio drawdown > 15% (−10pts)
   - Always uses **actual** portfolio data — never hardcoded

---

## Signals Pipeline

**Endpoint:** `GET /api/signals`
**Cache TTL:** 5 minutes (standard signals), 30 minutes (SEBI regulatory alerts)

The signals pipeline runs four sources in parallel on every refresh:

```
┌────────────────────────────────────────────────────────────────┐
│                    /api/signals GET                             │
├──────────────────┬─────────────────┬──────────────┬───────────┤
│ NSE Bulk Deals   │ Base Signals    │ Mgmt         │ SEBI      │
│ (live API)       │ (demo-data.ts)  │ Commentary   │ Alerts    │
│                  │                 │ (Groq 70b)   │ (scrape + │
│ → getStockPrice  │ → seeded per    │              │  Groq fb) │
│ → Groq sentiment │   ticker        │ → getStock   │           │
│                  │                 │   Price      │ 30-min    │
│ max 3 deals      │                 │              │ cache     │
└──────────────────┴─────────────────┴──────────────┴───────────┘
                           ↓
              Merge → cap at 12 signals → cache
```

### Signal Types (12 total)

| Type | Icon | Source | Sentiment |
|------|------|--------|-----------|
| `insider_buy` | 🔥 | NSE filings | Groq |
| `insider_sell` | 🚨 | NSE filings | Groq |
| `breakout_52w` | 📈 | Yahoo price data | Groq |
| `volume_spike` | 📊 | Volume ratio > 2× | Groq |
| `fii_accumulation` | 🏦 | FII flow data | Groq |
| `fii_selling` | 🏦 | FII flow data | Groq |
| `strong_results` | 📋 | NSE quarterly data | Groq |
| `promoter_pledge` | ⚠️ | NSE filings | Groq |
| `bulk_deal` | 🔔 | NSE bulk deal API | Groq |
| `reversal_pattern` | 📉 | Chart analysis | Groq |
| `management_commentary` | 🗣️ | Groq (llama-3.3-70b) scans top 10 Nifty stocks for earnings language shifts | Groq |
| `regulatory_alert` | ⚖️ | SEBI circulars page → Groq fallback | Rule-based |

### Management Commentary Signal

Groq llama-3.3-70b is prompted to surface one significant management language shift from 10 watch-list stocks (RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, BAJFINANCE, BHARTIARTL, ZOMATO, TATAMOTORS, SUNPHARMA). Detects: guidance cuts, margin warnings, expansion announcements, CEO changes, capex plans.

### Regulatory Alert Signal

1. Fetches `https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecent=yes`
2. Parses circular titles from HTML table cells using regex
3. If SEBI is unreachable, falls back to Groq llama-3.1-8b for the most recent notable SEBI circular
4. Results cached for 30 minutes to avoid hammering SEBI's servers

---

## AI Video Engine

**Endpoint:** `POST /api/video/generate`

```
POST body: { type: "market_wrap" | "race_chart" | "fii_dii" | "ipo_tracker" }

Pipeline:
  1. Fetch live data from /api/market/pulse (req.nextUrl.origin, 8s timeout)
  2. Fall back to getDemoMarketData() if pulse returns empty indices
  3. Call Groq llama-3.3-70b to write a Hinglish voiceover script
  4. Return { script, marketData, sectorData, ipoData }

Frontend:
  - HTML5 Canvas 2D animations (requestAnimationFrame, no video libs)
  - MediaRecorder captures canvas stream at 30fps → WebM blob → download URL
  - Auto Mode: regenerates every 60s via setInterval
```

| Template | Duration | Key Visuals |
|----------|----------|-------------|
| Daily Market Wrap | 45s | 5 scenes: intro, index cards (count-up), gainers/losers bars, FII/DII arcs, outro |
| Sector Race Chart | 30s | 8 sectors racing over 5 days, leader highlighted gold |
| FII/DII Flow | 30s | Particle streams, green=buy, red=sell |
| IPO Tracker | 45s | IPO cards animating in with subscription fill bars and GMP |

---

## Tool Integrations

```
┌─────────────────────┬────────────────────────────┬──────────────────────┐
│ Tool                │ Data Source                 │ Fallback             │
├─────────────────────┼────────────────────────────┼──────────────────────┤
│ get_stock_price     │ Yahoo Finance 2             │ TICKER_BASE_PRICES   │
│                     │ (TICKER.NS suffix)          │ + seeded change_pct  │
├─────────────────────┼────────────────────────────┼──────────────────────┤
│ get_technicals      │ Derived from Yahoo OHLCV    │ Seeded per-ticker    │
│                     │ (RSI, EMA20/50/200, MACD,   │ deterministic values │
│                     │  Bollinger, ADX, ATR)       │                      │
├─────────────────────┼────────────────────────────┼──────────────────────┤
│ get_fundamentals    │ Yahoo quoteSummary          │ 15-stock static dict │
│                     │ (PE, ROE, PB, sector)       │ + seeded for rest    │
├─────────────────────┼────────────────────────────┼──────────────────────┤
│ get_bulk_deals      │ NSE India /api/corporates   │ 5 realistic demo     │
│                     │ /bulk_deals (with session   │ bulk deals           │
│                     │  cookie + TTL=20min)        │                      │
├─────────────────────┼────────────────────────────┼──────────────────────┤
│ get_quarterly_      │ NSE India earnings data     │ 14-stock Q3FY26      │
│ results             │                             │ quarterly results    │
├─────────────────────┼────────────────────────────┼──────────────────────┤
│ get_fii_dii         │ Market pulse data           │ Demo FII/DII flows   │
├─────────────────────┼────────────────────────────┼──────────────────────┤
│ calculate_nivesh_   │ Internal rule engine        │ N/A (always works)   │
│ score               │ (RSI + PE + ROE + volume)   │                      │
└─────────────────────┴────────────────────────────┴──────────────────────┘
```

---

## Data Flow — "Analyze ZOMATO"

```
User types: "Analyze Zomato"
        │
        ▼
[Groq llama-3.1-8b]  ←── local NAME_TO_TICKER map as safety net
 Extracts: ticker=ZOMATO, intent="Analyze Zomato stock", isHinglish=false
        │
        ▼
[Claude Sonnet] receives enriched query: "[EXTRACTED TICKER: ZOMATO] Analyze Zomato stock"
        │
        ├─► tool: get_stock_price(ZOMATO)    → ₹218, +4.8%, vol 2.1x  ──SSE→ UI step 1
        ├─► tool: get_technicals(ZOMATO)     → RSI 61, MACD+, EMA bull ──SSE→ UI step 2
        ├─► tool: get_fundamentals(ZOMATO)   → PE 312, ROE 4.2%        ──SSE→ UI step 3
        ├─► tool: get_user_portfolio()       → No ZOMATO holdings       ──SSE→ UI step 4
        ├─► tool: calculate_nivesh_score()   → Score: 74/100
        │
        ▼
[Claude Final Response] — streamed as SSE final event
 "ZOMATO showing breakout momentum... ACTION: ACCUMULATE
  Entry: ₹212–220 | SL: ₹198 | Target: ₹268 (3–4 months)
  Nivesh Score: 74/100"
        │
        ▼
[UI] Renders verdict with markdown formatting
```

---

## Error Handling Logic

```
Every API call follows the same 3-tier pattern:

TIER 1 — Live Data (Yahoo Finance / NSE API)
    │  Success: return real data
    │  Failure (timeout, 4xx, 5xx, empty):
    ▼
TIER 2 — AI Fallback (Claude → Groq)
    │  Claude credits exhausted → Groq llama-3.3-70b
    │  Groq also fails:
    ▼
TIER 3 — Deterministic Seeded Fallback
    - Price: TICKER_BASE_PRICES[ticker] ?? seed-derived price (never 0)
    - OHLCV: generateFallbackOHLCV(ticker, period) — seeded per ticker
    - Pattern: getDemoPattern(ticker) — seed = charCodeAt sum % 12
    - Score: computeRuleBasedScore(holdings) — pure logic, always works

KEY GUARANTEE: The UI never shows ₹0, never crashes, never shows
               the same data for different tickers.
               All fallbacks are seeded on the ticker symbol so
               RELIANCE always gets RELIANCE-specific values.
```

---

## State Management

```
Zustand Store (persisted to localStorage)
├── activeStock: string          — currently viewed ticker
├── marketPulse: MarketPulseData — indices, movers, FII/DII
├── isDemoMode: boolean          — Demo vs Live mode toggle
├── portfolioOpen: boolean       — portfolio panel visibility
├── videoEngineOpen: boolean     — Video Engine overlay visibility
└── portfolio
    ├── holdings: Holding[]      — user's stocks with qty/avg
    └── [computed by calcPortfolio()]
        ├── total_invested
        ├── current_value
        ├── total_pnl / total_pnl_pct
        └── holdings[].pnl / pnl_pct (per holding)
```

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, SSR) |
| Language | TypeScript (strict mode) |
| UI | Tailwind CSS + Framer Motion |
| Charts | Lightweight Charts (TradingView) |
| State | Zustand + localStorage persistence |
| Primary AI | Anthropic Claude Sonnet (claude-sonnet-4-5) |
| Fast AI | Groq (llama-3.1-8b-instant + llama-3.3-70b-versatile) |
| Market Data | Yahoo Finance 2 (npm), NSE India public APIs |
| Streaming | Server-Sent Events (SSE) — no WebSocket needed |
| Deployment | Vercel (Edge-compatible API routes) |

---

*DRISHTI — "दृष्टि" means Vision in Sanskrit. Because good investing starts with seeing clearly.*
