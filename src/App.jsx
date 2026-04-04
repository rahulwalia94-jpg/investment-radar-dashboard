import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import './App.css';
import { IntroAnimation } from './intro.jsx';
import { ScoreBreakdown } from './ScoreBreakdown.jsx';
import { WaterfallChart } from './WaterfallChart.jsx';
import { RiskReturnMatrix } from './RiskReturnMatrix.jsx';
import { NeuralBond } from './NeuralBond.jsx';
import { DominoTimeline } from './DominoTimeline.jsx';
import { speak, stopSpeaking } from './voice.js';
import { generateStockBrief, buildSpokenBrief } from './stockbrief.js';
import { RegimeWorld, RegimeSelector } from './regimeworld.jsx';
import { DominoChains } from './domino.jsx';

const API = import.meta.env.VITE_API_URL || 'https://investment-radar-backend.onrender.com';

// ── PARKED QUESTIONS ──────────────────────────────────────────
const PARKED = { questions: [] };

// ── REGIME META ───────────────────────────────────────────────
const DIM = {
  BULL:      { color:'#00ffcc', label:'BULL',      dim:'5th Dimension — Ascending' },
  SOFT_BULL: { color:'#00b4ff', label:'SOFT BULL', dim:'4th Dimension — Lifting'   },
  SIDEWAYS:  { color:'#ffcc00', label:'SIDEWAYS',  dim:'3rd Dimension — Stable'    },
  SOFT_BEAR: { color:'#ff8c00', label:'SOFT BEAR', dim:'2nd Dimension — Falling'   },
  BEAR:      { color:'#ff2244', label:'BEAR',      dim:'1st Dimension — Collapse'  },
};

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
      setData(await r.json()); setTs(new Date()); setError(null);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => refresh(true), 5*60*1000);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, loading, error, ts, refresh, waking };
}

// speakStock now uses the voice.js engine
const speakStock = (symbol, text) => speak(text);

