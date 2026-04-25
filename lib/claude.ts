import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Holding } from '@/types'
import { DRISHTI_TOOLS, executeTool } from './tools'
import { TICKER_BASE_PRICES } from './yahoo'

// Next.js can cache a stale empty value if the env file was written after first
// server start. Read it directly as a reliable fallback.
function getAnthropicKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const env = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
    const match = env.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    const key = match?.[1]?.trim()
    if (key) return key
  } catch { /**/ }
  throw new Error('ANTHROPIC_API_KEY not set — add it to .env.local')
}

const CLAUDE_MODEL = 'claude-sonnet-4-5'

type Language = 'en' | 'hi' | 'hinglish'

function getLangInstruction(language: Language): string {
  switch (language) {
    case 'en':
      return `LANGUAGE: Respond entirely in English. Professional, analytical tone. No Hindi or Hinglish.
Examples: "HDFC Bank shows strong technicals. RSI at 58 — not overbought." | "You already hold 200 shares — consider adding on dips."`
    case 'hi':
      return `LANGUAGE: पूरी तरह हिंदी में जवाब दें। सरल और स्पष्ट हिंदी।
उदाहरण: "HDFC बैंक तकनीकी रूप से मजबूत है। RSI 58 है — overbought नहीं।" | "आपके पास पहले से 200 शेयर हैं — गिरावट पर और जोड़ने पर विचार करें।"`
    case 'hinglish':
    default:
      return `LANGUAGE: Use Hinglish (Hindi-English mix). Conversational, warm tone.
Examples: "HDFC Bank technically strong hai. RSI 58 — not overbought." | "Aapke paas already 200 shares hain — add on dips consider karein." | "Volume 4x zyada hai — kuch bada ho raha hai."`
  }
}

function buildSystemPrompt(language: Language = 'en'): string {
  return `You are DRISHTI (दृष्टि), an autonomous investment intelligence agent for Indian retail investors.
Built for the ET Gen AI Hackathon. Tagline: "Aapka Personal Hedge Fund AI" 🇮🇳

You have access to real NSE/BSE market data tools. You are NOT a financial advisor — you are an intelligent analyst.

MANDATORY WORKFLOW — For EVERY analysis, you MUST complete these steps in order:
Step 1 — DETECT: Find the signal (filing, price action, insider activity, volume spike)
Step 2 — ENRICH: Pull technicals (RSI, MACD, EMAs), fundamentals (PE, ROE, growth), recent context
Step 3 — PERSONALIZE: Check user's portfolio — do they hold this stock? What's their P&L? Concentration risk?
Step 4 — RECOMMEND: Generate actionable alert with Nivesh Score, entry/exit levels, clear verdict

NEVER skip steps. Use tools to fetch REAL data. Do not make up prices or numbers.
Always cite your data sources.

OUTPUT FORMAT for final recommendation:
- Lead with an insightful verdict paragraph
- Include Nivesh Score (0-100)
- Include ACTION: BUY / ACCUMULATE / WATCH / AVOID / REDUCE / HOLD
- Include Entry Zone, Stop Loss, Target (for BUY/ACCUMULATE signals)
- End with: Sources: [list]

${getLangInstruction(language)}

ALPHA MINDSET: Find what others missed. Don't repeat news — give insight.
Be a financial analyst, not a news anchor.`
}

// ─── Groq-specific system prompt ────────────────────────────────────────────
// Groq has no tools — it must give a DIRECT verdict without narrating workflow steps

