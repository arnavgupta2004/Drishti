import { NextRequest, NextResponse } from 'next/server'
import { getPortfolioScore } from '@/lib/claude'
import { calcPortfolio, getSectorAllocation, getConcentrationRisks } from '@/lib/portfolio'
import type { Holding, PortfolioHealthScore } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

// ─── Rule-based portfolio scorer (no AI needed) ────────────────────────────

function computeRuleBasedScore(holdings: Holding[]): PortfolioHealthScore {
  const portfolio = calcPortfolio(holdings)
  const sectors = getSectorAllocation(holdings)
  const risks = getConcentrationRisks(holdings)

  const issues: string[] = []
  const suggestions: string[] = []
  let score = 100

  // ── 1. Diversification: number of stocks ─────────────────────────────────
  if (holdings.length < 5) {
    score -= 15
    issues.push(`Only ${holdings.length} stock${holdings.length === 1 ? '' : 's'} — portfolio is undiversified`)
    suggestions.push('Add at least 8–12 stocks across different sectors to reduce unsystematic risk')
  } else if (holdings.length < 8) {
    score -= 7
    issues.push(`${holdings.length} stocks — moderate diversification`)
    suggestions.push('Consider adding 3–4 more stocks across underrepresented sectors')
  }

  // ── 2. Sector diversification ────────────────────────────────────────────
  const sectorCount = Object.keys(sectors).length
  if (sectorCount < 3) {
    score -= 12
    issues.push(`Exposure to only ${sectorCount} sector${sectorCount === 1 ? '' : 's'} — high sector concentration`)
    suggestions.push('Diversify across at least 5 sectors (Banking, IT, FMCG, Energy, Healthcare)')
  }

  for (const [sector, pct] of Object.entries(sectors)) {
    if (pct > 50) {
      score -= 12
      issues.push(`${sector} sector at ${pct.toFixed(1)}% of portfolio — dangerously concentrated`)
      suggestions.push(`Reduce ${sector} allocation to below 35% by adding non-${sector} stocks`)
    } else if (pct > 40) {
      score -= 6
      issues.push(`${sector} sector at ${pct.toFixed(1)}% — above recommended 35% limit`)
      suggestions.push(`Trim ${sector} exposure or add stocks from other sectors to rebalance`)
    }
  }

  // ── 3. Single-stock concentration ────────────────────────────────────────
  const total = portfolio.current_value
  for (const h of holdings) {
    const pct = total > 0 ? (h.qty * (h.current_price ?? h.avg_buy_price) / total) * 100 : 0
    if (pct > 35) {
      score -= 12
      issues.push(`${h.company || h.ticker} is ${pct.toFixed(1)}% of portfolio — dangerously concentrated`)
      suggestions.push(`Reduce ${h.ticker} position size to under 25% to limit single-stock risk`)
    } else if (pct > 25) {
      score -= 6
      issues.push(`${h.company || h.ticker} at ${pct.toFixed(1)}% exceeds the 25% single-stock limit`)
      suggestions.push(`Consider trimming ${h.ticker} or adding more positions to dilute concentration`)
    }
  }

  // ── 4. Overall P&L performance ───────────────────────────────────────────
  if (portfolio.total_pnl_pct < -15) {
    score -= 10
    issues.push(`Portfolio is down ${Math.abs(portfolio.total_pnl_pct).toFixed(1)}% overall — significant drawdown`)
    suggestions.push('Review underperforming positions; consider stop-losses to limit further downside')
  } else if (portfolio.total_pnl_pct < -5) {
    score -= 5
    issues.push(`Portfolio is down ${Math.abs(portfolio.total_pnl_pct).toFixed(1)}% — monitor closely`)
    suggestions.push('Identify the largest loss-making positions and reassess their fundamentals')
  } else if (portfolio.total_pnl_pct > 20) {
    // Bonus for strong performance
    score = Math.min(score + 3, 100)
  }

  // ── 5. Individual holding losses ─────────────────────────────────────────
  const bigLosers = portfolio.holdings.filter(h => (h.pnl_pct ?? 0) < -20)
  if (bigLosers.length > 0) {
    score -= bigLosers.length * 4
    for (const h of bigLosers) {
      issues.push(`${h.company || h.ticker} is down ${Math.abs(h.pnl_pct ?? 0).toFixed(1)}% — review thesis`)
      suggestions.push(`Re-evaluate ${h.ticker}: if fundamentals have deteriorated, consider exiting`)
    }
  }

  // ── 6. IT sector check (common over-allocation in Indian portfolios) ──────
  const itPct = sectors['IT'] ?? 0
  if (itPct > 40) {
    score -= 5
    if (!issues.some(i => i.includes('IT'))) {
      issues.push(`IT sector at ${itPct.toFixed(1)}% — watch for global macro headwinds`)
      suggestions.push('Balance IT exposure with domestic-oriented sectors like FMCG, Banking, or Infrastructure')
    }
  }

  // ── 7. Suggestions for missing sectors ──────────────────────────────────
  const sectorNames = Object.keys(sectors).map(s => s.toLowerCase())
  if (!sectorNames.some(s => s.includes('pharma') || s.includes('health'))) {
    suggestions.push('Consider adding a Healthcare/Pharma stock for defensive balance (e.g. SUNPHARMA, DRREDDY)')
  }
  if (!sectorNames.some(s => s.includes('fmcg') || s.includes('consumer'))) {
    suggestions.push('A FMCG holding (ITC, HINDUNILVR) can provide stability during market downturns')
  }

  // ── Clamp score and assign grade ─────────────────────────────────────────
  score = Math.max(10, Math.min(100, score))

  let grade: PortfolioHealthScore['grade']
  if (score >= 80) grade = 'Excellent'
  else if (score >= 65) grade = 'Good'
  else if (score >= 45) grade = 'Fair'
  else grade = 'Poor'

  // Deduplicate and cap
  const uniqueIssues = [...new Set(issues)].slice(0, 6)
  const uniqueSuggestions = [...new Set(suggestions)].slice(0, 6)

  return {
    score: Math.round(score),
    grade,
    issues: uniqueIssues.length > 0 ? uniqueIssues : ['No major issues detected'],
    suggestions: uniqueSuggestions.length > 0 ? uniqueSuggestions : ['Portfolio looks well balanced — keep monitoring quarterly results'],
    sector_allocation: sectors,
    concentration_risk: risks,
  }
}

