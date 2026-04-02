import React, { useRef, useEffect, useState } from 'react';

// ── RISK-RETURN MATRIX — All 600 stocks ───────────────────────
const PORTFOLIO = new Set(['NET', 'CEG', 'GLNG']);

export function RiskReturnMatrix({ scores, regime }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const nodesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scores) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const PAD = { l: 40, r: 20, t: 20, b: 30 };
    const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b;

    // Build plot data from scores
    const stocks = Object.entries(scores).map(([sym, s]) => {
      const cal = s.calibration || {};
      const sigma = cal.sigma?.[regime] || 0.25;
      const bR = cal.base_returns?.[regime] || 0;
      return { sym, sigma, bR, score: s.score || 50, sector: s.sector || '', isPort: PORTFOLIO.has(sym) };
    }).filter(s => s.sigma > 0);

    // Axis ranges
    const sigmas = stocks.map(s => s.sigma);
    const returns = stocks.map(s => s.bR);
    const X_MIN = 0.05, X_MAX = Math.min(0.7, Math.max(...sigmas) * 1.1);
    const Y_MIN = Math.min(-25, Math.min(...returns) * 1.1);
    const Y_MAX = Math.max(30, Math.max(...returns) * 1.1);

    function px(sigma) { return PAD.l + ((sigma - X_MIN) / (X_MAX - X_MIN)) * PW; }
    function py(ret)   { return PAD.t + PH - ((ret - Y_MIN) / (Y_MAX - Y_MIN)) * PH; }

    const midX = px(0.3), midY = py(0);

    // Store nodes for hover
    nodesRef.current = stocks.map(s => ({ ...s, x: px(s.sigma), y: py(s.bR), r: s.isPort ? 9 : 4 }));

    let raf;
    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Quadrant fills
      ctx.fillStyle = 'rgba(0,255,204,0.04)';  ctx.fillRect(PAD.l, PAD.t, midX - PAD.l, midY - PAD.t);
      ctx.fillStyle = 'rgba(255,204,0,0.03)';  ctx.fillRect(midX, PAD.t, W - PAD.r - midX, midY - PAD.t);
      ctx.fillStyle = 'rgba(0,180,255,0.03)';  ctx.fillRect(PAD.l, midY, midX - PAD.l, H - PAD.b - midY);
      ctx.fillStyle = 'rgba(255,34,68,0.05)';  ctx.fillRect(midX, midY, W - PAD.r - midX, H - PAD.b - midY);

      // Quadrant labels
      ctx.font = '7px JetBrains Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,255,204,0.35)';   ctx.fillText('IDEAL', PAD.l + (midX - PAD.l) / 2, PAD.t + 12);
      ctx.fillStyle = 'rgba(255,204,0,0.35)';   ctx.fillText('AGGRESSIVE', midX + (W - PAD.r - midX) / 2, PAD.t + 12);
      ctx.fillStyle = 'rgba(0,180,255,0.35)';   ctx.fillText('DEFENSIVE', PAD.l + (midX - PAD.l) / 2, H - PAD.b - 4);
      ctx.fillStyle = 'rgba(255,34,68,0.35)';   ctx.fillText('AVOID', midX + (W - PAD.r - midX) / 2, H - PAD.b - 4);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
      [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].forEach(v => {
        if (v > X_MAX) return;
        const x = px(v);
        ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, H - PAD.b); ctx.stroke();
        ctx.fillStyle = '#2a3a50'; ctx.font = '7px JetBrains Mono, monospace'; ctx.textAlign = 'center';
        ctx.fillText(`${v * 100}%`, x, H - PAD.b + 10);
      });
      [-20, -10, 0, 10, 20, 30].forEach(v => {
        const y = py(v);
        if (y < PAD.t || y > H - PAD.b) return;
        ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
        ctx.fillStyle = '#2a3a50'; ctx.font = '7px JetBrains Mono, monospace'; ctx.textAlign = 'right';
        ctx.fillText(`${v > 0 ? '+' : ''}${v}%`, PAD.l - 3, y + 3);
      });

      // Zero line
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(PAD.l, midY); ctx.lineTo(W - PAD.r, midY); ctx.stroke();
      ctx.setLineDash([]);

      // Axis labels
      ctx.fillStyle = '#3a5070'; ctx.font = '7px JetBrains Mono, monospace';
      ctx.textAlign = 'center'; ctx.fillText('VOLATILITY →', W / 2, H);
      ctx.save(); ctx.translate(10, H / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('EXPECTED RETURN →', 0, 0); ctx.restore();

      // Plot stocks
      nodesRef.current.forEach(s => {
        const pulse = s.isPort ? 1 + Math.sin(t * 2 + s.x) * 0.15 : 1;
        const r = s.r * pulse;
        const c = s.score >= 65 ? '#00ffcc' : s.score >= 50 ? '#ffcc00' : '#ff2244';

        // Glow for portfolio
        if (s.isPort) {
          const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 3);
          grd.addColorStop(0, c + '44'); grd.addColorStop(1, 'transparent');
          ctx.beginPath(); ctx.arc(s.x, s.y, r * 3, 0, Math.PI * 2);
          ctx.fillStyle = grd; ctx.fill();
        }

        ctx.shadowColor = c; ctx.shadowBlur = s.isPort ? 12 : 3;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = c + (s.isPort ? 'dd' : '66'); ctx.fill();
        ctx.shadowBlur = 0;

        if (s.isPort) {
          ctx.fillStyle = '#d0e8ff'; ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.textAlign = 'center'; ctx.fillText(s.sym, s.x, s.y - r - 4);
          ctx.fillStyle = c; ctx.font = '7px JetBrains Mono, monospace';
          ctx.fillText('★', s.x, s.y + r + 9);
        }
      });

      t += 0.016;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [scores, regime]);

  // Hover detection
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const hit = nodesRef.current.find(n => Math.sqrt((mx - n.x) ** 2 + (my - n.y) ** 2) < Math.max(n.r * 2, 8));
    setTooltip(hit ? { sym: hit.sym, sigma: (hit.sigma * 100).toFixed(0), bR: hit.bR.toFixed(1), score: hit.score, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 7, fontFamily: 'Orbitron, monospace', letterSpacing: 3, color: '#4a5680', marginBottom: 6 }}>
        RISK-RETURN MATRIX · {Object.keys(scores || {}).length} STOCKS
      </div>
      <canvas ref={canvasRef} width={320} height={280}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}/>
      {tooltip && (
        <div style={{ position: 'absolute', left: tooltip.x + 10, top: tooltip.y - 30,
          background: 'rgba(10,20,40,0.95)', border: '1px solid rgba(0,255,204,0.3)',
          borderRadius: 8, padding: '6px 10px', pointerEvents: 'none', zIndex: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#d0e8ff', fontFamily: 'JetBrains Mono, monospace' }}>{tooltip.sym}</div>
          <div style={{ fontSize: 8, color: '#7090a8', fontFamily: 'JetBrains Mono, monospace' }}>
            σ {tooltip.sigma}% · Exp {tooltip.bR >= 0 ? '+' : ''}{tooltip.bR}% · Score {tooltip.score}
          </div>
        </div>
      )}
    </div>
  );
}