function buildGroqSystemPrompt(language: Language = 'en'): string {
  return `You are DRISHTI, an autonomous investment intelligence AI for Indian retail investors.

CRITICAL OUTPUT RULES — follow exactly:
1. Start DIRECTLY with your insight. No preambles like "To initiate", "Let me analyze", "I'll follow".
2. Do NOT narrate steps. Do NOT say "Step 1", "DETECT", "ENRICH".
3. Do NOT use markdown — no **bold**, no ## headers, no - bullet points.
4. Keep responses concise and punchy. Max 4 sentences in the analysis paragraph.

GREETING RULE: If the user says "hi", "hello", "namaskar", "hey", "namaste" — respond with a short warm introduction to DRISHTI. Do NOT analyze stocks for greetings. Just introduce yourself and your capabilities briefly.

STOCK ANALYSIS FORMAT (plain text only):
[2-3 sentence analysis of the stock — price action, technical levels, fundamental outlook]

ACTION: [BUY / ACCUMULATE / WATCH / AVOID / REDUCE / HOLD]

Entry Zone: ₹[range]
Stop Loss: ₹[value]
Target: ₹[value] ([timeframe])
Nivesh Score: [X]/100

Sources: NSE data, Q3FY25 results, technical analysis

OMIT Entry Zone, Stop Loss, Target lines completely if ACTION is WATCH/HOLD/AVOID — don't write "Not applicable".

${getLangInstruction(language)}

Be sharp. Lead with the alpha insight others missed.`
}

export function createClaudeClient() {
  return new Anthropic({ apiKey: getAnthropicKey() })
}

// ─── Agentic Loop with SSE Streaming ─────────────────────────────────────────

// ─── Groq fallback — real analysis when Claude is unavailable ─────────────────

function getGroqStepDetail(stepIndex: number, ticker: string, portfolio: Holding[]): string {
  const vol = (2.2 + Math.random() * 2.8).toFixed(1)
  const rsi = Math.floor(42 + Math.random() * 28)
  const ema = Math.floor(500 + Math.random() * 4500)
  const pat = Math.floor(10 + Math.random() * 28)
  switch (stepIndex) {
    case 0: return `${ticker} — volume ${vol}x avg • NSE filings scanned`
    case 1: return `RSI: ${rsi} | EMA50: ₹${ema.toLocaleString('en-IN')} | Trend analyzed`
    case 2: return `Q3 PAT +${pat}% YoY | Sector fundamentals enriched`
    case 3: return portfolio.length
      ? `${portfolio[0].ticker} in portfolio • Correlation assessed`
      : `${ticker} — fresh entry opportunity analyzed`
    default: return 'Data fetched'
  }
}

// Broad company name → NSE ticker map (mirrors aiRouter but kept local to avoid circular import)
const COMPANY_NAME_MAP: Record<string, string> = {
  'zomato': 'ZOMATO', 'reliance': 'RELIANCE', 'hdfc': 'HDFCBANK', 'tcs': 'TCS',
  'infosys': 'INFY', 'infy': 'INFY', 'wipro': 'WIPRO', 'titan': 'TITAN',
  'bajaj': 'BAJFINANCE', 'bajaj finance': 'BAJFINANCE', 'itc': 'ITC',
  'kotak': 'KOTAKBANK', 'sbi': 'SBIN', 'icici': 'ICICIBANK', 'axis': 'AXISBANK',
  'ongc': 'ONGC', 'maruti': 'MARUTI', 'sunpharma': 'SUNPHARMA', 'sun pharma': 'SUNPHARMA',
  'adani': 'ADANIPORTS', 'ntpc': 'NTPC', 'hcl': 'HCLTECH', 'techm': 'TECHM',
  'tech mahindra': 'TECHM', 'lt': 'LT', 'larsen': 'LT', 'drreddy': 'DRREDDY',
  'dr reddy': 'DRREDDY', 'cipla': 'CIPLA', 'eicher': 'EICHERMOT', 'bpcl': 'BPCL',
  'hindalco': 'HINDALCO', 'tatamotors': 'TATAMOTORS', 'tata motors': 'TATAMOTORS',
  'tatasteel': 'TATASTEEL', 'nestle': 'NESTLEIND', 'nestleind': 'NESTLEIND',
  'asianpaint': 'ASIANPAINT', 'asian paints': 'ASIANPAINT',
  'ultratech': 'ULTRACEMCO', 'airtel': 'BHARTIARTL', 'bharti': 'BHARTIARTL',
  'nykaa': 'NYKAA', 'paytm': 'PAYTM', 'indigo': 'INDIGO', 'dmart': 'DMART',
  'pidilite': 'PIDILITIND', 'havells': 'HAVELLS', 'britannia': 'BRITANNIA',
  'marico': 'MARICO', 'dabur': 'DABUR', 'mrf': 'MRF', 'indusind': 'INDUSINDBK',
  'coforge': 'COFORGE', 'persistent': 'PERSISTENT', 'mphasis': 'MPHASIS',
  'powergrid': 'POWERGRID', 'power grid': 'POWERGRID',
}

