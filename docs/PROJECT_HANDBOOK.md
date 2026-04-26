# DRISHTI Project Handbook

This document is the single-source technical handbook for the DRISHTI project.

It is written for:
- new teammates joining the project
- judges or reviewers who want to understand the system end to end
- future maintainers who need both product context and code context
- non-finance readers who need a glossary of technical market terms

If someone reads only this file, they should understand:
- what DRISHTI does
- why it exists
- how the frontend and backend are structured
- how the AI pipeline works
- what data sources are used
- what fallback logic exists
- what financial indicators and chart patterns mean
- where the important files live
- how to run, extend, and explain the project

---

## 1. What DRISHTI Is

DRISHTI is an AI-powered investment intelligence system for Indian retail investors.

At a product level, it combines:
- market pulse monitoring
- stock opportunity detection
- technical chart analysis
- fundamentals and quarterly result context
- portfolio-aware AI recommendations
- a conversational multi-agent assistant
- an AI video engine for market summaries

At a systems level, DRISHTI is:
- a `Next.js 14` full-stack web app
- written in `TypeScript`
- using `React` on the frontend
- using API routes on the backend
- using `Anthropic Claude` and `Groq` models in a model-routed architecture
- integrated with `Yahoo Finance`, `NSE India`, and `SEBI` public data sources
- protected by fallback layers so the UI stays usable even when public feeds fail

The project tagline is:

`Aapka Personal Hedge Fund AI`

This means the product is positioned as an AI copilot that tries to give retail investors some of the analytical experience usually available only to institutional desks.

---

## 2. What Problem It Solves

Indian retail investors usually face three problems:

1. Data fragmentation
They need to look at price, chart, volume, filings, earnings, news, flows, and portfolio impact across multiple tools.

2. Low explainability
Many systems show a signal or recommendation but do not explain why it matters, what the risk is, or what to monitor next.

3. Reliability and trust
Public market data can be delayed, blocked, cached, or fail entirely. If a system hides this, trust breaks quickly.

DRISHTI addresses this with three design principles:
- explainability over black-box output
- trust-first source labeling
- portfolio-aware personalization

---

## 3. Core Product Modules

The UI is organized into three major desktop panels plus a top bar and overlays.

### 3.1 Market Pulse

This is the top scrolling ticker bar.

It shows:
- NIFTY 50
- SENSEX
- NIFTY BANK
- NIFTY IT
- INDIA VIX
- FII and DII flows
- top gainers
- top losers

It also shows:
- data freshness/source state
- demo vs market-feed toggle
- video engine button
- portfolio button

Source file:
- `components/layout/MarketPulse.tsx`

Backend:
- `app/api/market/pulse/route.ts`

Frontend polling hook:
- `hooks/useMarketData.ts`

### 3.2 Opportunity Radar

This is the left panel with signal cards.

It surfaces candidate investment opportunities such as:
- insider buy
- bulk deal
- breakout
- strong results
- FII accumulation
- regulatory alert

Each card includes:
- company name
- ticker
- price and daily change
- signal type
- short explanation
- Nivesh score

Opening a card shows the stock info drawer with:
- technicals
- fundamentals
- quarterly results
- confidence and evidence layer
- bull case
- risk case
- next checks

Source files:
- `components/radar/OpportunityRadar.tsx`
- `components/radar/SignalCard.tsx`
- `components/radar/StockInfoDrawer.tsx`

Backend:
- `app/api/signals/route.ts`

Hook:
- `hooks/useSignals.ts`

### 3.3 Chart Intelligence

This is the center panel.

It shows:
- a candlestick chart
- timeframe controls
- overlays such as EMA and Bollinger Bands
- technical context
- fundamentals
- quarterly results
- chart pattern detection
- compact AI insight cards like "Why It Matters", "Primary Risk", and "Next Check"

Source files:
- `components/chart/ChartIntelligence.tsx`
- `components/chart/CandlestickChart.tsx`
- `components/chart/PatternOverlay.tsx`
- `components/chart/PatternInfoCard.tsx`

