import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import './App.css';
import { IntroAnimation } from './intro.jsx';
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

  return { data, loading, error, ts, refresh };
}

// ── TALKING STOCK ─────────────────────────────────────────────
function speakStock(symbol, text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9; u.pitch = 1.0; u.volume = 1.0;
  // Pick a nice voice
  const voices = window.speechSynthesis.getVoices();
  const nice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
    || voices.find(v => v.lang.startsWith('en'));
  if (nice) u.voice = nice;
  window.speechSynthesis.speak(u);
}

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
  const [msgs,  setMsgs]  = useState([]);
  const [input, setInput] = useState('');
  const [busy,  setBusy]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  // Speak intro when opened
  useEffect(() => {
    const s = scores?.[symbol] || {};
    const regime = snap?.regime || 'SIDEWAYS';
    const bR = s.calibration?.base_returns?.[regime];
    const intro = `${symbol}. ${s.sector || ''}. Score ${s.score || '--'} out of 100. Signal: ${s.signal || 'neutral'}. ${bR !== undefined ? `Expected return ${bR >= 0 ? 'plus' : 'minus'} ${Math.abs(bR)} percent in this ${regime} market. ` : ''}${s.reason?.slice(0,60) || ''}`;
    speakStock(symbol, intro);
    setMsgs([{ role:'ai', text: `**${symbol}** — ${s.sector || 'Unknown Sector'}\n\nScore: **${s.score || '--'}/100** · Signal: **${s.signal || 'N/A'}**\n\n${s.reason || 'Ask me anything about this stock.'}\n\n*Tap to ask any question. Unknown answers get parked.*` }]);
  }, []);

  const send = async (q_) => {
    const q = q_ || input.trim();
    if (!q || busy) return;
    setInput('');
    setMsgs(m => [...m, { role:'user', text:q }]);
    setBusy(true);
    try {
      const s = scores?.[symbol] || {};
      const regime = snap?.regime || 'SIDEWAYS';
      const isUS = ['NET','CEG','GLNG','NVDA','MSFT','AAPL'].includes(symbol);
      const price = isUS ? snap?.usPrices?.[symbol] : s.last_price;
      const avgs = { NET:208.62, CEG:310.43, GLNG:50.93 };
      const pct = avgs[symbol] && price ? ((price-avgs[symbol])/avgs[symbol]*100).toFixed(1) : null;

      const ctx = `Stock: ${symbol} | Sector: ${s.sector||'?'} | Score: ${s.score||'?'}/100 | Signal: ${s.signal||'?'} | Regime: ${regime} | Price: ${isUS?'$':'₹'}${price||'?'} ${pct?`(${pct}% vs avg)`:''}  | Expected return: ${s.calibration?.base_returns?.[regime]??'?'}% | Volatility: ${s.calibration?.sigma?.[regime]?`${(s.calibration.sigma[regime]*100).toFixed(0)}%`:'?'} | Source: ${s.calibration?.source||'?'} | Reason: ${s.reason||'?'} | FII: ${snap?.fii?.fii_net?`${Math.round(snap.fii.fii_net)}Cr`:'?'} | VIX: ${snap?.indices?.['INDIA VIX']?.last?.toFixed(1)||'?'}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:800,
          system:`You are a dimensional investment intelligence for ${symbol}. Answer DIRECTLY with numbers. 3-4 sentences max. No disclaimers. If genuinely unknown say "PARKING THIS: [question]" exactly.`,
          messages:[{ role:'user', content:`Context: ${ctx}\n\nQuestion: ${q}` }],
        }),
      });
      const d = await res.json();
      const answer = d.content?.[0]?.text || 'No response.';
      if (answer.includes('PARKING THIS:')) {
        PARKED.questions.push({ symbol, question:q, ts:new Date().toISOString() });
      }
      setMsgs(m => [...m, { role:'ai', text:answer }]);
      // Speak the answer
      speakStock(symbol, answer.replace(/PARKING THIS:/g,'').replace(/\*\*/g,'').slice(0,150));
    } catch(e) {
      setMsgs(m => [...m, { role:'ai', text:`Error: ${e.message}` }]);
    } finally { setBusy(false); }
  };

  const sugg = ['Should I buy or sell?','What is the win probability?','Main risk factors?','Price target 3 months?','Why this score?'];

  return (
    <div style={{ marginTop:12, borderTop:'1px solid rgba(100,150,255,0.1)', paddingTop:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <Label color="#7b2fff">ASK ABOUT {symbol}</Label>
        <button onClick={() => { window.speechSynthesis?.cancel(); onClose(); }}
          style={{ background:'none', border:'none', color:'#3a5070', fontSize:16, cursor:'pointer' }}>×</button>
      </div>

      <div style={{ maxHeight:220, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{
            alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth:'90%',
            padding:'8px 12px',
            borderRadius: m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',
            background: m.role==='user'?'rgba(123,47,255,0.2)':'rgba(0,180,255,0.08)',
            border:`1px solid ${m.role==='user'?'rgba(123,47,255,0.35)':'rgba(0,180,255,0.15)'}`,
            fontSize:10, lineHeight:1.7, whiteSpace:'pre-wrap',
            color: m.role==='user'?'#c4a8ff':'#90b8d0',
            fontFamily: m.role==='user'?'Space Grotesk':'JetBrains Mono, monospace',
            animation:'slide-up 0.2s ease',
          }}>
            {m.text.includes('PARKING THIS')
              ? <><span style={{ color:'#ffcc00', fontWeight:700 }}>📌 PARKED: </span>{m.text.replace('PARKING THIS:','').trim()}</>
              : m.text.replace(/\*\*(.*?)\*\*/g, '$1')}
          </div>
        ))}
        {busy && <div style={{ alignSelf:'flex-start', padding:'8px 12px', fontSize:10,
          color:'#3a5070', fontFamily:'JetBrains Mono, monospace',
          background:'rgba(0,180,255,0.06)', borderRadius:'14px 14px 14px 4px',
          border:'1px solid rgba(0,180,255,0.12)', animation:'slide-up 0.2s ease' }}>
          traversing dimensions...
        </div>}
        <div ref={bottomRef}/>
      </div>

      {msgs.length <= 1 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:8 }}>
          {sugg.map(s => (
            <button key={s} onClick={() => send(s)} style={{ padding:'3px 8px', borderRadius:8,
              border:'1px solid rgba(123,47,255,0.2)', background:'rgba(123,47,255,0.05)',
              color:'#3a5070', fontSize:8, fontFamily:'Space Grotesk' }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:6 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder={`Ask anything about ${symbol}...`}
          style={{ flex:1, padding:'8px 12px', borderRadius:10, outline:'none',
            border:'1px solid rgba(123,47,255,0.2)', background:'rgba(123,47,255,0.06)',
            color:'#d0e8ff', fontSize:10, fontFamily:'JetBrains Mono, monospace' }}/>
        <button onClick={()=>send()} disabled={busy||!input.trim()} style={{
          padding:'8px 14px', borderRadius:10, border:'none', fontSize:12,
          background: busy||!input.trim()?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#7b2fff,#00b4ff)',
          color: busy||!input.trim()?'#3a5070':'#fff', fontWeight:700,
          boxShadow: busy||!input.trim()?'none':'0 0 20px rgba(123,47,255,0.4)',
          transition:'all 0.2s' }}>→</button>
      </div>
    </div>
  );
}

// ── STOCK CARD ────────────────────────────────────────────────
function StockCard({ inst, regime, snap, scores }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const c = inst.score>=75?'#00ffcc':inst.score>=60?'#00b4ff':inst.score>=45?'#ffcc00':'#ff2244';
  const cal = inst.calibration || {};
  const bR = cal.base_returns?.[regime];
  const sig = inst.signal||'';
  const sigC = sig.includes('BUY')||sig.includes('ADD')?'#00ffcc':sig.includes('AVOID')||sig.includes('SELL')?'#ff2244':'#ffcc00';

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

      {/* Calibration */}
      {expanded && cal.base_returns && (
        <div style={{ marginTop:10 }}>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {Object.entries(cal.base_returns).map(([r,v]) => (
              <div key={r} style={{ padding:'3px 7px', borderRadius:6, fontSize:8,
                fontFamily:'JetBrains Mono, monospace',
                background: r===regime?`${c}12`:'rgba(255,255,255,0.03)',
                border:`1px solid ${r===regime?`${c}44`:'rgba(255,255,255,0.06)'}`,
                color: r===regime?c:'#3a5070' }}>
                {r.replace('_',' ')}: {v>=0?'+':''}{v}%
              </div>
            ))}
          </div>
        </div>
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
    </div>
  );
}

// ── OPPORTUNITIES TAB ─────────────────────────────────────────
function OpportunitiesTab({ data }) {
  const [search, setSearch] = useState('');
  const [minS,   setMinS]   = useState(50);
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
    </div>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────
function SettingsTab({ refresh, ts }) {
  const [msg,setBusy2] = useState('');
  const [busy,setBusy] = useState(false);
  const trigger = async (type='morning') => {
    setBusy(true); setBusy2('');
    try {
      const r = await fetch(`${API}/api/refresh${type==='recalibrate'?'?type=recalibrate':''}`);
      const d = await r.json();
      setBusy2(d.ok?'✅ Started':`❌ ${d.error}`);
      if (d.ok) setTimeout(()=>refresh(true),8000);
    } catch(e) { setBusy2(`❌ ${e.message}`); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ padding:'14px 14px 90px' }}>
      <Panel glow="#7b2fff">
        <Label color="#7b2fff">CONTROL PANEL</Label>
        <button onClick={()=>trigger()} disabled={busy} style={{ width:'100%', padding:14, borderRadius:12, border:'none',
          background:busy?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#00ffcc,#00b4ff)',
          color:busy?'#3a5070':'#01030a', fontWeight:900, fontSize:13, fontFamily:'Space Grotesk',
          marginBottom:8, boxShadow:busy?'none':'0 0 25px rgba(0,255,204,0.3)', transition:'all 0.2s' }}>
          {busy?'⏳ RUNNING...':'⚡ REFRESH NOW'}
        </button>
        <button onClick={()=>trigger('recalibrate')} disabled={busy} style={{ width:'100%', padding:11, borderRadius:12,
          border:'1px solid rgba(255,204,0,0.25)', background:'rgba(255,204,0,0.06)',
          color:'#ffcc00', fontWeight:700, fontSize:10, fontFamily:'Space Grotesk', marginBottom:8 }}>
          🔄 FULL RECALIBRATION (20 min)
        </button>
        {msg && <div style={{ padding:'10px 12px', borderRadius:8, fontSize:10,
          fontFamily:'JetBrains Mono, monospace',
          background:msg.startsWith('✅')?'rgba(0,255,204,0.08)':'rgba(255,34,68,0.08)',
          border:`1px solid ${msg.startsWith('✅')?'rgba(0,255,204,0.2)':'rgba(255,34,68,0.2)'}`,
          color:msg.startsWith('✅')?'#00ffcc':'#ff2244' }}>{msg}</div>}
        {ts && <div style={{ marginTop:8, fontSize:8, color:'#3a5070', fontFamily:'JetBrains Mono, monospace' }}>Last fetch: {ts.toLocaleTimeString('en-IN')}</div>}
      </Panel>

      {PARKED.questions.length > 0 && (
        <Panel glow="#ffcc00">
          <Label color="#ffcc00">📌 PARKED QUESTIONS — DEBATE LATER ({PARKED.questions.length})</Label>
          {PARKED.questions.map((q,i) => (
            <div key={i} style={{ padding:'7px 10px', marginBottom:4, borderRadius:8,
              background:'rgba(255,204,0,0.05)', border:'1px solid rgba(255,204,0,0.12)' }}>
              <div style={{ fontSize:8, color:'#ffcc00', fontFamily:'JetBrains Mono, monospace' }}>{q.symbol} · {q.ts?.slice(11,16)}</div>
              <div style={{ fontSize:9, color:'#7090a8', marginTop:2, fontFamily:'Space Grotesk' }}>{q.question}</div>
            </div>
          ))}
        </Panel>
      )}

      <Panel>
        <Label>DIMENSIONAL SYSTEM STATUS</Label>
        {[
          {l:'Backend',  v:'Render · Singapore', c:'#00ffcc'},
          {l:'Storage',  v:'Backblaze B2 · 1TB', c:'#00ffcc'},
          {l:'Firebase', v:'DELETED',             c:'#ff2244'},
          {l:'Scoring',  v:'Python GARCH Engine', c:'#00b4ff'},
          {l:'News',     v:'196 stocks · 15min',  c:'#00b4ff'},
          {l:'Cost',     v:'~$20/month fixed',    c:'#00ffcc'},
        ].map(x => (
          <div key={x.l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0',
            borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ fontSize:9, color:'#3a5070', fontFamily:'Orbitron, monospace', letterSpacing:1 }}>{x.l}</span>
            <span style={{ fontSize:9, color:x.c, fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{x.v}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────
function Nav({ tab, setTab }) {
  const tabs = [
    {id:'dashboard',     icon:'◈', label:'RADAR'},
    {id:'opportunities', icon:'◎', label:'PICKS'},
    {id:'portfolio',     icon:'◇', label:'PORT'},
    {id:'settings',      icon:'⊙', label:'SYS'},
  ];
  return (
    <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:480, zIndex:200,
      background:'rgba(1,3,10,0.92)', backdropFilter:'blur(30px)',
      borderTop:'1px solid rgba(100,180,255,0.06)',
      display:'flex', justifyContent:'space-around',
      padding:'10px 0 max(12px,env(safe-area-inset-bottom))' }}>
      {tabs.map(t => {
        const active = tab===t.id;
        return (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:'flex', flexDirection:'column',
            alignItems:'center', gap:3, background:'none', border:'none', padding:'4px 16px', borderRadius:10 }}>
            <span style={{ fontSize:18, lineHeight:1,
              color:active?'#00ffcc':'#3a5070',
              textShadow:active?'0 0 15px #00ffcc':'none',
              transform:active?'scale(1.2)':'scale(1)',
              transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)' }}>{t.icon}</span>
            <span style={{ fontSize:7, fontFamily:'Orbitron, monospace', letterSpacing:2, fontWeight:700,
              color:active?'#00ffcc':'#3a5070', transition:'color 0.2s' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [tab,        setTab]        = useState('dashboard');
  const [showIntro,  setShowIntro]  = useState(true);
  const { data, loading, error, ts, refresh } = useData();

  // Show intro only once per session
  useEffect(() => {
    const seen = sessionStorage.getItem('intro-seen');
    if (seen) setShowIntro(false);
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem('intro-seen', '1');
  };

  // Render intro as overlay — not as early return — so dashboard is ready underneath

  if (loading && !data) {
    return (
      <div style={{ minHeight:'100vh', background:'#01030a', display:'flex',
        flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20 }}>
        <div style={{ position:'relative', width:60, height:60 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ position:'absolute', inset:i*10, borderRadius:'50%',
              border:`1px solid rgba(0,255,204,${0.6-i*0.2})`,
              animation:`pulse-ring 1.5s ease-out infinite`, animationDelay:`${i*0.3}s` }}/>
          ))}
        </div>
        <div style={{ fontSize:10, fontFamily:'Orbitron, monospace', color:'#00ffcc', letterSpacing:4 }}>LOADING</div>
      </div>
    );
  }

  const regime = data?.snap?.regime || 'SIDEWAYS';
  const dm = DIM[regime] || DIM.SIDEWAYS;

  return (
    <div style={{ minHeight:'100vh', background:'#01030a', color:'#d0e8ff',
      maxWidth:480, margin:'0 auto', position:'relative',
      animation:'world-explode-in 0.8s cubic-bezier(0.2,0,0,1) forwards',
      backgroundImage:`radial-gradient(ellipse at 50% 0%, ${dm.color}08 0%, transparent 60%)` }}>

      {/* ── INTRO OVERLAY ── */}
      {showIntro && (
        <IntroAnimation
          regime={data?.snap?.regime || 'BEAR'}
          snap={data?.snap || {}}
          onComplete={handleIntroComplete}/>
      )}

      {/* ── REGIME WORLD BACKGROUND ── */}
      <div style={{ position:'fixed', inset:0, zIndex:0, opacity:0.35,
        pointerEvents:'none', maxWidth:480, margin:'0 auto',
        animation:'world-explode-in 0.9s cubic-bezier(0.2,0,0,1) forwards' }}>
        <RegimeWorld regime={regime}/>
      </div>

      {/* Dim overlay so content is readable */}
      <div style={{ position:'fixed', inset:0, zIndex:1, pointerEvents:'none',
        background:'linear-gradient(180deg, rgba(1,3,10,0.7) 0%, rgba(1,3,10,0.5) 40%, rgba(1,3,10,0.8) 100%)' }}/>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:100,
        background:'rgba(1,3,10,0.92)', backdropFilter:'blur(30px)',
        borderBottom:'1px solid rgba(100,180,255,0.06)',
        padding:'12px 16px 10px',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#00ffcc',
              boxShadow:'0 0 10px #00ffcc', flexShrink:0 }}/>
            <span style={{ fontSize:14, fontWeight:700, letterSpacing:3,
              fontFamily:'Orbitron, monospace', color:'#d0e8ff' }}>INVESTMENT RADAR</span>
          </div>
          <div style={{ fontSize:7, fontFamily:'JetBrains Mono, monospace',
            color:'#3a5070', letterSpacing:2, marginTop:2, marginLeft:16 }}>
            PRO · {data?.snap?.regime||'—'} · 5D INTELLIGENCE
          </div>
        </div>
        <button onClick={()=>refresh()} disabled={loading}
          style={{ padding:'7px 14px', borderRadius:8,
            border:'1px solid rgba(0,255,204,0.2)',
            background:loading?'transparent':'rgba(0,255,204,0.08)',
            color:loading?'#3a5070':'#00ffcc',
            fontFamily:'JetBrains Mono, monospace', fontWeight:700, fontSize:10,
            letterSpacing:1, boxShadow:loading?'none':'0 0 12px rgba(0,255,204,0.15)',
            transition:'all 0.2s' }}>
          {loading?'...':'↺'}
        </button>
      </div>

      <div style={{ overflowY:'auto', paddingBottom:70, position:'relative', zIndex:2 }}>
        {tab==='dashboard'     && <DashboardTab     data={data}/>}
        {tab==='opportunities' && <OpportunitiesTab data={data}/>}
        {tab==='portfolio'     && <PortfolioTab     data={data}/>}
        {tab==='settings'      && <SettingsTab      refresh={refresh} ts={ts}/>}
      </div>

      <Nav tab={tab} setTab={setTab}/>
    </div>
  );
}