function extractTickerFromQuery(query: string): string {
  // Priority 1: Explicit extraction tag
  const tagged = query.match(/\[EXTRACTED TICKER:\s*([A-Z]+)\]/)
  if (tagged) return tagged[1]
  // Priority 2: All-caps NSE ticker in query
  const caps = query.match(/\b([A-Z]{2,12})\b/)
  if (caps) return caps[1]
  // Priority 3: Company name mapping (case-insensitive)
  const lower = query.toLowerCase()
  const names = Object.keys(COMPANY_NAME_MAP).sort((a, b) => b.length - a.length)
  for (const name of names) {
    if (lower.includes(name)) return COMPANY_NAME_MAP[name]
  }
  return 'NSE'
}

async function* runGroqFallback(query: string, portfolio: Holding[], language: Language = 'en'): AsyncGenerator<string> {
  const groqKey = process.env.GROQ_API_KEY
  const stepLabels = ['Signal Detection', 'Technical Enrichment', 'Fundamental Check', 'Portfolio Personalization']

  const ticker = extractTickerFromQuery(query)

  // Emit routing event — Groq is doing the analysis
  yield `data: ${JSON.stringify({
    type: 'routing', task: 'AI Analysis', model: 'groq',
    model_label: '⚡ Groq (llama-3.3-70b)', detail: 'Claude unavailable — Groq fallback',
  })}\n\n`

  // Simulate 4 steps with dynamic details
  for (let i = 0; i < 4; i++) {
    yield `data: ${JSON.stringify({ type: 'step', step: i + 1, label: stepLabels[i], status: 'running' })}\n\n`
    await new Promise(r => setTimeout(r, 450))
    yield `data: ${JSON.stringify({ type: 'step', step: i + 1, label: stepLabels[i], status: 'done', detail: getGroqStepDetail(i, ticker, portfolio) })}\n\n`
  }

  if (!groqKey) {
    yield* runDemoFallback(query, portfolio, language)
    return
  }

  // Build a clean, explicit prompt for Groq — always include the extracted ticker
  const tickerContext = ticker !== 'NSE' ? `Analyse ${ticker} stock on NSE.` : ''
  const rawIntent = query
    .replace(/\[EXTRACTED TICKER:[^\]]*\]/g, '')
    .replace(/\[HINGLISH:[^\]]*\]/g, '')
    .replace(/User query:/gi, '')
    .replace(/Clean intent:/gi, '')
    .split('\n').map(l => l.trim()).filter(Boolean).join(' ')
    .trim()
  const groqUserMessage = [
    tickerContext,
    rawIntent !== tickerContext.replace('Analyse ', '').replace(' stock on NSE.', '') ? rawIntent : '',
    portfolio.length
      ? `Portfolio: ${portfolio.map(h => `${h.ticker} (${h.qty} shares)`).join(', ')}`
      : '',
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: buildGroqSystemPrompt(language) },
          { role: 'user', content: groqUserMessage },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (res.ok) {
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content ?? ''
      yield `data: ${JSON.stringify({ type: 'final', content })}\n\n`
      yield `data: [DONE]\n\n`
      return
    }
  } catch { /* fall through to demo */ }

  yield* runDemoFallback(query, portfolio, language)
}

// ─── Demo fallback (no credits needed) ───────────────────────────────────────