Backend:
- `app/api/stock/[ticker]/route.ts`
- `app/api/patterns/route.ts`

### 3.4 DRISHTI Agent

This is the right-side conversational AI assistant.

The user can ask questions like:
- Should I buy HDFC Bank now?
- Any signals on Reliance?
- What is the IT sector outlook?
- Analyse my portfolio health.

The agent streams a multi-step workflow to the UI.

Source files:
- `components/agent/DrishtiAgent.tsx`
- `components/agent/AgentMessage.tsx`
- `components/agent/ThinkingChain.tsx`
- `components/agent/ActionCard.tsx`

Backend:
- `app/api/agent/route.ts`
- `lib/claude.ts`
- `lib/aiRouter.ts`
- `lib/tools.ts`

### 3.5 Portfolio Panel

This is the portfolio side panel.

It supports:
- adding holdings
- tracking invested amount and current value
- refreshing live/latest quotes for holdings
- sector allocation
- P&L
- AI portfolio health scoring

Source files:
- `components/portfolio/PortfolioPanel.tsx`
- `components/portfolio/HoldingRow.tsx`
- `components/portfolio/HealthScore.tsx`

Backend:
- `app/api/portfolio/score/route.ts`

Logic:
- `lib/portfolio.ts`

### 3.6 AI Video Engine

This is the video generation overlay.

It generates downloadable market update videos using:
- market pulse data
- Groq-generated scripts
- HTML5 canvas animations
- MediaRecorder-based WebM recording

Supported templates:
- Daily Market Wrap
- Sector Race Chart
- FII/DII Flow
- IPO Tracker

Source files:
- `components/video/VideoEngine.tsx`
- `components/video/MarketWrapAnimation.tsx`
- `components/video/RaceChartAnimation.tsx`
- `components/video/FIIDIIFlow.tsx`
- `components/video/IPOTracker.tsx`

Backend:
- `app/api/video/generate/route.ts`

---

## 4. High-Level Architecture

The system has five main layers:

1. Presentation Layer
React components render the UI and interact with state + hooks.

2. Client State Layer
Zustand manages global state such as:
- demo mode
- language
- signals
- market pulse
- portfolio
- active stock
- agent messages

3. API Layer
Next.js API routes provide server-side orchestration, data access, AI calls, caching, and fallback handling.

4. Data + AI Service Layer
This includes:
- Yahoo Finance wrappers
- NSE wrappers
- prompt routing
- Claude agent loop
- pattern generation
- scoring logic

5. Trust/Fallback Layer
This layer tracks whether data is:
- live
- cached
- fallback
- reference
- demo

This is one of the most important product choices in the app.

---

## 5. Directory Guide

### `app/`

Contains the Next.js app router pages and API routes.

