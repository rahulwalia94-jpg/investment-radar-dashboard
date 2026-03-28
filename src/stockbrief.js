// ── 7-LEVEL DEEP STOCK BRIEF ──────────────────────────────────
// Generates a full analyst brief for any stock
// Layman-friendly. 7 levels of why.

const API_URL = 'https://api.anthropic.com/v1/messages';

export async function generateStockBrief({ symbol, scoreData, snap, onChunk }) {
  const regime  = snap?.regime || 'SIDEWAYS';
  const fii     = snap?.fii?.fii_net || 0;
  const vix     = snap?.indices?.['INDIA VIX']?.last || 0;
  const usdInr  = snap?.usdInr || 86;
  const cal     = scoreData?.calibration || {};
  const bR      = cal.base_returns?.[regime];
  const sigma   = cal.sigma?.[regime];
  const isUS    = ['NET','CEG','GLNG','NVDA','MSFT','AAPL','GOOGL'].includes(symbol);
  const price   = isUS ? snap?.usPrices?.[symbol] : scoreData?.last_price;
  const avgs    = { NET: 208.62, CEG: 310.43, GLNG: 50.93 };
  const avgCost = avgs[symbol];
  const plPct   = avgCost && price ? ((price - avgCost) / avgCost * 100).toFixed(1) : null;
  const chains  = snap?.dominoChains || [];
  const chainHit = chains.find(c =>
    (c.positive || []).some(p => p.stock === symbol) ||
    (c.negative || []).some(p => p.stock === symbol)
  );

  const context = `
STOCK: ${symbol}
Exchange: ${isUS ? 'NASDAQ/NYSE' : 'NSE India'}
Sector: ${scoreData?.sector || 'Unknown'}
Score: ${scoreData?.score || '--'}/100
Signal: ${scoreData?.signal || 'NEUTRAL'}
Current price: ${isUS ? '$' : '₹'}${price || '--'}
${avgCost ? `Your avg cost: ${isUS ? '$' : '₹'}${avgCost} | P&L: ${plPct}%` : ''}
Expected return in ${regime}: ${bR !== undefined ? `${bR >= 0 ? '+' : ''}${bR}%` : 'unknown'}
Annual volatility: ${sigma ? `${(sigma * 100).toFixed(0)}%` : 'unknown'}
Calibration source: ${cal.source || 'fallback'}
Score reason: ${scoreData?.reason || 'Not available'}

MARKET CONTEXT:
Regime: ${regime} (Score ${snap?.regime_score || 0}/5)
FII today: ${fii >= 0 ? '+' : ''}${Math.round(fii)} Cr (${fii < 0 ? 'institutions selling' : 'institutions buying'})
India VIX: ${vix?.toFixed(1) || '--'} (${vix > 20 ? 'elevated fear' : 'calm'})
USD/INR: ${usdInr?.toFixed(2) || '--'}
${chainHit ? `Domino chain impact: ${chainHit.trigger} — ${symbol} is ${chainHit.positive?.some(p=>p.stock===symbol) ? 'positively' : 'negatively'} impacted` : ''}
  `.trim();

  const prompt = `You are a world-class investment analyst explaining ${symbol} to someone who knows NOTHING about investing. 
  
Give a 7-level analysis. Be specific with numbers. Be direct. Use plain English. Make the person feel like they just got a private briefing from Goldman Sachs.

Structure your response EXACTLY like this (use these exact headings):

WHAT IS THIS
[One paragraph. What does this company actually do in plain English. Where is it listed. How big is it. Why does it exist in the world.]

WHY THIS SCORE TODAY
[Specific factors driving the score of ${scoreData?.score || '--'}/100 right now. Not generic. Use the actual data.]

REGIME IMPACT
[The current ${regime} regime — what specifically does it mean for THIS stock. Not for stocks in general. For THIS one.]

MACRO FORCES AT WORK
[FII flow, central bank stance, currency move, oil price, global macro — which of these are hitting this stock right now and HOW. Connect the dots.]

THE REAL RISK
[One specific thing that could go wrong. Not boilerplate. The actual threat to this stock's value right now.]

WIN PROBABILITY
[Expected return, volatility, win probability in plain English. If someone invests ₹1 lakh today, what is the realistic range of outcomes in 3 months.]

BOTTOM LINE
[One sentence. Decisive. What should a layman do RIGHT NOW. No hedging. No "consult your advisor".]

Context data: ${context}`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.[0]?.text || '';

  // Parse sections
  const sections = parseSections(text);
  onChunk?.(sections);
  return { text, sections };
}

function parseSections(text) {
  const headings = [
    'WHAT IS THIS',
    'WHY THIS SCORE TODAY',
    'REGIME IMPACT',
    'MACRO FORCES AT WORK',
    'THE REAL RISK',
    'WIN PROBABILITY',
    'BOTTOM LINE',
  ];

  const sections = {};
  headings.forEach((h, i) => {
    const start = text.indexOf(h);
    if (start === -1) return;
    const contentStart = start + h.length;
    const nextHeading = headings.slice(i + 1).map(nh => text.indexOf(nh, contentStart)).filter(p => p > 0);
    const end = nextHeading.length > 0 ? Math.min(...nextHeading) : text.length;
    sections[h] = text.slice(contentStart, end).replace(/^\s*\n/, '').trim();
  });

  return sections;
}

// Build the spoken version — natural, not robotic
export function buildSpokenBrief(symbol, sections) {
  const parts = [];

  if (sections['WHAT IS THIS'])
    parts.push(sections['WHAT IS THIS']);

  if (sections['WHY THIS SCORE TODAY'])
    parts.push(sections['WHY THIS SCORE TODAY']);

  if (sections['REGIME IMPACT'])
    parts.push(sections['REGIME IMPACT']);

  if (sections['MACRO FORCES AT WORK'])
    parts.push(sections['MACRO FORCES AT WORK']);

  if (sections['THE REAL RISK'])
    parts.push('Now, the risk. ' + sections['THE REAL RISK']);

  if (sections['WIN PROBABILITY'])
    parts.push(sections['WIN PROBABILITY']);

  if (sections['BOTTOM LINE'])
    parts.push('Bottom line. ' + sections['BOTTOM LINE']);

  return parts.join(' ');
}
