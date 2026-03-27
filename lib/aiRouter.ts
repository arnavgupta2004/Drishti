// ─── AI Router — Cost-efficient model routing ─────────────────────────────────
//
//  Claude  → complex reasoning: 4-agent pipeline, portfolio scoring, pattern detection
//  Groq    → fast classification: intent extraction, sentiment, JSON cleanup
//
// Groq API is OpenAI-compatible. Model: llama-3.1-8b-instant

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-8b-instant'

export interface QueryIntent {
  ticker: string | null        // Primary NSE ticker extracted (e.g. "RELIANCE")
  intent: string               // Clean English reformulation of the query
  isHinglish: boolean          // Whether the original query was in Hinglish/Hindi
  routed_to: 'groq'
}

export interface SignalSentiment {
  sentiment: 'bullish' | 'bearish' | 'neutral'
  reason: string               // One-line reason
  confidence: number           // 0.0 – 1.0
  routed_to: 'groq'
}

// ─── Groq fetch wrapper ────────────────────────────────────────────────────────

async function groqChat(systemPrompt: string, userMessage: string, maxTokens = 256): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(6000),
  })

  if (!res.ok) throw new Error(`Groq API error: ${res.status}`)
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content?.trim() ?? ''
}

// ─── Task 1: Intent Extraction ────────────────────────────────────────────────
// Used in /api/agent/route.ts before calling Claude

// Common company name → NSE ticker mapping (handles "Analyze Zomato", "Reliance ka scene", etc.)
const NAME_TO_TICKER: Record<string, string> = {
  'zomato': 'ZOMATO', 'reliance': 'RELIANCE', 'jio': 'RELIANCE',
  'hdfc': 'HDFCBANK', 'hdfcbank': 'HDFCBANK', 'hdfc bank': 'HDFCBANK',
  'tcs': 'TCS', 'tata consultancy': 'TCS',
  'infosys': 'INFY', 'infy': 'INFY',
  'wipro': 'WIPRO', 'titan': 'TITAN', 'tanishq': 'TITAN',
  'bajaj': 'BAJFINANCE', 'bajajfinance': 'BAJFINANCE', 'bajaj finance': 'BAJFINANCE',
  'bajajfinsv': 'BAJAJFINSV', 'bajaj finserv': 'BAJAJFINSV',
  'itc': 'ITC', 'kotak': 'KOTAKBANK', 'kotak bank': 'KOTAKBANK', 'kotakbank': 'KOTAKBANK',
  'sbi': 'SBIN', 'state bank': 'SBIN',
  'icici': 'ICICIBANK', 'icici bank': 'ICICIBANK', 'icicibank': 'ICICIBANK',
  'axis': 'AXISBANK', 'axis bank': 'AXISBANK', 'axisbank': 'AXISBANK',
  'ongc': 'ONGC', 'maruti': 'MARUTI', 'maruti suzuki': 'MARUTI',
  'sunpharma': 'SUNPHARMA', 'sun pharma': 'SUNPHARMA', 'sun pharmaceutical': 'SUNPHARMA',
  'adani': 'ADANIPORTS', 'adani ports': 'ADANIPORTS', 'adaniports': 'ADANIPORTS',
  'ntpc': 'NTPC', 'powergrid': 'POWERGRID', 'power grid': 'POWERGRID',
  'hcl': 'HCLTECH', 'hcltech': 'HCLTECH', 'hcl tech': 'HCLTECH',
  'techm': 'TECHM', 'tech mahindra': 'TECHM',
  'lt': 'LT', 'larsen': 'LT', 'larsen toubro': 'LT',
  'ltimindtree': 'LTIMINDTREE', 'lti': 'LTIMINDTREE',
  'drreddy': 'DRREDDY', 'dr reddy': 'DRREDDY', 'dr reddys': 'DRREDDY',
  'cipla': 'CIPLA', 'eicher': 'EICHERMOT', 'royal enfield': 'EICHERMOT',
  'bpcl': 'BPCL', 'hindalco': 'HINDALCO',
  'tatamotors': 'TATAMOTORS', 'tata motors': 'TATAMOTORS',
  'tatasteel': 'TATASTEEL', 'tata steel': 'TATASTEEL',
  'tatapower': 'TATAPOWER', 'tata power': 'TATAPOWER',
  'nestleind': 'NESTLEIND', 'nestle': 'NESTLEIND',
  'asianpaint': 'ASIANPAINT', 'asian paints': 'ASIANPAINT', 'asian paint': 'ASIANPAINT',
  'ultracemco': 'ULTRACEMCO', 'ultratech': 'ULTRACEMCO', 'ultratech cement': 'ULTRACEMCO',
  'bharti': 'BHARTIARTL', 'airtel': 'BHARTIARTL', 'bhartiartl': 'BHARTIARTL',
  'nykaa': 'NYKAA', 'paytm': 'PAYTM', 'one97': 'PAYTM',
  'indigo': 'INDIGO', 'interglobe': 'INDIGO',
  'dmart': 'DMART', 'avenue supermarts': 'DMART',
  'pidilite': 'PIDILITIND', 'fevicol': 'PIDILITIND',
  'havells': 'HAVELLS', 'voltas': 'VOLTAS',
  'britannia': 'BRITANNIA', 'marico': 'MARICO', 'dabur': 'DABUR',
  'godrej': 'GODREJCP', 'godrej consumer': 'GODREJCP',
  'mrf': 'MRF', 'apollo tyre': 'APOLLOTYRE', 'apollo tyres': 'APOLLOTYRE',
  'indusind': 'INDUSINDBK', 'indusind bank': 'INDUSINDBK',
  'federalbank': 'FEDERALBNK', 'federal bank': 'FEDERALBNK',
  'srf': 'SRF', 'coforge': 'COFORGE', 'persistent': 'PERSISTENT',
  'mphasis': 'MPHASIS', 'hexaware': 'HEXAWARE',
}