Important files:
- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`

API routes:
- `app/api/agent/route.ts`
- `app/api/market/pulse/route.ts`
- `app/api/patterns/route.ts`
- `app/api/portfolio/score/route.ts`
- `app/api/signals/route.ts`
- `app/api/stock/[ticker]/route.ts`
- `app/api/video/generate/route.ts`

### `components/`

Contains UI components grouped by module:
- `agent/`
- `chart/`
- `layout/`
- `portfolio/`
- `radar/`
- `shared/`
- `video/`

### `hooks/`

Client hooks for polling and stateful data access:
- `useMarketData.ts`
- `useSignals.ts`
- `usePortfolio.ts`

### `lib/`

Contains business logic, AI orchestration, data wrappers, scoring, and fallback logic.

Important files:
- `aiRouter.ts`
- `claude.ts`
- `data-source.ts`
- `demo-data.ts`
- `investment-case.ts`
- `nse.ts`
- `nse-tickers.ts`
- `patterns.ts`
- `portfolio.ts`
- `signals.ts`
- `tools.ts`
- `yahoo.ts`

### `store/`

Global Zustand store:
- `useAppStore.ts`

### `types/`

Type definitions:
- `types/index.ts`

### `docs/`

Project documentation:
- `ARCHITECTURE.md`
- this handbook

---

## 6. Runtime Flow: What Happens When the App Loads

When the user opens the homepage:

1. `app/page.tsx` renders the top bar and three-panel layout.
2. `useMarketData()` starts polling market pulse every 30 seconds.
3. `useSignals()` starts polling signals every 5 minutes.
4. `usePortfolio()` refreshes holding prices on mount and every 5 minutes.
5. The user can:
   - click a signal
   - open the chart for a ticker
   - query the agent
   - open portfolio
   - generate a video

This means the UI is not one giant API call. It is several specialized pipelines running independently.

---

## 7. API Routes Explained

This section explains each API route, what it accepts, what it returns, and how it behaves.

### 7.1 `GET /api/market/pulse`

Purpose:
- fetch the top-level market pulse for the ticker bar

Reads:
- quote data from `lib/yahoo.ts`
- FII/DII context from `lib/nse.ts`
- fallback market pulse from `lib/demo-data.ts`

Features:
- 30-second in-memory cache
- demo mode support with `?demo=true`
- source metadata attached to the response

Returned fields:
- `indices`
- `fii_net`
- `dii_net`
- `gainers`
- `losers`
- `timestamp`
- `source`

Key file:
- `app/api/market/pulse/route.ts`

### 7.2 `GET /api/signals`

Purpose:
- generate and return opportunity radar signals

Pipeline inputs:
- bulk deals from NSE
- generated base signals
- management commentary signal from Groq
- SEBI regulatory alerts from scrape or Groq fallback

Features:
- 5-minute cache for general signals
- 30-minute cache for SEBI alerts
- demo mode support
- source metadata for overall radar

Output:
- `signals`
- `cached`
- `meta`

Key file:
- `app/api/signals/route.ts`

### 7.3 `GET /api/stock/[ticker]`

Purpose:
- return the full data needed for chart intelligence and stock info drawer

Data bundled together:
- latest price
- OHLCV candles
- technical indicators
- fundamentals
- quarterly results

Important note:
- route is marked `force-dynamic`, meaning it should not be statically cached by Next.js

Key file:
- `app/api/stock/[ticker]/route.ts`

### 7.4 `POST /api/patterns`

Purpose:
- detect technical chart patterns for a stock

Flow:
- gets current ticker
- runs pattern detection using Claude
- falls back to Groq if needed
- falls back to seeded demo pattern if both are unavailable

Output:
- `pattern`

Key file:
- `app/api/patterns/route.ts`

### 7.5 `POST /api/agent`

Purpose:
- run the DRISHTI conversational AI pipeline

Input:
- `query`
- `portfolio`
- `isDemoMode`
- `language`

Output:
- streamed SSE messages containing:
  - routing events
  - step events
  - final answer

Key file:
- `app/api/agent/route.ts`

### 7.6 `POST /api/portfolio/score`

Purpose:
- return a portfolio health score and analysis

Flow:
- receives user holdings
- computes deterministic risk structure
- tries Claude
- falls back to Groq
- falls back to pure rule-based result if needed

Key file:
- `app/api/portfolio/score/route.ts`

### 7.7 `POST /api/video/generate`

Purpose:
- generate the content used by the video engine

Input:
- `type`

Output:
- script
- market data
- sector data
- IPO data

Key file:
- `app/api/video/generate/route.ts`

---

## 8. State Management

DRISHTI uses `Zustand` for global client state.

State file:
- `store/useAppStore.ts`

State includes:
- `isDemoMode`
- `language`
- `marketPulse`
- `signals`
- `signalsMeta`
- `activeStock`
- `messages`
- `isAgentRunning`
- `currentSteps`
- `holdings`
- `portfolioOpen`
- `videoEngineOpen`

Why Zustand was a good choice:
- small and lightweight
- simple mental model
- easy persistence support
- low boilerplate for hackathon speed

Persisted state includes:
- holdings
- demo mode
- language

This means the app remembers the user’s portfolio and language preference across refreshes.

---

## 9. AI Layer

This is one of the most important parts of the project.

DRISHTI does not use a single model for everything.
It uses model routing based on task difficulty, latency sensitivity, and cost.

### 9.1 Why Model Routing Exists

Not every task needs an expensive reasoning model.

Examples:
- extracting a ticker from a user query is cheap and fast
- generating a final investment verdict needs deeper reasoning
- cleaning output JSON is different from running a structured multi-step tool chain

So the project routes:
- fast, small tasks to Groq
- complex reasoning and tool use to Claude

### 9.2 Models Used

#### Anthropic Claude

Model:
- `claude-sonnet-4-5`

Used for:
- primary stock analysis agent
- tool-using deep reasoning
- pattern detection primary pass
- portfolio health scoring primary pass

Code:
- `lib/claude.ts`

#### Groq llama-3.1-8b-instant

Used for:
- query intent extraction
- language detection
- ticker extraction
- signal sentiment classification
- some knowledge-based fallbacks

Code:
- `lib/aiRouter.ts`

#### Groq llama-3.3-70b-versatile

Used for:
- Claude fallback for final stock reasoning
- management commentary generation
- pattern detection fallback
- video voiceover generation

Code references:
- `lib/claude.ts`
- `app/api/signals/route.ts`
- `app/api/video/generate/route.ts`

---

## 10. AI Pipelines

### 10.1 Query Intent Pipeline

File:
- `lib/aiRouter.ts`

Goal:
- understand what the user is asking
- identify ticker
- normalize the query
- detect Hindi/Hinglish

Output structure:
- `ticker`
- `intent`
- `isHinglish`
- `routed_to`

Fallback behavior:
- local `NAME_TO_TICKER` map if Groq is unavailable

This is useful because users may type:
- company name
- brand name
- product name
- Hinglish sentence
- ticker directly

Example:
- "Reliance ka scene kya hai?" becomes a normalized intent for `RELIANCE`

### 10.2 Agent Reasoning Pipeline

Files:
- `app/api/agent/route.ts`
- `lib/claude.ts`
- `lib/tools.ts`

Main workflow:
1. extract ticker and intent
2. stream routing decision
3. begin SSE step updates
4. call Claude with tool access
5. tool-fetch price, technicals, fundamentals, portfolio context
6. produce final recommendation

Step labels shown in UI:
- Signal Detection
- Technical Enrichment
- Fundamental Check
- Portfolio Personalization

Fallback chain:
- Claude primary
- Groq 70b fallback
- demo/rule-based fallback

### 10.3 Signal Sentiment Pipeline

File:
- `lib/aiRouter.ts`

Used for:
- classifying signals as bullish, bearish, or neutral

Inputs:
- `headline`
- `detail`
- `signalType`

Output:
- `sentiment`
- `reason`
- `confidence`

### 10.4 Management Commentary Signal

File:
- `app/api/signals/route.ts`

Goal:
- ask Groq to infer one important management-language shift across selected top stocks

Examples of commentary shifts:
- guidance cut
- capex announcement
- margin warning
- expansion commentary
- CEO change

This is interesting because it goes beyond pure price-based signals.

### 10.5 Portfolio Health Scoring

Files:
- `app/api/portfolio/score/route.ts`
- `lib/portfolio.ts`

This uses a three-layer logic:
- Claude for rich analysis
- Groq for fallback structured scoring
- deterministic rule-based calculator as hard fallback

The deterministic engine checks:
- number of holdings
- sector concentration
- single-stock concentration
- drawdown/risk

---

## 11. Tool Layer Used by Claude

Claude does not directly know market values.
It uses tools defined in:
- `lib/tools.ts`

These tools provide access to project-specific data functions such as:
- `get_stock_price`
- `get_technicals`
- `get_fundamentals`
- `get_quarterly_results`
- `get_bulk_deals`
- `get_fii_dii`
- `calculate_nivesh_score`

This makes the system more grounded because the model can reason over fetched values instead of inventing them.

---

## 12. Data Sources

The project depends on multiple external/public data sources.

### 12.1 Yahoo Finance

Used for:
- stock quotes
- OHLCV historical data
- quote summary fundamentals

Code:
- `lib/yahoo.ts`

Functions:
- `getStockPrice`
- `getOHLCV`
- `getTechnicals`
- `getFundamentals`

Strengths:
- easy access to quote and chart data

Limitations:
- public, unofficial workflow
- may fail or return empty values
- not an exchange-grade guaranteed feed

### 12.2 NSE India

Used for:
- bulk/block deals
- FII/DII flow context
- quarterly reference data

Code:
- `lib/nse.ts`

Important implementation detail:
- the project simulates a browser session and caches cookies for NSE requests

Why this matters:
- NSE often rate-limits or requires valid session cookies

### 12.3 SEBI Circular Page

Used for:
- regulatory alerts

Code:
- `app/api/signals/route.ts`

Behavior:
- scrape latest titles
- if scraping fails, fall back to Groq knowledge-based extraction

### 12.4 Demo Data

Used for:
- resilient presentation mode
- deterministic fallback when public sources fail

Code:
- `lib/demo-data.ts`

Important point:
- demo data is not random on every render
- much of it is seeded or deterministic to avoid UI flicker

---

## 13. Trust Layer and Source States

This is a critical concept in DRISHTI.

The app explicitly labels data source state using:
- `live`
- `cached`
- `fallback`
- `reference`
- `demo`

Types:
- `types/index.ts`

Helpers:
- `lib/data-source.ts`

Badge component:
- `components/shared/SourceBadge.tsx`

Meaning of each state:

### Live
Data was fetched from the intended public source successfully.

### Cached
The system is reusing recently fetched data for performance or stability.

### Fallback
The intended source failed, and the system substituted a backup/reference value.

### Reference
The content is informative or curated, but not necessarily tied to a fresh live price fetch.

### Demo
The app is intentionally running in demo mode with presentation data.

This prevents a common financial-product problem:
pretending stale or inferred data is truly live.

---

## 14. Financial Concepts Used in DRISHTI

This section explains the finance vocabulary used in the app.

### 14.1 Price

The latest quoted value of a stock.

### 14.2 OHLCV

This stands for:
- Open
- High
- Low
- Close
- Volume

It is the standard structure for candlestick chart data.

### 14.3 Volume

The number of shares traded over a period.

Higher-than-usual volume often signals stronger interest or stronger conviction behind a price move.

### 14.4 Volume Ratio

This compares current volume to average volume.

Example:
- 2.0x volume ratio means current volume is double the average.

Why it matters:
- high volume can confirm breakouts, bulk deals, or reversals

### 14.5 Market Cap

Short for market capitalization.

Formula:

`Market Cap = Share Price × Number of Outstanding Shares`

It estimates the market value of the company’s equity.

### 14.6 Revenue

The company’s top-line income from operations before expenses.

### 14.7 PAT

Profit After Tax.

This is the company’s net profit after all expenses and taxes.

### 14.8 YoY

Year-over-Year.

Compares the current quarter or period to the same period last year.

### 14.9 ROE

Return on Equity.

Formula:

`ROE = Net Income / Shareholder Equity`

Meaning:
- how efficiently the company generates profit from shareholder capital

Higher ROE is often better, but it must be interpreted with debt and business context.

### 14.10 P/E Ratio

Price-to-Earnings Ratio.

Formula:

`P/E = Share Price / Earnings Per Share`

Meaning:
- how much investors are paying for each unit of earnings

High P/E may indicate:
- high growth expectations
- expensive valuation

Low P/E may indicate:
- undervaluation
- weak growth
- sector-specific pricing

### 14.11 P/B Ratio

Price-to-Book Ratio.

Formula:

`P/B = Market Price / Book Value Per Share`

Meaning:
- compares market price to the accounting book value of the company

Commonly used more in financial firms than asset-light tech companies.

### 14.12 Debt-to-Equity Ratio

Shows how much debt the company uses relative to equity.

Formula:

`Debt/Equity = Total Debt / Shareholder Equity`

Meaning:
- higher value usually means more leverage risk

### 14.13 Promoter Holding

In India, the promoter is the founding/controlling group behind the company.

Promoter holding is the percentage of shares they own.

Why it matters:
- rising promoter holding can be seen as confidence
- promoter pledge can be a warning signal

### 14.14 FII and DII

FII = Foreign Institutional Investor
DII = Domestic Institutional Investor

These are institutional money flows into and out of the market.

Why it matters:
- large inflows/outflows can influence market direction and sentiment

### 14.15 Bulk Deal

A large transaction in a stock, usually big enough to matter as a signal.

Why it matters:
- can indicate institutional interest
- may reveal strategic accumulation or exit behavior

### 14.16 Insider Buy / Insider Sell

A transaction by insiders such as promoters, management, or major internal stakeholders.

Why it matters:
- insider buying can be interpreted as confidence
- insider selling needs nuance; it is not always bearish, but it can be a caution signal

### 14.17 52-Week Breakout

When a stock moves above its highest price of the last 52 weeks.

Why it matters:
- often interpreted as a momentum signal

### 14.18 Unusual Volume

Current volume significantly higher than normal average volume.

Why it matters:
- may indicate strong market attention or hidden information flow

---

## 15. Technical Analysis Terms Used in DRISHTI

### 15.1 EMA

EMA means Exponential Moving Average.

A moving average smooths price.
An EMA gives more weight to recent prices than older prices.

In DRISHTI:
- EMA20 = short-term trend
- EMA50 = medium-term trend
- EMA200 = long-term trend

Common interpretation:
- price above EMA20 and EMA50 can indicate bullish structure
- price below EMA50 or EMA200 can indicate weaker structure

### 15.2 RSI

RSI means Relative Strength Index.

It measures momentum on a scale from 0 to 100.

Common interpretation:
- above 70 = overbought
- below 30 = oversold
- around 45 to 65 = healthy momentum zone

Important note:
- overbought does not always mean the stock must fall immediately

### 15.3 MACD

MACD means Moving Average Convergence Divergence.

It is a momentum indicator derived from moving averages.

A positive MACD or bullish crossover may support upward momentum.

### 15.4 Bollinger Bands

Bollinger Bands are volatility envelopes around a moving average.

They help estimate whether price is stretched or compressed relative to recent volatility.

### 15.5 ADX

ADX means Average Directional Index.

It measures trend strength, not direction.

Common interpretation:
- ADX above 25 often suggests a meaningful trend
- lower ADX often suggests weaker or sideways conditions

### 15.6 ATR

ATR means Average True Range.

It measures typical price range volatility.

Higher ATR means the stock moves more aggressively.

### 15.7 Support

A price zone where buying interest tends to appear.

### 15.8 Resistance

A price zone where selling pressure tends to appear.

### 15.9 Breakout

When price moves decisively above resistance.

### 15.10 Reversal

When a stock changes from a downtrend to uptrend or vice versa.

---

## 16. Chart Patterns Used in the Project

Pattern-related logic lives in:
- `lib/patterns.ts`
- `app/api/patterns/route.ts`

The project uses demo/fallback support for multiple classic chart patterns.

Below are the most important patterns readers should understand.

### 16.1 Ascending Triangle

Structure:
- flat resistance on top
- rising lows underneath

Interpretation:
- often bullish
- indicates buyers are pushing upward into fixed resistance

### 16.2 Descending Triangle

Structure:
- flat support
- falling highs

Interpretation:
- often bearish

### 16.3 Symmetrical Triangle

Structure:
- lower highs and higher lows

Interpretation:
- compression
- can break in either direction

### 16.4 Double Bottom

Structure:
- two lows near the same price

Interpretation:
- classic bullish reversal pattern

### 16.5 Double Top

Structure:
- two highs near the same price

Interpretation:
- classic bearish reversal pattern

### 16.6 Cup and Handle

Structure:
- rounded base followed by a smaller pullback

Interpretation:
- bullish continuation/recovery pattern

### 16.7 Head and Shoulders

Structure:
- left shoulder
- head
- right shoulder

Interpretation:
- bearish reversal pattern

### 16.8 Inverse Head and Shoulders

Interpretation:
- bullish reversal counterpart of head and shoulders

### 16.9 Channel Breakout

Structure:
- price moving within a channel, then breaking out

Interpretation:
- continuation or strong trend signal depending on direction

### 16.10 Flag / Pennant

Structure:
- strong move followed by consolidation

Interpretation:
- continuation pattern

Important note on all patterns:
- a pattern is not a guarantee
- volume and follow-through matter
- pattern reliability depends on context and timeframe

---

## 17. Nivesh Score

Nivesh score is the project’s internal conviction score.

Related logic:
- `lib/signals.ts`
- `lib/tools.ts`

It is influenced by:
- RSI zone
- price relative to EMA50 and EMA200
- signal type
- volume-related confirmation
- profit growth

It is a heuristic score, not a statistically trained probability model.

Why that matters:
- it is interpretable
- easy to demo
- easier to tune in a hackathon environment

But it should not be misrepresented as a regulated or production-certified risk model.

---

## 18. Investment Case Layer

File:
- `lib/investment-case.ts`

Purpose:
- transform raw technical and financial inputs into investor-readable explanation blocks

Outputs:
- confidence score
- confidence label
- thesis bullets
- risk bullets
- watchlist bullets

This layer is what powers:
- "Bull Case"
- "Primary Risk"
- "Next Check"

It is especially useful in demos because it turns low-level market data into human-readable investment reasoning.

---

## 19. Fallback and Demo Philosophy

This project relies on public market sources.

Public sources can:
- throttle requests
- block the server
- change response format
- return zero values
- timeout

So DRISHTI uses a layered resilience strategy.

### 19.1 Quote Fallback

If Yahoo quote fails:
- use deterministic fallback price
- attach source state

File:
- `lib/yahoo.ts`

### 19.2 OHLCV Fallback

If historical candle fetch fails:
- generate deterministic ticker-specific OHLCV

### 19.3 NSE Fallback

If NSE calls fail:
- use realistic fallback bulk deals and FII/DII values

### 19.4 AI Fallback

If Claude fails:
- use Groq 70b

If richer AI scoring fails:
- use rule-based fallback

### 19.5 Pattern Fallback

If pattern AI fails:
- use seeded demo pattern

### 19.6 Demo Mode

Demo mode intentionally switches to presentation-ready seeded datasets.

This is not a bug.
It exists so the product remains demoable even in unstable conditions.

---

## 20. Video Engine Deep Dive

The AI video engine is more than a static animation.

It works as follows:

1. User picks a template.
2. Frontend calls `/api/video/generate`.
3. Backend gathers market data.
4. Groq writes a Hinglish script.
5. Frontend passes data into a canvas animation component.
6. `requestAnimationFrame` renders frames.
7. `MediaRecorder` captures the canvas stream.
8. Output becomes a downloadable WebM.

Why this is interesting:
- there is no external video rendering service
- everything is generated inside the browser
- it showcases multimodal storytelling from market data to visual media

---

## 21. Styling and UX System

Styling lives mainly in:
- `app/globals.css`

Notable choices:
- dark, premium terminal-meets-bloomberg aesthetic
- `Manrope` for primary typography
- `JetBrains Mono` for numeric/market text
- reusable panel shells and premium card styles
- explicit source badges for trust

Animation libraries:
- `Framer Motion`
- CSS animations
- `requestAnimationFrame` for canvas work

---

## 22. Types and Data Contracts

Main type file:
- `types/index.ts`

Important types:
- `StockPrice`
- `OHLCV`
- `Technicals`
- `Fundamentals`
- `QuarterlyResult`
- `Signal`
- `MarketPulseData`
- `Holding`
- `Portfolio`
- `PortfolioHealthScore`
- `ChatMessage`
- `AgentStep`
- `DataSourceMeta`

Why this matters:
- the entire app depends on these shared types for frontend-backend consistency

If a new developer wants to understand the data flowing through the system, this is one of the best files to read first.

---

## 23. Key Code Paths to Read First

If you are new to the codebase, read in this order:

1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `types/index.ts`
4. `app/page.tsx`
5. `store/useAppStore.ts`
6. `app/api/stock/[ticker]/route.ts`
7. `lib/yahoo.ts`
8. `app/api/signals/route.ts`
9. `lib/aiRouter.ts`
10. `lib/claude.ts`
11. `lib/tools.ts`
12. `components/chart/ChartIntelligence.tsx`
13. `components/radar/StockInfoDrawer.tsx`
14. `components/agent/DrishtiAgent.tsx`

This sequence helps move from:
- product understanding
- to data structures
- to backend pipelines
- to AI orchestration
- to UI rendering

---

## 24. Setup and Environment

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repo>
cd drishti
npm install
```

