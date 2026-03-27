import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DRISHTI — Aapka Personal Hedge Fund AI',
  description: 'Autonomous multi-agent investment intelligence for Indian retail investors. Real-time NSE analysis, chart patterns, AI-powered buy/sell verdicts — in English, Hindi, or Hinglish.',
  keywords: ['NSE', 'BSE', 'Indian stocks', 'AI investment', 'NIFTY', 'stock analysis', 'stock market India', 'portfolio tracker', 'Nifty 50', 'DRISHTI'],
  authors: [{ name: 'BharatNivesh AI' }],
  creator: 'BharatNivesh AI',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'DRISHTI — Aapka Personal Hedge Fund AI',
    description: 'AI-powered investment intelligence for Indian retail investors. NSE real-time data, chart patterns, and personalized verdicts in Hindi, Hinglish & English.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'DRISHTI by BharatNivesh AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DRISHTI — Aapka Personal Hedge Fund AI',
    description: 'Autonomous AI that analyzes Indian stocks like a hedge fund. Real-time NSE data. Hindi/Hinglish support.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#070B14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" style={{ background: '#080C14', overflow: 'hidden', height: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
