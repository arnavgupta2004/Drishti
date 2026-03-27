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

export async function extractQueryIntent(rawQuery: string): Promise<QueryIntent> {
  const fallback: QueryIntent = {
    ticker: null,
    intent: rawQuery,
    isHinglish: /[^\x00-\x7F]/.test(rawQuery) || /\b(kya|hai|mein|ka|ko|se|aur|hoga|karein|lagao|becho)\b/i.test(rawQuery),
    routed_to: 'groq',
  }

  try {
    const raw = await groqChat(
      `You are a financial query parser for Indian stock markets (NSE/BSE).
Extract structured intent from user queries. Respond ONLY with a JSON object.

Rules:
- ticker: NSE symbol if mentioned (RELIANCE, HDFCBANK, TCS, INFY etc.), else null
- intent: clean English reformulation (remove filler, keep financial meaning)
- isHinglish: true if query contains Hindi/Hinglish words`,
      `Query: "${rawQuery}"

Respond with ONLY this JSON (no markdown):
{"ticker": "<NSE_SYMBOL or null>", "intent": "<clean English intent>", "isHinglish": <true/false>}`
    )

    const match = raw.match(/\{[\s\S]*?\}/)
    if (!match) return fallback
    const parsed = JSON.parse(match[0]) as { ticker?: string | null; intent?: string; isHinglish?: boolean }
    return {
      ticker: parsed.ticker ?? null,
      intent: parsed.intent ?? rawQuery,
      isHinglish: parsed.isHinglish ?? fallback.isHinglish,
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