### Environment Variables

```env
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
```

Without these:
- demo mode and local fallbacks still allow large parts of the UI to run

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

---

## 25. How to Explain the Project to Different Audiences

### To a judge

Say:
- multi-agent AI for Indian retail investors
- model-routed reasoning using Claude + Groq
- trust-first source labeling
- portfolio-aware personalization

### To a new engineer

Say:
- Next.js full-stack app
- API routes orchestrate AI and data
- Zustand manages client state
- Yahoo/NSE wrappers power the market layer
- Claude tools plus Groq routing power the AI layer

### To a finance user

Say:
- it detects opportunities
- explains technical and fundamental context
- highlights risks and next checks
- personalizes to your existing holdings

---

## 26. Current Limitations

Every serious project should document limitations honestly.

### Data limitations
- public market feeds are not guaranteed exchange-grade real-time feeds
- Yahoo and NSE endpoints may fail or rate-limit

### AI limitations
- model outputs are guided and constrained, but still probabilistic
- the system is not a registered investment advisor

### Product limitations
- some fallbacks are deterministic reference data rather than guaranteed fresh market truth
- demo mode is presentation-friendly but not equal to live exchange connectivity

### Technical limitations
- much of the system uses in-memory cache, which may reset across deployments or server restarts

---

## 27. Future Improvements

Good next-step directions include:
- integrate a more reliable market data provider
- add more robust backtesting or statistical validation for signals
- replace some heuristic scoring with calibrated confidence models
- add user auth and persistent backend portfolio storage
- add sector/regime-level dashboards
- add more explicit source provenance in each agent verdict
- expand multilingual financial education support

---

## 28. Final Summary

DRISHTI is a full-stack AI investment intelligence platform with:
- a market pulse system
- a signal radar
- chart intelligence
- portfolio-aware AI analysis
- a conversational multi-agent assistant
- a video-generation engine

Technically, it combines:
- `Next.js 14`
- `React`
- `TypeScript`
- `Zustand`
- `Anthropic Claude Sonnet 4.5`
- `Groq llama-3.1-8b-instant`
- `Groq llama-3.3-70b-versatile`
- `Yahoo Finance`
- `NSE India`
- `SEBI`

Conceptually, it combines:
- finance
- explainable AI
- fallback-resilient architecture
- UI trust design
- portfolio personalization

If you want to understand the project "inside out", this handbook plus the architecture doc and the core files listed above will get you there.