// ─── Build prompt summary for AI ─────────────────────────────────────────────

function buildSummary(holdings: Holding[]): string {
  const portfolio = calcPortfolio(holdings)
  const sectors = getSectorAllocation(holdings)
  const risks = getConcentrationRisks(holdings)
  return `
Total Invested: ₹${portfolio.total_invested.toLocaleString('en-IN')}
Current Value: ₹${portfolio.current_value.toLocaleString('en-IN')}
Overall P&L: ${portfolio.total_pnl_pct.toFixed(1)}%
Holdings (${holdings.length} stocks):
${holdings.map(h => {
  const cp = h.current_price ?? h.avg_buy_price
  const pnlPct = ((cp - h.avg_buy_price) / h.avg_buy_price * 100).toFixed(1)
  return `- ${h.ticker}: ${h.qty} shares @ ₹${h.avg_buy_price} avg, LTP ₹${cp} (${Number(pnlPct) >= 0 ? '+' : ''}${pnlPct}%) [${h.sector ?? 'Unknown'}]`
}).join('\n')}
Sector Allocation: ${Object.entries(sectors).map(([k, v]) => `${k}: ${v.toFixed(1)}%`).join(', ')}
Concentration Risks: ${risks.join('; ') || 'None'}
  `.trim()
}

// ─── Groq fallback ────────────────────────────────────────────────────────────

const SCORE_PROMPT = (summary: string) => `You are a SEBI-registered investment advisor analyzing an Indian retail investor's portfolio.

Portfolio data:
${summary}

Return ONLY a valid JSON object — no markdown, no explanation, no code fences:
{
  "score": <integer 0-100>,
  "grade": "<Excellent|Good|Fair|Poor>",
  "issues": ["<specific issue mentioning actual ticker/sector names>", ...],
  "suggestions": ["<actionable suggestion mentioning actual tickers>", ...]
}

Rules:
- score 80-100 = Excellent, 65-79 = Good, 45-64 = Fair, 0-44 = Poor
- issues: up to 5 specific problems (concentration, sector gaps, underperformers)
- suggestions: up to 5 actionable steps (with stock names where possible)
- Be specific — reference actual tickers and percentages from the data above`

async function getGroqScore(summary: string): Promise<Pick<PortfolioHealthScore, 'score' | 'grade' | 'issues' | 'suggestions'> | null> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return null
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are a financial advisor. Always respond with valid JSON only — no markdown, no code blocks.' },
        { role: 'user', content: SCORE_PROMPT(summary) },
      ],
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const text: string = data.choices?.[0]?.message?.content ?? ''
  const clean = text.replace(/```(?:json)?/gi, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) return null
  const parsed = JSON.parse(match[0])
  if (!parsed.score || !parsed.grade) return null
  return parsed
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { holdings: rawHoldings = [] } = await req.json() as { holdings: Holding[]; isDemoMode: boolean }

  // Always use the actual holdings sent from the client — never override with demo data.
  // isDemoMode only affected the old hardcoded path; the rule-based scorer handles any input correctly.
  const holdings: Holding[] = rawHoldings

  // Always compute rule-based score as baseline (uses actual portfolio data)
  const ruleScore = computeRuleBasedScore(holdings)

  // If portfolio is empty, return a clear "no holdings" response
  if (holdings.length === 0) {
    return NextResponse.json({
      score: {
        score: 50,
        grade: 'Fair' as const,
        issues: ['No holdings in your portfolio yet'],
        suggestions: [
          'Start by adding your existing stock holdings',
          'Aim for 8–12 stocks across 4–6 sectors for good diversification',
          'Consider a mix of large-cap (60%), mid-cap (30%), and small-cap (10%)',
        ],
        sector_allocation: {},
        concentration_risk: [],
      },
    })
  }

  const summary = buildSummary(holdings)

  // ── Try Claude first ────────────────────────────────────────────────────
  try {
    const responseText = await getPortfolioScore(summary)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const claudeScore = JSON.parse(jsonMatch[0]) as Pick<PortfolioHealthScore, 'score' | 'grade' | 'issues' | 'suggestions'>
      if (claudeScore.score && claudeScore.grade) {
        return NextResponse.json({
          score: {
            ...claudeScore,
            sector_allocation: ruleScore.sector_allocation,
            concentration_risk: ruleScore.concentration_risk,
          },
        })
      }
    }
  } catch { /* Claude unavailable — try Groq */ }

  // ── Try Groq second ─────────────────────────────────────────────────────
  try {
    const groqScore = await getGroqScore(summary)
    if (groqScore) {
      return NextResponse.json({
        score: {
          ...groqScore,
          sector_allocation: ruleScore.sector_allocation,
          concentration_risk: ruleScore.concentration_risk,
        },
      })
    }
  } catch { /* Groq also failed */ }

  // ── Fallback: rule-based score (always reflects actual portfolio) ────────
  return NextResponse.json({ score: ruleScore })
}
