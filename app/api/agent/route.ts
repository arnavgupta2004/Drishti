import { NextRequest } from 'next/server'
import { runAgentLoop } from '@/lib/claude'
import { extractQueryIntent, routingDecisionSSE } from '@/lib/aiRouter'
import type { Holding } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, portfolio = [], isDemoMode = false, language = 'en' } = body as {
      query: string
      portfolio: Holding[]
      isDemoMode: boolean
      language: 'en' | 'hi' | 'hinglish'
    }

    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Query required' }), { status: 400 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (chunk: string) => controller.enqueue(encoder.encode(chunk))

        try {
          // ── Step 0: Groq intent extraction ──────────────────────────────
          emit(routingDecisionSSE('Intent extraction', 'groq', 'Parsing query structure'))

          const intent = await extractQueryIntent(query).catch(() => null)

          if (intent) {
            emit(`data: ${JSON.stringify({
              type: 'routing',
              task: 'Intent extraction',
              model: 'groq',
              model_label: '⚡ Groq (llama-3.1-8b)',
              detail: `Ticker: ${intent.ticker ?? 'none'} | Hinglish: ${intent.isHinglish} | Intent: "${intent.intent}"`,
            })}\n\n`)
          }

          // Build enriched query for Claude — add ticker context if extracted
          const enrichedQuery = intent?.ticker
            ? `[EXTRACTED TICKER: ${intent.ticker}] [HINGLISH: ${intent.isHinglish}]\n\nUser query: ${query}\n\nClean intent: ${intent.intent}`
            : query

          // ── Main pipeline: Claude 4-agent loop ──────────────────────────
          emit(routingDecisionSSE('4-agent analysis', 'claude', 'Deep reasoning pipeline'))

          for await (const chunk of runAgentLoop(enrichedQuery, portfolio, isDemoMode, language)) {
            emit(chunk)
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error'
          emit(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
}