// ── SCORE RING ────────────────────────────────────────────────
function Ring({ score, size = 52 }) {
  const c = score>=75?'#00ffcc':score>=60?'#00b4ff':score>=45?'#ffcc00':'#ff2244';
  const r = size/2-5, circ = 2*Math.PI*r, fill = (score/100)*circ;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ position:'absolute', transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${c}18`} strokeWidth="2.5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="2.5"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition:'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)',
            filter:`drop-shadow(0 0 6px ${c})` }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:size>44?13:11, fontWeight:900, color:c,
        fontFamily:'JetBrains Mono, monospace' }}>{score}</div>
    </div>
  );
}

// ── PANEL ─────────────────────────────────────────────────────
function Panel({ children, style, glow, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:'rgba(10,20,40,0.7)', backdropFilter:'blur(24px)',
      border:`1px solid ${glow?`${glow}25`:'rgba(100,180,255,0.08)'}`,
      borderRadius:20, padding:'16px 18px', marginBottom:10,
      boxShadow: glow?`0 0 40px ${glow}10, inset 0 0 20px ${glow}05`:'none',
      transition:'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      cursor:onClick?'pointer':'default', position:'relative', overflow:'hidden',
      animation:'slide-up 0.4s ease', ...style }}>
      {glow&&<div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:`linear-gradient(90deg, transparent, ${glow}44, transparent)` }}/>}
      {children}
    </div>
  );
}

function Label({ children, color='#3a5070' }) {
  return <div style={{ fontSize:8, fontFamily:'Orbitron, monospace', letterSpacing:3,
    color, fontWeight:700, marginBottom:10 }}>{children}</div>;
}

function Pill({ children, color, small }) {
  return <span style={{ display:'inline-flex', alignItems:'center',
    padding:small?'2px 7px':'4px 10px', borderRadius:20, fontSize:small?8:9,
    fontFamily:'JetBrains Mono, monospace', fontWeight:700,
    border:`1px solid ${color}33`, background:`${color}12`, color,
    textShadow:`0 0 10px ${color}44` }}>{children}</span>;
}

// ── PER-STOCK AI CHAT ─────────────────────────────────────────
function StockChat({ symbol, snap, scores, onClose }) {
  const [view,     setView]     = useState('brief');   // brief | chat
  const [sections, setSections] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [msgs,     setMsgs]     = useState([]);
  const [input,    setInput]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef(null);
  const scoreData = scores?.[symbol] || {};

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // Auto-generate brief on open
  useEffect(() => {
    setLoading(true);
    generateStockBrief({ symbol, scoreData, snap, onChunk: (s) => setSections(s) })
      .then(({ sections: s, text }) => {
        setSections(s);
        setLoading(false);
        // Auto-speak the bottom line when brief loads
        if (s?.['BOTTOM LINE']) {
          speak('Here is the bottom line on ' + symbol + '. ' + s['BOTTOM LINE']);
        }
      })
      .catch(() => setLoading(false));
  }, [symbol]);

  const handleSpeak = () => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    if (!sections) return;
    const text = buildSpokenBrief(symbol, sections);
    setSpeaking(true);
    speak(text).then(() => setSpeaking(false));
  };

  const sendChat = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const regime = snap?.regime || 'SIDEWAYS';
      const cal    = scoreData?.calibration || {};
      const isUS   = ['NET','CEG','GLNG','NVDA','MSFT'].includes(symbol);
      const price  = isUS ? snap?.usPrices?.[symbol] : scoreData?.last_price;
      const ctx    = `${symbol} | Score: ${scoreData?.score}/100 | Signal: ${scoreData?.signal} | Regime: ${regime} | Price: ${price} | Expected: ${cal.base_returns?.[regime]}% | Reason: ${scoreData?.reason}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 600,
          system: `You are an expert analyst for ${symbol}. Answer DIRECTLY in 2-3 sentences with specific numbers. Plain English. No disclaimers. If unknown say "PARKING THIS: [question]".`,
          messages: [{ role: 'user', content: `Context: ${ctx}\n\nQuestion: ${q}` }],
        }),
      });
      const d = await res.json();
      const answer = d.content?.[0]?.text || 'No response.';
      if (answer.includes('PARKING THIS:')) {
        PARKED.questions.push({ symbol, question: q, ts: new Date().toISOString() });
      }
      setMsgs(m => [...m, { role: 'ai', text: answer }]);
      speak(answer.replace('PARKING THIS:', '').slice(0, 200));
    } catch(e) {
      setMsgs(m => [...m, { role: 'ai', text: `Error: ${e.message}` }]);
    } finally { setBusy(false); }
  };

  const LEVEL_ICONS = {
    'WHAT IS THIS':          { icon: '①', color: '#00b4ff' },
    'WHY THIS SCORE TODAY':  { icon: '②', color: '#00ffcc' },
    'REGIME IMPACT':         { icon: '③', color: '#ffcc00' },
    'MACRO FORCES AT WORK':  { icon: '④', color: '#ff8c00' },
    'THE REAL RISK':         { icon: '⑤', color: '#ff2244' },
    'WIN PROBABILITY':       { icon: '⑥', color: '#7b2fff' },
    'BOTTOM LINE':           { icon: '⑦', color: '#00ffcc' },
  };

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid rgba(100,150,255,0.1)', paddingTop: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setView('brief')} style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 8, border: 'none',
            background: view === 'brief' ? 'rgba(0,180,255,0.2)' : 'transparent',
            color: view === 'brief' ? '#00b4ff' : '#3a5070',
            fontFamily: 'Orbitron, monospace', letterSpacing: 1, cursor: 'pointer',
          }}>BRIEF</button>
          <button onClick={() => setView('chat')} style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 8, border: 'none',
            background: view === 'chat' ? 'rgba(123,47,255,0.2)' : 'transparent',
            color: view === 'chat' ? '#7b2fff' : '#3a5070',
            fontFamily: 'Orbitron, monospace', letterSpacing: 1, cursor: 'pointer',
          }}>ASK</button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {sections && (
            <button onClick={handleSpeak} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 8, border: 'none',
              background: speaking ? 'rgba(0,255,204,0.15)' : 'rgba(0,255,204,0.06)',
              color: speaking ? '#00ffcc' : '#3a5070',
              fontFamily: 'Orbitron, monospace', letterSpacing: 1, cursor: 'pointer',
            }}>{speaking ? '■ STOP' : '▶ SPEAK'}</button>
          )}
          <button onClick={() => { stopSpeaking(); onClose(); }} style={{
            background: 'none', border: 'none', color: '#3a5070', fontSize: 16, cursor: 'pointer',
          }}>×</button>
        </div>
      </div>

      {/* BRIEF VIEW — 7 levels */}
      {view === 'brief' && (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 9, color: '#3a5070', fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: 3, animation: 'pulse-ring 1.5s ease infinite' }}>
                GENERATING ANALYSIS...
              </div>
            </div>
          )}
          {sections && Object.entries(LEVEL_ICONS).map(([heading, { icon, color }]) => {
            const content = sections[heading];
            if (!content) return null;
            const isBottom = heading === 'BOTTOM LINE';
            return (
              <div key={heading} style={{
                marginBottom: 10, padding: '10px 12px', borderRadius: 10,
                background: isBottom ? `${color}10` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isBottom ? `${color}33` : 'rgba(255,255,255,0.05)'}`,
                animation: 'slide-up 0.3s ease both',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 14, color }}>{icon}</span>
                  <span style={{ fontSize: 7, fontFamily: 'Orbitron, monospace',
                    letterSpacing: 2, color: `${color}88` }}>{heading}</span>
                </div>
                <div style={{ fontSize: isBottom ? 11 : 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: isBottom ? color : '#7090a8',
                  lineHeight: 1.7, fontWeight: isBottom ? 700 : 400 }}>
                  {content}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CHAT VIEW */}
      {view === 'chat' && (
        <div>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex',
            flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {msgs.length === 0 && (
              <div style={{ fontSize: 9, color: '#3a5070', fontFamily: 'JetBrains Mono, monospace',
                lineHeight: 1.6 }}>
                Ask anything about {symbol}. Unanswered questions get parked for debate.
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%',
                padding: '8px 12px', fontSize: 10, lineHeight: 1.7,
                borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: m.role === 'user' ? 'rgba(123,47,255,0.2)' : 'rgba(0,180,255,0.08)',
                border: `1px solid ${m.role === 'user' ? 'rgba(123,47,255,0.3)' : 'rgba(0,180,255,0.15)'}`,
                color: m.role === 'user' ? '#c4a8ff' : '#90b8d0',
                fontFamily: 'JetBrains Mono, monospace', animation: 'slide-up 0.2s ease',
              }}>
                {m.text.includes('PARKING THIS')
                  ? <><span style={{ color: '#ffcc00', fontWeight: 700 }}>📌 PARKED: </span>{m.text.replace('PARKING THIS:', '').trim()}</>
                  : m.text}
              </div>
            ))}
            {busy && <div style={{ alignSelf: 'flex-start', padding: '8px 12px',
              background: 'rgba(0,180,255,0.06)', borderRadius: '14px 14px 14px 4px',
              fontSize: 10, color: '#3a5070', fontFamily: 'JetBrains Mono, monospace',
              border: '1px solid rgba(0,180,255,0.1)' }}>thinking...</div>}
            <div ref={bottomRef}/>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder={`Ask about ${symbol}...`}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 10, outline: 'none',
                border: '1px solid rgba(123,47,255,0.2)', background: 'rgba(123,47,255,0.06)',
                color: '#d0e8ff', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}/>
            <button onClick={sendChat} disabled={busy || !input.trim()} style={{
              padding: '8px 14px', borderRadius: 10, border: 'none', fontSize: 12,
              background: busy || !input.trim() ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#7b2fff,#00b4ff)',
              color: busy || !input.trim() ? '#3a5070' : '#fff', fontWeight: 700,
              transition: 'all 0.2s' }}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STOCK CARD ────────────────────────────────────────────────
function StockCard({ inst, regime, snap, scores }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const c = inst.score>=75?'#00ffcc':inst.score>=60?'#00b4ff':inst.score>=45?'#ffcc00':'#ff2244';
  const cal = inst.calibration || inst.layers?.quant?.calibration || {};
  const bR  = cal.base_returns?.[regime];
  const sig = inst.layers?.quant?.source === 'calculated' ? (inst.signal||'HOLD') : (inst.signal||'');
  const sigC= sig.includes('BUY')||sig.includes('ADD')?'#00ffcc':sig.includes('AVOID')||sig.includes('SELL')?'#ff2244':'#ffcc00';
  const newsSource = inst.layers?.news?.source;
  const garchSrc   = inst.layers?.quant?.source;

  return (
    <Panel glow={chatOpen?c:undefined} style={{ marginBottom:8, padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>

        {/* Score ring — tap to speak */}
        <div onClick={() => {
          const s = scores?.[inst.tk]||{};
          const intro = `${inst.tk}. Score ${s.score||'--'}. ${s.signal||'neutral'}. ${s.reason?.slice(0,80)||''}`;
          speakStock(inst.tk, intro);
          setExpanded(!expanded);
        }} style={{ cursor:'pointer' }}>
          <Ring score={inst.score} size={50}/>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:17, fontWeight:700, color:'#d0e8ff',
              fontFamily:'Space Grotesk, sans-serif' }}>{inst.tk}</span>
            {inst.isTop && <span style={{ fontSize:10 }}>★</span>}
            {sig && <Pill color={sigC} small>{sig}</Pill>}
            {inst.isUS && <Pill color="#ffcc00" small>US</Pill>}
          </div>
          <div style={{ fontSize:9, color:'#3a5070', marginTop:2,
            fontFamily:'JetBrains Mono, monospace' }}>
            {inst.sector}
            {inst.last_price && <span style={{ color:'#1e3050', marginLeft:6 }}>
              {inst.isUS?'$':'₹'}{inst.last_price?.toLocaleString('en-IN')}
            </span>}
          </div>
          {/* Score bar */}
          <div style={{ marginTop:8, height:2, background:'rgba(255,255,255,0.04)', borderRadius:1, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${inst.score}%`,
              background:`linear-gradient(90deg,${c}66,${c})`, borderRadius:1,
              boxShadow:`0 0 6px ${c}44`,
              transition:'width 1s cubic-bezier(0.4,0,0.2,1)' }}/>
          </div>
          {bR!==undefined && (
            <div style={{ display:'flex', gap:10, marginTop:6 }}>
              <span style={{ fontSize:9, fontFamily:'JetBrains Mono, monospace',
                color:bR>=0?'#00ffcc':'#ff2244' }}>{bR>=0?'+':''}{bR?.toFixed(0)}% exp</span>
              {cal.source==='calculated' && <span style={{ fontSize:8, color:'#00ffcc33',
                fontFamily:'JetBrains Mono, monospace' }}>✓ REAL</span>}
            </div>
          )}
        </div>

        {/* Ask button */}
        <button onClick={e => { e.stopPropagation(); setChatOpen(!chatOpen); }}
          style={{ padding:'6px 10px', borderRadius:8, flexShrink:0,
            border:`1px solid ${chatOpen?'#7b2fff':'rgba(123,47,255,0.2)'}`,
            background: chatOpen?'rgba(123,47,255,0.2)':'rgba(123,47,255,0.06)',
            color: chatOpen?'#c4a8ff':'#7b2fff', fontSize:10, fontWeight:700,
            fontFamily:'Space Grotesk', transition:'all 0.2s' }}>
          {chatOpen?'×':'⚡'}
        </button>
      </div>

      {/* Reason */}
      {inst.reason && (expanded||chatOpen) && (
        <div style={{ marginTop:8, fontSize:9, fontFamily:'JetBrains Mono, monospace',
          color:'#3a5070', lineHeight:1.6, paddingTop:8,
          borderTop:'1px solid rgba(255,255,255,0.04)' }}>
          {inst.reason}
        </div>
      )}

      {/* 5-Layer Score Breakdown + Waterfall */}
      {expanded && (
        <>
          <ScoreBreakdown scoreData={scores?.[inst.tk]}/>
          <WaterfallChart scoreData={scores?.[inst.tk]}/>
        </>
      )}

      {/* Stock AI Chat */}
      {chatOpen && (
        <StockChat symbol={inst.tk} snap={snap} scores={scores}
          onClose={() => setChatOpen(false)}/>
      )}
    </Panel>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────────
function DashboardTab({ data }) {
  const snap     = data?.snap     || {};
  const analysis = data?.analysis || {};
  const regime   = snap.regime    || 'SIDEWAYS';
  const dm       = DIM[regime]    || DIM.SIDEWAYS;
  const scores   = analysis.scores?.scores || {};
  const top5     = analysis.scores?.top5   || [];
  const chains   = analysis.chains?.chains || [];
  const fii      = snap.fii?.fii_net || 0;
  const nifty    = snap.indices?.['NIFTY 50'];
  const vix      = snap.indices?.['INDIA VIX'];
  const [previewRegime, setPreviewRegime] = useState(regime);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const chatBottom = useRef(null);
  const ageMin = snap.ts ? Math.round((Date.now()-new Date(snap.ts).getTime())/60000) : null;

  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior:'smooth' }); }, [chatMsgs]);

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || chatBusy) return;
    setChatInput('');
    setChatMsgs(m => [...m, { role:'user', text:q }]);
    setChatBusy(true);
    try {
      const ctx = `Regime: ${regime} (${snap.regime_score}/5) | Nifty: ${nifty?.last?.toLocaleString('en-IN')||'?'} | VIX: ${vix?.last?.toFixed(1)||'?'} | FII: ${Math.round(fii)}Cr | USD/INR: ${snap.usdInr?.toFixed(2)||'?'} | Brent: ${snap.brent?'$'+snap.brent.toFixed(1):'?'} | Top picks: ${top5.join(',')} | NET: $${snap.usPrices?.NET?.toFixed(2)||'?'} (avg $208.62) | CEG: $${snap.usPrices?.CEG?.toFixed(2)||'?'} (avg $310.43) | GLNG: $${snap.usPrices?.GLNG?.toFixed(2)||'?'} (avg $50.93) | Narrative: ${(analysis.regimeNarrative||'').slice(0,200)}`;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:800,
          system:'You are Investment Radar AI. Answer market questions directly with numbers in 3-4 sentences. No disclaimers. If unknown say "PARKING THIS: [question]".',
          messages:[{ role:'user', content:`Context: ${ctx}\n\nQuestion: ${q}` }],
        }),
      });
      const d = await res.json();
      const ans = d.content?.[0]?.text||'No response.';
      if (ans.includes('PARKING THIS:')) PARKED.questions.push({ symbol:'GLOBAL', question:q, ts:new Date().toISOString() });
      setChatMsgs(m => [...m, { role:'ai', text:ans }]);
      speakStock('AI', ans.replace(/PARKING THIS:/g,'').slice(0,150));
    } catch(e) { setChatMsgs(m => [...m, { role:'ai', text:`Error: ${e.message}` }]); }
    finally { setChatBusy(false); }
  };

  return (
    <div style={{ padding:'0 14px 90px', position:'relative' }}>

      {/* Live bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0 8px',
        fontSize:8, fontFamily:'JetBrains Mono, monospace', color:'#3a5070' }}>
        <div style={{ position:'relative', width:7, height:7 }}>
          <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:ageMin<30?'#00ffcc':'#ffcc00', animation:'pulse-ring 2s ease-out infinite' }}/>
          <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:ageMin<30?'#00ffcc':'#ffcc00' }}/>
        </div>
        <span style={{ color:ageMin<30?'#00ffcc':'#ffcc00' }}>{snap.label||'Loading'}</span>
        {ageMin!==null && <span>· {ageMin}m ago</span>}
        <span style={{ marginLeft:'auto', color:'#1e3050' }}>{snap.model==='python-quant-v1'?'⚡ QUANT':'🤖 HAIKU'}</span>
      </div>

      {/* Regime World with selector */}
      <Panel glow={dm.color} style={{ padding:0, overflow:'visible' }}>
        <div style={{ padding:'14px 16px 10px' }}>
          <Label color={dm.color}>MARKET DIMENSION · REGIME WORLD</Label>
          <div style={{ fontSize:10, color:'#3a5070', marginBottom:12,
            fontFamily:'JetBrains Mono, monospace' }}>
            Tap a regime to preview its world. Algorithm recommends:
            <span style={{ color:dm.color, fontWeight:700 }}> {dm.label}</span>
          </div>
        </div>
        <div style={{ padding:'0 12px 12px' }}>
          <RegimeSelector current={regime} onSelect={setPreviewRegime}/>
        </div>
      </Panel>

      {/* Macro grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
        {[
          { l:'NIFTY 50', v:nifty?.last, fmt:v=>v?.toLocaleString('en-IN'),
            sub:`${(nifty?.pChange||0)>=0?'+':''}${nifty?.pChange?.toFixed(2)||0}%`,
            c:(nifty?.pChange||0)>=0?'#00ffcc':'#ff2244' },
          { l:'VIX', v:vix?.last, fmt:v=>v?.toFixed(1),
            sub:(vix?.last||0)>20?'HIGH':'CALM',
            c:(vix?.last||0)>20?'#ff2244':'#00ffcc' },
          { l:'FII TODAY', v:Math.abs(fii), fmt:v=>`${fii>=0?'+':'-'}${(v/100).toFixed(0)}Cr`,
            sub:fii>=0?'BUYING':'SELLING', c:fii>=0?'#00ffcc':'#ff2244' },
          { l:'USD/INR', v:snap.usdInr, fmt:v=>v?.toFixed(2), sub:'LIVE', c:'#00b4ff' },
          { l:'BRENT', v:snap.brent, fmt:v=>`$${v?.toFixed(1)}`,
            sub:(snap.brent||0)>95?'RISK':'OK',
            c:(snap.brent||0)>95?'#ff2244':'#ffcc00' },
          { l:'REGIME', v:regime, fmt:v=>v, sub:`Score ${snap.regime_score||0}`, c:dm.color },
        ].map(m => (
          <div key={m.l} style={{ background:'rgba(10,20,40,0.7)', backdropFilter:'blur(20px)',
            border:`1px solid ${m.c}18`, borderRadius:14, padding:'11px 11px 9px',
            boxShadow:`inset 0 0 15px ${m.c}06` }}>
            <div style={{ fontSize:7, fontFamily:'Orbitron, monospace', color:'#3a5070',
              letterSpacing:2, marginBottom:5 }}>{m.l}</div>
            <div style={{ fontSize:14, fontWeight:700, color:m.c,
              fontFamily:'JetBrains Mono, monospace',
              textShadow:`0 0 10px ${m.c}55` }}>
              {m.v!==undefined&&m.v!==null?m.fmt(m.v):'--'}
            </div>
            <div style={{ fontSize:7, color:'#3a5070', marginTop:3,
              fontFamily:'JetBrains Mono, monospace' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Global AI Chat */}
      <Panel glow="#7b2fff">
        <Label color="#7b2fff">⚡ INVESTMENT RADAR AI · ASK ANYTHING</Label>
        <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column',
          gap:8, marginBottom:10 }}>
          {chatMsgs.length===0 && (
            <div style={{ fontSize:10, color:'#3a5070', fontFamily:'JetBrains Mono, monospace',
              lineHeight:1.6 }}>
              I see across all market dimensions. Ask about any stock, the regime, your portfolio. Unanswered questions get parked for debate.
            </div>
          )}
          {chatMsgs.map((m,i) => (
            <div key={i} style={{ alignSelf:m.role==='user'?'flex-end':'flex-start', maxWidth:'90%',
              padding:'8px 12px', fontSize:10, lineHeight:1.7,
              borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',
              background:m.role==='user'?'rgba(123,47,255,0.2)':'rgba(0,180,255,0.08)',
              border:`1px solid ${m.role==='user'?'rgba(123,47,255,0.35)':'rgba(0,180,255,0.15)'}`,
              color:m.role==='user'?'#c4a8ff':'#90b8d0',
              fontFamily:m.role==='user'?'Space Grotesk':'JetBrains Mono, monospace',
              animation:'slide-up 0.2s ease' }}>
              {m.text.includes('PARKING THIS')
                ? <><span style={{ color:'#ffcc00', fontWeight:700 }}>📌 PARKED: </span>{m.text.replace('PARKING THIS:','').trim()}</>
                : m.text}
            </div>
          ))}
          {chatBusy && <div style={{ alignSelf:'flex-start', padding:'8px 12px',
            background:'rgba(0,180,255,0.06)', borderRadius:'14px 14px 14px 4px',
            fontSize:10, color:'#3a5070', fontFamily:'JetBrains Mono, monospace',
            border:'1px solid rgba(0,180,255,0.12)' }}>traversing dimensions...</div>}
          <div ref={chatBottom}/>
        </div>
        {chatMsgs.length===0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
            {['What to do with portfolio today?','Strongest sector in BEAR?','Add to GLNG now?','What does VIX 26 mean?'].map(s => (
              <button key={s} onClick={() => setChatInput(s)} style={{ padding:'3px 8px', borderRadius:8,
                border:'1px solid rgba(123,47,255,0.18)', background:'rgba(123,47,255,0.05)',
                color:'#3a5070', fontSize:8, fontFamily:'Space Grotesk' }}>{s}</button>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:6 }}>
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&sendChat()}
            placeholder="Ask anything about markets..."
            style={{ flex:1, padding:'9px 12px', borderRadius:10, outline:'none',
              border:'1px solid rgba(123,47,255,0.2)', background:'rgba(123,47,255,0.06)',
              color:'#d0e8ff', fontSize:10, fontFamily:'JetBrains Mono, monospace' }}/>
          <button onClick={sendChat} disabled={chatBusy||!chatInput.trim()} style={{
            padding:'9px 16px', borderRadius:10, border:'none', fontSize:12,
            background:chatBusy||!chatInput.trim()?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#7b2fff,#00b4ff)',
            color:chatBusy||!chatInput.trim()?'#3a5070':'#fff', fontWeight:700,
            boxShadow:chatBusy||!chatInput.trim()?'none':'0 0 20px rgba(123,47,255,0.4)',
            transition:'all 0.2s' }}>→</button>
        </div>
      </Panel>

      {/* Domino chains */}
      {chains.length > 0 && (
        <DominoChains chains={chains} scores={scores}/>
      )}

      {/* Top picks */}
      {top5.length > 0 && (
        <Panel glow="#00ffcc">
          <Label color="#00ffcc">TODAY'S TOP PICKS — TAP SCORE TO HEAR BRIEF</Label>
          {top5.map((tk,i) => {
            const s = scores[tk]||{};
            const c = s.score>=75?'#00ffcc':s.score>=60?'#00b4ff':'#ffcc00';
            const [chatOpen, setChatOpen] = useState(false);
            return (
              <div key={tk}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0',
                  borderBottom: i<top5.length-1&&!chatOpen?'1px solid rgba(255,255,255,0.04)':'none' }}>
                  <div onClick={() => {
                    const intro = `${tk}. ${s.sector||''}. Score ${s.score||'--'}. ${s.signal||'neutral'}. ${s.reason?.slice(0,60)||''}`;
                    speakStock(tk, intro);
                  }} style={{ cursor:'pointer' }}>
                    <Ring score={s.score||50} size={44}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'#d0e8ff',
                      fontFamily:'Space Grotesk' }}>{tk}</div>
                    {s.reason && <div style={{ fontSize:8, color:'#3a5070', marginTop:2,
                      lineHeight:1.5, fontFamily:'JetBrains Mono, monospace' }}>
                      {s.reason?.slice(0,70)}</div>}
                  </div>
                  {s.signal && <Pill color={c} small>{s.signal}</Pill>}
                  <button onClick={() => setChatOpen(!chatOpen)} style={{ padding:'5px 9px',
                    borderRadius:7, border:`1px solid ${chatOpen?'#7b2fff':'rgba(123,47,255,0.2)'}`,
                    background:chatOpen?'rgba(123,47,255,0.2)':'rgba(123,47,255,0.05)',
                    color:chatOpen?'#c4a8ff':'#7b2fff', fontSize:9, fontWeight:700,
                    fontFamily:'Space Grotesk' }}>⚡</button>
                </div>
                {chatOpen && (
                  <StockChat symbol={tk} snap={snap} scores={scores}
                    onClose={() => setChatOpen(false)}/>
                )}
              </div>
            );
          })}
        </Panel>
      )}

      {/* Portfolio signals */}
      {analysis.portfolioSignal && (
        <Panel glow="#ffcc00">
          <Label color="#ffcc00">YOUR PORTFOLIO SIGNALS</Label>
          {['NET','CEG','GLNG'].map(tk => {
            const sig = analysis.portfolioSignal[tk];
            if (!sig) return null;
            const curr = snap.usPrices?.[tk];
            const avgs = { NET:208.62, CEG:310.43, GLNG:50.93 };
            const pct = curr ? ((curr-avgs[tk])/avgs[tk]*100) : null;
            const pos = pct>=0;
            const ac = sig.action==='BUY'||sig.action==='ADD'?'#00ffcc':sig.action==='SELL'?'#ff2244':'#ffcc00';
            return (
              <div key={tk} style={{ display:'flex', gap:12, padding:'10px 0',
                borderBottom:tk!=='GLNG'?'1px solid rgba(255,255,255,0.04)':'none' }}>
                <div style={{ minWidth:55 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'#d0e8ff',
                    fontFamily:'Space Grotesk' }}>{tk}</div>
                  {curr && <div style={{ fontSize:10, fontFamily:'JetBrains Mono, monospace',
                    color:pos?'#00ffcc':'#ff2244' }}>
                    ${curr.toFixed(2)} {pct!==null&&<span style={{ fontSize:9 }}>{pos?'▲':'▼'}{Math.abs(pct).toFixed(1)}%</span>}
                  </div>}
                  {!curr && <div style={{ fontSize:9, color:'#3a5070', fontFamily:'JetBrains Mono, monospace' }}>fetching...</div>}
                </div>
                <div style={{ flex:1 }}>
                  <Pill color={ac} small>{sig.action}</Pill>
                  <div style={{ fontSize:9, color:'#3a5070', marginTop:4, lineHeight:1.5,
                    fontFamily:'JetBrains Mono, monospace' }}>{sig.reason}</div>
                  {sig.stop_loss && <div style={{ fontSize:8, color:'#1e3050', marginTop:2,
                    fontFamily:'JetBrains Mono, monospace' }}>SL ${sig.stop_loss} · TP ${sig.target}</div>}
                </div>
              </div>
            );
          })}
        </Panel>
      )}

      {/* NSE movers */}
      {snap.gainers?.length > 0 && (
        <Panel>
          <Label>NSE MOVERS</Label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[{list:snap.gainers,c:'#00ffcc',l:'GAINERS'},{list:snap.losers,c:'#ff2244',l:'LOSERS'}].map(({list,c,l}) => (
              <div key={l}>
                <div style={{ fontSize:7, fontFamily:'Orbitron, monospace', color:c,
                  letterSpacing:2, marginBottom:8 }}>{l}</div>
                {(list||[]).slice(0,5).map(s => (
                  <div key={s.symbol} style={{ display:'flex', justifyContent:'space-between',
                    padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize:10, fontFamily:'JetBrains Mono, monospace',
                      color:'#d0e8ff' }}>{s.symbol}</span>
                    <span style={{ fontSize:10, fontFamily:'JetBrains Mono, monospace',
                      color:c, fontWeight:700 }}>
                      {l==='GAINERS'?'+':''}{parseFloat(s.pChange).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* RADAR — Risk Return Matrix */}
      <Panel glow="#00b4ff">
        <Label color="#00b4ff">RISK — RETURN MATRIX · ALL STOCKS</Label>
        <RiskReturnMatrix scores={scores} regime={regime}/>
      </Panel>

      {/* RADAR — Neural Bond Network */}
      <Panel glow="#7b2fff">
        <Label color="#7b2fff">NEURAL BOND · CORRELATION NETWORK</Label>
        <NeuralBond scores={scores} regime={regime}/>
      </Panel>

      {/* RADAR — Domino Timeline */}
      <Panel glow="#ff8c00">
        <Label color="#ff8c00">DOMINO CHAIN TIMELINE</Label>
        <DominoTimeline chains={analysis.chains} snap={snap}/>
      </Panel>
    </div>
  );
}

// ── OPPORTUNITIES TAB ─────────────────────────────────────────
function OpportunitiesTab({ data }) {
  const [search, setSearch] = useState('');
  const [minS,   setMinS]   = useState(40);
  const [country,setCountry]= useState('ALL');
  const snap    = data?.snap     || {};
  const analysis= data?.analysis || {};
  const regime  = snap.regime    || 'SIDEWAYS';
  const dm      = DIM[regime]    || DIM.SIDEWAYS;
  const scores  = analysis.scores?.scores || {};
  const top5    = analysis.scores?.top5   || [];

  const US = new Set(['NET','CEG','GLNG','NVDA','MSFT','AAPL','GOOGL','META','AMZN','TSLA','JPM','GS','XOM','LNG','GLD','QQQ','SPY','PLTR','AMD','AVGO']);

  const list = useMemo(() => Object.entries(scores)
    .filter(([tk,s]) => {
      if (s.score<minS) return false;
      const isUS = US.has(tk)||s.country==='US';
      if (country==='US'&&!isUS) return false;
      if (country==='IN'&&isUS) return false;
      if (search) { const q=search.toLowerCase(); return tk.toLowerCase().includes(q)||(s.reason||'').toLowerCase().includes(q)||(s.sector||'').toLowerCase().includes(q); }
      return true;
    })
    .map(([tk,s]) => ({ tk,...s, isTop:top5.includes(tk), isUS:US.has(tk) }))
    .sort((a,b) => b.score-a.score),
    [scores,minS,country,search,top5]);

  const heatmap = useMemo(() => {
    const m = {};
    Object.values(scores).forEach(s => { const sec=(s.sector||'Other').split(' ')[0].slice(0,10); if(!m[sec])m[sec]={sum:0,n:0}; m[sec].sum+=s.score; m[sec].n++; });
    return Object.entries(m).map(([s,d])=>({s,avg:Math.round(d.sum/d.n),n:d.n})).sort((a,b)=>b.avg-a.avg).slice(0,12);
  },[scores]);

  const sc = s => s>=75?'#00ffcc':s>=60?'#00b4ff':s>=45?'#ffcc00':'#ff2244';

  return (
    <div style={{ overflowY:'auto', paddingBottom:90 }}>
      <div style={{ position:'sticky', top:0, zIndex:20, padding:'10px 14px',
        background:'rgba(1,3,10,0.95)', backdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(100,180,255,0.06)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div>
            <span style={{ fontSize:14, fontWeight:700, color:'#d0e8ff',
              fontFamily:'Space Grotesk' }}>OPPORTUNITIES</span>
            <span style={{ fontSize:8, color:'#3a5070', marginLeft:8,
              fontFamily:'JetBrains Mono, monospace' }}>{list.length} · {regime}</span>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {['ALL','IN','US'].map(c => (
              <button key={c} onClick={()=>setCountry(c)} style={{ padding:'3px 10px', borderRadius:6,
                fontSize:9, fontFamily:'JetBrains Mono, monospace', fontWeight:700,
                border:`1px solid ${country===c?`${dm.color}55`:'rgba(255,255,255,0.06)'}`,
                background:country===c?`${dm.color}12`:'transparent',
                color:country===c?dm.color:'#3a5070' }}>{c}</button>
            ))}
          </div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search stock, sector..." style={{ width:'100%', padding:'8px 12px',
            borderRadius:10, outline:'none', border:'1px solid rgba(100,150,255,0.15)',
            background:'rgba(100,150,255,0.05)', color:'#d0e8ff', fontSize:10,
            fontFamily:'JetBrains Mono, monospace', boxSizing:'border-box', marginBottom:8 }}/>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {[0,40,50,60,70,80].map(s => (
            <button key={s} onClick={()=>setMinS(s)} style={{ padding:'3px 8px', borderRadius:5,
              fontSize:8, fontFamily:'JetBrains Mono, monospace',
              border:`1px solid ${minS===s?`${dm.color}55`:'rgba(255,255,255,0.05)'}`,
              background:minS===s?`${dm.color}12`:'transparent',
              color:minS===s?dm.color:'#3a5070' }}>{s===0?'ALL':`${s}+`}</button>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      {heatmap.length>0 && (
        <div style={{ margin:'10px 14px 0', background:'rgba(10,20,40,0.7)',
          backdropFilter:'blur(20px)', borderRadius:16,
          border:'1px solid rgba(100,180,255,0.06)', padding:14 }}>
          <Label>SECTOR HEATMAP</Label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {heatmap.map(h => { const c=sc(h.avg); return (
              <div key={h.s} onClick={()=>setSearch(h.s)} style={{ padding:'6px 10px',
                borderRadius:10, cursor:'pointer', border:`1px solid ${c}20`, background:`${c}08` }}>
                <div style={{ fontSize:7, color:'#3a5070', fontFamily:'JetBrains Mono, monospace' }}>{h.s}</div>
                <div style={{ fontSize:16, fontWeight:700, fontFamily:'JetBrains Mono, monospace',
                  color:c, textShadow:`0 0 10px ${c}55` }}>{h.avg}</div>
              </div>
            );} )}
          </div>
        </div>
      )}

      <div style={{ padding:'8px 14px 0' }}>
        {list.length===0 ? (
          <div style={{ textAlign:'center', padding:60 }}>
            <div style={{ fontSize:36, opacity:0.3 }}>◎</div>
            <div style={{ fontSize:10, color:'#3a5070', marginTop:8, fontFamily:'JetBrains Mono, monospace' }}>No stocks match</div>
          </div>
        ) : list.map((inst,idx) => (
          <StockCard key={inst.tk} inst={inst} regime={regime} snap={snap} scores={scores}/>
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

  const totalInv  = holdings.reduce((s,h) => s+h.avg*h.qty*usdInr, 0);
  const totalCurr = holdings.reduce((s,h) => s+(prices[h.tk]||h.avg)*h.qty*usdInr, 0);
  const totalPL   = totalCurr-totalInv;
  const totalPct  = totalInv>0?(totalPL/totalInv*100):0;
  const pos       = totalPL>=0;
  const pc        = pos?'#00ffcc':'#ff2244';

  return (
    <div style={{ padding:'14px 14px 90px' }}>
      {/* Summary */}
      <Panel glow={pc} style={{ background:`radial-gradient(ellipse at top, ${pc}08, transparent), rgba(10,20,40,0.7)` }}>
        <Label color={pc}>PORTFOLIO DIMENSION</Label>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:32, fontWeight:700, color:pc,
              fontFamily:'JetBrains Mono, monospace',
              textShadow:`0 0 30px ${pc}` }}>
              {pos?'+':'-'}₹{(Math.abs(totalPL)/1000).toFixed(2)}K
            </div>
            <div style={{ fontSize:13, color:`${pc}88`, fontFamily:'JetBrains Mono, monospace', marginTop:2 }}>
              {pos?'▲':'▼'} {Math.abs(totalPct).toFixed(2)}% all time
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:8, color:'#3a5070', fontFamily:'Orbitron, monospace' }}>INVESTED</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#7090a8', fontFamily:'JetBrains Mono, monospace' }}>₹{(totalInv/1000).toFixed(1)}K</div>
            <div style={{ fontSize:8, color:'#3a5070', marginTop:3, fontFamily:'JetBrains Mono, monospace' }}>USD/INR {usdInr.toFixed(2)}</div>
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:65 }}>
          {holdings.map(h => {
            const curr = prices[h.tk]||h.avg;
            const pct = (curr-h.avg)/h.avg*100;
            const c = pct>=0?'#00ffcc':'#ff2244';
            const ht = Math.max(6, Math.min(56, Math.abs(pct)*4));
            return (
              <div key={h.tk} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ fontSize:8, fontFamily:'JetBrains Mono, monospace', color:c,
                  textShadow:`0 0 8px ${c}` }}>{pct>=0?'+':''}{pct.toFixed(1)}%</div>
                <div style={{ width:'100%', height:ht,
                  background:`linear-gradient(180deg, ${c}, ${c}44)`,
                  borderRadius:'4px 4px 0 0',
                  boxShadow:`0 0 12px ${c}55`,
                  transition:'height 1s cubic-bezier(0.4,0,0.2,1)' }}/>
                <div style={{ fontSize:9, color:'#7090a8', fontFamily:'JetBrains Mono, monospace', fontWeight:700 }}>{h.tk}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Individual holdings */}
      {holdings.map(h => {
        const curr  = prices[h.tk]||h.avg;
        const plUSD = (curr-h.avg)*h.qty;
        const plINR = plUSD*usdInr;
        const plPct = (curr-h.avg)/h.avg*100;
        const pos   = plINR>=0;
        const c     = pos?'#00ffcc':'#ff2244';
        const [chatOpen, setChatOpen] = useState(false);
        const scores = analysis.scores?.scores||{};

        return (
          <Panel key={h.tk} glow={c} style={{ border:`1px solid ${c}12` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:22, fontWeight:700, color:'#d0e8ff', fontFamily:'Space Grotesk' }}>{h.tk}</div>
                <div style={{ fontSize:9, color:'#3a5070', fontFamily:'JetBrains Mono, monospace' }}>{h.name}</div>
                <div style={{ fontSize:8, color:'#1e3050', fontFamily:'JetBrains Mono, monospace', marginTop:1 }}>{h.sector}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:20, fontWeight:700, color:c, fontFamily:'JetBrains Mono, monospace', textShadow:`0 0 15px ${c}` }}>
                  {pos?'+':'-'}₹{Math.round(Math.abs(plINR)).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize:10, color:c, fontFamily:'JetBrains Mono, monospace' }}>{pos?'▲':'▼'} {Math.abs(plPct).toFixed(2)}%</div>
                {!prices[h.tk] && <div style={{ fontSize:8, color:'#3a5070', fontFamily:'JetBrains Mono, monospace' }}>price loading...</div>}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:12, marginBottom:10 }}>
              {[{l:'QTY',v:h.qty.toFixed(3)},{l:'AVG',v:`$${h.avg}`},{l:'NOW',v:`$${curr.toFixed(2)}`}].map(x => (
                <div key={x.l} style={{ background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'7px 10px', border:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize:7, color:'#3a5070', fontFamily:'Orbitron, monospace', letterSpacing:1 }}>{x.l}</div>
                  <div style={{ fontSize:12, fontWeight:700, fontFamily:'JetBrains Mono, monospace', color:'#d0e8ff', marginTop:2 }}>{x.v}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setChatOpen(!chatOpen)} style={{ width:'100%', padding:8,
              borderRadius:10, border:`1px solid ${chatOpen?'#7b2fff':'rgba(123,47,255,0.2)'}`,
              background:chatOpen?'rgba(123,47,255,0.15)':'rgba(123,47,255,0.05)',
              color:chatOpen?'#c4a8ff':'#7b2fff', fontSize:10, fontWeight:700,
              fontFamily:'Space Grotesk', transition:'all 0.2s' }}>
              {chatOpen?'× Close AI':`⚡ Ask AI about ${h.tk}`}
            </button>
            {chatOpen && <StockChat symbol={h.tk} snap={snap} scores={scores} onClose={()=>setChatOpen(false)}/>}
          </Panel>
        );
      })}

      {/* Monte Carlo — 90 day simulation */}
      {analysis.scores?.monte_carlo && (
        <Panel glow="#7b2fff">
          <Label color="#7b2fff">MONTE CARLO — 90 DAY SIMULATION (10,000 paths)</Label>
          {['NET','CEG','GLNG'].map(sym => {
            const mc = analysis.scores.monte_carlo[sym];
            if (!mc) return null;
            const pos = mc.win_probability >= 50;
            return (
              <div key={sym} style={{ marginBottom:12, padding:'10px 12px',
                borderRadius:10, background:'rgba(123,47,255,0.06)',
                border:'1px solid rgba(123,47,255,0.15)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#d0e8ff',
                    fontFamily:'Orbitron,monospace' }}>{sym} ★</span>
                  <span style={{ fontSize:10, fontWeight:700,
                    color: pos?'#00ffcc':'#ff2244',
                    fontFamily:'JetBrains Mono,monospace' }}>
                    {mc.win_probability}% WIN PROB
                  </span>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {[
                    { l:'Expected',  v:`$${mc.expected_price?.toFixed(2)}`, c:'#00b4ff' },
                    { l:'Best 10%',  v:`$${mc.best_case_10?.toFixed(2)}`,   c:'#00ffcc' },
                    { l:'Worst 10%', v:`$${mc.worst_case_10?.toFixed(2)}`,  c:'#ff2244' },
                    { l:'Exp Return',v:`${mc.expected_return>=0?'+':''}${mc.expected_return}%`, c: mc.expected_return>=0?'#00ffcc':'#ff2244' },
                    { l:'Kelly',     v:`${(mc.kelly_fraction*100).toFixed(0)}%`, c:'#ffcc00' },
                  ].map(item => (
                    <div key={item.l} style={{ padding:'4px 8px', borderRadius:6,
                      background:'rgba(255,255,255,0.04)',
                      border:'1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize:7, color:'#3a5070', fontFamily:'JetBrains Mono,monospace' }}>{item.l}</div>
                      <div style={{ fontSize:10, color:item.c, fontWeight:700,
                        fontFamily:'JetBrains Mono,monospace' }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {analysis.scores.monte_carlo._portfolio && (
            <div style={{ padding:'10px 12px', borderRadius:10,
              background:'rgba(0,180,255,0.06)', border:'1px solid rgba(0,180,255,0.15)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <div style={{ fontSize:9, fontFamily:'Orbitron,monospace',
                  letterSpacing:2, color:'#00b4ff' }}>PORTFOLIO COMBINED</div>
                {analysis.scores.monte_carlo._portfolio.cholesky_used && (
                  <div style={{ fontSize:7, color:'#00ffcc', fontFamily:'JetBrains Mono,monospace',
                    padding:'2px 6px', background:'rgba(0,255,204,0.1)', borderRadius:4 }}>
                    ⬡ CHOLESKY CORRELATED
                  </div>
                )}
              </div>
              {(() => {
                const p = analysis.scores.monte_carlo._portfolio;
                return (<>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                    {[
                      { l:'Current Value', v:`₹${Math.round(p.current_value).toLocaleString()}` },
                      { l:'Expected 90d',  v:`₹${Math.round(p.expected_value).toLocaleString()}` },
                      { l:'Exp Return',    v:`${p.expected_return>=0?'+':''}${p.expected_return}%`,
                        c: p.expected_return>=0?'#00ffcc':'#ff2244' },
                      { l:'Win Prob',      v:`${p.win_probability}%`,
                        c: p.win_probability>=50?'#00ffcc':'#ff2244' },
                      { l:'VaR 95%',       v:`₹${Math.round(p.var_95).toLocaleString()}`, c:'#ffcc00' },
                      { l:'VaR 99%',       v:`₹${Math.round(p.var_99||p.var_95*1.4).toLocaleString()}`, c:'#ff8844' },
                      { l:'Port σ/yr',     v:`${p.portfolio_sigma||'--'}%`, c:'#00b4ff' },
                    ].map(item => (
                      <div key={item.l} style={{ padding:'4px 8px', borderRadius:6,
                        background:'rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize:7, color:'#3a5070', fontFamily:'JetBrains Mono,monospace' }}>{item.l}</div>
                        <div style={{ fontSize:10, color:item.c||'#00b4ff', fontWeight:700,
                          fontFamily:'JetBrains Mono,monospace' }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Marginal Risk Contribution */}
                  {p.marginal_risk?.length > 0 && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:8, color:'#3a5070',
                        fontFamily:'Orbitron,monospace', letterSpacing:1, marginBottom:6 }}>
                        MARGINAL RISK CONTRIBUTION
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        {p.marginal_risk.map(mr => (
                          <div key={mr.symbol} style={{ flex:1, padding:'6px 8px', borderRadius:8,
                            background:'rgba(255,255,255,0.03)',
                            border:'1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize:9, color:'#d0e8ff',
                              fontFamily:'Orbitron,monospace', marginBottom:4 }}>{mr.symbol}</div>
                            <div style={{ fontSize:8, color:'#ffcc00',
                              fontFamily:'JetBrains Mono,monospace' }}>{mr.contribution?.toFixed(1)}% risk</div>
                            <div style={{ fontSize:7, color:'#3a5070',
                              fontFamily:'JetBrains Mono,monospace' }}>{mr.weight}% weight</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>);
              })()}
            </div>
          )}

          {/* Correlation Heatmap — NET / CEG / GLNG */}
          {analysis.scores?.dcc?.correlation && (
            <div style={{ padding:'10px 12px', borderRadius:10, marginTop:10,
              background:'rgba(123,47,255,0.06)', border:'1px solid rgba(123,47,255,0.15)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:9, fontFamily:'Orbitron,monospace',
                  letterSpacing:2, color:'#7b2fff' }}>CORRELATION HEATMAP</div>
                <div style={{ fontSize:7, color:'#3a5070', fontFamily:'JetBrains Mono,monospace' }}>
                  {analysis.scores.dcc.source === 'precomputed'
                    ? `⬡ PRE-COMPUTED (${analysis.scores.dcc.matrix_size} stocks)`
                    : '⚡ REAL-TIME'}
                </div>
              </div>
              {(() => {
                const corr  = analysis.scores.dcc.correlation;
                const syms  = ['NET','CEG','GLNG'].filter(s => corr[s]);
                if (syms.length < 2) return <div style={{fontSize:8,color:'#3a5070'}}>Insufficient data</div>;
                const getColor = v => {
                  if (v >= 0.7)  return '#ff2244';
                  if (v >= 0.4)  return '#ff8844';
                  if (v >= 0.2)  return '#ffcc00';
                  if (v >= 0)    return '#00ffcc';
                  if (v >= -0.2) return '#00b4ff';
                  return '#7b2fff';
                };
                return (
                  <div>
                    <div style={{ display:'grid', gridTemplateColumns:`40px ${syms.map(()=>'1fr').join(' ')}`,
                      gap:3, fontSize:8, fontFamily:'JetBrains Mono,monospace' }}>
                      <div/>
                      {syms.map(s => (
                        <div key={s} style={{ textAlign:'center', color:'#3a5070', padding:'2px 0' }}>{s}</div>
                      ))}
                      {syms.map(a => (<>
                        <div key={a} style={{ color:'#3a5070', padding:'2px 0' }}>{a}</div>
                        {syms.map(b => {
                          const v = corr[a]?.[b] ?? 1;
                          return (
                            <div key={b} style={{
                              textAlign:'center', padding:'6px 4px', borderRadius:6,
                              background: a===b ? 'rgba(255,255,255,0.05)' : `${getColor(v)}22`,
                              border: `1px solid ${getColor(v)}44`,
                              color: getColor(v), fontWeight:700, fontSize:9,
                            }}>{a===b ? '1.00' : v.toFixed(2)}</div>
                          );
                        })}
                      </>))}
                    </div>
                    <div style={{ marginTop:6, fontSize:7, color:'#3a5070',
                      fontFamily:'JetBrains Mono,monospace' }}>
                      Low correlation = good diversification |
                      Regime: {analysis.scores.dcc.regime}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Factor Decomposition */}
          {['NET','CEG','GLNG'].some(s => analysis.scores?.scores?.[s]?.factor_detail) && (
            <div style={{ padding:'10px 12px', borderRadius:10, marginTop:10,
              background:'rgba(0,180,255,0.05)', border:'1px solid rgba(0,180,255,0.12)' }}>
              <div style={{ fontSize:9, fontFamily:'Orbitron,monospace',
                letterSpacing:2, color:'#00b4ff', marginBottom:8 }}>FACTOR DECOMPOSITION</div>
              <div style={{ display:'flex', gap:8 }}>
                {['NET','CEG','GLNG'].map(sym => {
                  const fd = analysis.scores?.scores?.[sym]?.factor_detail;
                  if (!fd) return null;
                  return (
                    <div key={sym} style={{ flex:1, padding:'8px', borderRadius:8,
                      background:'rgba(0,180,255,0.06)', border:'1px solid rgba(0,180,255,0.12)' }}>
                      <div style={{ fontSize:9, color:'#d0e8ff', fontFamily:'Orbitron,monospace',
                        marginBottom:6 }}>{sym}</div>
                      {[
                        { l:'Alpha',    v:`${fd.alpha>=0?'+':''}${fd.alpha?.toFixed(1)}%/yr`,
                          c: fd.alpha>=0?'#00ffcc':'#ff2244' },
                        { l:'Beta',     v:fd.beta?.toFixed(2), c:'#00b4ff' },
                        { l:'R²',       v:fd.r_squared?.toFixed(2), c:'#7b2fff' },
                        { l:'Mom 12m',  v:`${fd.momentum_12m>=0?'+':''}${fd.momentum_12m?.toFixed(1)}%`,
                          c: fd.momentum_12m>=0?'#00ffcc':'#ff2244' },
                        { l:'Info Ratio',v:fd.information?.toFixed(2), c:'#ffcc00' },
                      ].map(item => (
                        <div key={item.l} style={{ display:'flex', justifyContent:'space-between',
                          marginBottom:4 }}>
                          <span style={{ fontSize:7, color:'#3a5070',
                            fontFamily:'JetBrains Mono,monospace' }}>{item.l}</span>
                          <span style={{ fontSize:8, color:item.c, fontWeight:700,
                            fontFamily:'JetBrains Mono,monospace' }}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────
function SettingsTab({ data, refresh, ts }) {
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg ] = useState('');

  // ── DATA PATHS (guaranteed schema from v2 backend) ──────────
  const snap     = data?.snap     || {};
  const analysis = data?.analysis || {};
  const scoring  = analysis.scores || {};         // ScoringResult
  const scores   = scoring.scores  || {};         // per-stock StockScore objects
  const mc       = scoring.monte_carlo || {};
  const bl       = scoring.bl_result   || {};
  const dcc      = scoring.dcc         || {};
  const geoFlags = scoring.geo_signals?.active_flags || {};

  // ── STATUS CHECKS ────────────────────────────────────────────
  const totalScored  = Object.keys(scores).length;
  const garchOk      = totalScored > 100;
  const regimeOk     = !!snap.regime;
  const finbertCount = Object.values(scores).filter(s => s?.layers?.news?.source === 'finbert').length;
  const finbertOk    = finbertCount > 0;
  const newsCount    = Object.values(scores).filter(s => (s?.layers?.news?.articles||0) > 0).length;
  const dccOk        = (dcc.symbols?.length || 0) > 0;
  const mcOk         = Object.keys(mc).filter(k => k !== '_portfolio').length > 0;
  const blOk         = !!bl.top_pick;
  const fiiOk        = snap.fii?.fii_net !== undefined && snap.fii?.fii_net !== null;
  const usOk         = !!snap.usPrices?.NET;

  const STATUS = [
    { label:'PRICE HISTORY',
      ok: garchOk,
      detail: garchOk
        ? `${totalScored} instruments loaded | Top: ${scoring.top5?.slice(0,3).join(', ')||'?'}`
        : 'No price history — run radar-data-fetcher.js on Desktop' },
    { label:'GARCH SCORING',
      ok: garchOk,
      detail: garchOk
        ? `6-layer model running | Regime: ${snap.regime} | Source: ${Object.values(scores).find(s=>s?.layers?.quant?.source)?.layers?.quant?.source||'?'}`
        : 'Needs price history in B2' },
    { label:'REGIME PERIODS',
      ok: regimeOk,
      detail: regimeOk
        ? `Current: ${snap.regime} | 18yr Nifty 50 + SP500 regime classification`
        : 'Regime detection not running' },
    { label:'FINBERT NEWS',
      ok: finbertOk,
      detail: finbertOk
        ? `ProsusAI/finbert active | ${finbertCount} stocks scored at 85% accuracy`
        : `Keyword fallback (62%) | ${newsCount} stocks with news | Add HF_TOKEN to Render env` },
    { label:'DCC CORRELATIONS',
      ok: dccOk,
      detail: dccOk
        ? `${dcc.symbols?.length} stocks | NET-CEG: ${dcc.correlation?.NET?.CEG?.toFixed(2)||'?'} | NET-GLNG: ${dcc.correlation?.NET?.GLNG?.toFixed(2)||'?'} | Source: ${dcc.source||'?'}`
        : 'Not computed — run ⬡ COMPUTE CORRELATION MATRIX on Desktop' },
    { label:'MONTE CARLO',
      ok: mcOk,
      detail: mcOk
        ? `NET: ${mc.NET?.win_probability}% | CEG: ${mc.CEG?.win_probability}% | GLNG: ${mc.GLNG?.win_probability}% | Cholesky: ${mc._portfolio?.cholesky_used?'✅':'❌'}`
        : 'Not computed this cycle' },
    { label:'BLACK-LITTERMAN',
      ok: blOk,
      detail: blOk
        ? `Top pick: ${bl.top_pick} | Sharpe: ${bl.portfolio_metrics?.sharpe_ratio?.toFixed(2)} | Exp return: ${bl.portfolio_metrics?.expected_return?.toFixed(1)}%`
        : 'Not computed this cycle' },
    { label:'NEWS COVERAGE',
      ok: newsCount > 50,
      detail: `${newsCount}/${totalScored} stocks with active news | Loop running 24/7` },
    { label:'FII DATA',
      ok: fiiOk,
      detail: fiiOk
        ? `FII: ${snap.fii.fii_net >= 0 ? '+' : ''}₹${Math.round(snap.fii.fii_net)}Cr | DII: ${snap.fii.dii_net >= 0 ? '+' : ''}₹${Math.round(snap.fii.dii_net||0)}Cr`
        : 'FII data not loading' },
    { label:'US PRICES',
      ok: usOk,
      detail: usOk
        ? `NET: $${snap.usPrices.NET?.toFixed(2)} | CEG: $${snap.usPrices.CEG?.toFixed(2)} | GLNG: $${snap.usPrices.GLNG?.toFixed(2)}`
        : 'US prices not loading' },
  ];

  const okCount    = STATUS.filter(s => s.ok).length;
  const healthPct  = Math.round(okCount / STATUS.length * 100);
  const healthColor= healthPct >= 80 ? '#00ffcc' : healthPct >= 50 ? '#ffcc00' : '#ff2244';

  const trigger = async (type) => {
    setBusy(true); setMsg('Running...');
    try {
      const url = type === 'recalibrate' ? `${API}/api/refresh?type=recalibrate` : `${API}/api/refresh`;
      const r   = await fetch(url);
      const d   = await r.json();
      setMsg(d.ok !== false ? '✅ Done — refresh page to see updates' : `❌ ${d.error||'Error'}`);
      if (refresh) setTimeout(refresh, 2000);
    } catch(e) { setMsg('❌ ' + e.message); }
    setBusy(false);
  };

  return (
    <div style={{ padding:'0 4px', overflowY:'auto', paddingBottom:90 }}>

      {/* Health Score */}
      <Panel glow={healthColor}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <Label color={healthColor}>SYSTEM HEALTH</Label>
            <div style={{ fontSize:36, fontWeight:700, color:healthColor,
              fontFamily:'Orbitron,monospace', textShadow:`0 0 20px ${healthColor}` }}>
              {healthPct}%
            </div>
            <div style={{ fontSize:9, color:'#3a5070', fontFamily:'JetBrains Mono,monospace' }}>
              {okCount}/{STATUS.length} systems operational
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, color:'#3a5070', fontFamily:'JetBrains Mono,monospace' }}>
              {snap.regime || '--'} regime
            </div>
            <div style={{ fontSize:8, color:'#3a5070', fontFamily:'JetBrains Mono,monospace' }}>
              {ts ? new Date(ts).toLocaleTimeString() : '--'}
            </div>
            <div style={{ fontSize:8, color:'#3a5070', fontFamily:'JetBrains Mono,monospace' }}>
              v2 backend
            </div>
          </div>
        </div>
      </Panel>

      {/* Model Status */}
      <Panel glow="#00b4ff">
        <Label color="#00b4ff">MODEL STATUS</Label>
        {STATUS.map((s, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10,
            padding:'8px 0', borderBottom: i < STATUS.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', marginTop:4, flexShrink:0,
              background: s.ok ? '#00ffcc' : '#ff2244',
              boxShadow: `0 0 8px ${s.ok ? '#00ffcc' : '#ff2244'}` }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:1,
                color: s.ok ? '#d0e8ff' : '#ff6688', marginBottom:3 }}>{s.label}</div>
              <div style={{ fontSize:8, fontFamily:'JetBrains Mono,monospace',
                color: s.ok ? '#506070' : '#ff444488', lineHeight:1.5 }}>{s.detail}</div>
            </div>
          </div>
        ))}
      </Panel>

      {/* Active Geo Flags */}
      {Object.keys(geoFlags).length > 0 && (
        <Panel glow="#ff8844">
          <Label color="#ff8844">🚨 ACTIVE GEO FLAGS</Label>
          {Object.entries(geoFlags).map(([flag, data]) => (
            <div key={flag} style={{ display:'flex', justifyContent:'space-between',
              padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontSize:9, color:'#ff8844', fontFamily:'Orbitron,monospace', letterSpacing:1 }}>
                  {flag.replace(/_/g,' ')}
                </div>
                <div style={{ fontSize:8, color:'#506070', fontFamily:'JetBrains Mono,monospace' }}>
                  {data.note} · {data.count} articles
                </div>
              </div>
            </div>
          ))}
        </Panel>
      )}

      {/* BL Optimal Weights */}
      {blOk && (
        <Panel glow="#7b2fff">
          <Label color="#7b2fff">BLACK-LITTERMAN — OPTIMAL WEIGHTS</Label>
          <div style={{ marginBottom:6, fontSize:8, color:'#3a5070',
            fontFamily:'JetBrains Mono,monospace' }}>
            Sharpe: {bl.portfolio_metrics?.sharpe_ratio?.toFixed(2)} |
            Exp return: {bl.portfolio_metrics?.expected_return?.toFixed(1)}% |
            Vol: {bl.portfolio_metrics?.volatility?.toFixed(1)}%
          </div>
          {Object.entries(bl.optimal_weights||{}).sort(([,a],[,b])=>b-a).slice(0,8).map(([sym,wt]) => (
            <div key={sym} style={{ display:'flex', justifyContent:'space-between',
              padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize:9, color:'#d0e8ff', fontFamily:'JetBrains Mono,monospace' }}>
                {sym} {['NET','CEG','GLNG'].includes(sym) ? '★' : ''}
              </span>
              <div style={{ textAlign:'right' }}>
                <span style={{ fontSize:9, color:'#7b2fff', fontWeight:700,
                  fontFamily:'JetBrains Mono,monospace' }}>{wt}%</span>
                {bl.recommendations?.find(r=>r.symbol===sym)?.kelly_fraction > 0 && (
                  <span style={{ fontSize:7, color:'#ffcc00', marginLeft:8,
                    fontFamily:'JetBrains Mono,monospace' }}>
                    Kelly {(bl.recommendations.find(r=>r.symbol===sym).kelly_fraction*100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          ))}
          {bl.top_pick && (
            <div style={{ marginTop:8, padding:'6px 10px', borderRadius:8,
              background:'rgba(123,47,255,0.1)', fontSize:9,
              fontFamily:'JetBrains Mono,monospace', color:'#7b2fff' }}>
              ▶ Top pick: {bl.top_pick}
            </div>
          )}
        </Panel>
      )}

      {/* Controls */}
      <Panel glow="#3a5070">
        <Label color="#3a5070">CONTROLS</Label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            { label:'↻ REFRESH',      color:'#00b4ff', fn:()=>trigger('morning'),     tip:'Fetch prices + run all models' },
            { label:'⚙ RECALIBRATE',  color:'#ffcc00', fn:()=>trigger('recalibrate'), tip:'Refit GARCH (mobile-safe, no price fetch)' },
          ].map(btn => (
            <div key={btn.label}>
              <button onClick={btn.fn} disabled={busy} style={{
                padding:'8px 14px', borderRadius:8, border:`1px solid ${btn.color}44`,
                background:`${btn.color}11`, color:btn.color,
                fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:1,
                cursor:busy?'not-allowed':'pointer', opacity:busy?0.5:1, display:'block',
              }}>{btn.label}</button>
              <div style={{ fontSize:6, color:'#3a5070', marginTop:2,
                fontFamily:'JetBrains Mono,monospace' }}>{btn.tip}</div>
            </div>
          ))}
        </div>
        {msg && (
          <div style={{ marginTop:10, fontSize:9, fontFamily:'JetBrains Mono,monospace',
            color:msg.includes('✅')?'#00ffcc':'#ff6688' }}>{msg}</div>
        )}
      </Panel>

    </div>
  );
}



// ── NAV ───────────────────────────────────────────────────────
function Nav({ tab, setTab }) {
  const tabs = [
    { id:'dashboard',     icon:'◈', label:'RADAR'  },
    { id:'opportunities', icon:'◆', label:'PICKS'  },
    { id:'portfolio',     icon:'◉', label:'PORT'   },
    { id:'settings',      icon:'⬡', label:'STATUS' },
  ];
  return (
    <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:480, background:'rgba(1,3,10,0.96)',
      backdropFilter:'blur(24px)', borderTop:'1px solid rgba(100,180,255,0.08)',
      display:'flex', zIndex:100 }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'10px 4px 8px', border:'none', background:'transparent',
            cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3,
          }}>
            <span style={{ fontSize:16, color: active ? '#00ffcc' : '#3a5070',
              filter: active ? 'drop-shadow(0 0 6px #00ffcc)' : 'none',
              transition:'all 0.2s' }}>{t.icon}</span>
            <span style={{ fontSize:7, letterSpacing:1, fontFamily:'Orbitron,monospace',
              color: active ? '#00ffcc' : '#3a5070' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}


// ── APP ──────────────────────────────────────────────────────
function App() {
  const { data, loading, error, refresh, ts, waking } = useData();
  const [tab, setTab] = useState('dashboard');
  const snap = data?.snap || {};

  if (loading && !data) return (
    <div style={{ background:'#01030a', minHeight:'100vh', display:'flex',
      alignItems:'center', justifyContent:'center', color:'#3a5070',
      fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:2 }}>
      LOADING...
    </div>
  );

  return (
    <div style={{ background:'#01030a', minHeight:'100vh', maxWidth:480,
      margin:'0 auto', position:'relative' }}>
      <div style={{ paddingBottom:70 }}>
        {tab==='dashboard'    && <DashboardTab    data={data}/>}
        {tab==='opportunities' && <OpportunitiesTab data={data}/>}
        {tab==='portfolio'    && <PortfolioTab    data={data}/>}
        {tab==='settings'     && <SettingsTab     data={data} refresh={refresh} ts={ts}/>}
      </div>
      <Nav tab={tab} setTab={setTab}/>
    </div>
  );
}

export default App;
