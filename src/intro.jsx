import React, { useState, useEffect, useRef } from 'react';

// ── THE BRIEFING — ECG line draws, then market brief appears ──

export function IntroAnimation({ regime = 'BEAR', snap = {}, onComplete }) {
  const [phase, setPhase] = useState('heartline'); // heartline | brief | done
  const called = useRef(false);
  const canvasRef = useRef(null);

  const COLORS = {
    BULL:'#00ffcc', SOFT_BULL:'#00b4ff',
    SIDEWAYS:'#ffcc00', SOFT_BEAR:'#ff8c00', BEAR:'#ff2244',
  };
  const color = COLORS[regime] || '#ff2244';

  // Draw ECG line on canvas
  useEffect(() => {
    if (phase !== 'heartline') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const mid = H / 2;

    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();

    // ECG pattern: flat → spike → flat → spike → flat
    const pattern = [
      [0, 0], [0.08, 0], [0.10, -0.08], [0.12, 0],       // small bump
      [0.18, 0],
      [0.20, -0.05], [0.22, 0.05], [0.24, 0],             // small deflection
      [0.30, 0],
      [0.33, -0.04], [0.35, -0.02], [0.37, 0],            // P wave
      [0.40, 0],
      [0.42, -0.06], [0.44, 0.02],                        // Q
      [0.45, -0.95], [0.47, 0.95], [0.48, -0.15],        // QRS complex — the spike
      [0.50, 0],
      [0.52, 0.12], [0.56, 0.12], [0.60, 0],              // T wave
      [0.65, 0],
      [0.68, -0.04], [0.70, -0.02], [0.72, 0],
      [0.75, 0],
      [0.77, -0.05], [0.79, 0.05], [0.81, 0],
      [0.85, 0],
      [0.87, -0.95], [0.89, 0.95], [0.90, -0.15],        // second spike
      [0.92, 0],
      [0.94, 0.10], [0.97, 0.10], [1.0, 0],
    ];

    let drawn = 0;
    const total = pattern.length;
    const duration = 2000; // 2s to draw
    const startTime = performance.now();

    const draw = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const targetPts = Math.floor(progress * total);

      ctx.clearRect(0, 0, W, H);

      // Grid lines — faint
      ctx.strokeStyle = `${color}12`;
      ctx.lineWidth = 0.5;
      ctx.shadowBlur = 0;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // ECG line
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();

      for (let i = 0; i <= targetPts && i < pattern.length; i++) {
        const [px, py] = pattern[i];
        const x = px * W;
        const y = mid + py * (H * 0.4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glowing dot at tip
      if (targetPts > 0 && targetPts < pattern.length) {
        const [px, py] = pattern[targetPts - 1];
        const x = px * W;
        const y = mid + py * (H * 0.4);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = 20;
        ctx.fill();
      }

      if (progress < 1) {
        requestAnimationFrame(draw);
      }
    };

    requestAnimationFrame(draw);
  }, [phase, color]);

  useEffect(() => {
    // After heartline (2.2s) → show brief
    const t1 = setTimeout(() => setPhase('brief'), 2200);
    // After brief (4s total) → done
    const t2 = setTimeout(() => setPhase('done'), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase === 'done' && !called.current) {
      called.current = true;
      requestAnimationFrame(() => requestAnimationFrame(() => onComplete?.()));
    }
  }, [phase]);

  if (phase === 'done') return null;

  const fii    = snap?.fii?.fii_net || 0;
  const nifty  = snap?.indices?.['NIFTY 50'];
  const vix    = snap?.indices?.['INDIA VIX'];
  const usdInr = snap?.usdInr;
  const prices = snap?.usPrices || {};
  const avgs   = { NET: 208.62, CEG: 310.43, GLNG: 50.93 };
  const plUSD  = Object.entries(avgs).reduce((s, [tk, avg]) => {
    const curr = prices[tk];
    if (!curr) return s;
    const qty  = { NET: 1.066992, CEG: 0.714253, GLNG: 3.489692 }[tk];
    return s + (curr - avg) * qty;
  }, 0);
  const plINR  = plUSD * (usdInr || 86);
  const date   = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase();
  const time   = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:false }) + ' IST';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#01030a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      fontFamily: 'JetBrains Mono, monospace',
    }}>

      {/* Subtle grid background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: '40px 30px' }}/>

      {/* ECG Canvas — always visible */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: phase === 'brief' ? 0.15 : 1,
        transition: 'opacity 0.8s ease',
      }}/>

      {/* BRIEF phase */}
      {phase === 'brief' && (
        <div style={{
          position: 'relative', zIndex: 2,
          width: '85%', maxWidth: 340,
          animation: 'get-ready-in 0.5s cubic-bezier(0.2,0,0,1) both',
        }}>
          {/* Header line */}
          <div style={{ borderBottom: `1px solid ${color}44`, paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 8, letterSpacing: 4, color: `${color}88`, marginBottom: 6 }}>
              ▸ MARKET INTELLIGENCE BRIEF
            </div>
            <div style={{ fontSize: 9, color: '#3a5070', letterSpacing: 2 }}>
              {date} · {time}
            </div>
          </div>

          {/* Key facts — typed out one by one */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                label: 'REGIME',
                value: regime,
                color,
                sub: `Score ${snap?.regime_score || 0} / 5`,
              },
              {
                label: 'FII FLOW',
                value: fii !== 0 ? `${fii >= 0 ? '+' : ''}${(fii/100).toFixed(0)} Cr` : '--',
                color: fii >= 0 ? '#00ffcc' : '#ff2244',
                sub: fii < 0 ? 'Institutional selling' : 'Institutional buying',
              },
              {
                label: 'NIFTY 50',
                value: nifty?.last?.toLocaleString('en-IN') || '--',
                color: (nifty?.pChange || 0) >= 0 ? '#00ffcc' : '#ff2244',
                sub: nifty?.pChange ? `${nifty.pChange >= 0 ? '+' : ''}${nifty.pChange.toFixed(2)}% today` : '',
              },
              {
                label: 'VIX',
                value: vix?.last?.toFixed(1) || '--',
                color: (vix?.last || 0) > 20 ? '#ff8c00' : '#00ffcc',
                sub: (vix?.last || 0) > 20 ? 'Elevated fear' : 'Calm market',
              },
              {
                label: 'YOUR PORTFOLIO',
                value: prices.NET || prices.CEG || prices.GLNG
                  ? `${plINR >= 0 ? '+' : ''}₹${Math.abs(plINR/1000).toFixed(1)}K`
                  : 'Fetching...',
                color: plINR >= 0 ? '#00ffcc' : '#ff2244',
                sub: plINR >= 0 ? 'Unrealised gain' : 'Unrealised loss',
              },
            ].map((row, i) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                animation: `slide-up 0.3s ease ${i * 0.12}s both`,
              }}>
                <div>
                  <div style={{ fontSize: 7, letterSpacing: 3, color: '#3a5070', marginBottom: 2 }}>
                    {row.label}
                  </div>
                  {row.sub && (
                    <div style={{ fontSize: 8, color: '#1e3050' }}>{row.sub}</div>
                  )}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: row.color,
                  textShadow: `0 0 15px ${row.color}66`,
                  letterSpacing: 1,
                }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>

          {/* Enter prompt */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 8, letterSpacing: 3, color: `${color}55`,
              animation: 'heartbeat 1.5s ease infinite' }}>
              ENTERING DASHBOARD ▸▸▸
            </div>
          </div>
        </div>
      )}

      {/* Heartline phase label */}
      {phase === 'heartline' && (
        <div style={{ position: 'absolute', bottom: '15%', textAlign: 'center',
          animation: 'get-ready-in 0.5s ease 0.3s both' }}>
          <div style={{ fontSize: 9, letterSpacing: 5, color: `${color}55`,
            fontFamily: 'JetBrains Mono, monospace' }}>
            READING MARKET PULSE
          </div>
        </div>
      )}
    </div>
  );
}