function extractTickerFromText(text: string): string | null {
  const lower = text.toLowerCase()
  // Check multi-word names first (longer matches win)
  const sortedNames = Object.keys(NAME_TO_TICKER).sort((a, b) => b.length - a.length)
  for (const name of sortedNames) {
    if (lower.includes(name)) return NAME_TO_TICKER[name]
  }
  // Check if an all-caps word is already an NSE ticker
  const capsMatch = text.match(/\b([A-Z]{2,12})\b/)
  if (capsMatch) return capsMatch[1]
  return null
}

export async function extractQueryIntent(rawQuery: string): Promise<QueryIntent> {
  const isHinglish = /[^\x00-\x7F]/.test(rawQuery) || /\b(kya|hai|mein|ka|ko|se|aur|hoga|karein|lagao|becho)\b/i.test(rawQuery)

  // Fast local extraction first — catches "Analyze Zomato", "RELIANCE ka scene" etc.
  const localTicker = extractTickerFromText(rawQuery)

  const fallback: QueryIntent = {
    ticker: localTicker,
    intent: rawQuery,
    isHinglish,
    routed_to: 'groq',
  }

  try {
    const raw = await groqChat(
      `You are an expert financial query parser for Indian stock markets (NSE/BSE).
Your job: extract the NSE ticker symbol for ANY Indian company mentioned, using your complete knowledge of all NSE/BSE listed stocks.

TICKER RULES — be comprehensive:
- Map company names, brand names, products, subsidiaries to their NSE parent ticker
- Examples: "Tanishq" → TITAN, "Jio" → RELIANCE, "Fevicol" → PIDILITIND, "Royal Enfield" → EICHERMOT, "Croma" → TATACONSUM, "Star Health" → STARHEALTH, "Paytm" → PAYTM, "Nykaa" → NYKAA, "Swiggy" → SWIGGY, "Ola Electric" → OLAELEC, "PB Fintech" → POLICYBZR, "Delhivery" → DELHIVERY, "Mamaearth" → HONASA, "Go Digit" → GODIGIT
- For banking: "Punjab National Bank" → PNB, "Bank of Baroda" → BANKBARODA, "Canara Bank" → CANARABANK, "Union Bank" → UNIONBANK
- For PSUs: "BHEL" → BHEL, "HAL" → HAL, "IRCTC" → IRCTC, "RVNL" → RVNL, "IRFC" → IRFC, "HUDCO" → HUDCO
- For mid/small caps: use your complete NSE knowledge to find the right symbol
- If a company is NOT listed on NSE/BSE (e.g. Zerodha, Grofers, Dunzo), set ticker to "UNLISTED:<company_name>"
- If no company is mentioned at all, set ticker to null
- intent: clean English reformulation removing Hindi/Hinglish filler words
- isHinglish: true if query has Hindi/Hinglish words`,
      `Query: "${rawQuery}"

Respond with ONLY this JSON (no markdown, no explanation):
{"ticker": "<NSE_SYMBOL, UNLISTED:<name>, or null>", "intent": "<clean English intent>", "isHinglish": <true/false>}`
    )

    const match = raw.match(/\{[\s\S]*?\}/)
    if (!match) return fallback
    const parsed = JSON.parse(match[0]) as { ticker?: string | null; intent?: string; isHinglish?: boolean }
    return {
      // Prefer Groq's extraction, fall back to local extraction if Groq returned null
      ticker: parsed.ticker ?? localTicker,
      intent: parsed.intent ?? rawQuery,
      isHinglish: parsed.isHinglish ?? isHinglish,
      routed_to: 'groq',
    }
  } catch {
    return fallback
  }
}

