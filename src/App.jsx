import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'https://investment-radar-backend.onrender.com';

// ── CONSTANTS ─────────────────────────────────────────────────
const REGIME = {
  BULL:      { label: 'BULL',      color: '#00ffaa', glow: '#00ffaa40', icon: '▲' },
  SOFT_BULL: { label: 'SOFT BULL', color: '#4fffb0', glow: '#4fffb040', icon: '↗' },
  SIDEWAYS:  { label: 'SIDEWAYS',  color: '#ffcc00', glow: '#ffcc0040', icon: '→' },
  SOFT_BEAR: { label: 'SOFT BEAR', color: '#ff6b35', glow: '#ff6b3540', icon: '↘' },
  BEAR:      { label: 'BEAR',      color: '#ff2244', glow: '#ff224440', icon: '▼' },
};

// ── DATA HOOK ─────────────────────────────────────────────────
function useData() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [ts,      setTs]      = useState(null);

  const fetch_ = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`${API}/api/snapshot`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setData(d); setTs(new Date()); setError(null);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); const id = setInterval(() => fetch_(true), 5*60*1000); return () => clearInterval(id); }, [fetch_]);
  return { data, loading, error, ts, refresh: fetch_ };
}

// ── ANIMATED NUMBER ───────────────────────────────────────────
function AnimNum({ value, prefix = '', suffix = '', decimals = 0, color }) {
  const [display, setDisplay] = useState(0);
  const target = parseFloat(value) || 0;
  useEffect(() => {
    let start = display, frame;
    const step = () => {
      start += (target - start) * 0.12;
      if (Math.abs(target - start) < 0.01) start = target;
      setDisplay(start);
      if (start !== target) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('en-IN');
  return <span style={{ color }}>{prefix}{formatted}{suffix}</span>;
}

// ── SPARK LINE ────────────────────────────────────────────────
function SparkLine({ data, color, width = 80, height = 30 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── SCORE RING ────────────────────────────────────────────────
function ScoreRing({ score, size = 44 }) {
  const color = score >= 75 ? '#00ffaa' : score >= 60 ? '#4f8ef7' : score >= 45 ? '#ffcc00' : '#ff2244';
  const r = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff10" strokeWidth="3"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 4px ${color})` }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px`,
          fill: color, fontSize: 11, fontWeight: 900, fontFamily: 'monospace' }}>
        {score}
      </text>
    </svg>
  );
}

// ── GLASS CARD ────────────────────────────────────────────────
function Glass({ children, style, onClick, glow }) {
  return (
    <div onClick={onClick} style={{
      background: 'rgba(8,12,24,0.7)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${glow || 'rgba(255,255,255,0.06)'}`,
      borderRadius: 16,
      padding: '14px 16px',
      marginBottom: 10,
      boxShadow: glow ? `0 0 30px ${glow}` : 'none',
      transition: 'all 0.3s ease',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

// ── PULSE DOT ─────────────────────────────────────────────────
function PulseDot({ color }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 8, height: 8 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, animation: 'pulse 2s ease-out infinite' }}/>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color }}/>
    </span>
  );
}

// ── AI CHAT ───────────────────────────────────────────────────
function AskAI({ data }) {
  const [q, setQ]   = useState('');
  const [ans, setAns] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    if (!q.trim() || busy) return;
    setBusy(true);
    try {
      const snap = data?.snap || {};
      const analysis = data?.analysis || {};
      const scores = analysis.scores?.scores || {};
      const top5 = analysis.scores?.top5 || [];
      const regime = snap.regime || 'SIDEWAYS';
      const fii = snap.fii?.fii_net || 0;
      const nifty = snap.indices?.['NIFTY 50']?.last;

      const context = `
Market data: Nifty ${nifty}, Regime ${regime}, FII ${fii > 0 ? '+' : ''}${Math.round(fii)}Cr
Top picks today: ${top5.join(', ')}
Portfolio: NET avg $208.62, CEG avg $310.43, GLNG avg $50.93
Current prices: NET $${snap.usPrices?.NET?.toFixed(2) || 'N/A'}, CEG $${snap.usPrices?.CEG?.toFixed(2) || 'N/A'}, GLNG $${snap.usPrices?.GLNG?.toFixed(2) || 'N/A'}
VIX: ${snap.indices?.['INDIA VIX']?.last?.toFixed(1) || 'N/A'}
AI narrative: ${(analysis.regimeNarrative || '').slice(0, 300)}
Scores sample: ${Object.entries(scores).slice(0, 10).map(([k,v]) => `${k}:${v.score}`).join(', ')}
      `.trim();

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an investment analyst assistant for Investment Radar Pro. Answer questions about the Indian and US markets based on the provided market data. Be concise (2-4 sentences max), direct, and specific. Use numbers. No disclaimers.`,
          messages: [{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${q}` }],
        }),
      });
      const d = await res.json();
      setAns(d.content?.[0]?.text || 'Could not get response');
    } catch(e) {
      setAns(`Error: ${e.message}`);
    } finally { setBusy(false); }
  };

  const suggestions = ['What should I do with NET today?', 'Which sector is strongest?', 'Should I add to GLNG?', 'What does BEAR regime mean for my portfolio?'];

  return (
    <Glass style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)' }}>
      <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 3,
        color: '#4f8ef7', marginBottom: 10 }}>ASK INVESTMENT RADAR AI</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
          placeholder="Ask about your portfolio, stocks, regime..."
          style={{ flex: 1, padding: '9px 12px', borderRadius: 10, outline: 'none',
            border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.08)',
            color: '#e8f0fe', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}/>
        <button onClick={ask} disabled={busy || !q.trim()} style={{
          padding: '9px 14px', borderRadius: 10, border: 'none',
          background: busy ? '#1a2540' : '#4f8ef7',
          color: busy ? '#3a4d6e' : '#050810',
          fontWeight: 900, fontSize: 11, cursor: 'pointer',
          fontFamily: 'JetBrains Mono, monospace',
          transition: 'all 0.2s',
        }}>{busy ? '...' : '→'}</button>
      </div>

      {!ans && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => setQ(s)} style={{
              padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(79,142,247,0.2)',
              background: 'transparent', color: '#3a4d6e', fontSize: 8,
              fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
            }}>{s}</button>
          ))}
        </div>
      )}

      {ans && (
        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10,
          background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)',
          fontSize: 11, color: '#a0c4ff', lineHeight: 1.7,
          fontFamily: 'JetBrains Mono, monospace' }}>
          {ans}
          <button onClick={() => { setAns(''); setQ(''); }} style={{
            display: 'block', marginTop: 8, padding: '4px 10px', borderRadius: 6,
            border: '1px solid rgba(79,142,247,0.3)', background: 'transparent',
            color: '#4f8ef7', fontSize: 8, cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
          }}>← Ask another</button>
        </div>
      )}
    </Glass>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────────