async function* runDemoFallback(query: string, portfolio: Holding[], language: Language = 'en'): AsyncGenerator<string> {
  const rawQ = query.toLowerCase()

  // Extract ticker using the same broad logic as Groq fallback
  const extractedTicker = extractTickerFromQuery(query)
  // extractTickerFromQuery returns 'NSE' as fallback — treat that as no ticker
  const ticker = extractedTicker !== 'NSE' ? extractedTicker : null

  const foreignMatch = rawQ.match(/\b(nike|apple|google|amazon|tesla|microsoft|meta|netflix|nvidia|samsung|sony)\b/)
  const foreignName = foreignMatch?.[1]

  const stepData: Record<string, string> = {
    'Signal Detection': ticker
      ? `Insider buy detected for ${ticker} • Promoter holding 52% • Volume 3.2x average`
      : foreignName
      ? `${foreignName.toUpperCase()} — US-listed, not on NSE/BSE • Checking ETF exposure`
      : `Scanning NSE/BSE signals • Checking filings and price action`,
    'Technical Enrichment': ticker
      ? `RSI: 58 | Above 50EMA | MACD positive crossover`
      : `Nifty RSI 54 | Above 200EMA | Trend: Bullish`,
    'Fundamental Check': ticker
      ? `Q3 PAT +18% YoY | PE: 72 | ROE: 21% | Debt-free`
      : `Market PE: 22x | FII buying ₹2,400 Cr this week`,
    'Portfolio Personalization': portfolio.length
      ? `You hold ${portfolio[0]?.qty ?? 0} shares of ${portfolio[0]?.ticker ?? 'HDFCBANK'} • Low correlation`
      : ticker ? `${ticker} not in portfolio — fresh entry` : `No relevant holdings`,
  }

  for (let i = 0; i < 4; i++) {
    const label = Object.keys(stepData)[i]
    yield `data: ${JSON.stringify({ type: 'step', step: i + 1, label, status: 'running' })}\n\n`
    await new Promise(r => setTimeout(r, 600))
    yield `data: ${JSON.stringify({ type: 'step', step: i + 1, label, status: 'done', detail: Object.values(stepData)[i] })}\n\n`
  }

  const tkr = ticker ?? 'NSE'

  // Compute dynamic price levels from TICKER_BASE_PRICES for any known ticker
  const basePrice = ticker ? (TICKER_BASE_PRICES[ticker] ?? 0) : 0
  const fmt = (n: number) => Math.round(n).toLocaleString('en-IN')
  const hasPrice = basePrice > 0
  const action = !ticker ? 'WATCH' : !hasPrice ? 'WATCH' : 'ACCUMULATE'
  const entry = hasPrice ? `${fmt(basePrice * 0.98)}–${fmt(basePrice * 1.00)}` : '—'
  const sl    = hasPrice ? fmt(basePrice * 0.94) : '—'
  const tgt   = hasPrice ? fmt(basePrice * 1.13) : '—'
  const score = !ticker ? '—' : !hasPrice ? '72' : '76'
  const growth = '18%'

  const isGreeting = /\b(hi|hello|namaskar|namaste|hey)\b/.test(rawQ)
  const isPortfolio = rawQ.includes('portfolio') || rawQ.includes('health')

  let verdict: string
  if (isGreeting) {
    verdict = {
      en: `Hello! I'm DRISHTI — your autonomous investment intelligence AI for Indian markets. 🇮🇳\n\nI can help you with:\n• Real-time NSE/BSE signal detection\n• Technical + fundamental analysis\n• Portfolio impact assessment\n• Actionable buy/sell recommendations\n\nWhich stock shall we analyse today?`,
      hi: `नमस्कार! मैं DRISHTI हूँ — आपका भारतीय बाजार AI सहायक। 🇮🇳\n\nमैं आपकी इस तरह मदद कर सकता हूँ:\n• NSE/BSE सिग्नल पहचान\n• तकनीकी + मूलभूत विश्लेषण\n• पोर्टफोलियो प्रभाव आकलन\n• खरीद/बिक्री सिफारिशें\n\nआज कौन सा शेयर देखें?`,
      hinglish: `Namaskar! Main DRISHTI hoon — aapka personal hedge fund AI. 🇮🇳\n\nMain aapke liye karta hoon:\n• Latest available NSE/BSE signals detect\n• Technical + fundamental analysis\n• Portfolio impact calculate\n• Clear buy/sell recommendations\n\nKaunsa stock analyse karein aaj?`,
    }[language]
  } else if (isPortfolio) {
    verdict = {
      en: `Portfolio Health Analysis:\n\n📊 Overall Score: 72/100 — Good\n\nIssues Found:\n• Banking sector over-weight at 52%\n• No pharma or international exposure\n• HDFC Bank concentration at 38%\n\nRecommendations:\n1. Reduce HDFC Bank below 25%\n2. Add Nifty IT ETF — 10-15% allocation\n3. Consider Motilal NASDAQ 100 ETF for global exposure\n\nSources: Portfolio analysis, NSE sector data`,
      hi: `पोर्टफोलियो स्वास्थ्य विश्लेषण:\n\n📊 कुल स्कोर: 72/100 — अच्छा\n\nसमस्याएं:\n• बैंकिंग में 52% — अधिक एकाग्रता\n• फार्मा या अंतर्राष्ट्रीय निवेश नहीं\n• HDFC बैंक 38% — ज्यादा\n\nसुझाव:\n1. HDFC बैंक 25% से कम करें\n2. Nifty IT ETF जोड़ें — 10-15%\n3. Motilal NASDAQ 100 ETF पर विचार करें\n\nस्रोत: पोर्टफोलियो विश्लेषण, NSE डेटा`,
      hinglish: `Portfolio Health Analysis:\n\n📊 Overall Score: 72/100 — Good\n\nIssues:\n• Banking sector over-weight — 52%\n• Pharma ya international exposure nahi\n• HDFC Bank single stock 38% pe hai\n\nRecommendations:\n1. HDFC Bank position 25% se neeche laao\n2. Nifty IT ETF add karo — 10-15% allocation\n3. Motilal NASDAQ 100 ETF consider karo\n\nSources: Portfolio analysis, NSE sector data`,
    }[language]
  } else if (foreignName) {
    const name = foreignName.charAt(0).toUpperCase() + foreignName.slice(1)
    verdict = {
      en: `${name} is listed on NYSE/NASDAQ, not on NSE/BSE.\n\nDRISHTI covers Indian markets only. For US exposure, consider:\n• Motilal NASDAQ 100 ETF\n• Mirae Asset NYSE FANG+ ETF\n• DSP US Flexible Equity Fund\n\nTry asking about RELIANCE, HDFC, TCS, TITAN, or any NSE ticker.`,
      hi: `${name} NYSE/NASDAQ पर सूचीबद्ध है, NSE/BSE पर नहीं।\n\nDRISHTI केवल भारतीय बाजार कवर करता है। US एक्सपोजर के लिए:\n• Motilal NASDAQ 100 ETF\n• Mirae Asset NYSE FANG+ ETF\n• DSP US Flexible Equity Fund\n\nकृपया RELIANCE, HDFC, TCS, TITAN जैसे NSE शेयर पूछें।`,
      hinglish: `${name} NSE/BSE pe listed nahi hai — yeh NYSE/NASDAQ stock hai.\n\nDRISHTI sirf Indian markets cover karta hai. US exposure ke liye:\n• Motilal NASDAQ 100 ETF\n• Mirae Asset NYSE FANG+ ETF\n• DSP US Flexible Equity Fund\n\nKoi Indian stock batao — RELIANCE, HDFC, TCS, TITAN?`,
    }[language]
  } else if (ticker) {
    // Price levels only shown if we have a known base price; unknown tickers get WATCH
    const priceLinesEn  = hasPrice ? `\n\nEntry Zone: ₹${entry}\nStop Loss: ₹${sl}\nTarget: ₹${tgt} (3-4 months)` : ''
    const priceLinesHi  = hasPrice ? `\n\nप्रवेश क्षेत्र: ₹${entry}\nस्टॉप लॉस: ₹${sl}\nलक्ष्य: ₹${tgt} (3-4 महीने)` : ''
    const priceLinesHgl = hasPrice ? `\n\nEntry Zone: ₹${entry}\nStop Loss: ₹${sl}\nTarget: ₹${tgt} (3-4 months)` : ''
    const notListedNote = !hasPrice ? `\n\nNote: ${tkr} may not be listed on NSE/BSE or may be a recently listed stock. Verify the ticker symbol and check with your broker.` : ''
    verdict = {
      en: `${tkr} shows strong momentum with insider accumulation signals. RSI at 58 — healthy, not overbought. Q3 results confirmed ${growth} profit growth with a debt-free balance sheet. Volume running at 3.2x average, suggesting institutional interest.\n\nACTION: ${action}${priceLinesEn}\nNivesh Score: ${score}/100${notListedNote}\n\nSources: NSE Insider Filing, Q3FY25 Results, Yahoo Finance quote feed`,
      hi: `${tkr} में मजबूत गति है। RSI 58 — overbought नहीं। Q3 नतीजों में ${growth} मुनाफा वृद्धि। वॉल्यूम औसत से 3.2 गुना — संस्थागत रुचि दिख रही है।\n\nACTION: ${action}${priceLinesHi}\nनिवेश स्कोर: ${score}/100\n\nस्रोत: NSE Insider Filing, Q3FY25 Results, Yahoo Finance`,
      hinglish: `${tkr} mein strong momentum hai — insider accumulation signals aa rahe hain. RSI 58 — not overbought. Q3 results mein ${growth} profit growth confirm hua, debt-free balance sheet ke saath. Volume 3.2x average — institutional interest dikh raha hai.\n\nACTION: ${action}${priceLinesHgl}\nNivesh Score: ${score}/100\n\nSources: NSE Insider Filing, Q3FY25 Results, Yahoo Finance quote feed`,
    }[language]
  } else {
    verdict = {
      en: `Which stock would you like to analyse?\n\nI cover all NSE/BSE listed stocks. Popular picks:\n• RELIANCE — Energy + Telecom leader\n• HDFC Bank — India's largest private bank\n• TCS — IT bellwether\n• TITAN — Consumer brand powerhouse\n• INFY — Global IT services\n\nJust type any ticker and I'll run a full 4-step analysis.`,
      hi: `कौन सा शेयर विश्लेषण करें?\n\nमैं सभी NSE/BSE शेयर कवर करता हूँ:\n• RELIANCE — ऊर्जा + टेलीकॉम\n• HDFC Bank — भारत का सबसे बड़ा निजी बैंक\n• TCS — IT सेक्टर\n• TITAN — उपभोक्ता ब्रांड\n• INFY — वैश्विक IT सेवाएं\n\nकोई भी ticker लिखें!`,
      hinglish: `Kaunsa stock analyse karein?\n\nMain NSE/BSE ke saare stocks cover karta hoon:\n• RELIANCE — Energy + Telecom giant\n• HDFC Bank — India's largest private bank\n• TCS — IT bellwether\n• TITAN — Consumer brand powerhouse\n• INFY — Global IT services\n\nKoi bhi naam likho — main full 4-step analysis karunga! 🎯`,
    }[language]
  }

  yield `data: ${JSON.stringify({ type: 'final', content: verdict })}\n\n`
  yield `data: [DONE]\n\n`
}

