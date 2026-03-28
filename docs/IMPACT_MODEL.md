# DRISHTI — Impact Model

**Quantified Business Impact Estimate**  
*ET Gen AI Hackathon 2025*

---

## The Problem We're Solving

India has **~110 million active retail investors** (NSE, 2024). The vast majority make investment decisions based on:
- WhatsApp forwards and social media tips
- News headlines without context
- Brokers with inherent conflicts of interest
- Expensive SEBI-registered advisors (₹15,000–₹50,000/year) they can't afford

The result: retail investors consistently **underperform the index by 3–7% annually** (SEBI Investor Survey 2023).

---

## Impact Model

### Assumption 1 — Addressable Market

| Segment | Count | Basis |
|---------|-------|-------|
| Active NSE/BSE retail investors | 110 million | NSE Annual Report 2024 |
| Digitally active (smartphone + demat) | 60 million | CDSL/NSDL data |
| Willing to use AI investment tools | 12 million | 20% of digital-active (conservative) |
| **DRISHTI reachable TAM (Year 1)** | **500,000** | 4% of AI-willing segment |

---

### Impact 1 — Time Saved Per Investor

**Current state:** Manual research before each trade
- Reading 3–5 news articles: 25 minutes
- Checking charts manually: 15 minutes
- Looking up fundamentals: 10 minutes
- Comparing with portfolio: 10 minutes
- **Total: ~60 minutes per research session**

**With DRISHTI:**
- Full 4-step analysis: **45–90 seconds**
- Time saved per session: **~58 minutes**

**Calculation:**
```
Active investors using DRISHTI:     500,000
Research sessions per month:        8 (2 per week)
Time saved per session:             58 minutes
Total time saved per month:         500,000 × 8 × 58 min
                                  = 232,000,000 minutes
                                  = 3.87 million hours/month

At average Indian knowledge worker rate (₹500/hr):
Monthly time value saved:           ₹1,933 Crore
Annual time value saved:            ₹23,200 Crore (~$2.8 Billion)
```

---

### Impact 2 — Investment Return Improvement

**Assumption:** DRISHTI's 4-step analysis (signals + technicals + fundamentals + portfolio fit) helps users avoid 1–2 bad trades per quarter and catch 1 good opportunity they'd have missed.

Conservative estimate: **+1.5% annual return improvement** vs unassisted retail investor

```
Average retail portfolio size (India):   ₹3,50,000 (SEBI Survey 2023)
Return improvement:                       +1.5% per year
Gain per investor per year:              ₹5,250

Active DRISHTI users (Year 1):           500,000
Total incremental wealth created:        500,000 × ₹5,250
                                        = ₹2,625 Crore per year

At 500K users → ₹2,625 Cr additional wealth for Indian retail investors annually
At 5M users  → ₹26,250 Cr additional wealth
```

---

### Impact 3 — Cost Reduction vs Traditional Advisory

| Advisory Type | Annual Cost | DRISHTI Equivalent |
|--------------|-------------|-------------------|
| SEBI RIA (Registered Advisor) | ₹15,000–₹50,000 | ₹0 (Groq free tier covers ~2,000 queries/day) |
| Premium stock screener (Tickertape Pro) | ₹4,999/yr | ₹0 |
| Research reports (Motilal, ICICI Direct) | ₹10,000–₹25,000/yr | ₹0 |
| **Total saved per investor** | **₹25,000–₹75,000/yr** | **₹0** |

```
Users saving advisory costs:     500,000
Average advisory cost saved:     ₹15,000/year (conservative — free screener tier)
Total cost saved:                500,000 × ₹15,000 = ₹7,500 Crore/year
```

---

### Impact 4 — API Cost (Running DRISHTI)