// ─── Task 2: Signal / Bulk Deal Sentiment ─────────────────────────────────────
// Used in /api/signals/route.ts for each bulk deal

export async function classifySignalSentiment(
  headline: string,
  detail: string,
  signalType: string,
): Promise<SignalSentiment> {
  const fallback: SignalSentiment = {
    sentiment: signalType.includes('buy') || signalType.includes('accumulation') || signalType.includes('breakout') || signalType.includes('results')
      ? 'bullish'
      : signalType.includes('sell') || signalType.includes('pledge')
        ? 'bearish'
        : 'neutral',
    reason: 'Classified by signal type',
    confidence: 0.7,
    routed_to: 'groq',
  }

  try {
    const raw = await groqChat(
      `You are a financial sentiment classifier for Indian stock markets.
Classify the sentiment of the given stock market signal.
Respond ONLY with a JSON object — no markdown, no explanation.`,
      `Signal type: ${signalType}
Headline: ${headline}
Detail: ${detail}

Respond with ONLY this JSON:
{"sentiment": "<bullish|bearish|neutral>", "reason": "<one-line reason max 10 words>", "confidence": <0.0-1.0>}`
    )

    const match = raw.match(/\{[\s\S]*?\}/)
    if (!match) return fallback
    const parsed = JSON.parse(match[0]) as { sentiment?: string; reason?: string; confidence?: number }
    return {
      sentiment: (['bullish', 'bearish', 'neutral'].includes(parsed.sentiment ?? '') ? parsed.sentiment : fallback.sentiment) as SignalSentiment['sentiment'],
      reason: parsed.reason ?? fallback.reason,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : fallback.confidence,
      routed_to: 'groq',
    }
  } catch {
    return fallback
  }
}

// ─── Task 3: News Headline Sentiment ─────────────────────────────────────────
// Available for use in signals enrichment

export async function scoreNewsSentiment(
  headlines: string[],
  ticker: string,
): Promise<{ headline: string; sentiment: 'positive' | 'negative' | 'neutral'; confidence: number; routed_to: 'groq' }[]> {
  if (!headlines.length) return []

  const fallback = headlines.map(h => ({
    headline: h,
    sentiment: 'neutral' as const,
    confidence: 0.5,
    routed_to: 'groq' as const,
  }))

  try {
    const raw = await groqChat(
      `You are a financial news sentiment analyzer for Indian stock markets.
Score each headline for sentiment impact on the stock ${ticker}.
Respond ONLY with a JSON array — no markdown.`,
      `Headlines (one per line):
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Respond with ONLY a JSON array:
[{"headline": "<exact headline>", "sentiment": "<positive|negative|neutral>", "confidence": <0.0-1.0>}, ...]`,
      512
    )

    const match = raw.match(/\[[\s\S]*?\]/)
    if (!match) return fallback
    const parsed = JSON.parse(match[0]) as { headline: string; sentiment: string; confidence: number }[]
    return parsed.map(p => ({
      headline: p.headline,
      sentiment: (['positive', 'negative', 'neutral'].includes(p.sentiment) ? p.sentiment : 'neutral') as 'positive' | 'negative' | 'neutral',
      confidence: typeof p.confidence === 'number' ? Math.min(1, Math.max(0, p.confidence)) : 0.5,
      routed_to: 'groq' as const,
    }))
  } catch {
    return fallback
  }
}

// ─── Router decision logger ───────────────────────────────────────────────────
// Returns the SSE payload announcing routing decision

export function routingDecisionSSE(task: string, model: 'groq' | 'claude', detail?: string): string {
  return `data: ${JSON.stringify({
    type: 'routing',
    task,
    model,
    model_label: model === 'groq' ? '⚡ Groq (llama-3.1-8b)' : '🧠 Claude (sonnet-4)',
    detail: detail ?? '',
  })}\n\n`
}