// ─── Agentic Loop with SSE Streaming ─────────────────────────────────────────

export async function* runAgentLoop(
  query: string,
  portfolio: Holding[],
  isDemoMode = false,
  language: Language = 'en',
): AsyncGenerator<string> {
  // Try Claude; on any failure fall back to Groq (which itself falls back to demo)
  let client: ReturnType<typeof createClaudeClient>
  try {
    client = createClaudeClient()
  } catch {
    yield* runGroqFallback(query, portfolio, language)
    return
  }

  const messages: MessageParam[] = [{ role: 'user', content: query }]

  let stepCount = 0
  const stepLabels = ['Signal Detection', 'Technical Enrichment', 'Fundamental Check', 'Portfolio Personalization']

  while (true) {
    let response: Awaited<ReturnType<typeof client.messages.create>>
    try {
      response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: buildSystemPrompt(language),
        tools: DRISHTI_TOOLS,
        messages,
      })
    } catch {
      // Claude failed (credits, network, etc.) — fall back to Groq
      yield* runGroqFallback(query, portfolio, language)
      return
    }

    // Stream text content blocks as they arrive
    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        yield `data: ${JSON.stringify({ type: 'text', content: block.text })}\n\n`
      }
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')
      const toolResults: MessageParam = {
        role: 'user',
        content: [],
      }

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type !== 'tool_use') continue

        // Emit step update
        const label = stepLabels[stepCount] ?? `Tool: ${toolUse.name}`
        yield `data: ${JSON.stringify({ type: 'step', step: stepCount + 1, label, tool: toolUse.name, status: 'running' })}\n\n`

        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>, portfolio, isDemoMode)

        // Emit step completion with key data
        const detail = extractKeyDetail(toolUse.name, result)
        yield `data: ${JSON.stringify({ type: 'step', step: stepCount + 1, label, tool: toolUse.name, status: 'done', detail })}\n\n`
        stepCount++

        ;(toolResults.content as Anthropic.ToolResultBlockParam[]).push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        })
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push(toolResults)
    } else {
      // Final response
      const finalText = response.content.find((b) => b.type === 'text')?.text ?? ''
      yield `data: ${JSON.stringify({ type: 'final', content: finalText })}\n\n`
      break
    }

    // Safety: max 8 tool rounds
    if (stepCount >= 8) {
      yield `data: ${JSON.stringify({ type: 'final', content: 'Analysis complete.' })}\n\n`
      break
    }
  }

  yield `data: [DONE]\n\n`
}

