import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'https://investment-radar-backend.onrender.com';

// ── DIMENSION CONSTANTS ───────────────────────────────────────
const DIM = {
  BULL:      { label: 'BULL',      color: '#00ffcc', glow: '#00ffcc', dim: '5th — Ascending', icon: '↑' },
  SOFT_BULL: { label: 'SOFT BULL', color: '#00b4ff', glow: '#00b4ff', dim: '4th — Lifting',   icon: '↗' },
  SIDEWAYS:  { label: 'SIDEWAYS',  color: '#ffcc00', glow: '#ffcc00', dim: '3rd — Stable',    icon: '→' },
  SOFT_BEAR: { label: 'SOFT BEAR', color: '#ff8c00', glow: '#ff8c00', dim: '2nd — Falling',   icon: '↘' },
  BEAR:      { label: 'BEAR',      color: '#ff2d78', glow: '#ff2d78', dim: '1st — Collapse',  icon: '↓' },
};

// ── PARKED QUESTIONS STORE ────────────────────────────────────
const PARKED = { questions: [] };

// ── DATA HOOK ─────────────────────────────────────────────────
function useData() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [ts,      setTs]      = useState(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`${API}/api/snapshot`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
      setTs(new Date());
      setError(null);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => refresh(true), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, loading, error, ts, refresh };
}

// ── ANIMATED COUNTER ──────────────────────────────────────────
function Counter({ value, prefix = '', suffix = '', decimals = 0, color, size = 20 }) {
  const [disp, setDisp] = useState(0);
  const target = parseFloat(value) || 0;
  useEffect(() => {
    let cur = disp, raf;
    const step = () => {
      cur += (target - cur) * 0.15;
      if (Math.abs(target - cur) < 0.005) cur = target;
      setDisp(cur);
      if (cur !== target) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  const fmt = decimals > 0
    ? Math.abs(disp).toFixed(decimals)
    : Math.abs(Math.round(disp)).toLocaleString('en-IN');
  return (
    <span style={{ color, fontSize: size, fontWeight: 700,
      fontFamily: 'JetBrains Mono, monospace',
      textShadow: color ? `0 0 20px ${color}88` : 'none',
      animation: 'number-tick 0.3s ease' }}>
      {disp < 0 ? '-' : ''}{prefix}{fmt}{suffix}
    </span>
  );
}

// ── DIMENSIONAL ORB ───────────────────────────────────────────
function DimOrbs({ regime }) {
  const d = DIM[regime] || DIM.SIDEWAYS;
  return (
    <>
      <div className="orb" style={{ width: 300, height: 300, top: -100, right: -100,
        background: `radial-gradient(circle, ${d.color}22, transparent 70%)`,
        animationDuration: '15s' }}/>
      <div className="orb" style={{ width: 200, height: 200, bottom: '20%', left: -60,
        background: `radial-gradient(circle, #7b2fff22, transparent 70%)`,
        animationDuration: '20s', animationDelay: '-7s' }}/>
      <div className="orb" style={{ width: 150, height: 150, top: '40%', right: '10%',
        background: `radial-gradient(circle, #00b4ff18, transparent 70%)`,
        animationDuration: '18s', animationDelay: '-3s' }}/>
    </>
  );
}

// ── DIMENSIONAL SCORE ─────────────────────────────────────────
function DimScore({ score, size = 52 }) {
  const c = score >= 75 ? '#00ffcc' : score >= 60 ? '#00b4ff' : score >= 45 ? '#ffcc00' : '#ff2d78';
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={`${c}18`} strokeWidth="2.5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={c} strokeWidth="2.5"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)',
            filter: `drop-shadow(0 0 6px ${c})` }}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: size > 44 ? 13 : 11, fontWeight: 900, color: c,
        fontFamily: 'JetBrains Mono, monospace' }}>
        {score}
      </div>
    </div>
  );
}

// ── HYPERSPACE LINE ───────────────────────────────────────────
function HyperLine({ data, color, width = 100, height = 36, label }) {
  if (!data || data.length < 2) return (
    <div style={{ width, height, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 8, color: '#1e2545',
      fontFamily: 'JetBrains Mono, monospace' }}>NO DATA</div>
  );
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastUp = data[data.length - 1] >= data[0];
  const c = lastUp ? color || '#00ffcc' : '#ff2d78';
  const id = `grad-${Math.random().toString(36).slice(2,8)}`;
  return (
    <svg width={width} height={height} overflow="visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={c} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon points={`0,${height} ${pts} ${width},${height}`}
        fill={`url(#${id})`}/>
      {/* Line */}
      <polyline points={pts} fill="none" stroke={c} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${c})` }}/>
      {/* Last dot */}
      <circle cx={(data.length-1)/(data.length-1)*width}
        cy={height-4-((data[data.length-1]-min)/range)*(height-8)}
        r="3" fill={c} style={{ filter: `drop-shadow(0 0 6px ${c})` }}/>
    </svg>
  );
}

// ── GLASS PANEL ───────────────────────────────────────────────
function Panel({ children, style, glow, onClick, animate }) {
  return (
    <div onClick={onClick} style={{
      background: 'rgba(13,17,40,0.65)',
      backdropFilter: 'blur(24px)',
      border: `1px solid ${glow ? `${glow}30` : 'rgba(123,47,255,0.12)'}`,
      borderRadius: 20, padding: '16px 18px', marginBottom: 10,
      boxShadow: glow ? `0 0 40px ${glow}12, inset 0 0 20px ${glow}06` : 'none',
      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      cursor: onClick ? 'pointer' : 'default',
      animation: animate ? 'slide-up 0.4s ease' : 'none',
      position: 'relative', overflow: 'hidden',
      ...style,
    }}>
      {glow && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${glow}44, transparent)` }}/>
      )}
      {children}
    </div>
  );
}

// ── LABEL ─────────────────────────────────────────────────────
function Label({ children, color = '#4a5680' }) {
  return (
    <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
      letterSpacing: 3, color, fontWeight: 600, textTransform: 'uppercase',
      marginBottom: 10 }}>{children}</div>
  );
}

// ── PILL ──────────────────────────────────────────────────────
function Pill({ children, color, small }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center',
      padding: small ? '2px 7px' : '4px 10px',
      borderRadius: 20, fontSize: small ? 8 : 9,
      fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
      border: `1px solid ${color}33`,
      background: `${color}12`, color,
      textShadow: `0 0 10px ${color}66` }}>
      {children}
    </span>
  );
}

