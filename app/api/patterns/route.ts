import { NextRequest, NextResponse } from 'next/server'
import { getOHLCV } from '@/lib/yahoo'
import { getDemoPattern, formatOHLCVForClaude } from '@/lib/patterns'
import { createClaudeClient } from '@/lib/claude'
import type { ChartPattern } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

const PATTERN_PROMPT = (ticker: string, csv: string) => `You are a technical analysis expert for Indian stocks (NSE/BSE).

Analyze this OHLCV data for ${ticker} and identify the most significant chart pattern.
Format: date,open,high,low,close,volume

Data (last 90 candles):
${csv}

CRITICAL: Respond ONLY with a valid JSON object. No markdown, no code fences, no explanation outside the JSON.
LANGUAGE RULE: ALL text fields (description, description_hi) MUST be written in English only. No Hindi, no Hinglish, no transliteration. Pure English.

{
  "pattern_name": "<pattern name>",
  "confidence": <0-100>,
  "support_level": <price as number>,
  "resistance_level": <price as number>,
  "target_price": <price as number>,
  "stop_loss": <price as number>,
  "description": "<1-2 sentence ENGLISH description mentioning ${ticker} and key price levels — NO Hindi or Hinglish>",
  "description_hi": "<1-2 sentence ENGLISH description for retail investors — NO Hindi or Hinglish>",
  "historical_win_rate": <percentage 0-100>,
  "key_levels": [<support>, <resistance>, <target>],
  "direction": "<bullish|bearish|neutral>"
}`

export async function POST(req: NextRequest) {
  const { ticker, isDemoMode = false } = await req.json()

  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  if (isDemoMode) {
    return NextResponse.json({ pattern: getDemoPattern(ticker) })
  }

  try {
    const ohlcv = await getOHLCV(ticker, '6mo', '1d')
    if (ohlcv.length < 20) {
      return NextResponse.json({ pattern: getDemoPattern(ticker) })
    }

    const csvData = formatOHLCVForClaude(ohlcv)

    // ── Try Claude first ─────────────────────────────────────
    try {
      const client = createClaudeClient()
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: PATTERN_PROMPT(ticker, csvData) }],
      })
      const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
      const pattern = parsePatternJSON(text)
      if (pattern) return NextResponse.json({ pattern })
    } catch { /* Claude unavailable — try Groq */ }

    // ── Groq fallback ────────────────────────────────────────
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 800,
            temperature: 0.2,
            messages: [
              {
                role: 'system',
                content: 'You are a technical analysis expert for Indian stocks. Always respond with valid JSON only — no markdown, no code blocks, no explanation. IMPORTANT: All text fields in your JSON response must be in English only. Do not use Hindi, Hinglish, or any transliteration.',
              },
              { role: 'user', content: PATTERN_PROMPT(ticker, csvData) },
            ],
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const text = data.choices?.[0]?.message?.content ?? ''
          const pattern = parsePatternJSON(text)
          if (pattern) return NextResponse.json({ pattern })
        }
      } catch { /* Groq also failed */ }
    }

    // ── Final fallback: seeded demo pattern ──────────────────
    return NextResponse.json({ pattern: getDemoPattern(ticker) })

  } catch {
    return NextResponse.json({ pattern: getDemoPattern(ticker) })
  }
}

function parsePatternJSON(text: string): ChartPattern | null {
  try {
    // Strip any markdown code fences if present
    const clean = text.replace(/```(?:json)?/gi, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return null
    const p = JSON.parse(match[0]) as ChartPattern
    // Validate required numeric fields are present and non-zero
    if (!p.pattern_name || !p.support_level || !p.resistance_level) return null
    return p
  } catch {
    return null
  }
}
