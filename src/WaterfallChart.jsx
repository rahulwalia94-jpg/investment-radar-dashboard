import React, { useEffect, useRef } from 'react';

// ── ANIMATED WATERFALL SCORE CHART ────────────────────────────
export function WaterfallChart({ scoreData }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scoreData) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const layers = scoreData.layers || {};
    const finalScore = scoreData.score || 50;

    const bars = [
      { label: 'NEUTRAL',     value: 0,  color: '#3a5070', base: 50 },
      { label: 'QUANT',       value: (layers.quant?.score || 50) - 50,       color: '#00ffcc' },
      { label: 'NEWS',        value: (layers.news?.score || 50) - 50,        color: '#00b4ff' },
      { label: 'FUNDAMENTAL', value: (layers.fundamental?.score || 50) - 50, color: '#7b2fff' },
      { label: 'MACRO',       value: (layers.macro?.score || 50) - 50,       color: '#ffcc00' },
      { label: 'GEO',         value: (layers.geo?.score || 50) - 50,         color: '#ff8c00' },
    ];

    const PAD_L = 95, PAD_R = 35, PAD_T = 20, PAD_B = 20;
    const BW = W - PAD_L - PAD_R;
    const BH = (H - PAD_T - PAD_B - bars.length * 4) / bars.length;
    const SCALE = BW / 100;
    const BASE_X = PAD_L + 50 * SCALE;

    let running = 50;
    const computed = bars.map((b, i) => {
      if (i === 0) return { ...b, start: 50, end: 50 };
      const start = running;
      const end = Math.max(0, Math.min(100, running + b.value));
      running = end;
      return { ...b, start, end };
    });
    computed.push({ label: 'FINAL', value: 0, color: finalScore >= 60 ? '#00ffcc' : finalScore >= 45 ? '#ffcc00' : '#ff2244', start: 50, end: finalScore, isFinal: true });

    let prog = 0;
    let raf;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Grid
      [0, 25, 50, 75, 100].forEach(v => {
        const x = PAD_L + v * SCALE;
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, H - PAD_B); ctx.stroke();
        ctx.fillStyle = '#2a3a50';
        ctx.font = '7px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(v, x, PAD_T - 4);
      });

      // Neutral line
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(BASE_X, PAD_T - 8); ctx.lineTo(BASE_X, H - PAD_B); ctx.stroke();
      ctx.setLineDash([]);

      computed.forEach((bar, i) => {
        const p = Math.min(1, Math.max(0, (prog - i * 0.12) / 0.35));
        if (p <= 0) return;

        const y = PAD_T + i * (BH + 4);
        const bh = bar.isFinal ? BH + 6 : BH;
        const x1 = PAD_L + Math.min(bar.start, bar.end) * SCALE;
        const bw = Math.abs(bar.end - bar.start) * SCALE * p;
        const isPositive = bar.end >= bar.start;

        // Row bg
        ctx.fillStyle = `${bar.color}08`;
        ctx.fillRect(PAD_L, y, BW, bh);

        // Bar
        const grd = ctx.createLinearGradient(isPositive ? x1 : x1 + bw, 0, isPositive ? x1 + bw : x1, 0);
        grd.addColorStop(0, bar.color + '44');
        grd.addColorStop(1, bar.color);
        ctx.fillStyle = grd;
        ctx.fillRect(isPositive ? x1 : x1 + bw - bw, y + 2, bw, bh - 4);

        // Glow
        ctx.shadowColor = bar.color; ctx.shadowBlur = 6;
        ctx.fillRect(isPositive ? x1 : x1 + bw - bw, y + 2, bw, bh - 4);
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = bar.isFinal ? '#d0e8ff' : '#7090a8';
        ctx.font = `${bar.isFinal ? 'bold 8' : '7'}px JetBrains Mono, monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(bar.label, PAD_L - 5, y + bh / 2 + 3);

        // Value
        if (p > 0.6) {
          ctx.fillStyle = bar.color;
          ctx.font = `bold ${bar.isFinal ? 10 : 9}px JetBrains Mono, monospace`;
          const vx = isPositive ? x1 + bw + 4 : x1 - 4;
          ctx.textAlign = isPositive ? 'left' : 'right';
          const label = bar.isFinal ? `${finalScore}` : bar.value >= 0 ? `+${Math.round(bar.value)}` : `${Math.round(bar.value)}`;
          ctx.fillText(label, vx, y + bh / 2 + 3);
        }

        // Connector
        if (i > 0 && i < computed.length - 2 && p > 0.9) {
          const next = computed[i + 1];
          if (next) {
            const cx = PAD_L + bar.end * SCALE;
            ctx.strokeStyle = bar.color + '33'; ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(cx, y + bh); ctx.lineTo(cx, y + bh + 4); ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      });

      prog += 0.018;
      if (prog < 2.5) raf = requestAnimationFrame(draw);
      else setTimeout(() => { prog = 0; draw(); }, 3000);
    }

    draw();
    return () => { cancelAnimationFrame(raf); };
  }, [scoreData]);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 7, fontFamily: 'Orbitron, monospace', letterSpacing: 3,
        color: '#4a5680', marginBottom: 6 }}>SCORE WATERFALL</div>
      <canvas ref={canvasRef} width={320} height={220}
        style={{ width: '100%', height: 'auto', display: 'block' }}/>
    </div>
  );
}