// ── PER-STOCK AI CHAT ─────────────────────────────────────────
function StockChat({ symbol, data, onClose }) {
  const [msgs,  setMsgs]  = useState([
    { role: 'ai', text: `I know everything about ${symbol} in the current ${data?.snap?.regime || 'SIDEWAYS'} regime. Ask me anything — price targets, risks, probability, why this score, what to do. If I don't know, I'll park it.` }
  ]);
  const [input, setInput] = useState('');
  const [busy,  setBusy]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async (question) => {
    const q = question || input.trim();
    if (!q || busy) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', text: q }]);
    setBusy(true);

    try {
      const snap      = data?.snap     || {};
      const analysis  = data?.analysis || {};
      const scores    = analysis.scores?.scores || {};
      const stockData = scores[symbol] || {};
      const cal       = stockData.calibration || {};
      const regime    = snap.regime || 'SIDEWAYS';
      const bR        = cal.base_returns?.[regime];
      const sigma     = cal.sigma?.[regime];
      const isUS      = ['NET','CEG','GLNG','NVDA','MSFT','AAPL'].includes(symbol);
      const price     = isUS ? snap.usPrices?.[symbol] : stockData.last_price;
      const avgs      = { NET: 208.62, CEG: 310.43, GLNG: 50.93 };
      const avgPrice  = avgs[symbol];
      const plPct     = avgPrice && price ? ((price - avgPrice) / avgPrice * 100).toFixed(1) : null;

      const context = `
Stock: ${symbol} | Sector: ${stockData.sector || 'Unknown'}
Score: ${stockData.score || '--'}/100 | Signal: ${stockData.signal || '--'}
Regime: ${regime} (Score ${snap.regime_score || 0}/5)
Price: ${isUS ? '$' : '₹'}${price || '--'} ${plPct ? `(${plPct}% vs avg)` : ''}
Expected return in ${regime}: ${bR !== undefined ? `${bR >= 0 ? '+' : ''}${bR}%` : 'unknown'}
Volatility σ: ${sigma ? `${(sigma*100).toFixed(0)}%/yr` : 'unknown'}
Calibration: ${cal.source || 'fallback'}
Score reason: ${stockData.reason || 'Not available'}
FII flow: ${snap.fii?.fii_net ? `${snap.fii.fii_net >= 0 ? '+' : ''}${Math.round(snap.fii.fii_net)} Cr` : '--'}
VIX: ${snap.indices?.['INDIA VIX']?.last?.toFixed(1) || '--'}
Regime narrative: ${(analysis.regimeNarrative || '').slice(0, 200)}
      `.trim();

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a hyper-intelligent investment AI for Investment Radar Pro. You have deep knowledge of ${symbol} and current market conditions. Answer questions directly, specifically, with numbers. Be concise (3-5 sentences max). If you genuinely don't know something, say "PARKING THIS: [restate the question]" — do not make up answers. Never add disclaimers or say "consult a financial advisor".`,
          messages: [
            { role: 'user', content: `Context about ${symbol}:\n${context}\n\nQuestion: ${q}` }
          ],
        }),
      });

      const d = await res.json();
      const answer = d.content?.[0]?.text || 'Unable to get response.';

      // Check if parked
      if (answer.includes('PARKING THIS:')) {
        const parked = answer.replace('PARKING THIS:', '').trim();
        PARKED.questions.push({ symbol, question: q, parked, ts: new Date().toISOString() });
      }

      setMsgs(m => [...m, { role: 'ai', text: answer }]);
    } catch(e) {
      setMsgs(m => [...m, { role: 'ai', text: `Error: ${e.message}` }]);
    } finally { setBusy(false); }
  };

  const suggestions = [
    'Should I buy, hold or sell?',
    'What is the win probability?',
    'Why is the score this high/low?',
    'What are the main risks?',
    'What price target in 3 months?',
  ];

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid rgba(123,47,255,0.15)',
      paddingTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 10 }}>
        <Label color="#7b2fff">ASK ABOUT {symbol}</Label>
        <button onClick={onClose} style={{ background: 'none', border: 'none',
          color: '#4a5680', fontSize: 14, cursor: 'pointer', padding: '0 4px' }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10,
        display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
            padding: '8px 12px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: m.role === 'user' ? 'rgba(123,47,255,0.25)' : 'rgba(0,180,255,0.1)',
            border: `1px solid ${m.role === 'user' ? 'rgba(123,47,255,0.4)' : 'rgba(0,180,255,0.2)'}`,
            fontSize: 10, lineHeight: 1.6, color: m.role === 'user' ? '#c4a8ff' : '#a0c8e8',
            fontFamily: m.role === 'user' ? 'Space Grotesk' : 'JetBrains Mono, monospace',
            animation: 'slide-up 0.2s ease',
          }}>
            {m.text.includes('PARKING THIS') ? (
              <div>
                <span style={{ color: '#ffcc00', fontWeight: 700 }}>📌 PARKED: </span>
                {m.text.replace('PARKING THIS:', '').trim()}
              </div>
            ) : m.text}
          </div>
        ))}
        {busy && (
          <div style={{ alignSelf: 'flex-start', padding: '8px 12px',
            background: 'rgba(0,180,255,0.08)', borderRadius: '14px 14px 14px 4px',
            fontSize: 10, color: '#4a5680', fontFamily: 'JetBrains Mono, monospace',
            border: '1px solid rgba(0,180,255,0.15)' }}>
            thinking across dimensions...
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick suggestions */}
      {msgs.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => send(s)} style={{
              padding: '3px 8px', borderRadius: 8,
              border: '1px solid rgba(123,47,255,0.2)',
              background: 'rgba(123,47,255,0.06)',
              color: '#4a5680', fontSize: 8,
              fontFamily: 'Space Grotesk, sans-serif',
              transition: 'all 0.2s',
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Ask anything about ${symbol}...`}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 10, outline: 'none',
            border: '1px solid rgba(123,47,255,0.25)',
            background: 'rgba(123,47,255,0.08)',
            color: '#e0e8ff', fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace' }}/>
        <button onClick={() => send()} disabled={busy || !input.trim()} style={{
          padding: '8px 14px', borderRadius: 10, border: 'none',
          background: busy || !input.trim() ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #7b2fff, #00b4ff)',
          color: busy || !input.trim() ? '#4a5680' : '#fff',
          fontWeight: 700, fontSize: 11, transition: 'all 0.2s',
          boxShadow: busy || !input.trim() ? 'none' : '0 0 20px rgba(123,47,255,0.4)',
        }}>{busy ? '...' : '→'}</button>
      </div>

      {/* Park status */}
      {PARKED.questions.filter(q => q.symbol === symbol).length > 0 && (
        <div style={{ marginTop: 8, fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
          color: '#ffcc0088' }}>
          📌 {PARKED.questions.filter(q => q.symbol === symbol).length} question(s) parked for {symbol}
        </div>
      )}
    </div>
  );
}

// ── STOCK CARD ────────────────────────────────────────────────
function StockCard({ inst, idx, regime, snap }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const c = inst.score >= 75 ? '#00ffcc' : inst.score >= 60 ? '#00b4ff' : inst.score >= 45 ? '#ffcc00' : '#ff2d78';
  const cal = inst.calibration || {};
  const bR  = cal.base_returns?.[regime];
  const sig = inst.signal || '';
  const sigC = sig.includes('BUY') || sig.includes('ADD') ? '#00ffcc'
    : sig.includes('AVOID') || sig.includes('SELL') ? '#ff2d78' : '#ffcc00';
  const isTop = inst.isTop;

  return (
    <Panel glow={chatOpen ? c : undefined} animate
      style={{ marginBottom: 8, padding: '14px 16px' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
        onClick={() => setExpanded(!expanded)}>
        <DimScore score={inst.score} size={50}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#e0e8ff',
              fontFamily: 'Space Grotesk, sans-serif' }}>{inst.tk}</span>
            {isTop && <span style={{ fontSize: 10 }}>★</span>}
            {sig && <Pill color={sigC} small>{sig}</Pill>}
            {inst.isUS && <Pill color="#ffcc00" small>US</Pill>}
          </div>
          <div style={{ fontSize: 9, color: '#4a5680', marginTop: 2,
            fontFamily: 'JetBrains Mono, monospace' }}>
            {inst.sector}
            {inst.last_price && (
              <span style={{ color: '#1e2545', marginLeft: 6 }}>
                {inst.isUS ? '$' : '₹'}{inst.last_price?.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Score bar */}
          <div style={{ marginTop: 8, height: 2,
            background: 'rgba(255,255,255,0.04)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${inst.score}%`,
              background: `linear-gradient(90deg, ${c}88, ${c})`,
              borderRadius: 1, boxShadow: `0 0 8px ${c}66`,
              transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }}/>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            {bR !== undefined && (
              <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                color: bR >= 0 ? '#00ffcc' : '#ff2d78' }}>
                {bR >= 0 ? '+' : ''}{bR?.toFixed(0)}% exp
              </span>
            )}
            {cal.source === 'calculated' && (
              <span style={{ fontSize: 8, color: '#00ffcc44',
                fontFamily: 'JetBrains Mono, monospace' }}>✓ REAL</span>
            )}
          </div>
        </div>

        {/* Chat button */}
        <button onClick={e => { e.stopPropagation(); setChatOpen(!chatOpen); }}
          style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${chatOpen ? '#7b2fff' : 'rgba(123,47,255,0.2)'}`,
            background: chatOpen ? 'rgba(123,47,255,0.2)' : 'rgba(123,47,255,0.06)',
            color: chatOpen ? '#c4a8ff' : '#7b2fff',
            fontSize: 10, fontWeight: 700, flexShrink: 0,
            transition: 'all 0.2s',
            fontFamily: 'Space Grotesk, sans-serif' }}>
          {chatOpen ? '× ASK' : '⚡ ASK'}
        </button>
      </div>

      {/* Reason */}
      {inst.reason && (expanded || chatOpen) && (
        <div style={{ marginTop: 8, fontSize: 9,
          fontFamily: 'JetBrains Mono, monospace', color: '#4a5680',
          lineHeight: 1.6, paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {inst.reason}
        </div>
      )}

      {/* Expanded calibration */}
      {expanded && cal.base_returns && (
        <div style={{ marginTop: 10 }}>
          <Label color="#4a5680">REGIME RETURNS</Label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Object.entries(cal.base_returns).map(([r, v]) => (
              <div key={r} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 8,
                fontFamily: 'JetBrains Mono, monospace',
                background: r === regime ? `${c}15` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${r === regime ? `${c}44` : 'rgba(255,255,255,0.06)'}`,
                color: r === regime ? c : '#4a5680' }}>
                {r.replace('_',' ')}: {v >= 0 ? '+' : ''}{v}%
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-stock AI Chat */}
      {chatOpen && (
        <StockChat symbol={inst.tk} data={{ snap, analysis: { scores: { scores: {} } } }}
          onClose={() => setChatOpen(false)}/>
      )}
    </Panel>
  );
}

