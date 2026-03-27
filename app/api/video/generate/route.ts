import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

const GROQ_KEY = () => process.env.GROQ_API_KEY ?? ''

// Demo market data with realistic Indian market values
function getDemoMarketData() {
  return {
    indices: [
      { name: 'NIFTY 50', value: 24836, change_pct: -0.42 },
      { name: 'SENSEX', value: 81521, change_pct: -0.38 },
      { name: 'BANK NIFTY', value: 52184, change_pct: -0.71 },
      { name: 'NIFTY IT', value: 34587, change_pct: +0.69 },
    ],
    gainers: [
      { ticker: 'SUNPHARMA', change_pct: 5.2 },
      { ticker: 'ZOMATO', change_pct: 4.8 },
      { ticker: 'INFY', change_pct: 3.4 },
    ],
    losers: [
      { ticker: 'COALINDIA', change_pct: -2.4 },
      { ticker: 'ONGC', change_pct: -1.9 },
      { ticker: 'NTPC', change_pct: -1.5 },
    ],
    fii_net: 3140,
    dii_net: -620,
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  }
}

function getDemoSectorData() {
  // 5 days of sector performance data
  return [
    { name: 'IT',      days: [-0.3, 1.2, 0.8, -0.5, 1.4],  color: '#3B8BEB' },
    { name: 'Banking', days: [-1.1, 0.4, -0.7, 0.9, -0.8],  color: '#FFB800' },
    { name: 'Pharma',  days: [1.5, 0.9, 1.1, 2.3, 1.8],     color: '#00D4AA' },
    { name: 'Auto',    days: [0.6, -0.3, 0.9, 1.2, 0.7],    color: '#FF6B35' },
    { name: 'FMCG',   days: [0.2, 0.5, -0.1, 0.8, 0.3],    color: '#A78BFA' },
    { name: 'Realty',  days: [-0.8, 1.4, 0.6, -1.2, 0.9],   color: '#F472B6' },
    { name: 'Metal',   days: [-1.3, -0.6, 1.8, -0.4, 1.1],  color: '#FB923C' },
    { name: 'Energy',  days: [0.4, -0.8, -0.3, 0.6, -0.5],  color: '#34D399' },
  ]
}

function getDemoIPOData() {
  return [
    { company: 'Hexaware Technologies', issueSize: '8,750 Cr', priceBand: '674-708', gmp: 45, subscription: 2.8, status: 'open', sector: 'IT' },
    { company: 'Dr Agarwals Eye Hospital', issueSize: '3,027 Cr', priceBand: '382-402', gmp: 28, subscription: 15.3, status: 'closed', sector: 'Healthcare' },
    { company: 'Aegis Vopak Terminals', issueSize: '2,800 Cr', priceBand: '223-235', gmp: 12, subscription: 0.7, status: 'open', sector: 'Infrastructure' },
    { company: 'Ather Energy', issueSize: '2,626 Cr', priceBand: '304-321', gmp: 67, subscription: 42.1, status: 'listed', sector: 'EV' },
    { company: 'NSDL', issueSize: '4,500 Cr', priceBand: 'TBA', gmp: 0, subscription: 0, status: 'upcoming', sector: 'Financial Services' },
  ]
}

