// Shared NSE ticker list — used for search, validation, and autocomplete

export const NSE_TICKERS: readonly string[] = [
  // Nifty 50
  'RELIANCE','HDFCBANK','TCS','INFY','ICICIBANK','HINDUNILVR','ITC','KOTAKBANK',
  'SBIN','BHARTIARTL','BAJFINANCE','ASIANPAINT','MARUTI','AXISBANK','LT',
  'TITAN','SUNPHARMA','NESTLEIND','ULTRACEMCO','WIPRO','TECHM','HCLTECH',
  'TATAMOTORS','BAJAJFINSV','POWERGRID','JSWSTEEL','NTPC','ONGC','COALINDIA',
  'GRASIM','M_M','HEROMOTOCO','HINDALCO','ADANIENT','ADANIPORTS','TATACONSUM',
  'APOLLOHOSP','DIVISLAB','DRREDDY','CIPLA','EICHERMOT','INDUSINDBK','VEDL',
  'TATASTEEL','SBILIFE','HDFCLIFE','BPCL','SHREECEM','UPL','BRITANNIA',
  // Nifty Next 50 & popular mid-caps
  'ZOMATO','NYKAA','PAYTM','POLICYBZR','IRCTC','DMART','PIDILITIND',
  'TORNTPHARM','AMBUJACEM','ACC','GODREJCP','MUTHOOTFIN','CHOLAFIN',
  'SIEMENS','ABB','HAVELLS','VOLTAS','WHIRLPOOL','BLUEDART','CONCOR',
  'BANKBARODA','FEDERALBNK','IDFCFIRSTB','PNB','CANARABANK',
  'TATAPOWER','ADANIGREEN','ADANITRANS','ADANIWILMAR',
  'JUBLFOOD','WESTLIFE','DEVYANI',
  'PERSISTENT','COFORGE','MPHASIS','LTTS','KPIT','TATAELXSI',
  'MANKIND','TORNTPOWER','CESC',
  'SBICARD','SHRIRAMFIN','PEL','CHOLAFIN',
  'NAUKRI','ZEEL','SUNTVNETWORK','PVRINOX',
  'POLYCAB','APLAPOLLO','KFINTECH','CAMS',
  'LAURUSLABS','ALKEM','IPCALAB','GLENMARK',
  'BALKRISIND','APOLLOTYRE','EXIDEIND','MINDA',
  'SUPREMEIND','ASTRAL','VGUARD','CROMPTON',
  'AAVAS','HOMEFIRST','CAN_FIN','REPCO',
  'LICI','BSE','CDSL','MCX',
  'DELHIVERY','MAPMYINDIA','LATENTVIEW','HAPPYMINDS',
  'ROUTE','NAZARA','EASEMYTRIP','IXIGO',
  'MCDOWELL_N','RADICO','GLOBUSSPI',
  'GAIL','IGL','MGL','PETRONET',
  'POWERGRID','NHPC','SJVN','IREDA',
  'RECLTD','PFC','IRFC','HUDCO',
  'INDIGO','SPICEJET','BLUEDART',
  'MOTHERSON','BOSCHLTD','BHARATFORG','CRAFTSMAN',
  // Indices (for market reference)
  'NIFTY50','BANKNIFTY','NIFTYMIDCAP','CNXIT',
] as const

// Set for O(1) lookup
const NSE_TICKER_SET = new Set<string>(NSE_TICKERS)

/**
 * Check if a ticker is a known valid NSE symbol.
 */
export function isValidNSETicker(ticker: string): boolean {
  return NSE_TICKER_SET.has(ticker.trim().toUpperCase())
}

/**
 * Search tickers — starts-with first, then contains. Returns up to `limit` results.
 */
export function searchNSETickers(query: string, limit = 8): string[] {
  const upper = query.trim().toUpperCase()
  if (!upper) return []
  return [...NSE_TICKERS]
    .filter(t => t.includes(upper))
    .sort((a, b) => {
      const aStarts = a.startsWith(upper) ? 0 : 1
      const bStarts = b.startsWith(upper) ? 0 : 1
      return aStarts - bStarts || a.localeCompare(b)
    })
    .slice(0, limit)
}
