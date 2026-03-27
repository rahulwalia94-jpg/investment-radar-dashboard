import React from 'react';
import { useState } from 'react';


// ── REGIME NARRATIVE COMPONENT ────────────────────────────────
function RegimeNarrative({ regime, narrative, chains, scores, snapshot }) {
  const [expanded, setExpanded] = React.useState(false);

  const REGIME_META = {
    BULL:       { emoji: '🚀', label: 'BULL MARKET',      color: '#00d4aa', bg: 'rgba(0,212,170,.06)',  border: 'rgba(0,212,170,.2)'  },
    SOFT_BULL:  { emoji: '📈', label: 'SOFT BULL',        color: '#4f8ef7', bg: 'rgba(79,142,247,.06)', border: 'rgba(79,142,247,.2)' },
    SIDEWAYS:   { emoji: '➡️', label: 'SIDEWAYS',         color: '#ffa726', bg: 'rgba(255,167,38,.06)', border: 'rgba(255,167,38,.2)' },
    SOFT_BEAR:  { emoji: '📉', label: 'SOFT BEAR',        color: '#ff6b35', bg: 'rgba(255,107,53,.06)', border: 'rgba(255,107,53,.2)' },
    BEAR:       { emoji: '🐻', label: 'BEAR MARKET',      color: '#ff4757', bg: 'rgba(255,71,87,.06)',  border: 'rgba(255,71,87,.2)'  },
  };

  const meta = REGIME_META[regime] || REGIME_META.SIDEWAYS;

  // Parse narrative sections from markdown-style text
  const parseSections = (text) => {
    if (!text) return null;
    const sections = [];
    const parts = text.split(/\*\*(.*?)\*\*/g);
    let currentTitle = null;
    let currentBody = '';
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        // This is a bold title
        if (currentTitle) sections.push({ title: currentTitle, body: currentBody.trim() });
        currentTitle = parts[i];
        currentBody = '';
      } else {
        currentBody += parts[i];
      }
    }
    if (currentTitle) sections.push({ title: currentTitle, body: currentBody.trim() });
    return sections.length > 0 ? sections : [{ title: null, body: text }];
  };

  const sections = parseSections(narrative);

  // Evidence bullets (always shown)
  const fii = snapshot?.fii?.fii_net || 0;
  const vix = snapshot?.indices?.['INDIA VIX']?.last || 17.8;
  const nifty = snapshot?.indices?.['NIFTY 50'];
  const top3 = (scores?.top5 || []).slice(0, 3);

  const evidenceBullets = [
    { icon: fii >= 0 ? '📈' : '📉', text: `FII ${fii >= 0 ? '+' : ''}${Math.round(fii)} Cr today`, color: fii >= 0 ? '#00d4aa' : '#ff4757' },
    { icon: '😰', text: `VIX ${vix.toFixed(1)} — ${vix < 14 ? 'low fear' : vix < 18 ? 'mild caution' : vix < 22 ? 'elevated fear' : 'high fear'}`, color: vix > 20 ? '#ff4757' : vix > 16 ? '#ffa726' : '#00d4aa' },
    { icon: '🏦', text: 'All 4 CBs holding — tight global liquidity', color: '#ff4757' },
    { icon: '🛢️', text: `Brent $${snapshot?.brent?.toFixed(0) || 101} — ${(snapshot?.brent || 101) > 95 ? 'inflation risk' : 'moderate'}`, color: (snapshot?.brent || 101) > 95 ? '#ff4757' : '#ffa726' },
  ].filter(Boolean);

  return (
    <div className="regime-narrative" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
      {/* Header */}
      <div className="rn-header" onClick={() => setExpanded(!expanded)}>
        <div className="rn-badge" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
          <span className="rn-emoji">{meta.emoji}</span>
          <span className="rn-regime" style={{ color: meta.color }}>{meta.label}</span>
          <span className="rn-score" style={{ color: meta.color }}>Score {snapshot?.regime_score || 0}/5</span>
        </div>
        <div className="rn-expand" style={{ color: meta.color }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {/* Evidence bullets — always visible */}
      <div className="rn-evidence">
        {evidenceBullets.map((b, i) => (
          <div key={i} className="rn-evidence-item">
            <span>{b.icon}</span>
            <span style={{ color: b.color }}>{b.text}</span>
          </div>
        ))}
      </div>

      {/* Top picks summary */}
      {top3.length > 0 && (
        <div className="rn-top-picks">
          <span className="rn-picks-label">TODAY'S PICKS:</span>
          {top3.map(tk => (
            <span key={tk} className="rn-pick-chip" style={{ borderColor: meta.color + '44', color: meta.color }}>{tk}</span>
          ))}
        </div>
      )}

      {/* Full narrative (expandable) */}
      {expanded && narrative && (
        <div className="rn-full">
          <div className="rn-divider" style={{ borderColor: meta.border }} />
          {sections ? sections.map((s, i) => (
            <div key={i} className="rn-section">
              {s.title && <div className="rn-section-title" style={{ color: meta.color }}>{s.title}</div>}
              <div className="rn-section-body">{s.body}</div>
            </div>
          )) : (
            <div className="rn-section-body">{narrative}</div>
          )}

          {/* Active domino chains */}
          {(chains?.chains || []).length > 0 && (
            <div className="rn-chains">
              <div className="rn-chains-title" style={{ color: meta.color }}>ACTIVE DOMINO CHAINS</div>
              {(chains.chains || []).slice(0, 3).map((chain, i) => (
                <div key={i} className="rn-chain-item">
                  <div className="rn-chain-trigger">⚡ {chain.trigger}</div>
                  <div className="rn-chain-mech">{chain.mechanism}</div>
                  <div className="rn-chain-stocks">
                    {(chain.positive || []).slice(0, 2).map(p => (
                      <span key={p.stock} className="rn-stock-tag positive">+{p.stock}</span>
                    ))}
                    {(chain.negative || []).slice(0, 2).map(p => (
                      <span key={p.stock} className="rn-stock-tag negative">-{p.stock}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tap to expand hint */}
      {!expanded && (
        <div className="rn-hint" style={{ color: meta.color }}>
          Tap for full analysis + domino chains →
        </div>
      )}
    </div>
  );
}

const REGIME_COLORS = {
  BULL:       '#00d4aa',
  SOFT_BULL:  '#4f8ef7',
  SIDEWAYS:   '#ffa726',
  SOFT_BEAR:  '#ff6b35',
  BEAR:       '#ff4757',
};

export default function Dashboard({ data, onRefresh, lastRefresh }) {
  const snap     = data?.snap     || {};
  const analysis = data?.analysis || {};
  const news     = data?.news     || {};

  const nifty    = snap.indices?.['NIFTY 50'];
  const vix      = snap.indices?.['INDIA VIX'];
  const fii      = snap.fii;
  const regime   = snap.regime || 'SIDEWAYS';
  const top5     = analysis.scores?.top5 || [];
  const avoid    = analysis.scores?.avoid || [];
  const chains   = analysis.chains?.chains || [];
  const sentiment= analysis.sentiment || {};
  const portfolio= analysis.portfolioSignal || {};

  const ageMin = snap.ts
    ? Math.round((Date.now() - new Date(snap.ts).getTime()) / 60000)
    : null;

  const fmtINR = v => {
    if (!v) return '--';
    const abs = Math.abs(v);
    if (abs >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`;
    if (abs >= 100000)   return `₹${(v/100000).toFixed(1)}L`;
    if (abs >= 1000)     return `₹${(v/1000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  };

  return (
    <div className="page dashboard-page">

      {/* Data Freshness */}
      <div className="freshness-bar">
        <div className={`freshness-dot ${ageMin < 30 ? 'live' : ageMin < 120 ? 'recent' : 'stale'}`} />
        <span>{snap.label || 'Loading...'}</span>
        {ageMin !== null && <span className="freshness-age">{ageMin}min ago</span>}
      </div>

      {/* Regime Narrative — top of page */}
      <RegimeNarrative
        regime={regime}
        narrative={analysis.regimeNarrative}
        chains={chains}
        scores={analysis.scores}
        snapshot={snap}
      />

      {/* Macro Strip */}
      <div className="macro-grid">
        {[
          { label: 'NIFTY',    value: nifty?.last?.toLocaleString('en-IN') || '--',   sub: `${nifty?.pChange >= 0 ? '+' : ''}${nifty?.pChange?.toFixed(2) || '0'}%`, color: nifty?.pChange >= 0 ? '#00d4aa' : '#ff4757' },
          { label: 'VIX',      value: vix?.last?.toFixed(1) || '--',                  sub: vix?.pChange >= 0 ? '↑' : '↓',                                             color: vix?.last > 20 ? '#ff4757' : vix?.last > 16 ? '#ffa726' : '#00d4aa' },
          { label: 'FII',      value: fii ? `${fii.fii_net >= 0 ? '+' : ''}${(fii.fii_net/100).toFixed(0)}Cr` : '--', sub: fii?.fii_net >= 0 ? 'Buying' : 'Selling', color: fii?.fii_net >= 0 ? '#00d4aa' : '#ff4757' },
          { label: 'USD/INR',  value: snap.usdInr?.toFixed(2) || '--',                sub: 'Live',                                                                     color: '#ffa726' },
          { label: 'BRENT',    value: snap.brent ? `$${snap.brent.toFixed(1)}` : '--',sub: 'Oil/bbl',                                                                  color: snap.brent > 95 ? '#ff4757' : '#ffa726' },
          { label: 'REGIME',   value: regime,                                         sub: `Score: ${snap.regime_score || 0}`,                                          color: REGIME_COLORS[regime] || '#ffa726' },
        ].map(m => (
          <div key={m.label} className="macro-card">
            <div className="macro-label">{m.label}</div>
            <div className="macro-value" style={{ color: m.color }}>{m.value}</div>
            <div className="macro-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Central Banks */}
      <div className="section-card">
        <div className="section-title">⚡ Central Banks</div>
        <div className="cb-grid">
          {[
            { bank: 'RBI',  rate: '5.25%', stance: 'PAUSED',  next: 'Apr 6-8',  color: '#ffa726' },
            { bank: 'FED',  rate: '3.5-3.75%', stance: 'HOLD', next: 'May 6-7', color: '#ff4757' },
            { bank: 'ECB',  rate: '2.00%', stance: 'HOLD',   next: '--',        color: '#ff4757' },
            { bank: 'BoE',  rate: '3.75%', stance: 'HOLD',   next: '--',        color: '#ff4757' },
          ].map(cb => (
            <div key={cb.bank} className="cb-card">
              <div className="cb-bank">{cb.bank}</div>
              <div className="cb-rate">{cb.rate}</div>
              <div className="cb-stance" style={{ color: cb.color }}>{cb.stance}</div>
              {cb.next !== '--' && <div className="cb-next">Next: {cb.next}</div>}
            </div>
          ))}
        </div>
        <div className="cb-note">All 4 major CBs holding → tight global liquidity → FII headwind for India</div>
      </div>

      {/* Portfolio Signals */}
      {(portfolio.NET || portfolio.CEG || portfolio.GLNG) && (
        <div className="section-card">
          <div className="section-title">💼 Your Portfolio Signals</div>
          {['NET', 'CEG', 'GLNG'].map(tk => {
            const sig = portfolio[tk];
            if (!sig) return null;
            const curr = snap.usPrices?.[tk];
            const avgMap = { NET: 208.62, CEG: 310.43, GLNG: 50.93 };
            const avg = avgMap[tk];
            const plPct = curr ? ((curr - avg) / avg * 100).toFixed(1) : null;
            return (
              <div key={tk} className="port-signal-row">
                <div className="ps-left">
                  <div className="ps-tk">{tk}</div>
                  {curr && <div className="ps-price">${curr.toFixed(2)} {plPct && <span style={{ color: parseFloat(plPct) >= 0 ? '#00d4aa' : '#ff4757' }}>({plPct >= 0 ? '+' : ''}{plPct}%)</span>}</div>}
                </div>
                <div className="ps-right">
                  <div className={`ps-action action-${sig.action?.toLowerCase()}`}>{sig.action}</div>
                  <div className="ps-reason">{sig.reason}</div>
                  {sig.stop_loss && <div className="ps-stop">Stop: ${sig.stop_loss}</div>}
                </div>
              </div>
            );
          })}
          {portfolio.coherence && <div className="coherence-note">{portfolio.coherence}</div>}
        </div>
      )}

      {/* Top Opportunities */}
      {top5.length > 0 && (
        <div className="section-card">
          <div className="section-title">🎯 Top 5 Today</div>
          <div className="top5-list">
            {top5.map((tk, i) => {
              const s = analysis.scores?.scores?.[tk];
              const sent = sentiment.sentiment?.[tk];
              return (
                <div key={tk} className="top5-item">
                  <div className="top5-rank">#{i + 1}</div>
                  <div className="top5-info">
                    <div className="top5-tk">{tk}</div>
                    {s?.reason && <div className="top5-reason">{s.reason}</div>}
                  </div>
                  <div className="top5-score" style={{ color: s?.score >= 80 ? '#00d4aa' : '#ffa726' }}>
                    {s?.score || '--'}/100
                  </div>
                </div>
              );
            })}
          </div>
          {avoid.length > 0 && (
            <div className="avoid-row">
              <span className="avoid-label">AVOID: </span>
              {avoid.map(a => <span key={a} className="avoid-chip">{a}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Active Domino Chains */}
      {chains.length > 0 && (
        <div className="section-card">
          <div className="section-title">🔗 Active Domino Chains</div>
          {chains.slice(0, 2).map((chain, i) => (
            <div key={i} className="chain-card">
              <div className="chain-header">
                <span className="chain-severity">{'⚡'.repeat(Math.min(chain.severity, 5))}</span>
                <span className="chain-trigger">{chain.trigger}</span>
              </div>
              <div className="chain-mechanism">{chain.mechanism}</div>
              <div className="chain-effects">
                {(chain.positive || []).slice(0, 3).map(p => (
                  <div key={p.stock} className="chain-effect positive">
                    <span className="ce-stock">{p.stock}</span>
                    <span className="ce-reason">{p.reason}</span>
                    <span className="ce-adj positive">+{p.adj}</span>
                  </div>
                ))}
                {(chain.negative || []).slice(0, 2).map(p => (
                  <div key={p.stock} className="chain-effect negative">
                    <span className="ce-stock">{p.stock}</span>
                    <span className="ce-reason">{p.reason}</span>
                    <span className="ce-adj negative">{p.adj}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market News */}
      {(news.market || []).length > 0 && (
        <div className="section-card">
          <div className="section-title">📰 Market News</div>
          {(news.market || []).slice(0, 6).map((item, i) => (
            <div key={i} className="news-item">
              <div className="news-dot">→</div>
              <div className="news-title">{item.title}</div>
            </div>
          ))}
        </div>
      )}

      {/* NSE Movers */}
      {snap.gainers?.length > 0 && (
        <div className="section-card">
          <div className="section-title">📈 NSE 500 Movers Today</div>
          <div className="movers-grid">
            <div className="movers-col">
              <div className="movers-header gainers">TOP GAINERS</div>
              {snap.gainers.slice(0, 5).map(s => (
                <div key={s.symbol} className="mover-row">
                  <span className="mover-sym">{s.symbol}</span>
                  <span className="mover-chg gainers">+{parseFloat(s.pChange).toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <div className="movers-col">
              <div className="movers-header losers">TOP LOSERS</div>
              {snap.losers.slice(0, 5).map(s => (
                <div key={s.symbol} className="mover-row">
                  <span className="mover-sym">{s.symbol}</span>
                  <span className="mover-chg losers">{parseFloat(s.pChange).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
