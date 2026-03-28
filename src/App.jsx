import { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'https://investment-radar-backend.onrender.com';

const REGIME_META = {
  BULL:      { emoji: '🚀', label: 'BULL',      color: '#00d4aa', bg: 'rgba(0,212,170,0.08)'  },
  SOFT_BULL: { emoji: '📈', label: 'SOFT BULL', color: '#4f8ef7', bg: 'rgba(79,142,247,0.08)' },
  SIDEWAYS:  { emoji: '➡️', label: 'SIDEWAYS',  color: '#ffa726', bg: 'rgba(255,167,38,0.08)' },
  SOFT_BEAR: { emoji: '📉', label: 'SOFT BEAR', color: '#ff6b35', bg: 'rgba(255,107,53,0.08)' },
  BEAR:      { emoji: '🐻', label: 'BEAR',      color: '#ff4757', bg: 'rgba(255,71,87,0.08)'  },
};

function useData() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/snapshot`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setData(d);
      setLastRefresh(new Date());
      setError(null);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, lastRefresh, error, refresh: fetch_ };
}

// ── SHARED COMPONENTS ─────────────────────────────────────────
function Pill({ color, children, small }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: small ? '2px 6px' : '3px 8px',
      borderRadius: 5,
      fontSize: small ? 9 : 10,
      fontFamily: 'monospace',
      fontWeight: 700,
      border: `1px solid ${color}44`,
      background: `${color}15`,
      color,
    }}>{children}</span>
  );
}

function ScoreBar({ score }) {
  const color = score >= 75 ? '#00d4aa' : score >= 60 ? '#4f8ef7' : score >= 45 ? '#ffa726' : '#ff4757';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#141c2e', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2,
          transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color, minWidth: 28 }}>
        {score}
      </span>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#0c1120',
      border: '1px solid #141c2e',
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 10,
      ...style,
    }}>{children}</div>
  );
}

function SectionTitle({ children, color = '#4f8ef7' }) {
  return (
    <div style={{
      fontSize: 9, fontFamily: 'monospace', letterSpacing: 2,
      color, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase',
    }}>{children}</div>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────────
function DashboardTab({ data }) {
  const snap     = data?.snap     || {};
  const analysis = data?.analysis || {};
  const regime   = snap.regime || 'SIDEWAYS';
  const meta     = REGIME_META[regime] || REGIME_META.SIDEWAYS;
  const scores   = analysis.scores?.scores || {};
  const top5     = analysis.scores?.top5   || [];
  const fii      = snap.fii?.fii_net || 0;
  const nifty    = snap.indices?.['NIFTY 50'];
  const vix      = snap.indices?.['INDIA VIX'];
  const narrative= analysis.regimeNarrative || '';
  const [expanded, setExpanded] = useState(false);

  const ageMin = snap.ts
    ? Math.round((Date.now() - new Date(snap.ts).getTime()) / 60000) : null;

  return (
    <div style={{ padding: '0 14px 80px' }}>

      {/* Data freshness */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 8px',
        fontSize: 10, fontFamily: 'monospace', color: '#7a90b8' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%',
          background: ageMin < 30 ? '#00d4aa' : ageMin < 120 ? '#ffa726' : '#ff4757',
          boxShadow: `0 0 6px ${ageMin < 30 ? '#00d4aa' : '#ffa726'}` }} />
        <span>{snap.label || 'Loading...'}</span>
        {ageMin !== null && <span style={{ color: '#3a4d6e' }}>· {ageMin}m ago</span>}
        <span style={{ marginLeft: 'auto', color: '#3a4d6e' }}>
          {snap.model === 'python-quant-v1' ? '⚡ Quant' : '🤖 AI'}
        </span>
      </div>

      {/* Regime Banner */}
      <div style={{ background: meta.bg, border: `1px solid ${meta.color}33`,
        borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          onClick={() => setExpanded(!expanded)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{meta.emoji}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: meta.color,
                fontFamily: 'monospace', letterSpacing: 1 }}>{meta.label}</div>
              <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#7a90b8', marginTop: 2 }}>
                Score {snap.regime_score || 0}/5 · Tap for analysis
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: meta.color }}>{expanded ? '▲' : '▼'}</div>
        </div>

        {/* Evidence bullets */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {[
            { icon: fii >= 0 ? '📈' : '📉', text: `FII ${fii >= 0 ? '+' : ''}${Math.round(fii)}Cr`,
              color: fii >= 0 ? '#00d4aa' : '#ff4757' },
            { icon: '😰', text: `VIX ${vix?.last?.toFixed(1) || '--'}`,
              color: (vix?.last || 17) > 20 ? '#ff4757' : '#ffa726' },
            { icon: '🛢️', text: `Brent $${snap.brent?.toFixed(0) || '--'}`,
              color: (snap.brent || 85) > 95 ? '#ff4757' : '#ffa726' },
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5,
              background: '#05081044', borderRadius: 8, padding: '4px 8px',
              fontSize: 10, fontFamily: 'monospace' }}>
              <span>{b.icon}</span>
              <span style={{ color: b.color }}>{b.text}</span>
            </div>
          ))}
        </div>

        {/* Full narrative */}
        {expanded && narrative && (
          <div style={{ marginTop: 12, paddingTop: 12,
            borderTop: `1px solid ${meta.color}22`,
            fontSize: 11, color: '#a0b4d0', lineHeight: 1.7, fontFamily: 'monospace' }}>
            {narrative}
          </div>
        )}
      </div>

      {/* Macro Grid */}
      <Card>
        <SectionTitle>Market Snapshot</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { l: 'NIFTY 50',  v: nifty?.last?.toLocaleString('en-IN') || '--',
              sub: `${nifty?.pChange >= 0 ? '+' : ''}${nifty?.pChange?.toFixed(2) || 0}%`,
              color: (nifty?.pChange || 0) >= 0 ? '#00d4aa' : '#ff4757' },
            { l: 'INDIA VIX', v: vix?.last?.toFixed(1) || '--',
              sub: (vix?.last || 0) > 20 ? 'HIGH FEAR' : 'CALM',
              color: (vix?.last || 0) > 20 ? '#ff4757' : '#00d4aa' },
            { l: 'FII FLOW',  v: `${fii >= 0 ? '+' : ''}${(fii/100).toFixed(0)}Cr`,
              sub: fii >= 0 ? 'BUYING' : 'SELLING',
              color: fii >= 0 ? '#00d4aa' : '#ff4757' },
            { l: 'USD/INR',   v: snap.usdInr?.toFixed(2) || '--', sub: 'LIVE', color: '#ffa726' },
            { l: 'BRENT',     v: snap.brent ? `$${snap.brent.toFixed(1)}` : '--',
              sub: (snap.brent || 0) > 95 ? 'RISK↑' : 'OK',
              color: (snap.brent || 0) > 95 ? '#ff4757' : '#ffa726' },
            { l: 'REGIME',    v: regime, sub: `Score ${snap.regime_score || 0}`,
              color: meta.color },
          ].map(m => (
            <div key={m.l} style={{ background: '#080c18', borderRadius: 10,
              padding: '10px 10px 8px', border: '1px solid #141c2e' }}>
              <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#3a4d6e',
                letterSpacing: 1, marginBottom: 4 }}>{m.l}</div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace',
                color: m.color, lineHeight: 1 }}>{m.v}</div>
              <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#7a90b8',
                marginTop: 3 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top 5 Picks */}
      {top5.length > 0 && (
        <Card>
          <SectionTitle color="#00d4aa">🎯 Today's Top Picks</SectionTitle>
          {top5.map((tk, i) => {
            const s = scores[tk] || {};
            const color = s.score >= 75 ? '#00d4aa' : s.score >= 60 ? '#4f8ef7' : '#ffa726';
            return (
              <div key={tk} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0', borderBottom: i < top5.length - 1 ? '1px solid #141c2e' : 'none' }}>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#3a4d6e',
                  width: 20, flexShrink: 0 }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#e8f0fe' }}>{tk}</div>
                  {s.reason && <div style={{ fontSize: 9, fontFamily: 'monospace',
                    color: '#7a90b8', marginTop: 2, lineHeight: 1.4 }}>{s.reason}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace',
                    color }}>{s.score || '--'}</div>
                  <div style={{ fontSize: 8, color: '#3a4d6e', fontFamily: 'monospace' }}>
                    /100
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Portfolio Signals */}
      {analysis.portfolioSignal && (
        <Card>
          <SectionTitle color="#ffa726">💼 Your Portfolio</SectionTitle>
          {['NET', 'CEG', 'GLNG'].map(tk => {
            const sig  = analysis.portfolioSignal[tk];
            if (!sig) return null;
            const curr = snap.usPrices?.[tk];
            const avgs = { NET: 208.62, CEG: 310.43, GLNG: 50.93 };
            const pct  = curr ? ((curr - avgs[tk]) / avgs[tk] * 100).toFixed(1) : null;
            const pos  = parseFloat(pct) >= 0;
            const actionColor = sig.action === 'BUY' || sig.action === 'ADD' ? '#00d4aa'
              : sig.action === 'SELL' || sig.action === 'AVOID' ? '#ff4757' : '#ffa726';
            return (
              <div key={tk} style={{ display: 'flex', gap: 12, padding: '10px 0',
                borderBottom: tk !== 'GLNG' ? '1px solid #141c2e' : 'none' }}>
                <div style={{ minWidth: 50 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#e8f0fe' }}>{tk}</div>
                  {curr && <div style={{ fontSize: 11, fontFamily: 'monospace',
                    color: pos ? '#00d4aa' : '#ff4757' }}>
                    ${curr.toFixed(2)} {pct && `(${pos ? '+' : ''}${pct}%)`}
                  </div>}
                </div>
                <div style={{ flex: 1 }}>
                  <Pill color={actionColor}>{sig.action}</Pill>
                  <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#7a90b8',
                    marginTop: 4, lineHeight: 1.4 }}>{sig.reason}</div>
                  {sig.stop_loss && (
                    <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#3a4d6e',
                      marginTop: 2 }}>Stop ${sig.stop_loss} · Target ${sig.target}</div>
                  )}
                </div>
              </div>
            );
          })}
          {analysis.portfolioSignal?.coherence && (
            <div style={{ marginTop: 8, fontSize: 10, fontFamily: 'monospace',
              color: '#7a90b8', lineHeight: 1.5, paddingTop: 8,
              borderTop: '1px solid #141c2e' }}>
              {analysis.portfolioSignal.coherence}
            </div>
          )}
        </Card>
      )}

      {/* NSE Movers */}
      {snap.gainers?.length > 0 && (
        <Card>
          <SectionTitle>📊 NSE Movers Today</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#00d4aa',
                letterSpacing: 1, marginBottom: 6 }}>TOP GAINERS</div>
              {snap.gainers.slice(0, 5).map(s => (
                <div key={s.symbol} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '4px 0', borderBottom: '1px solid #0c1120' }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#e8f0fe' }}>
                    {s.symbol}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00d4aa',
                    fontWeight: 700 }}>+{parseFloat(s.pChange).toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#ff4757',
                letterSpacing: 1, marginBottom: 6 }}>TOP LOSERS</div>
              {snap.losers?.slice(0, 5).map(s => (
                <div key={s.symbol} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '4px 0', borderBottom: '1px solid #0c1120' }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#e8f0fe' }}>
                    {s.symbol}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#ff4757',
                    fontWeight: 700 }}>{parseFloat(s.pChange).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Market News */}
      {(data?.news?.market || []).length > 0 && (
        <Card>
          <SectionTitle>📰 Market News</SectionTitle>
          {(data.news.market || []).slice(0, 6).map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0',
              borderBottom: i < 5 ? '1px solid #141c2e' : 'none' }}>
              <div style={{ color: '#4f8ef7', fontSize: 10, marginTop: 1 }}>→</div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#a0b4d0',
                lineHeight: 1.5 }}>{item.title}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── OPPORTUNITIES TAB ─────────────────────────────────────────
function OpportunitiesTab({ data }) {
  const [search,  setSearch]  = useState('');
  const [minS,    setMinS]    = useState(50);
  const [country, setCountry] = useState('ALL');
  const [sortBy,  setSortBy]  = useState('score');
  const [exp,     setExp]     = useState(null);

  const snap    = data?.snap     || {};
  const analysis= data?.analysis || {};
  const regime  = snap.regime || 'SIDEWAYS';
  const meta    = REGIME_META[regime] || REGIME_META.SIDEWAYS;
  const scores  = analysis.scores?.scores || {};
  const top5    = analysis.scores?.top5   || [];

  const US_SET = new Set(['NET','CEG','GLNG','NVDA','MSFT','AAPL','GOOGL','META',
    'AMZN','TSLA','JPM','GS','XOM','LNG','GLD','QQQ','SPY','PLTR','AMD','AVGO','CRM']);

  const list = Object.entries(scores)
    .filter(([tk, s]) => {
      if (s.score < minS) return false;
      const isUS = US_SET.has(tk) || s.country === 'US';
      if (country === 'US' && !isUS) return false;
      if (country === 'IN' && isUS) return false;
      if (search) {
        const q = search.toLowerCase();
        return tk.toLowerCase().includes(q) ||
          (s.reason||'').toLowerCase().includes(q) ||
          (s.sector||'').toLowerCase().includes(q);
      }
      return true;
    })
    .map(([tk, s]) => ({ tk, ...s, isTop: top5.includes(tk), isUS: US_SET.has(tk) }))
    .sort((a, b) => {
      if (sortBy === 'return') return (b.calibration?.base_returns?.[regime] || 0) -
        (a.calibration?.base_returns?.[regime] || 0);
      return b.score - a.score;
    });

  const scoreColor = s => s >= 75 ? '#00d4aa' : s >= 60 ? '#4f8ef7' : s >= 45 ? '#ffa726' : '#ff4757';

  // Sector heatmap
  const heatmap = Object.values(scores).reduce((m, s) => {
    const sec = (s.sector || 'Other').split(' ')[0].slice(0, 10);
    if (!m[sec]) m[sec] = { sum: 0, n: 0 };
    m[sec].sum += s.score; m[sec].n++;
    return m;
  }, {});
  const heatList = Object.entries(heatmap)
    .map(([s, d]) => ({ s, avg: Math.round(d.sum / d.n), n: d.n }))
    .sort((a, b) => b.avg - a.avg).slice(0, 12);

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

      {/* Sticky filters */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#080c18',
        borderBottom: '1px solid #141c2e', padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#e8f0fe' }}>
              🎯 Opportunities
            </span>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#3a4d6e',
              marginLeft: 8 }}>{list.length} stocks · {regime}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['ALL','IN','US'].map(c => (
              <button key={c} onClick={() => setCountry(c)} style={{
                padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 9,
                fontFamily: 'monospace', fontWeight: 700,
                border: `1px solid ${country === c ? meta.color + '88' : '#1a2540'}`,
                background: country === c ? meta.color + '20' : 'transparent',
                color: country === c ? meta.color : '#3a4d6e',
              }}>{c}</button>
            ))}
          </div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search stock, sector..."
          style={{ width: '100%', padding: '7px 12px', borderRadius: 8, outline: 'none',
            border: '1px solid #1a2540', background: '#0c1120', color: '#e8f0fe',
            fontSize: 11, fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: 8 }}/>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[0, 40, 50, 60, 70, 80].map(s => (
            <button key={s} onClick={() => setMinS(s)} style={{
              padding: '3px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 9,
              fontFamily: 'monospace',
              border: `1px solid ${minS === s ? meta.color + '88' : '#1a2540'}`,
              background: minS === s ? meta.color + '20' : 'transparent',
              color: minS === s ? meta.color : '#3a4d6e',
            }}>{s === 0 ? 'ALL' : `${s}+`}</button>
          ))}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            padding: '3px 8px', borderRadius: 5, border: '1px solid #1a2540',
            background: '#0c1120', color: '#7a90b8', fontSize: 9,
            fontFamily: 'monospace', cursor: 'pointer', marginLeft: 'auto',
          }}>
            <option value="score">↓ Score</option>
            <option value="return">↓ Exp Return</option>
          </select>
        </div>
      </div>

      {/* Sector heatmap */}
      {heatList.length > 0 && (
        <div style={{ margin: '10px 14px 0', background: '#0c1120',
          borderRadius: 12, border: '1px solid #141c2e', padding: 12 }}>
          <SectionTitle>Sector Heatmap</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {heatList.map(h => {
              const c = h.avg >= 70 ? '#00d4aa' : h.avg >= 55 ? '#4f8ef7' : h.avg >= 45 ? '#ffa726' : '#ff4757';
              return (
                <div key={h.s} onClick={() => setSearch(h.s)} style={{
                  padding: '5px 8px', borderRadius: 7, cursor: 'pointer',
                  border: `1px solid ${c}33`, background: `${c}10`,
                }}>
                  <div style={{ fontSize: 7, fontFamily: 'monospace', color: '#7a90b8' }}>{h.s}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: c }}>
                    {h.avg}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock list */}
      <div style={{ padding: '8px 14px 0' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36 }}>🔍</div>
            <div style={{ fontFamily: 'monospace', color: '#3a4d6e', fontSize: 11, marginTop: 8 }}>
              No stocks match filters
            </div>
          </div>
        ) : list.map((inst, idx) => {
          const isExp   = exp === inst.tk;
          const c       = scoreColor(inst.score);
          const cal     = inst.calibration || {};
          const bR      = cal.base_returns?.[regime];
          const sig     = cal.sigma?.[regime];
          const signalC = (inst.signal||'').includes('BUY') || (inst.signal||'').includes('ADD')
            ? '#00d4aa' : (inst.signal||'').includes('AVOID') ? '#ff4757' : '#ffa726';

          return (
            <div key={inst.tk} onClick={() => setExp(isExp ? null : inst.tk)}
              style={{ background: '#0c1120', borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${isExp ? c + '55' : '#141c2e'}`,
                marginBottom: 6, padding: '11px 12px',
                boxShadow: isExp ? `0 0 20px ${c}15` : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s' }}>

              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#3a4d6e',
                  width: 20, flexShrink: 0, paddingTop: 3 }}>
                  {inst.isTop ? '⭐' : `#${idx+1}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#e8f0fe' }}>
                      {inst.tk}
                    </span>
                    {inst.signal && (
                      <Pill color={signalC} small>{inst.signal}</Pill>
                    )}
                    {inst.isUS && <Pill color="#ffa726" small>US</Pill>}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#7a90b8', marginTop: 2 }}>
                    {inst.sector}
                    {inst.last_price && (
                      <span style={{ color: '#3a4d6e' }}>
                        · {inst.isUS ? '$' : '₹'}{inst.last_price?.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: c }}>
                    {inst.score}
                  </div>
                  <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#3a4d6e' }}>/100</div>
                </div>
              </div>

              {/* Score bar */}
              <div style={{ marginTop: 8 }}>
                <ScoreBar score={inst.score} />
              </div>

              {/* Quick metrics */}
              {(bR !== undefined || sig) && (
                <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                  {bR !== undefined && (
                    <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#3a4d6e' }}>
                      Return <span style={{ color: bR >= 0 ? '#00d4aa' : '#ff4757' }}>
                        {bR >= 0 ? '+' : ''}{bR?.toFixed(0)}%
                      </span>
                    </span>
                  )}
                  {sig && (
                    <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#3a4d6e' }}>
                      σ <span style={{ color: '#7a90b8' }}>{(sig * 100).toFixed(0)}%</span>
                    </span>
                  )}
                </div>
              )}

              {/* Reason */}
              {inst.reason && (
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#7a90b8',
                  marginTop: 6, lineHeight: 1.5 }}>{inst.reason}</div>
              )}

              {/* Expanded details */}
              {isExp && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #141c2e' }}>

                  {/* Regime calibration */}
                  {cal.base_returns && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 7, fontFamily: 'monospace', letterSpacing: 2,
                        color: '#4f8ef7', marginBottom: 8 }}>
                        CALIBRATION · {cal.source === 'calculated' ? '✓ Real Data' : '~ Estimates'}
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {Object.entries(cal.base_returns).map(([r, ret]) => (
                          <div key={r} style={{ padding: '4px 8px', borderRadius: 6,
                            fontSize: 8, fontFamily: 'monospace', background: '#080c18',
                            border: `1px solid ${r === regime ? c + '55' : '#141c2e'}`,
                            color: r === regime ? c : '#3a4d6e' }}>
                            {r.replace('_',' ')}: <b>{ret >= 0 ? '+' : ''}{ret}%</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valuation */}
                  {inst.valuation && Object.keys(inst.valuation).length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 7, fontFamily: 'monospace', letterSpacing: 2,
                        color: '#00c8e0', marginBottom: 8 }}>VALUATION</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {[
                          { l: 'P/E',  v: inst.valuation.pe?.toFixed(1) },
                          { l: 'P/B',  v: inst.valuation.pb?.toFixed(1) },
                          { l: 'ROE',  v: inst.valuation.roe ? `${inst.valuation.roe.toFixed(0)}%` : null },
                          { l: 'D/E',  v: inst.valuation.de?.toFixed(2) },
                          { l: 'Div',  v: inst.valuation.divYield ? `${inst.valuation.divYield.toFixed(1)}%` : null },
                        ].filter(x => x.v).map(x => (
                          <div key={x.l} style={{ background: '#080c18', borderRadius: 7,
                            padding: '5px 8px', border: '1px solid #141c2e' }}>
                            <div style={{ fontSize: 7, fontFamily: 'monospace', color: '#3a4d6e' }}>
                              {x.l}
                            </div>
                            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#e8f0fe',
                              fontWeight: 700 }}>{x.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 52 week range */}
                  {inst.week52_high && inst.week52_low && (
                    <div>
                      <div style={{ fontSize: 7, fontFamily: 'monospace', letterSpacing: 2,
                        color: '#3a4d6e', marginBottom: 8 }}>52-WEEK RANGE</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#ff4757' }}>
                          ₹{Number(inst.week52_low).toLocaleString('en-IN')}
                        </span>
                        <div style={{ flex: 1, height: 4, background: '#141c2e',
                          borderRadius: 2, position: 'relative' }}>
                          {inst.last_price && (
                            <div style={{ position: 'absolute', top: -3, width: 10, height: 10,
                              borderRadius: '50%', background: c, border: '2px solid #e8f0fe',
                              left: `${Math.min(90, Math.max(5, (inst.last_price - inst.week52_low) /
                                (inst.week52_high - inst.week52_low) * 100))}%`,
                              transform: 'translateX(-50%)' }} />
                          )}
                        </div>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#00d4aa' }}>
                          ₹{Number(inst.week52_high).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PORTFOLIO TAB ─────────────────────────────────────────────
function PortfolioTab({ data }) {
  const snap   = data?.snap     || {};
  const usdInr = snap.usdInr    || 86;
  const prices = snap.usPrices  || {};

  const holdings = [
    { tk: 'NET',  qty: 1.066992, avg: 208.62, name: 'Cloudflare',         sector: 'Cloud Security' },
    { tk: 'CEG',  qty: 0.714253, avg: 310.43, name: 'Constellation Energy',sector: 'Nuclear Energy' },
    { tk: 'GLNG', qty: 3.489692, avg: 50.93,  name: 'Golar LNG',           sector: 'LNG Shipping'  },
  ];

  const totalInvested = holdings.reduce((s, h) => s + h.avg * h.qty * usdInr, 0);
  const totalCurrent  = holdings.reduce((s, h) => s + (prices[h.tk] || h.avg) * h.qty * usdInr, 0);
  const totalPL       = totalCurrent - totalInvested;
  const totalPLPct    = totalInvested > 0 ? (totalPL / totalInvested * 100).toFixed(2) : 0;

  return (
    <div style={{ padding: '0 14px 80px' }}>

      {/* Portfolio summary */}
      <Card style={{ marginTop: 14, background: totalPL >= 0
        ? 'linear-gradient(135deg, #0c1120, #0a1c14)' : 'linear-gradient(135deg, #0c1120, #1c0a0a)' }}>
        <SectionTitle color="#ffa726">💼 Portfolio Summary</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#3a4d6e' }}>INVESTED</div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', color: '#e8f0fe' }}>
              ₹{(totalInvested / 100000).toFixed(2)}L
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#3a4d6e' }}>CURRENT</div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace',
              color: totalPL >= 0 ? '#00d4aa' : '#ff4757' }}>
              ₹{(totalCurrent / 100000).toFixed(2)}L
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#3a4d6e' }}>P&L (₹)</div>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace',
              color: totalPL >= 0 ? '#00d4aa' : '#ff4757' }}>
              {totalPL >= 0 ? '+' : ''}₹{Math.round(totalPL).toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#3a4d6e' }}>P&L (%)</div>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace',
              color: totalPL >= 0 ? '#00d4aa' : '#ff4757' }}>
              {totalPLPct >= 0 ? '+' : ''}{totalPLPct}%
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 8, fontFamily: 'monospace', color: '#3a4d6e' }}>
          USD/INR: {usdInr.toFixed(2)}
        </div>
      </Card>

      {/* Individual holdings */}
      {holdings.map(h => {
        const curr  = prices[h.tk] || h.avg;
        const plUSD = (curr - h.avg) * h.qty;
        const plINR = plUSD * usdInr;
        const plPct = ((curr - h.avg) / h.avg * 100).toFixed(2);
        const pos   = plINR >= 0;

        return (
          <Card key={h.tk} style={{ border: `1px solid ${pos ? '#00d4aa22' : '#ff475722'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#e8f0fe' }}>{h.tk}</div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#7a90b8' }}>{h.name}</div>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#3a4d6e', marginTop: 2 }}>
                  {h.sector}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace',
                  color: pos ? '#00d4aa' : '#ff4757' }}>
                  {pos ? '+' : ''}₹{Math.round(plINR).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'monospace',
                  color: pos ? '#00d4aa' : '#ff4757' }}>
                  {plPct >= 0 ? '+' : ''}{plPct}%
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
              gap: 8, marginTop: 12 }}>
              {[
                { l: 'Qty',    v: h.qty.toFixed(3) },
                { l: 'Avg',    v: `$${h.avg}` },
                { l: 'Current',v: `$${curr.toFixed(2)}` },
              ].map(x => (
                <div key={x.l} style={{ background: '#080c18', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#3a4d6e' }}>{x.l}</div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#e8f0fe',
                    fontWeight: 700 }}>{x.v}</div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── NEWS TAB ──────────────────────────────────────────────────
function NewsTab({ data }) {
  const news   = data?.news    || {};
  const market = news.market   || [];
  const stocks = news.stocks   || {};

  return (
    <div style={{ padding: '0 14px 80px', marginTop: 14 }}>

      {market.length > 0 && (
        <Card>
          <SectionTitle>📰 Market News</SectionTitle>
          {market.slice(0, 10).map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0',
              borderBottom: i < market.length - 1 ? '1px solid #141c2e' : 'none' }}>
              <div style={{ color: '#4f8ef7', fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</div>
              <div>
                <div style={{ fontSize: 11, color: '#a0b4d0', lineHeight: 1.5 }}>{item.title}</div>
                {item.date && (
                  <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#3a4d6e', marginTop: 3 }}>
                    {item.date?.slice(0, 16)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {Object.entries(stocks).slice(0, 10).map(([sym, items]) => (
        Array.isArray(items) && items.length > 0 ? (
          <Card key={sym}>
            <SectionTitle color="#ffa726">📌 {sym}</SectionTitle>
            {items.slice(0, 3).map((item, i) => (
              <div key={i} style={{ fontSize: 10, fontFamily: 'monospace', color: '#7a90b8',
                padding: '5px 0', borderBottom: i < 2 ? '1px solid #141c2e' : 'none',
                lineHeight: 1.4 }}>
                {item.title || item}
              </div>
            ))}
          </Card>
        ) : null
      ))}

      {market.length === 0 && Object.keys(stocks).length === 0 && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36 }}>📰</div>
          <div style={{ fontFamily: 'monospace', color: '#3a4d6e', fontSize: 11, marginTop: 8 }}>
            News will appear after next refresh
          </div>
        </div>
      )}
    </div>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────
function SettingsTab({ onRefresh, lastRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const [recal,      setRecal]      = useState(false);
  const [msg,        setMsg]        = useState('');

  const triggerRefresh = async (type = 'morning') => {
    setRefreshing(true);
    setMsg('');
    try {
      const r = await fetch(`${API}/api/refresh${type === 'recalibrate' ? '?type=recalibrate' : ''}`);
      const d = await r.json();
      setMsg(d.ok ? '✅ Refresh started — check back in 5 minutes' : `❌ ${d.error}`);
      if (d.ok && onRefresh) setTimeout(onRefresh, 8000);
    } catch(e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{ padding: '14px 14px 80px' }}>
      <Card>
        <SectionTitle>⚡ Manual Refresh</SectionTitle>
        <div style={{ marginBottom: 12, fontSize: 10, fontFamily: 'monospace', color: '#7a90b8',
          lineHeight: 1.6 }}>
          Trigger a fresh score run. Takes ~5 minutes. Python GARCH engine runs automatically.
        </div>
        <button onClick={() => triggerRefresh('morning')} disabled={refreshing}
          style={{ width: '100%', padding: '13px', borderRadius: 10, cursor: 'pointer',
            border: 'none', background: refreshing ? '#1a2540' : '#00d4aa',
            color: refreshing ? '#3a4d6e' : '#050810', fontWeight: 900,
            fontSize: 13, fontFamily: 'monospace', marginBottom: 8,
            transition: 'background 0.2s' }}>
          {refreshing ? '⏳ Running...' : '🚀 Refresh Now'}
        </button>
        <button onClick={() => { setRecal(!recal); }}
          style={{ width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid #1a2540', background: 'transparent',
            color: '#7a90b8', fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>
          {recal ? '▲ Hide' : '▼ Weekly Recalibration (advanced)'}
        </button>
        {recal && (
          <button onClick={() => triggerRefresh('recalibrate')} disabled={refreshing}
            style={{ width: '100%', padding: '12px', borderRadius: 10, cursor: 'pointer',
              border: '1px solid #ffa72644', background: '#ffa72615',
              color: '#ffa726', fontWeight: 700, fontSize: 11,
              fontFamily: 'monospace', marginTop: 8 }}>
            🔄 Full Recalibration (15-20 min)
          </button>
        )}
        {msg && (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8,
            background: msg.startsWith('✅') ? '#00d4aa15' : '#ff475715',
            border: `1px solid ${msg.startsWith('✅') ? '#00d4aa33' : '#ff475733'}`,
            fontSize: 10, fontFamily: 'monospace',
            color: msg.startsWith('✅') ? '#00d4aa' : '#ff4757' }}>
            {msg}
          </div>
        )}
        {lastRefresh && (
          <div style={{ marginTop: 8, fontSize: 8, fontFamily: 'monospace', color: '#3a4d6e' }}>
            Last data fetch: {lastRefresh.toLocaleTimeString('en-IN')}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>📊 System Status</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { l: 'Backend',     v: 'Render (Singapore)', c: '#00d4aa' },
            { l: 'Storage',     v: 'Backblaze B2 (1TB)', c: '#00d4aa' },
            { l: 'Scoring',     v: 'Python GARCH Engine', c: '#4f8ef7' },
            { l: 'Instruments', v: '527 stocks tracked', c: '#ffa726' },
            { l: 'Schedule',    v: '6x daily auto-refresh', c: '#7a90b8' },
            { l: 'Monthly cost',v: '~$20 fixed', c: '#00d4aa' },
          ].map(x => (
            <div key={x.l} style={{ display: 'flex', justifyContent: 'space-between',
              padding: '5px 0', borderBottom: '1px solid #141c2e' }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#7a90b8' }}>{x.l}</span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: x.c,
                fontWeight: 700 }}>{x.v}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle color="#9b59ff">📱 Telegram</SectionTitle>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#7a90b8', lineHeight: 1.7 }}>
          To receive daily briefs on Telegram:
        </div>
        <ol style={{ fontSize: 10, fontFamily: 'monospace', color: '#7a90b8',
          lineHeight: 2, paddingLeft: 16 }}>
          <li>Open Telegram → search @BotFather</li>
          <li>Create bot → copy token</li>
          <li>Add TELEGRAM_BOT_TOKEN to Render env vars</li>
          <li>Message your bot, get chat ID</li>
          <li>Add TELEGRAM_CHAT_ID to Render env vars</li>
          <li>Visit /api/test-telegram to verify</li>
        </ol>
      </Card>
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: 'dashboard',     icon: '🏠', label: 'Home' },
    { id: 'opportunities', icon: '🎯', label: 'Picks' },
    { id: 'portfolio',     icon: '💼', label: 'Portfolio' },
    { id: 'news',          icon: '📰', label: 'News' },
    { id: 'settings',      icon: '⚙️', label: 'Settings' },
  ];
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(8,12,24,0.95)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid #141c2e', display: 'flex', justifyContent: 'space-around',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 3, background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 12px', borderRadius: 10,
          transition: 'all 0.15s ease',
        }}>
          <span style={{ fontSize: 20, lineHeight: 1,
            opacity: tab === t.id ? 1 : 0.4,
            transform: tab === t.id ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.15s ease' }}>{t.icon}</span>
          <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
            color: tab === t.id ? '#e8f0fe' : '#3a4d6e',
            transition: 'color 0.15s' }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const { data, loading, lastRefresh, error, refresh } = useData();

  if (loading && !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#050810', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>📊</div>
        <div style={{ fontSize: 14, fontFamily: 'monospace', color: '#4f8ef7',
          letterSpacing: 2 }}>INVESTMENT RADAR PRO</div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#3a4d6e',
          letterSpacing: 1 }}>Loading...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#050810', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: 24 }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#ff4757',
          textAlign: 'center' }}>Connection Error</div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#3a4d6e',
          textAlign: 'center' }}>{error}</div>
        <button onClick={refresh} style={{ padding: '12px 24px', borderRadius: 10,
          background: '#4f8ef7', border: 'none', color: '#fff',
          fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050810', color: '#e8f0fe',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,8,16,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #141c2e',
        padding: '12px 16px 10px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1, color: '#e8f0fe' }}>
            📡 Investment Radar
          </div>
          <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#3a4d6e', letterSpacing: 1 }}>
            PRO · {data?.snap?.regime || '—'}
          </div>
        </div>
        <button onClick={refresh} disabled={loading}
          style={{ padding: '7px 14px', borderRadius: 8, border: 'none',
            background: loading ? '#141c2e' : '#4f8ef720',
            color: loading ? '#3a4d6e' : '#4f8ef7',
            fontFamily: 'monospace', fontWeight: 700, fontSize: 11, cursor: 'pointer',
            border: '1px solid #4f8ef733' }}>
          {loading ? '⏳' : '↺ Refresh'}
        </button>
      </div>

      {/* Tab content */}
      <div style={{ overflowY: 'auto', paddingBottom: 80 }}>
        {tab === 'dashboard'     && <DashboardTab     data={data} />}
        {tab === 'opportunities' && <OpportunitiesTab data={data} />}
        {tab === 'portfolio'     && <PortfolioTab     data={data} />}
        {tab === 'news'          && <NewsTab          data={data} />}
        {tab === 'settings'      && <SettingsTab      onRefresh={refresh} lastRefresh={lastRefresh} />}
      </div>

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