async function generateScript(type: string, marketData: ReturnType<typeof getDemoMarketData>): Promise<string> {
  const groqKey = GROQ_KEY()
  if (!groqKey) return getDefaultScript(type, marketData)

  const nifty = marketData.indices[0]
  const sensex = marketData.indices[1]
  const topGainer = marketData.gainers[0]
  const topLoser = marketData.losers[0]

  const dataContext = `NIFTY 50: ${nifty.value} (${nifty.change_pct > 0 ? '+' : ''}${nifty.change_pct}%), SENSEX: ${sensex.value} (${sensex.change_pct > 0 ? '+' : ''}${sensex.change_pct}%), Top Gainer: ${topGainer.ticker} +${topGainer.change_pct}%, Top Loser: ${topLoser.ticker} ${topLoser.change_pct}%, FII: ${marketData.fii_net > 0 ? '+' : ''}₹${marketData.fii_net} Cr, DII: ${marketData.dii_net > 0 ? '+' : ''}₹${marketData.dii_net} Cr`

  const prompts: Record<string, string> = {
    market_wrap: `You are writing a 45-second market update script for Indian retail investors. Use Hinglish. Be energetic but factual.
Data: ${dataContext}
Write a voiceover script with timestamps:
[0-8s]: Intro - greet viewers, date
[8-20s]: Index performance - NIFTY and SENSEX numbers
[20-32s]: Top movers - best gainer and loser
[32-42s]: FII/DII summary - institutional flows
[42-45s]: Outro - "Powered by DRISHTI AI"
Keep it punchy. Max 80 words total. Each section on new line with timestamp.`,
    race_chart: `Write a 30-second energetic commentary for a sector race chart animation showing IT, Banking, Pharma, Auto, FMCG, Realty, Metal, Energy sectors over 5 days. Data: ${dataContext}. Hinglish, max 50 words, include which sector is winning.`,
    fii_dii: `Write a 30-second commentary on FII and DII institutional flows. FII: ₹${marketData.fii_net} Cr, DII: ₹${marketData.dii_net} Cr. Explain what this means for retail investors. Hinglish, max 50 words.`,
    ipo_tracker: `Write a 45-second IPO tracker commentary covering recent hot IPOs in Indian market. Mention subscription levels and GMP. Hinglish, energetic, max 70 words.`,
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompts[type] ?? prompts.market_wrap }],
        max_tokens: 300,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? getDefaultScript(type, marketData)
    }
  } catch { /* fall through */ }

  return getDefaultScript(type, marketData)
}

function getDefaultScript(type: string, marketData: ReturnType<typeof getDemoMarketData>): string {
  const nifty = marketData.indices[0]
  const scripts: Record<string, string> = {
    market_wrap: `[0-8s]: Namaskar! Aaj ${marketData.date} ke market update mein aapka swagat hai. Main hoon DRISHTI AI.\n\n[8-20s]: NIFTY 50 aaj ${nifty.value.toLocaleString('en-IN')} pe band hua, ${nifty.change_pct > 0 ? 'upar' : 'neeche'} ${Math.abs(nifty.change_pct)}%. SENSEX bhi isi trend mein raha.\n\n[20-32s]: ${marketData.gainers[0].ticker} aaj ka star raha +${marketData.gainers[0].change_pct}% ke saath. ${marketData.losers[0].ticker} mein bikawal pressure dikh raha tha.\n\n[32-42s]: FII ne ₹${marketData.fii_net} Crore ${marketData.fii_net > 0 ? 'kharida' : 'becha'}. DII ne ₹${Math.abs(marketData.dii_net)} Crore ${marketData.dii_net > 0 ? 'kharida' : 'becha'}.\n\n[42-45s]: Yeh tha aaj ka market wrap. Powered by DRISHTI AI — Aapka Personal Hedge Fund AI!`,
    race_chart: `Sector race chart mein aaj Pharma sector lead kar raha hai! IT close second pe hai. Banking sector pressure mein hai. Dekho kaun jeeta — 5 din ki race mein! DRISHTI AI ke saath market samjho.`,
    fii_dii: `FII ne aaj ₹${marketData.fii_net} Crore ${marketData.fii_net > 0 ? 'kharida' : 'becha'}. Iska matlab foreigners ${marketData.fii_net > 0 ? 'bullish' : 'bearish'} hain Indian market pe. DII ne ₹${Math.abs(marketData.dii_net)} Crore ${marketData.dii_net > 0 ? 'dala' : 'nikala'}. Institutional flows aapko market ka direction batate hain.`,
    ipo_tracker: `IPO market mein bahut excitement hai! Ather Energy 42x subscribe hua. Dr Agarwals Eye Hospital bhi strong subscription mila. Aane waale IPOs pe nazar rakho — NSDL listing ka wait hai. DRISHTI AI ke saath smart investment decisions lo!`,
  }
  return scripts[type] ?? scripts.market_wrap
}

export async function POST(req: NextRequest) {
  try {
    const { type = 'market_wrap' } = await req.json()

    const marketData = getDemoMarketData()
    const sectorData = getDemoSectorData()
    const ipoData = getDemoIPOData()
    const script = await generateScript(type, marketData)

    return NextResponse.json({
      script,
      marketData,
      sectorData,
      ipoData,
      generatedAt: Date.now(),
    })
  } catch (_err) {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