function DashboardTab({ data }) {
  const snap     = data?.snap     || {};
  const analysis = data?.analysis || {};
  const regime   = snap.regime    || 'SIDEWAYS';
  const rm       = REGIME[regime] || REGIME.SIDEWAYS;
  const scores   = analysis.scores?.scores || {};
  const top5     = analysis.scores?.top5   || [];
  const fii      = snap.fii?.fii_net || 0;
  const nifty    = snap.indices?.['NIFTY 50'];
  const vix      = snap.indices?.['INDIA VIX'];
  const [showFull, setShowFull] = useState(false);

  const ageMin = snap.ts ? Math.round((Date.now() - new Date(snap.ts).getTime()) / 60000) : null;

  // Fake sparkline data from regime score for viz
  const sparkData = [45, 48, 52, 49, 55, 58, 54, 60, 57, 62, 58, 65];

  return (
    <div style={{ padding: '0 14px 90px' }}>

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 0 8px', fontSize: 9,
        fontFamily: 'JetBrains Mono, monospace', color: '#3a4d6e' }}>
        <PulseDot color={ageMin < 30 ? '#00ffaa' : '#ffcc00'} />
        <span style={{ color: ageMin < 30 ? '#00ffaa' : '#ffcc00' }}>
          {snap.label || 'Loading'}
        </span>
        {ageMin !== null && <span>· {ageMin}m ago</span>}
        <span style={{ marginLeft: 'auto' }}>
          {snap.model === 'python-quant-v1' ? '⚡ QUANT' : '🤖 AI'}
        </span>
      </div>

      {/* Regime Hero */}
      <div onClick={() => setShowFull(!showFull)} style={{
        position: 'relative', overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 0%, ${rm.glow}, transparent 70%), rgba(8,12,24,0.8)`,
        border: `1px solid ${rm.color}33`,
        borderRadius: 20, padding: '20px 20px 16px', marginBottom: 10,
        cursor: 'pointer',
        boxShadow: `0 0 40px ${rm.glow}`,
      }}>
        {/* Animated grid bg */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `linear-gradient(${rm.color} 1px, transparent 1px), linear-gradient(90deg, ${rm.color} 1px, transparent 1px)`,
          backgroundSize: '20px 20px', pointerEvents: 'none' }}/>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 3, color: rm.color, opacity: 0.7, marginBottom: 6 }}>
              MARKET REGIME
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: rm.color,
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: 2,
              textShadow: `0 0 20px ${rm.color}` }}>
              {rm.icon} {rm.label}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
              color: '#7a90b8', marginTop: 4 }}>
              Score {snap.regime_score || 0}/5 · {showFull ? 'tap to collapse' : 'tap for analysis'}
            </div>
          </div>
          <SparkLine data={sparkData} color={rm.color} width={80} height={40}/>
        </div>

        {/* Evidence pills */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { label: `FII ${fii >= 0 ? '+' : ''}${(fii/100).toFixed(0)}Cr`,
              color: fii >= 0 ? '#00ffaa' : '#ff2244' },
            { label: `VIX ${vix?.last?.toFixed(1) || '--'}`,
              color: (vix?.last || 0) > 20 ? '#ff2244' : '#ffcc00' },
            { label: `₹${snap.usdInr?.toFixed(2) || '--'}/$`,
              color: '#4f8ef7' },
            { label: `Brent $${snap.brent?.toFixed(0) || '--'}`,
              color: (snap.brent || 0) > 95 ? '#ff2244' : '#ffcc00' },
          ].map(p => (
            <div key={p.label} style={{ padding: '4px 10px', borderRadius: 20,
              background: `${p.color}15`, border: `1px solid ${p.color}33`,
              fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: p.color }}>
              {p.label}
            </div>
          ))}
        </div>

        {showFull && analysis.regimeNarrative && (
          <div style={{ marginTop: 14, paddingTop: 14,
            borderTop: `1px solid ${rm.color}22`,
            fontSize: 10, color: '#a0b4d0', lineHeight: 1.8,
            fontFamily: 'JetBrains Mono, monospace' }}>
            {analysis.regimeNarrative}
          </div>
        )}
      </div>

      {/* Macro grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
        {[
          { l: 'NIFTY', v: nifty?.last, fmt: v => v?.toLocaleString('en-IN'),
            sub: `${(nifty?.pChange||0) >= 0 ? '+' : ''}${nifty?.pChange?.toFixed(2)||0}%`,
            color: (nifty?.pChange||0) >= 0 ? '#00ffaa' : '#ff2244' },
          { l: 'INDIA VIX', v: vix?.last, fmt: v => v?.toFixed(1),
            sub: (vix?.last||0) > 20 ? 'HIGH FEAR' : 'CALM',
            color: (vix?.last||0) > 20 ? '#ff2244' : '#00ffaa' },
          { l: 'FII TODAY', v: fii, fmt: v => `${v >= 0 ? '+' : ''}${(v/100).toFixed(0)}Cr`,
            sub: fii >= 0 ? 'BUYING' : 'SELLING',
            color: fii >= 0 ? '#00ffaa' : '#ff2244' },
        ].map(m => (
          <div key={m.l} style={{ background: 'rgba(8,12,24,0.7)', backdropFilter: 'blur(20px)',
            border: `1px solid ${m.color}22`, borderRadius: 14, padding: '12px 12px 10px',
            boxShadow: `inset 0 0 20px ${m.color}08` }}>
            <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
              color: '#3a4d6e', letterSpacing: 2, marginBottom: 6 }}>{m.l}</div>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace',
              color: m.color, textShadow: `0 0 10px ${m.color}66` }}>
              {m.v !== undefined && m.v !== null ? m.fmt(m.v) : '--'}
            </div>
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
              color: '#3a4d6e', marginTop: 3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* AI Chat */}
      <AskAI data={data} />

      {/* Top 5 */}
      {top5.length > 0 && (
        <Glass>
          <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 3, color: '#00ffaa', marginBottom: 12 }}>TODAY'S TOP PICKS</div>
          {top5.map((tk, i) => {
            const s = scores[tk] || {};
            const c = s.score >= 75 ? '#00ffaa' : s.score >= 60 ? '#4f8ef7' : '#ffcc00';
            return (
              <div key={tk} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0', borderBottom: i < top5.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                  color: '#3a4d6e', width: 18 }}>#{i+1}</div>
                <ScoreRing score={s.score || 50} size={42}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#e8f0fe',
                    fontFamily: 'JetBrains Mono, monospace' }}>{tk}</div>
                  {s.reason && <div style={{ fontSize: 8, color: '#7a90b8',
                    fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
                    lineHeight: 1.5 }}>{s.reason?.slice(0, 80)}</div>}
                </div>
                {s.signal && (
                  <div style={{ padding: '3px 8px', borderRadius: 6, fontSize: 8,
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 900,
                    background: `${c}15`, border: `1px solid ${c}33`, color: c }}>
                    {s.signal}
                  </div>
                )}
              </div>
            );
          })}
        </Glass>
      )}

      {/* Portfolio signals */}
      {analysis.portfolioSignal && (
        <Glass glow="rgba(255,204,0,0.08)">
          <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 3, color: '#ffcc00', marginBottom: 12 }}>YOUR PORTFOLIO SIGNALS</div>
          {['NET', 'CEG', 'GLNG'].map(tk => {
            const sig  = analysis.portfolioSignal[tk];
            if (!sig) return null;
            const curr = snap.usPrices?.[tk];
            const avgs = { NET: 208.62, CEG: 310.43, GLNG: 50.93 };
            const pct  = curr ? ((curr - avgs[tk]) / avgs[tk] * 100) : 0;
            const pos  = pct >= 0;
            const ac   = sig.action === 'BUY' || sig.action === 'ADD' ? '#00ffaa'
              : sig.action === 'SELL' ? '#ff2244' : '#ffcc00';
            return (
              <div key={tk} style={{ display: 'flex', gap: 12, padding: '10px 0',
                borderBottom: tk !== 'GLNG' ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ minWidth: 55 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#e8f0fe',
                    fontFamily: 'JetBrains Mono, monospace' }}>{tk}</div>
                  {curr && <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                    color: pos ? '#00ffaa' : '#ff2244', marginTop: 2 }}>
                    ${curr.toFixed(2)} <span style={{ fontSize: 9 }}>
                      {pos ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%
                    </span>
                  </div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 5,
                    background: `${ac}15`, border: `1px solid ${ac}33`, color: ac,
                    fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 900, marginBottom: 4 }}>{sig.action}</div>
                  <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                    color: '#7a90b8', lineHeight: 1.5 }}>{sig.reason}</div>
                  {sig.stop_loss && <div style={{ fontSize: 8, color: '#3a4d6e',
                    fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                    SL ${sig.stop_loss} · TP ${sig.target}
                  </div>}
                </div>
              </div>
            );
          })}
        </Glass>
      )}

      {/* NSE Movers */}
      {snap.gainers?.length > 0 && (
        <Glass>
          <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 3, color: '#7a90b8', marginBottom: 12 }}>NSE MOVERS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[{ list: snap.gainers, c: '#00ffaa', label: 'GAINERS' },
              { list: snap.losers,  c: '#ff2244', label: 'LOSERS'  }].map(({ list, c, label }) => (
              <div key={label}>
                <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                  color: c, letterSpacing: 2, marginBottom: 8 }}>{label}</div>
                {(list || []).slice(0, 5).map(s => (
                  <div key={s.symbol} style={{ display: 'flex', justifyContent: 'space-between',
                    padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                      color: '#e8f0fe' }}>{s.symbol}</span>
                    <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                      color: c, fontWeight: 700 }}>
                      {label === 'GAINERS' ? '+' : ''}{parseFloat(s.pChange).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Glass>
      )}
    </div>
  );
}

// ── OPPORTUNITIES TAB ─────────────────────────────────────────
function OpportunitiesTab({ data }) {
  const [search,  setSearch]  = useState('');
  const [minS,    setMinS]    = useState(50);
  const [country, setCountry] = useState('ALL');
  const [exp,     setExp]     = useState(null);

  const snap    = data?.snap     || {};
  const analysis= data?.analysis || {};
  const regime  = snap.regime    || 'SIDEWAYS';
  const rm      = REGIME[regime] || REGIME.SIDEWAYS;
  const scores  = analysis.scores?.scores || {};
  const top5    = analysis.scores?.top5   || [];

  const US = new Set(['NET','CEG','GLNG','NVDA','MSFT','AAPL','GOOGL','META','AMZN',
    'TSLA','JPM','GS','XOM','LNG','GLD','QQQ','SPY','PLTR','AMD','AVGO','CRM']);

  const list = Object.entries(scores)
    .filter(([tk, s]) => {
      if (s.score < minS) return false;
      const isUS = US.has(tk) || s.country === 'US';
      if (country === 'US' && !isUS) return false;
      if (country === 'IN' && isUS) return false;
      if (search) {
        const q = search.toLowerCase();
        return tk.toLowerCase().includes(q) || (s.reason||'').toLowerCase().includes(q) || (s.sector||'').toLowerCase().includes(q);
      }
      return true;
    })
    .map(([tk, s]) => ({ tk, ...s, isTop: top5.includes(tk), isUS: US.has(tk) }))
    .sort((a, b) => b.score - a.score);

  // Sector heatmap
  const sectors = Object.values(scores).reduce((m, s) => {
    const sec = (s.sector || 'Other').split(' ')[0].slice(0, 10);
    if (!m[sec]) m[sec] = { sum: 0, n: 0 };
    m[sec].sum += s.score; m[sec].n++;
    return m;
  }, {});
  const heatmap = Object.entries(sectors)
    .map(([s, d]) => ({ s, avg: Math.round(d.sum / d.n), n: d.n }))
    .sort((a, b) => b.avg - a.avg).slice(0, 12);

  const sc = s => s >= 75 ? '#00ffaa' : s >= 60 ? '#4f8ef7' : s >= 45 ? '#ffcc00' : '#ff2244';

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 90 }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, padding: '10px 14px',
        background: 'rgba(5,8,16,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#e8f0fe',
              fontFamily: 'JetBrains Mono, monospace' }}>OPPORTUNITIES</span>
            <span style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
              color: '#3a4d6e', marginLeft: 8 }}>{list.length} · {regime}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['ALL','IN','US'].map(c => (
              <button key={c} onClick={() => setCountry(c)} style={{
                padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                border: `1px solid ${country === c ? rm.color + '66' : 'rgba(255,255,255,0.06)'}`,
                background: country === c ? `${rm.color}15` : 'transparent',
                color: country === c ? rm.color : '#3a4d6e',
              }}>{c}</button>
            ))}
          </div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search stock, sector, reason..."
          style={{ width: '100%', padding: '8px 12px', borderRadius: 10, outline: 'none',
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
            color: '#e8f0fe', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
            boxSizing: 'border-box', marginBottom: 8 }}/>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[0,40,50,60,70,80].map(s => (
            <button key={s} onClick={() => setMinS(s)} style={{
              padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
              fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
              border: `1px solid ${minS === s ? rm.color + '66' : 'rgba(255,255,255,0.06)'}`,
              background: minS === s ? `${rm.color}15` : 'transparent',
              color: minS === s ? rm.color : '#3a4d6e',
            }}>{s === 0 ? 'ALL' : `${s}+`}</button>
          ))}
        </div>
      </div>

      {/* Sector heatmap */}
      {heatmap.length > 0 && (
        <div style={{ margin: '10px 14px 0', background: 'rgba(8,12,24,0.7)',
          backdropFilter: 'blur(20px)', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.06)', padding: 12 }}>
          <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 3, color: '#4f8ef7', marginBottom: 10 }}>SECTOR HEATMAP</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {heatmap.map(h => {
              const c = sc(h.avg);
              return (
                <div key={h.s} onClick={() => setSearch(h.s)} style={{
                  padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${c}33`, background: `${c}0a`,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                    color: '#7a90b8' }}>{h.s}</div>
                  <div style={{ fontSize: 16, fontWeight: 900,
                    fontFamily: 'JetBrains Mono, monospace', color: c,
                    textShadow: `0 0 10px ${c}66` }}>{h.avg}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock list */}
      <div style={{ padding: '8px 14px 0' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40 }}>◉</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#3a4d6e',
              fontSize: 10, marginTop: 8 }}>No stocks match filters</div>
          </div>
        ) : list.map((inst, idx) => {
          const isExp = exp === inst.tk;
          const c = sc(inst.score);
          const cal = inst.calibration || {};
          const bR  = cal.base_returns?.[regime];
          const ac  = (inst.signal||'').includes('BUY') || (inst.signal||'').includes('ADD')
            ? '#00ffaa' : (inst.signal||'').includes('AVOID') ? '#ff2244' : '#ffcc00';

          return (
            <div key={inst.tk} onClick={() => setExp(isExp ? null : inst.tk)}
              style={{ background: 'rgba(8,12,24,0.7)', backdropFilter: 'blur(20px)',
                borderRadius: 14, cursor: 'pointer', marginBottom: 6, padding: '12px 14px',
                border: `1px solid ${isExp ? c + '44' : 'rgba(255,255,255,0.05)'}`,
                boxShadow: isExp ? `0 0 20px ${c}15` : 'none',
                transition: 'all 0.25s ease' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                  color: '#3a4d6e', width: 20, paddingTop: 3, flexShrink: 0 }}>
                  {inst.isTop ? '★' : `#${idx+1}`}
                </div>
                <ScoreRing score={inst.score} size={42}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#e8f0fe',
                      fontFamily: 'JetBrains Mono, monospace' }}>{inst.tk}</span>
                    {inst.signal && (
                      <span style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                        padding: '2px 6px', borderRadius: 4, fontWeight: 900,
                        background: `${ac}15`, border: `1px solid ${ac}33`, color: ac }}>
                        {inst.signal}
                      </span>
                    )}
                    {inst.isUS && (
                      <span style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                        padding: '2px 6px', borderRadius: 4,
                        background: 'rgba(255,204,0,0.1)', border: '1px solid rgba(255,204,0,0.3)',
                        color: '#ffcc00' }}>US</span>
                    )}
                  </div>
                  <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                    color: '#7a90b8', marginTop: 2 }}>
                    {inst.sector}
                    {inst.last_price && <span style={{ color: '#3a4d6e' }}>
                      · {inst.isUS ? '$' : '₹'}{inst.last_price?.toLocaleString('en-IN')}
                    </span>}
                  </div>
                </div>
              </div>

              {/* Animated score bar */}
              <div style={{ marginTop: 8, height: 2, background: 'rgba(255,255,255,0.05)',
                borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${inst.score}%`, background: c,
                  borderRadius: 1, boxShadow: `0 0 8px ${c}`,
                  transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}/>
              </div>

              {/* Quick stats */}
              {bR !== undefined && (
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  <span style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                    color: '#3a4d6e' }}>
                    Exp <span style={{ color: bR >= 0 ? '#00ffaa' : '#ff2244' }}>
                      {bR >= 0 ? '+' : ''}{bR?.toFixed(0)}%
                    </span>
                  </span>
                  {cal.source === 'calculated' && (
                    <span style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                      color: '#00ffaa66' }}>✓ REAL DATA</span>
                  )}
                </div>
              )}

              {inst.reason && (
                <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                  color: '#7a90b8', marginTop: 6, lineHeight: 1.6 }}>
                  {inst.reason?.slice(0, 100)}
                </div>
              )}

              {/* Expanded */}
              {isExp && (
                <div style={{ marginTop: 12, paddingTop: 12,
                  borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  {cal.base_returns && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                        letterSpacing: 2, color: '#4f8ef7', marginBottom: 8 }}>
                        REGIME RETURNS · {cal.source === 'calculated' ? '✓ REAL' : '~ EST'}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {Object.entries(cal.base_returns).map(([r, ret]) => (
                          <div key={r} style={{ padding: '4px 8px', borderRadius: 6,
                            fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${r === regime ? c + '55' : 'rgba(255,255,255,0.06)'}`,
                            color: r === regime ? c : '#3a4d6e' }}>
                            {r.replace('_',' ')}: <b>{ret >= 0 ? '+' : ''}{ret}%</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {inst.valuation && Object.keys(inst.valuation).length > 0 && (
                    <div>
                      <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                        letterSpacing: 2, color: '#00c8e0', marginBottom: 8 }}>VALUATION</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {[
                          { l: 'P/E', v: inst.valuation.pe?.toFixed(1) },
                          { l: 'P/B', v: inst.valuation.pb?.toFixed(1) },
                          { l: 'ROE', v: inst.valuation.roe ? `${inst.valuation.roe.toFixed(0)}%` : null },
                          { l: 'D/E', v: inst.valuation.de?.toFixed(2) },
                        ].filter(x => x.v).map(x => (
                          <div key={x.l} style={{ background: 'rgba(255,255,255,0.03)',
                            borderRadius: 7, padding: '5px 8px',
                            border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                              color: '#3a4d6e' }}>{x.l}</div>
                            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                              color: '#e8f0fe', fontWeight: 700 }}>{x.v}</div>
                          </div>
                        ))}
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
  const snap   = data?.snap  || {};
  const usdInr = snap.usdInr || 86;
  const prices = snap.usPrices || {};

  const holdings = [
    { tk: 'NET',  qty: 1.066992, avg: 208.62, name: 'Cloudflare',          sector: 'Cloud Security' },
    { tk: 'CEG',  qty: 0.714253, avg: 310.43, name: 'Constellation Energy', sector: 'Nuclear Energy' },
    { tk: 'GLNG', qty: 3.489692, avg: 50.93,  name: 'Golar LNG',            sector: 'LNG Shipping'  },
  ];

  const totalInvested = holdings.reduce((s, h) => s + h.avg * h.qty * usdInr, 0);
  const totalCurrent  = holdings.reduce((s, h) => s + (prices[h.tk] || h.avg) * h.qty * usdInr, 0);
  const totalPL       = totalCurrent - totalInvested;
  const totalPct      = totalInvested > 0 ? (totalPL / totalInvested * 100) : 0;
  const pos           = totalPL >= 0;

  // Build mini chart data (simulated from holdings)
  const chartPts = holdings.map(h => {
    const curr = prices[h.tk] || h.avg;
    return ((curr - h.avg) / h.avg * 100);
  });

  return (
    <div style={{ padding: '14px 14px 90px' }}>

      {/* Total P&L Card */}
      <div style={{ background: pos
        ? 'radial-gradient(ellipse at top, rgba(0,255,170,0.08), transparent)'
        : 'radial-gradient(ellipse at top, rgba(255,34,68,0.08), transparent)',
        border: `1px solid ${pos ? 'rgba(0,255,170,0.2)' : 'rgba(255,34,68,0.2)'}`,
        borderRadius: 20, padding: '20px', marginBottom: 10,
        boxShadow: `0 0 30px ${pos ? 'rgba(0,255,170,0.1)' : 'rgba(255,34,68,0.1)'}` }}>
        <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: 3, color: '#7a90b8', marginBottom: 8 }}>PORTFOLIO PERFORMANCE</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace',
              color: pos ? '#00ffaa' : '#ff2244',
              textShadow: `0 0 20px ${pos ? '#00ffaa' : '#ff2244'}` }}>
              {pos ? '+' : ''}₹{(Math.abs(totalPL)/1000).toFixed(1)}K
            </div>
            <div style={{ fontSize: 14, fontFamily: 'JetBrains Mono, monospace',
              color: pos ? '#00ffaa88' : '#ff224488', marginTop: 2 }}>
              {pos ? '▲' : '▼'} {Math.abs(totalPct).toFixed(2)}%
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              color: '#3a4d6e' }}>INVESTED</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              color: '#7a90b8' }}>₹{(totalInvested/1000).toFixed(1)}K</div>
            <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              color: '#3a4d6e', marginTop: 4 }}>USD/INR {usdInr.toFixed(2)}</div>
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16, alignItems: 'flex-end', height: 40 }}>
          {holdings.map((h, i) => {
            const curr = prices[h.tk] || h.avg;
            const pct  = (curr - h.avg) / h.avg * 100;
            const ht   = Math.min(40, Math.max(4, Math.abs(pct) * 3));
            const c    = pct >= 0 ? '#00ffaa' : '#ff2244';
            return (
              <div key={h.tk} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                  color: c }}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</div>
                <div style={{ width: '100%', height: ht, background: c,
                  borderRadius: 3, boxShadow: `0 0 8px ${c}66`,
                  transition: 'height 0.8s ease' }}/>
                <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                  color: '#7a90b8' }}>{h.tk}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual holdings */}
      {holdings.map(h => {
        const curr  = prices[h.tk] || h.avg;
        const plUSD = (curr - h.avg) * h.qty;
        const plINR = plUSD * usdInr;
        const plPct = (curr - h.avg) / h.avg * 100;
        const pos   = plINR >= 0;
        const c     = pos ? '#00ffaa' : '#ff2244';

        return (
          <Glass key={h.tk} glow={pos ? 'rgba(0,255,170,0.06)' : 'rgba(255,34,68,0.06)'}
            style={{ border: `1px solid ${c}18` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#e8f0fe',
                  fontFamily: 'JetBrains Mono, monospace' }}>{h.tk}</div>
                <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                  color: '#7a90b8' }}>{h.name}</div>
                <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                  color: '#3a4d6e', marginTop: 2 }}>{h.sector}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace',
                  color: c, textShadow: `0 0 15px ${c}` }}>
                  {pos ? '+' : ''}₹{Math.round(Math.abs(plINR)).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: c }}>
                  {pos ? '▲' : '▼'} {Math.abs(plPct).toFixed(2)}%
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
              gap: 8, marginTop: 12 }}>
              {[
                { l: 'QTY',    v: h.qty.toFixed(3) },
                { l: 'AVG',    v: `$${h.avg}` },
                { l: 'CURRENT',v: `$${curr.toFixed(2)}` },
              ].map(x => (
                <div key={x.l} style={{ background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8, padding: '8px 10px',
                  border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                    color: '#3a4d6e', letterSpacing: 1 }}>{x.l}</div>
                  <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
                    color: '#e8f0fe', fontWeight: 700, marginTop: 2 }}>{x.v}</div>
                </div>
              ))}
            </div>
          </Glass>
        );
      })}
    </div>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────