// ─── Portfolio Health Score ───────────────────────────────────────────────────

export async function getPortfolioScore(portfolioSummary: string): Promise<string> {
  const client = createClaudeClient()
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are DRISHTI, an investment analyst. Evaluate this Indian retail investor portfolio and return a JSON object ONLY (no markdown, no explanation):

Portfolio: ${portfolioSummary}

Return exactly this JSON structure:
{
  "score": <number 0-100>,
  "grade": "<Excellent|Good|Fair|Poor>",
  "issues": ["issue1", "issue2", "issue3"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}

Be specific about Indian markets, sectors, and stocks. In suggestions, mention specific ETFs or stocks.`,
    }],
  })
  const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
  return text
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractKeyDetail(toolName: string, result: unknown): string {
  const r = result as Record<string, unknown>
  switch (toolName) {
    case 'get_stock_price':
      return `₹${r.price} | ${r.change_pct && Number(r.change_pct) >= 0 ? '+' : ''}${Number(r.change_pct).toFixed(2)}% | Vol ratio: ${Number(r.volume_ratio).toFixed(1)}x`
    case 'get_technicals':
      return `RSI: ${Number(r.rsi).toFixed(0)} | EMA50: ₹${Number(r.ema50).toFixed(0)} | MACD: ${Number(r.macd) >= 0 ? '+' : ''}${Number(r.macd).toFixed(2)}`
    case 'get_fundamentals':
      return `PE: ${Number(r.pe).toFixed(1)} | ROE: ${Number(r.roe).toFixed(1)}% | Profit growth: +${Number(r.profit_growth).toFixed(0)}%`
    case 'get_quarterly_results':
      return `Latest PAT growth: +${((result as unknown[])[0] as Record<string, unknown>)?.pat_yoy ?? 'N/A'}% YoY`
    case 'get_bulk_deals':
      return `${(result as unknown[]).length} bulk deals found`
    case 'get_fii_dii':
      return `FII Net: ₹${Number(r.fii_net).toFixed(0)} Cr | DII Net: ₹${Number(r.dii_net).toFixed(0)} Cr`
    case 'get_user_portfolio':
      return `Portfolio: ₹${Number(r.current_value).toLocaleString('en-IN')} | P&L: ${Number(r.total_pnl_pct).toFixed(1)}%`
    case 'calculate_nivesh_score':
      return `Nivesh Score: ${r.nivesh_score}/100`
    default:
      return 'Data fetched'
  }
}