**Cost per analysis (Claude + Groq):**
```
Claude Sonnet (4-agent loop):
  Input:  ~2,000 tokens × $3/M  = $0.006
  Output: ~1,000 tokens × $15/M = $0.015
  Total per deep analysis:        $0.021 (~₹1.75)

Groq (intent extraction + fallbacks):
  ~500 tokens × $0.05/M = $0.000025 (~₹0.002)

Cost per full analysis:           ~₹1.75
Cost per month (8 queries/user):  ~₹14/user/month
Cost per year:                    ~₹168/user/year

vs. what users currently pay:     ₹15,000–₹75,000/year
Cost reduction ratio:             89x–446x cheaper
```

---

### Impact 5 — Revenue Model (SaaS Path)

```
Freemium tier (Groq only — no Claude):  Free
Pro tier (Claude deep analysis):         ₹299/month (~$3.60)

Conversion assumption: 5% of users upgrade to Pro

500,000 users × 5% = 25,000 Pro users
Monthly revenue:    25,000 × ₹299 = ₹74.75 Lakh
Annual revenue:     ₹8.97 Crore

At 5M users (3-year target):
Pro users:          250,000
Annual revenue:     ₹89.7 Crore (~$10.8M ARR)
```

---

## Summary Table

| Metric | Value | Basis |
|--------|-------|-------|
| Time saved per user/month | 7.7 hours | 8 sessions × 58 min |
| Time value saved (500K users) | ₹23,200 Cr/year | @ ₹500/hr |
| Incremental investment returns | ₹2,625 Cr/year | +1.5% on ₹3.5L avg portfolio |
| Advisory cost saved per user | ₹15,000–₹75,000/year | vs SEBI RIA / premium tools |
| Cost to run per user | ₹168/year | Claude + Groq API |
| Cost reduction vs traditional | **89x–446x cheaper** | |
| Year 1 revenue potential | ₹8.97 Crore | 5% Pro conversion |
| 3-year revenue potential | ₹89.7 Crore | 5M users, 5% Pro |

---

## Key Assumptions & Risks

| Assumption | Value | Risk if Wrong |
|-----------|-------|---------------|
| 20% of digital investors want AI tools | Conservative | If 10%: halve all numbers |
| DRISHTI captures 4% of AI-willing TAM | Conservative | Depends on distribution |
| +1.5% return improvement | Conservative (SEBI shows 3-7% underperformance gap) | Hard to attribute causally |
| 8 research sessions/month | Moderate | Power users may do 20+, casual 2-3 |
| 5% Pro conversion | Industry SaaS benchmark | Could be lower initially |
| Claude API pricing stable | Based on current pricing | Anthropic may change pricing |

---

## The Real Impact — Beyond Numbers

**Financial inclusion:** 76% of Indian retail investors are in Tier-2/3 cities (NSE, 2024). They cannot access ₹50,000/year advisors. DRISHTI gives them the same quality of analysis — in Hindi, Hinglish, or English — for free.

**Democratization:** The same multi-step analysis that a hedge fund analyst does manually in 2 hours, DRISHTI does in 90 seconds for anyone with a smartphone.

**Behavior change:** By showing *why* before showing *what* (the 4-step DETECT → ENRICH → PERSONALIZE → RECOMMEND workflow), DRISHTI trains investors to think analytically rather than react emotionally to tips.

**Proactive intelligence:** Most retail investors only find out about management guidance cuts or SEBI circulars days later — via news, or worse, after their broker mentions it. DRISHTI's Opportunity Radar surfaces:
- **Management Commentary signals** (🗣️) — AI monitors earnings call language for guidance cuts, margin warnings, and expansion announcements across top Nifty 50 stocks
- **SEBI Regulatory Alerts** (⚖️) — Automatically fetches the latest SEBI circulars and notifies users of regulatory changes that may impact their holdings

This closes the information gap between retail investors and institutional participants who have dedicated research teams watching these same signals daily.

---

*Numbers are back-of-envelope estimates. Sources: NSE Annual Report 2024, SEBI Investor Survey 2023, CDSL/NSDL demat account data, Anthropic/Groq public API pricing (March 2026).*