function SettingsTab({ refresh, ts }) {
  const [msg,  setMsg]  = useState('');
  const [busy, setBusy] = useState(false);

  const trigger = async (type = 'morning') => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`${API}/api/refresh${type === 'recalibrate' ? '?type=recalibrate' : ''}`);
      const d = await r.json();
      setMsg(d.ok ? '✅ Started — check back in 5 min' : `❌ ${d.error}`);
      if (d.ok) setTimeout(() => refresh(true), 8000);
    } catch(e) { setMsg(`❌ ${e.message}`); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ padding: '14px 14px 90px' }}>
      <Glass>
        <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: 3, color: '#4f8ef7', marginBottom: 14 }}>MANUAL REFRESH</div>
        <button onClick={() => trigger()} disabled={busy} style={{
          width: '100%', padding: 14, borderRadius: 12, border: 'none',
          background: busy ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #00ffaa, #4f8ef7)',
          color: busy ? '#3a4d6e' : '#050810', fontWeight: 900,
          fontSize: 13, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
          marginBottom: 8, boxShadow: busy ? 'none' : '0 0 20px rgba(0,255,170,0.3)',
          transition: 'all 0.2s' }}>
          {busy ? '⏳ RUNNING...' : '⚡ REFRESH NOW'}
        </button>
        <button onClick={() => trigger('recalibrate')} disabled={busy} style={{
          width: '100%', padding: 12, borderRadius: 12, cursor: 'pointer',
          border: '1px solid rgba(255,204,0,0.3)', background: 'rgba(255,204,0,0.06)',
          color: '#ffcc00', fontWeight: 700, fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
          🔄 FULL RECALIBRATION (20 min)
        </button>
        {msg && <div style={{ padding: '10px 12px', borderRadius: 8, fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          background: msg.startsWith('✅') ? 'rgba(0,255,170,0.08)' : 'rgba(255,34,68,0.08)',
          border: `1px solid ${msg.startsWith('✅') ? 'rgba(0,255,170,0.2)' : 'rgba(255,34,68,0.2)'}`,
          color: msg.startsWith('✅') ? '#00ffaa' : '#ff2244' }}>{msg}</div>}
        {ts && <div style={{ marginTop: 8, fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
          color: '#3a4d6e' }}>Last fetch: {ts.toLocaleTimeString('en-IN')}</div>}
      </Glass>

      <Glass>
        <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: 3, color: '#7a90b8', marginBottom: 12 }}>SYSTEM STATUS</div>
        {[
          { l: 'Backend',     v: 'Render · Singapore',    c: '#00ffaa' },
          { l: 'Storage',     v: 'Backblaze B2 · 1TB',    c: '#00ffaa' },
          { l: 'Database',    v: 'Firebase — DELETED',     c: '#ff2244' },
          { l: 'Scoring',     v: 'Python GARCH Engine',    c: '#4f8ef7' },
          { l: 'News',        v: '196 stocks · 15min cycle',c: '#4f8ef7' },
          { l: 'Schedule',    v: '6× daily auto-refresh',  c: '#7a90b8' },
          { l: 'Monthly cost',v: '~$20 fixed',             c: '#00ffaa' },
        ].map(x => (
          <div key={x.l} style={{ display: 'flex', justifyContent: 'space-between',
            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              color: '#7a90b8' }}>{x.l}</span>
            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              color: x.c, fontWeight: 700 }}>{x.v}</span>
          </div>
        ))}
      </Glass>
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────
function Nav({ tab, setTab }) {
  const tabs = [
    { id: 'dashboard',     icon: '◈', label: 'RADAR' },
    { id: 'opportunities', icon: '◎', label: 'PICKS' },
    { id: 'portfolio',     icon: '◇', label: 'PORT' },
    { id: 'settings',      icon: '⊙', label: 'SYS' },
  ];
  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 100,
      background: 'rgba(5,8,16,0.9)', backdropFilter: 'blur(30px)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', justifyContent: 'space-around',
      padding: '10px 0 max(12px,env(safe-area-inset-bottom))' }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 16px', borderRadius: 10,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1,
              color: active ? '#00ffaa' : '#3a4d6e',
              textShadow: active ? '0 0 10px #00ffaa' : 'none',
              transform: active ? 'scale(1.2)' : 'scale(1)',
              transition: 'all 0.2s ease' }}>{t.icon}</span>
            <span style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 1, fontWeight: 900,
              color: active ? '#00ffaa' : '#3a4d6e',
              transition: 'color 0.2s' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const { data, loading, error, ts, refresh } = useData();

  if (loading && !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#050810', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ fontSize: 48, animation: 'spin 3s linear infinite' }}>◉</div>
        <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
          color: '#00ffaa', letterSpacing: 4, textShadow: '0 0 20px #00ffaa' }}>
          INVESTMENT RADAR PRO
        </div>
        <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
          color: '#3a4d6e', letterSpacing: 2 }}>INITIALIZING...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050810', color: '#e8f0fe',
      maxWidth: 480, margin: '0 auto', position: 'relative',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(0,255,170,0.03) 0%, transparent 60%)',
    }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,8,16,0.9)', backdropFilter: 'blur(30px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '12px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 2,
            fontFamily: 'JetBrains Mono, monospace', color: '#e8f0fe' }}>
            <span style={{ color: '#00ffaa', textShadow: '0 0 10px #00ffaa' }}>◈</span>{' '}
            INVESTMENT RADAR
          </div>
          <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
            color: '#3a4d6e', letterSpacing: 2 }}>
            PRO · {data?.snap?.regime || '—'} · v6
          </div>
        </div>
        <button onClick={() => refresh()} disabled={loading}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(0,255,170,0.2)',
            background: loading ? 'transparent' : 'rgba(0,255,170,0.08)',
            color: loading ? '#3a4d6e' : '#00ffaa',
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            fontSize: 10, cursor: 'pointer', letterSpacing: 1,
            transition: 'all 0.2s' }}>
          {loading ? '...' : '↺'}
        </button>
      </div>

      {/* Content */}
      <div style={{ overflowY: 'auto', paddingBottom: 70 }}>
        {tab === 'dashboard'     && <DashboardTab     data={data} />}
        {tab === 'opportunities' && <OpportunitiesTab data={data} />}
        {tab === 'portfolio'     && <PortfolioTab     data={data} />}
        {tab === 'settings'      && <SettingsTab      refresh={refresh} ts={ts} />}
      </div>

      <Nav tab={tab} setTab={setTab} />
    </div>
  );
}