// ── PARKED QUESTIONS PANEL ────────────────────────────────────
function ParkedPanel() {
  if (PARKED.questions.length === 0) return null;
  return (
    <Panel glow="#ffcc00" style={{ marginBottom: 8 }}>
      <Label color="#ffcc00">📌 PARKED QUESTIONS ({PARKED.questions.length})</Label>
      <div style={{ fontSize: 9, color: '#4a5680', marginBottom: 8,
        fontFamily: 'JetBrains Mono, monospace' }}>
        Questions we couldn't answer — debate later
      </div>
      {PARKED.questions.map((q, i) => (
        <div key={i} style={{ padding: '6px 10px', marginBottom: 4, borderRadius: 8,
          background: 'rgba(255,204,0,0.06)', border: '1px solid rgba(255,204,0,0.15)',
          fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
          <span style={{ color: '#ffcc00' }}>{q.symbol}</span>
          <span style={{ color: '#4a5680' }}> · {q.question}</span>
        </div>
      ))}
    </Panel>
  );
}

// ── GLOBAL AI CHAT ────────────────────────────────────────────
function GlobalChat({ data }) {
  const [msgs,  setMsgs]  = useState([
    { role: 'ai', text: 'I see across all 5 market dimensions simultaneously. Ask me about any stock, the regime, your portfolio, sectors — anything. Questions I cannot answer will be parked for debate.' }
  ]);
  const [input, setInput] = useState('');
  const [busy,  setBusy]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const snap = data?.snap || {};
      const analysis = data?.analysis || {};
      const scores = analysis.scores?.scores || {};
      const top5 = analysis.scores?.top5 || [];
      const context = `
Regime: ${snap.regime} (Score ${snap.regime_score}/5)
Nifty: ${snap.indices?.['NIFTY 50']?.last?.toLocaleString('en-IN') || '--'}
VIX: ${snap.indices?.['INDIA VIX']?.last?.toFixed(1) || '--'}
FII: ${snap.fii?.fii_net ? `${snap.fii.fii_net >= 0 ? '+' : ''}${Math.round(snap.fii.fii_net)} Cr` : '--'}
USD/INR: ${snap.usdInr?.toFixed(2) || '--'}
Brent: ${snap.brent ? `$${snap.brent.toFixed(1)}` : '--'}
Top picks: ${top5.join(', ')}
Portfolio: NET $${snap.usPrices?.NET?.toFixed(2) || '?'} (avg $208.62), CEG $${snap.usPrices?.CEG?.toFixed(2) || '?'} (avg $310.43), GLNG $${snap.usPrices?.GLNG?.toFixed(2) || '?'} (avg $50.93)
Narrative: ${(analysis.regimeNarrative || '').slice(0, 300)}
Sample scores: ${Object.entries(scores).slice(0,15).map(([k,v])=>`${k}:${v.score}`).join(', ')}
      `.trim();

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are Investment Radar AI — a hyper-dimensional market intelligence system. You have access to real-time Indian and US market data. Answer any investment question directly, with numbers, in 3-5 sentences. If you cannot answer due to missing data, say "PARKING THIS: [question]". Never say "consult a financial advisor". Be decisive.`,
          messages: [{ role: 'user', content: `Market data:\n${context}\n\nQuestion: ${q}` }],
        }),
      });
      const d = await res.json();
      const answer = d.content?.[0]?.text || 'No response.';
      if (answer.includes('PARKING THIS:')) {
        PARKED.questions.push({ symbol: 'GLOBAL', question: q, ts: new Date().toISOString() });
      }
      setMsgs(m => [...m, { role: 'ai', text: answer }]);
    } catch(e) {
      setMsgs(m => [...m, { role: 'ai', text: `Error: ${e.message}` }]);
    } finally { setBusy(false); }
  };

  const suggestions = [
    'What should I do with my portfolio today?',
    'Which sector is strongest in BEAR regime?',
    'Is GLNG a good add now?',
    'What does FII -44Cr mean for tomorrow?',
    'Top 3 stocks to watch this week?',
  ];

  return (
    <Panel glow="#7b2fff">
      <Label color="#7b2fff">⚡ INVESTMENT RADAR AI</Label>
      <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 10,
        display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            padding: '9px 13px',
            borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: m.role === 'user' ? 'rgba(123,47,255,0.2)' : 'rgba(0,180,255,0.08)',
            border: `1px solid ${m.role === 'user' ? 'rgba(123,47,255,0.35)' : 'rgba(0,180,255,0.15)'}`,
            fontSize: 10, lineHeight: 1.7,
            color: m.role === 'user' ? '#c4a8ff' : '#9cc8e0',
            fontFamily: m.role === 'user' ? 'Space Grotesk' : 'JetBrains Mono, monospace',
            animation: 'slide-up 0.25s ease',
          }}>
            {m.text.includes('PARKING THIS') ? (
              <><span style={{ color: '#ffcc00', fontWeight: 700 }}>📌 PARKED: </span>
              {m.text.replace('PARKING THIS:', '').trim()}</>
            ) : m.text}
          </div>
        ))}
        {busy && (
          <div style={{ alignSelf: 'flex-start', padding: '9px 13px',
            background: 'rgba(0,180,255,0.06)', borderRadius: '16px 16px 16px 4px',
            fontSize: 10, color: '#4a5680', fontFamily: 'JetBrains Mono, monospace',
            border: '1px solid rgba(0,180,255,0.12)' }}>
            traversing dimensions...
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {msgs.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => { setInput(s); }}
              style={{ padding: '3px 8px', borderRadius: 8, fontSize: 8,
                border: '1px solid rgba(123,47,255,0.18)',
                background: 'rgba(123,47,255,0.05)',
                color: '#4a5680', fontFamily: 'Space Grotesk' }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask the AI anything about markets..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: 12, outline: 'none',
            border: '1px solid rgba(123,47,255,0.2)',
            background: 'rgba(123,47,255,0.06)',
            color: '#e0e8ff', fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace' }}/>
        <button onClick={send} disabled={busy || !input.trim()} style={{
          padding: '10px 16px', borderRadius: 12, border: 'none', fontSize: 12,
          background: busy || !input.trim()
            ? 'rgba(255,255,255,0.04)'
            : 'linear-gradient(135deg, #7b2fff, #00b4ff)',
          color: busy || !input.trim() ? '#4a5680' : '#fff',
          fontWeight: 700, transition: 'all 0.2s',
          boxShadow: busy || !input.trim() ? 'none' : '0 0 25px rgba(123,47,255,0.5)',
        }}>→</button>
      </div>
    </Panel>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────────
function DashboardTab({ data }) {
  const snap      = data?.snap     || {};
  const analysis  = data?.analysis || {};
  const regime    = snap.regime    || 'SIDEWAYS';
  const dm        = DIM[regime]    || DIM.SIDEWAYS;
  const scores    = analysis.scores?.scores || {};
  const top5      = analysis.scores?.top5   || [];
  const fii       = snap.fii?.fii_net || 0;
  const nifty     = snap.indices?.['NIFTY 50'];
  const vix       = snap.indices?.['INDIA VIX'];
  const [full,    setFull]    = useState(false);
  const ageMin = snap.ts ? Math.round((Date.now() - new Date(snap.ts).getTime()) / 60000) : null;

  return (
    <div style={{ padding: '0 14px 90px', position: 'relative' }}>
      <DimOrbs regime={regime}/>

      {/* Live bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 0 8px', fontSize: 8, position: 'relative', zIndex: 1,
        fontFamily: 'JetBrains Mono, monospace', color: '#4a5680' }}>
        <div style={{ position: 'relative', width: 7, height: 7 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
            background: ageMin < 30 ? '#00ffcc' : '#ffcc00',
            animation: 'pulse-ring 2s ease-out infinite' }}/>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
            background: ageMin < 30 ? '#00ffcc' : '#ffcc00' }}/>
        </div>
        <span style={{ color: ageMin < 30 ? '#00ffcc' : '#ffcc00' }}>
          {snap.label || 'Loading'}
        </span>
        {ageMin !== null && <span>· {ageMin}m ago</span>}
        <span style={{ marginLeft: 'auto', color: '#1e2545' }}>
          {snap.model === 'python-quant-v1' ? '⚡ QUANT' : '🤖 HAIKU'}
        </span>
      </div>

      {/* Dimensional Regime Banner */}
      <div onClick={() => setFull(!full)} style={{ position: 'relative', zIndex: 1,
        background: `radial-gradient(ellipse at 30% 50%, ${dm.color}15, transparent 70%), rgba(13,17,40,0.7)`,
        backdropFilter: 'blur(30px)',
        border: `1px solid ${dm.color}25`,
        borderRadius: 24, padding: '22px 22px 18px',
        marginBottom: 10, cursor: 'pointer', overflow: 'hidden',
        boxShadow: `0 0 60px ${dm.color}10, inset 0 0 40px ${dm.color}05`,
        animation: 'slide-up 0.4s ease',
      }}>
        {/* Scan line */}
        <div style={{ position: 'absolute', left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${dm.color}44, transparent)`,
          animation: 'scan 4s linear infinite', opacity: 0.4, pointerEvents: 'none' }}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 3, color: `${dm.color}88`, marginBottom: 6 }}>
              DIMENSIONAL MARKET STATE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: dm.color,
                fontFamily: 'Space Grotesk, sans-serif',
                textShadow: `0 0 30px ${dm.color}`, letterSpacing: 1,
                animation: 'flicker 8s ease infinite' }}>
                {dm.icon} {dm.label}
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#4a5680', marginTop: 4,
              fontFamily: 'JetBrains Mono, monospace' }}>
              {dm.dim} · Score {snap.regime_score || 0}/5
            </div>
          </div>
          <HyperLine
            data={[45,48,42,50,47,55,52,58,54,60,56,62,58,65]}
            color={dm.color} width={90} height={50}/>
        </div>

        {/* Evidence pills */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { l: `FII ${fii >= 0 ? '+' : ''}${(Math.abs(fii)/100).toFixed(0)}Cr`,
              c: fii >= 0 ? '#00ffcc' : '#ff2d78' },
            { l: `VIX ${vix?.last?.toFixed(1) || '--'}`,
              c: (vix?.last||0) > 20 ? '#ff2d78' : '#ffcc00' },
            { l: `₹${snap.usdInr?.toFixed(2) || '--'}/$`,
              c: '#00b4ff' },
            { l: `Brent $${snap.brent?.toFixed(1) || '--'}`,
              c: (snap.brent||0) > 95 ? '#ff2d78' : '#ffcc00' },
          ].map(p => <Pill key={p.l} color={p.c} small>{p.l}</Pill>)}
        </div>

        {/* Full narrative */}
        {full && analysis.regimeNarrative && (
          <div style={{ marginTop: 14, paddingTop: 14,
            borderTop: `1px solid ${dm.color}18`,
            fontSize: 10, color: '#7a90b8', lineHeight: 1.8,
            fontFamily: 'JetBrains Mono, monospace' }}>
            {analysis.regimeNarrative}
          </div>
        )}
      </div>

      {/* Macro grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 8, marginBottom: 10, position: 'relative', zIndex: 1 }}>
        {[
          { l: 'NIFTY 50',  v: nifty?.last,    fmt: v => v?.toLocaleString('en-IN'),
            sub: `${(nifty?.pChange||0)>=0?'+':''}${nifty?.pChange?.toFixed(2)||0}%`,
            color: (nifty?.pChange||0)>=0 ? '#00ffcc' : '#ff2d78' },
          { l: 'INDIA VIX', v: vix?.last,      fmt: v => v?.toFixed(1),
            sub: (vix?.last||0)>20 ? 'HIGH' : 'CALM',
            color: (vix?.last||0)>20 ? '#ff2d78' : '#00ffcc' },
          { l: 'FII FLOW',  v: Math.abs(fii),  fmt: v => `${fii>=0?'+':'-'}${(v/100).toFixed(0)}Cr`,
            sub: fii>=0 ? 'BUYING' : 'SELLING',
            color: fii>=0 ? '#00ffcc' : '#ff2d78' },
        ].map(m => (
          <div key={m.l} style={{ background: 'rgba(13,17,40,0.65)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${m.color}18`,
            borderRadius: 16, padding: '12px 12px 10px',
            boxShadow: `inset 0 0 20px ${m.color}06` }}>
            <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
              color: '#4a5680', letterSpacing: 2, marginBottom: 6 }}>{m.l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: m.color,
              fontFamily: 'JetBrains Mono, monospace',
              textShadow: `0 0 12px ${m.color}66` }}>
              {m.v !== undefined && m.v !== null ? m.fmt(m.v) : '--'}
            </div>
            <div style={{ fontSize: 8, color: '#4a5680', marginTop: 3,
              fontFamily: 'JetBrains Mono, monospace' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Global AI Chat */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <GlobalChat data={data}/>
      </div>

      {/* Top picks */}
      {top5.length > 0 && (
        <Panel glow="#00ffcc" style={{ position: 'relative', zIndex: 1 }}>
          <Label color="#00ffcc">TODAY'S TOP DIMENSIONAL PICKS</Label>
          {top5.map((tk, i) => {
            const s = scores[tk] || {};
            const c = s.score >= 75 ? '#00ffcc' : s.score >= 60 ? '#00b4ff' : '#ffcc00';
            return (
              <div key={tk} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 0', borderBottom: i < top5.length-1
                  ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <DimScore score={s.score || 50} size={44}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#e0e8ff',
                    fontFamily: 'Space Grotesk, sans-serif' }}>{tk}</div>
                  {s.reason && <div style={{ fontSize: 8, color: '#4a5680', marginTop: 2,
                    lineHeight: 1.5, fontFamily: 'JetBrains Mono, monospace' }}>
                    {s.reason?.slice(0, 70)}
                  </div>}
                </div>
                {s.signal && <Pill color={c} small>{s.signal}</Pill>}
              </div>
            );
          })}
        </Panel>
      )}

      {/* Portfolio signals */}
      {analysis.portfolioSignal && (
        <Panel glow="#ffcc00" style={{ position: 'relative', zIndex: 1 }}>
          <Label color="#ffcc00">YOUR PORTFOLIO SIGNALS</Label>
          {['NET','CEG','GLNG'].map(tk => {
            const sig   = analysis.portfolioSignal[tk];
            if (!sig) return null;
            const curr  = snap.usPrices?.[tk];
            const avgs  = { NET: 208.62, CEG: 310.43, GLNG: 50.93 };
            const pct   = curr ? ((curr - avgs[tk]) / avgs[tk] * 100) : null;
            const pos   = pct >= 0;
            const ac    = sig.action === 'BUY' || sig.action === 'ADD' ? '#00ffcc'
              : sig.action === 'SELL' ? '#ff2d78' : '#ffcc00';
            return (
              <div key={tk} style={{ display: 'flex', gap: 12, padding: '10px 0',
                borderBottom: tk !== 'GLNG' ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ minWidth: 56 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#e0e8ff',
                    fontFamily: 'Space Grotesk, sans-serif' }}>{tk}</div>
                  {curr && <div style={{ fontSize: 10,
                    color: pos ? '#00ffcc' : '#ff2d78',
                    fontFamily: 'JetBrains Mono, monospace' }}>
                    ${curr.toFixed(2)}{pct !== null &&
                      <span style={{ fontSize: 9 }}> {pos ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%</span>}
                  </div>}
                </div>
                <div style={{ flex: 1 }}>
                  <Pill color={ac} small>{sig.action}</Pill>
                  <div style={{ fontSize: 9, color: '#4a5680', marginTop: 4, lineHeight: 1.5,
                    fontFamily: 'JetBrains Mono, monospace' }}>{sig.reason}</div>
                  {sig.stop_loss && <div style={{ fontSize: 8, color: '#1e2545',
                    fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                    SL ${sig.stop_loss} · TP ${sig.target}
                  </div>}
                </div>
              </div>
            );
          })}
        </Panel>
      )}

      {/* Parked questions */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <ParkedPanel/>
      </div>

      {/* Movers */}
      {snap.gainers?.length > 0 && (
        <Panel style={{ position: 'relative', zIndex: 1 }}>
          <Label>NSE DIMENSIONAL MOVERS</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[{ list: snap.gainers, c: '#00ffcc', l: 'GAINERS' },
              { list: snap.losers,  c: '#ff2d78', l: 'LOSERS'  }].map(({ list, c, l }) => (
              <div key={l}>
                <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                  color: c, letterSpacing: 2, marginBottom: 8 }}>{l}</div>
                {(list||[]).slice(0,5).map(s => (
                  <div key={s.symbol} style={{ display: 'flex',
                    justifyContent: 'space-between', padding: '4px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                      color: '#e0e8ff' }}>{s.symbol}</span>
                    <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                      color: c, fontWeight: 700 }}>
                      {l==='GAINERS'?'+':''}{parseFloat(s.pChange).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ── OPPORTUNITIES TAB ─────────────────────────────────────────
function OpportunitiesTab({ data }) {
  const [search,  setSearch]  = useState('');
  const [minS,    setMinS]    = useState(50);
  const [country, setCountry] = useState('ALL');

  const snap    = data?.snap     || {};
  const analysis= data?.analysis || {};
  const regime  = snap.regime    || 'SIDEWAYS';
  const dm      = DIM[regime]    || DIM.SIDEWAYS;
  const scores  = analysis.scores?.scores || {};
  const top5    = analysis.scores?.top5   || [];

  const US = new Set(['NET','CEG','GLNG','NVDA','MSFT','AAPL','GOOGL','META','AMZN',
    'TSLA','JPM','GS','XOM','LNG','GLD','QQQ','SPY','PLTR','AMD','AVGO']);

  const list = useMemo(() => Object.entries(scores)
    .filter(([tk, s]) => {
      if (s.score < minS) return false;
      const isUS = US.has(tk) || s.country === 'US';
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
    .map(([tk, s]) => ({ tk, ...s, isTop: top5.includes(tk), isUS: US.has(tk) }))
    .sort((a, b) => b.score - a.score),
    [scores, minS, country, search, top5]);

  // Sector heatmap
  const heatmap = useMemo(() => {
    const m = {};
    Object.values(scores).forEach(s => {
      const sec = (s.sector||'Other').split(' ')[0].slice(0,10);
      if (!m[sec]) m[sec] = { sum: 0, n: 0 };
      m[sec].sum += s.score; m[sec].n++;
    });
    return Object.entries(m)
      .map(([s, d]) => ({ s, avg: Math.round(d.sum/d.n), n: d.n }))
      .sort((a,b) => b.avg - a.avg).slice(0, 12);
  }, [scores]);

  const sc = s => s>=75?'#00ffcc':s>=60?'#00b4ff':s>=45?'#ffcc00':'#ff2d78';

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 90 }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(3,5,15,0.95)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(123,47,255,0.1)',
        padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e0e8ff',
              fontFamily: 'Space Grotesk' }}>OPPORTUNITIES</span>
            <span style={{ fontSize: 8, color: '#4a5680', marginLeft: 8,
              fontFamily: 'JetBrains Mono, monospace' }}>{list.length} · {regime}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['ALL','IN','US'].map(c => (
              <button key={c} onClick={() => setCountry(c)} style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                border: `1px solid ${country===c ? `${dm.color}55` : 'rgba(255,255,255,0.06)'}`,
                background: country===c ? `${dm.color}12` : 'transparent',
                color: country===c ? dm.color : '#4a5680',
              }}>{c}</button>
            ))}
          </div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search stock, sector, signal..."
          style={{ width: '100%', padding: '8px 12px', borderRadius: 10, outline: 'none',
            border: '1px solid rgba(123,47,255,0.18)',
            background: 'rgba(123,47,255,0.06)',
            color: '#e0e8ff', fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            boxSizing: 'border-box', marginBottom: 8 }}/>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[0,40,50,60,70,80].map(s => (
            <button key={s} onClick={() => setMinS(s)} style={{
              padding: '3px 8px', borderRadius: 5, fontSize: 8,
              fontFamily: 'JetBrains Mono, monospace',
              border: `1px solid ${minS===s ? `${dm.color}55` : 'rgba(255,255,255,0.05)'}`,
              background: minS===s ? `${dm.color}12` : 'transparent',
              color: minS===s ? dm.color : '#4a5680',
            }}>{s===0?'ALL':`${s}+`}</button>
          ))}
        </div>
      </div>

      {/* Sector heatmap */}
      {heatmap.length > 0 && (
        <div style={{ margin: '10px 14px 0',
          background: 'rgba(13,17,40,0.65)', backdropFilter: 'blur(20px)',
          borderRadius: 16, border: '1px solid rgba(123,47,255,0.1)', padding: 14 }}>
          <Label>SECTOR HEATMAP — tap to filter</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {heatmap.map(h => {
              const c = sc(h.avg);
              return (
                <div key={h.s} onClick={() => setSearch(h.s)} style={{
                  padding: '6px 10px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${c}25`,
                  background: `${c}08`,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: 7, color: '#4a5680',
                    fontFamily: 'JetBrains Mono, monospace' }}>{h.s}</div>
                  <div style={{ fontSize: 17, fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace', color: c,
                    textShadow: `0 0 12px ${c}66` }}>{h.avg}</div>
                  <div style={{ fontSize: 7, color: '#1e2545',
                    fontFamily: 'JetBrains Mono, monospace' }}>{h.n}s</div>
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
            <div style={{ fontSize: 40, opacity: 0.3 }}>◎</div>
            <div style={{ fontSize: 10, color: '#4a5680', marginTop: 8,
              fontFamily: 'JetBrains Mono, monospace' }}>No stocks match filters</div>
          </div>
        ) : list.map((inst, idx) => (
          <StockCard key={inst.tk} inst={inst} idx={idx}
            regime={regime} snap={snap}/>
        ))}
      </div>
    </div>
  );
}

// ── PORTFOLIO TAB ─────────────────────────────────────────────
function PortfolioTab({ data }) {
  const snap   = data?.snap  || {};
  const usdInr = snap.usdInr || 86;
  const prices = snap.usPrices || {};
  const analysis = data?.analysis || {};

  const holdings = [
    { tk:'NET',  qty:1.066992, avg:208.62, name:'Cloudflare',          sector:'Cloud Security' },
    { tk:'CEG',  qty:0.714253, avg:310.43, name:'Constellation Energy', sector:'Nuclear Energy' },
    { tk:'GLNG', qty:3.489692, avg:50.93,  name:'Golar LNG',            sector:'LNG Shipping'   },
  ];

  const totalInv  = holdings.reduce((s,h) => s + h.avg * h.qty * usdInr, 0);
  const totalCurr = holdings.reduce((s,h) => s + (prices[h.tk]||h.avg) * h.qty * usdInr, 0);
  const totalPL   = totalCurr - totalInv;
  const totalPct  = totalInv > 0 ? (totalPL / totalInv * 100) : 0;
  const pos       = totalPL >= 0;
  const portColor = pos ? '#00ffcc' : '#ff2d78';

  // Dimension bars for each holding
  const dimData = holdings.map(h => {
    const curr = prices[h.tk] || h.avg;
    return { pct: (curr - h.avg) / h.avg * 100, tk: h.tk };
  });

  return (
    <div style={{ padding: '14px 14px 90px' }}>
      <DimOrbs regime={pos ? 'SOFT_BULL' : 'SOFT_BEAR'}/>

      {/* Total P&L */}
      <Panel glow={portColor} animate style={{ position: 'relative', zIndex: 1,
        background: `radial-gradient(ellipse at top left, ${portColor}10, transparent 60%), rgba(13,17,40,0.7)` }}>
        <Label color={portColor}>PORTFOLIO DIMENSION</Label>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 34, fontWeight: 700, color: portColor,
              fontFamily: 'JetBrains Mono, monospace',
              textShadow: `0 0 30px ${portColor}` }}>
              {pos ? '+' : '-'}₹{(Math.abs(totalPL)/1000).toFixed(2)}K
            </div>
            <div style={{ fontSize: 14, color: `${portColor}88`,
              fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
              {pos ? '▲' : '▼'} {Math.abs(totalPct).toFixed(2)}% all time
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, color: '#4a5680',
              fontFamily: 'JetBrains Mono, monospace' }}>INVESTED</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#7a90b8',
              fontFamily: 'JetBrains Mono, monospace' }}>
              ₹{(totalInv/1000).toFixed(1)}K
            </div>
            <div style={{ fontSize: 8, color: '#4a5680', marginTop: 4,
              fontFamily: 'JetBrains Mono, monospace' }}>
              USD/INR {usdInr.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Dimensional bar chart */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 60 }}>
          {dimData.map(({ tk, pct }) => {
            const c = pct >= 0 ? '#00ffcc' : '#ff2d78';
            const h = Math.max(6, Math.min(54, Math.abs(pct) * 4));
            return (
              <div key={tk} style={{ flex: 1, display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace', color: c,
                  textShadow: `0 0 8px ${c}` }}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                </div>
                <div style={{ width: '100%', height: h,
                  background: `linear-gradient(180deg, ${c}, ${c}44)`,
                  borderRadius: '4px 4px 0 0',
                  boxShadow: `0 0 15px ${c}66`,
                  transition: 'height 1s cubic-bezier(0.4,0,0.2,1)' }}/>
                <div style={{ fontSize: 9, color: '#7a90b8',
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{tk}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Individual holdings with AI chat */}
      {holdings.map(h => {
        const curr  = prices[h.tk] || h.avg;
        const plUSD = (curr - h.avg) * h.qty;
        const plINR = plUSD * usdInr;
        const plPct = (curr - h.avg) / h.avg * 100;
        const pos   = plINR >= 0;
        const c     = pos ? '#00ffcc' : '#ff2d78';
        const [chatOpen, setChatOpen] = useState(false);

        return (
          <Panel key={h.tk} glow={c} animate
            style={{ border: `1px solid ${c}15`, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#e0e8ff',
                  fontFamily: 'Space Grotesk' }}>{h.tk}</div>
                <div style={{ fontSize: 9, color: '#4a5680',
                  fontFamily: 'JetBrains Mono, monospace' }}>{h.name}</div>
                <div style={{ fontSize: 8, color: '#1e2545',
                  fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>{h.sector}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: c,
                  fontFamily: 'JetBrains Mono, monospace',
                  textShadow: `0 0 20px ${c}` }}>
                  {pos?'+':'-'}₹{Math.round(Math.abs(plINR)).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 10, color: c,
                  fontFamily: 'JetBrains Mono, monospace' }}>
                  {pos?'▲':'▼'} {Math.abs(plPct).toFixed(2)}%
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns:'repeat(3,1fr)',
              gap:8, marginTop:12, marginBottom: 10 }}>
              {[
                { l:'QTY',    v: h.qty.toFixed(3) },
                { l:'AVG',    v: `$${h.avg}` },
                { l:'NOW',    v: `$${curr.toFixed(2)}` },
              ].map(x => (
                <div key={x.l} style={{ background:'rgba(255,255,255,0.03)',
                  borderRadius:8, padding:'7px 10px',
                  border:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize:7, color:'#4a5680',
                    fontFamily:'JetBrains Mono, monospace', letterSpacing:1 }}>{x.l}</div>
                  <div style={{ fontSize:12, fontWeight:700,
                    fontFamily:'JetBrains Mono, monospace', color:'#e0e8ff',
                    marginTop:2 }}>{x.v}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setChatOpen(!chatOpen)} style={{
              width: '100%', padding: '8px', borderRadius: 10,
              border: `1px solid ${chatOpen ? '#7b2fff' : 'rgba(123,47,255,0.2)'}`,
              background: chatOpen ? 'rgba(123,47,255,0.15)' : 'rgba(123,47,255,0.05)',
              color: chatOpen ? '#c4a8ff' : '#7b2fff',
              fontSize: 10, fontWeight: 700, fontFamily: 'Space Grotesk',
              transition: 'all 0.2s',
            }}>
              {chatOpen ? '× Close AI' : `⚡ Ask AI about ${h.tk}`}
            </button>

            {chatOpen && (
              <StockChat symbol={h.tk} data={data}
                onClose={() => setChatOpen(false)}/>
            )}
          </Panel>
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
      const r = await fetch(`${API}/api/refresh${type==='recalibrate'?'?type=recalibrate':''}`);
      const d = await r.json();
      setMsg(d.ok ? '✅ Started' : `❌ ${d.error}`);
      if (d.ok) setTimeout(() => refresh(true), 8000);
    } catch(e) { setMsg(`❌ ${e.message}`); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ padding: '14px 14px 90px' }}>
      <Panel glow="#7b2fff">
        <Label color="#7b2fff">MANUAL CONTROL</Label>
        <button onClick={() => trigger()} disabled={busy} style={{
          width:'100%', padding:14, borderRadius:12, border:'none',
          background: busy ? 'rgba(255,255,255,0.04)'
            : 'linear-gradient(135deg, #00ffcc, #00b4ff)',
          color: busy ? '#4a5680' : '#03050f',
          fontWeight:900, fontSize:13, fontFamily:'Space Grotesk',
          marginBottom:8,
          boxShadow: busy ? 'none' : '0 0 30px rgba(0,255,204,0.3)',
          transition:'all 0.2s' }}>
          {busy ? '⏳ RUNNING...' : '⚡ REFRESH NOW'}
        </button>
        <button onClick={() => trigger('recalibrate')} disabled={busy} style={{
          width:'100%', padding:11, borderRadius:12, marginBottom:8,
          border:'1px solid rgba(255,204,0,0.25)',
          background:'rgba(255,204,0,0.06)',
          color:'#ffcc00', fontWeight:700, fontSize:10,
          fontFamily:'Space Grotesk' }}>
          🔄 FULL RECALIBRATION (20 min)
        </button>
        {msg && <div style={{ padding:'10px 12px', borderRadius:8, fontSize:10,
          fontFamily:'JetBrains Mono, monospace',
          background: msg.startsWith('✅') ? 'rgba(0,255,204,0.08)' : 'rgba(255,45,120,0.08)',
          border:`1px solid ${msg.startsWith('✅') ? 'rgba(0,255,204,0.2)' : 'rgba(255,45,120,0.2)'}`,
          color: msg.startsWith('✅') ? '#00ffcc' : '#ff2d78' }}>{msg}</div>}
        {ts && <div style={{ marginTop:8, fontSize:8, color:'#4a5680',
          fontFamily:'JetBrains Mono, monospace' }}>
          Last fetch: {ts.toLocaleTimeString('en-IN')}</div>}
      </Panel>

      {PARKED.questions.length > 0 && (
        <Panel glow="#ffcc00">
          <Label color="#ffcc00">📌 PARKED QUESTIONS ({PARKED.questions.length})</Label>
          <div style={{ fontSize: 9, color: '#4a5680', marginBottom: 10,
            fontFamily: 'JetBrains Mono, monospace' }}>
            Questions the AI couldn't answer — debate material
          </div>
          {PARKED.questions.map((q, i) => (
            <div key={i} style={{ padding:'8px 10px', marginBottom:4, borderRadius:8,
              background:'rgba(255,204,0,0.06)',
              border:'1px solid rgba(255,204,0,0.12)' }}>
              <div style={{ fontSize:8, color:'#ffcc00',
                fontFamily:'JetBrains Mono, monospace' }}>{q.symbol} · {q.ts?.slice(11,16)}</div>
              <div style={{ fontSize:9, color:'#7a90b8', marginTop:2,
                fontFamily:'Space Grotesk' }}>{q.question}</div>
            </div>
          ))}
        </Panel>
      )}

      <Panel>
        <Label>SYSTEM STATUS</Label>
        {[
          { l:'Backend',     v:'Render · Singapore',     c:'#00ffcc' },
          { l:'Storage',     v:'Backblaze B2 · 1TB',     c:'#00ffcc' },
          { l:'Firebase',    v:'DELETED',                 c:'#ff2d78' },
          { l:'Scoring',     v:'Python GARCH Engine',     c:'#00b4ff' },
          { l:'News',        v:'196 stocks · 15min',      c:'#00b4ff' },
          { l:'Cost',        v:'~$20/month fixed',        c:'#00ffcc' },
        ].map(x => (
          <div key={x.l} style={{ display:'flex', justifyContent:'space-between',
            padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ fontSize:9, color:'#4a5680',
              fontFamily:'JetBrains Mono, monospace' }}>{x.l}</span>
            <span style={{ fontSize:9, color:x.c, fontWeight:700,
              fontFamily:'JetBrains Mono, monospace' }}>{x.v}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────
function Nav({ tab, setTab }) {
  const tabs = [
    { id:'dashboard',     icon:'◈', label:'RADAR' },
    { id:'opportunities', icon:'◎', label:'PICKS' },
    { id:'portfolio',     icon:'◇', label:'PORT'  },
    { id:'settings',      icon:'⊙', label:'SYS'   },
  ];
  return (
    <div style={{ position:'fixed', bottom:0, left:'50%',
      transform:'translateX(-50%)', width:'100%', maxWidth:480, zIndex:200,
      background:'rgba(3,5,15,0.92)', backdropFilter:'blur(30px)',
      borderTop:'1px solid rgba(123,47,255,0.12)',
      display:'flex', justifyContent:'space-around',
      padding:'10px 0 max(12px,env(safe-area-inset-bottom))' }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display:'flex', flexDirection:'column', alignItems:'center',
            gap:3, background:'none', border:'none',
            padding:'4px 16px', borderRadius:10,
          }}>
            <span style={{ fontSize:18, lineHeight:1,
              color: active ? '#00ffcc' : '#4a5680',
              textShadow: active ? '0 0 15px #00ffcc' : 'none',
              transform: active ? 'scale(1.2)' : 'scale(1)',
              transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)' }}>{t.icon}</span>
            <span style={{ fontSize:7, fontFamily:'JetBrains Mono, monospace',
              letterSpacing:2, fontWeight:700,
              color: active ? '#00ffcc' : '#4a5680',
              transition:'color 0.2s' }}>{t.label}</span>
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
      <div style={{ minHeight:'100vh', background:'#03050f', display:'flex',
        flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20 }}>
        <div style={{ position:'relative', width:80, height:80 }}>
          <div style={{ position:'absolute', inset:0, borderRadius:'50%',
            border:'2px solid #00ffcc22', animation:'pulse-ring 1.5s ease-out infinite' }}/>
          <div style={{ position:'absolute', inset:10, borderRadius:'50%',
            border:'2px solid #7b2fff44', animation:'pulse-ring 1.5s ease-out infinite 0.3s' }}/>
          <div style={{ position:'absolute', inset:20, borderRadius:'50%',
            border:'2px solid #00b4ff66', animation:'pulse-ring 1.5s ease-out infinite 0.6s' }}/>
          <div style={{ position:'absolute', inset:30, borderRadius:'50%',
            background:'#00ffcc', boxShadow:'0 0 20px #00ffcc' }}/>
        </div>
        <div style={{ fontSize:10, fontFamily:'JetBrains Mono, monospace',
          color:'#00ffcc', letterSpacing:4,
          textShadow:'0 0 20px #00ffcc' }}>INVESTMENT RADAR PRO</div>
        <div style={{ fontSize:8, color:'#4a5680', letterSpacing:3,
          fontFamily:'JetBrains Mono, monospace' }}>
          TRAVERSING DIMENSIONS...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#03050f', color:'#e0e8ff',
      maxWidth:480, margin:'0 auto', position:'relative',
      backgroundImage:'radial-gradient(ellipse at 50% 0%, rgba(123,47,255,0.06) 0%, transparent 60%)' }}>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:100,
        background:'rgba(3,5,15,0.92)', backdropFilter:'blur(30px)',
        borderBottom:'1px solid rgba(123,47,255,0.1)',
        padding:'12px 16px 10px',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#00ffcc',
              boxShadow:'0 0 10px #00ffcc', flexShrink:0 }}/>
            <span style={{ fontSize:14, fontWeight:700, letterSpacing:2,
              fontFamily:'Space Grotesk, sans-serif', color:'#e0e8ff' }}>
              INVESTMENT RADAR
            </span>
          </div>
          <div style={{ fontSize:7, fontFamily:'JetBrains Mono, monospace',
            color:'#4a5680', letterSpacing:2, marginTop:2, marginLeft:16 }}>
            PRO · {data?.snap?.regime || '—'} · 5D
          </div>
        </div>
        <button onClick={() => refresh()} disabled={loading}
          style={{ padding:'7px 14px', borderRadius:8,
            border:'1px solid rgba(0,255,204,0.2)',
            background: loading ? 'transparent' : 'rgba(0,255,204,0.08)',
            color: loading ? '#4a5680' : '#00ffcc',
            fontFamily:'JetBrains Mono, monospace', fontWeight:700,
            fontSize:10, letterSpacing:1,
            boxShadow: loading ? 'none' : '0 0 15px rgba(0,255,204,0.2)',
            transition:'all 0.2s' }}>
          {loading ? '...' : '↺'}
        </button>
      </div>

      {/* Content */}
      <div style={{ overflowY:'auto', paddingBottom:70 }}>
        {tab==='dashboard'     && <DashboardTab     data={data}/>}
        {tab==='opportunities' && <OpportunitiesTab data={data}/>}
        {tab==='portfolio'     && <PortfolioTab     data={data}/>}
        {tab==='settings'      && <SettingsTab      refresh={refresh} ts={ts}/>}
      </div>

      <Nav tab={tab} setTab={setTab}/>
    </div>
  );
}
