import React, { useRef, useEffect } from 'react';

const PORTFOLIO = new Set(['NET', 'CEG', 'GLNG']);

export function DominoTimeline({ chains, snap }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Use real chains or fallback
    const dominos = chains?.chains?.length > 0 ? chains.chains : [
      {
        trigger: 'IRAN HORMUZ', severity: 5, color: '#ff8c00',
        steps: [
          { label: 'LNG SHOCK',    time: -2, stocks: ['GLNG', 'LNG'],    impact: +12 },
          { label: 'OIL SPIKE',    time: 0,  stocks: ['ONGC', 'GLNG'],   impact: +6  },
          { label: 'FII SELL',     time: 2,  stocks: ['HDFCBANK'],       impact: -5  },
          { label: 'NET SAFE',     time: 4,  stocks: ['NET'],            impact: +3  },
        ],
      },
      {
        trigger: 'FED HOLDS', severity: 3, color: '#7b2fff',
        steps: [
          { label: 'USD STRONG',   time: -1, stocks: ['NET', 'INFY'],   impact: +4 },
          { label: 'EM PRESSURE',  time: 1,  stocks: ['HDFCBANK'],      impact: -3 },
          { label: 'CEG STABLE',   time: 3,  stocks: ['CEG'],           impact: +2 },
        ],
      },
      {
        trigger: 'NUCLEAR DEMAND', severity: 4, color: '#00b4ff',
        steps: [
          { label: 'BASELOAD UP',  time: -1, stocks: ['CEG', 'VST'],    impact: +8 },
          { label: 'AI POWER',     time: 1,  stocks: ['CEG'],           impact: +6 },
          { label: 'COAL DOWN',    time: 3,  stocks: ['COALINDIA'],     impact: -4 },
        ],
      },
    ];

    const TIME_START = -3, TIME_END = 7;
    const TIME_RANGE = TIME_END - TIME_START;
    const PAD_L = 16, PAD_R = 16, PAD_T = 24, PAD_B = 20;
    const TRACK_H = (H - PAD_T - PAD_B) / dominos.length;

    function tx(time) {
      return PAD_L + ((time - TIME_START) / TIME_RANGE) * (W - PAD_L - PAD_R);
    }
    const NOW_X = tx(0);

    let t = 0, raf;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Header
      ctx.fillStyle = '#2a3a50'; ctx.font = '7px JetBrains Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText('PAST ←————————————————→ FUTURE', W / 2, 12);

      // Time axis
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
      for (let d = TIME_START; d <= TIME_END; d++) {
        const x = tx(d);
        ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, H - PAD_B); ctx.stroke();
        ctx.fillStyle = d === 0 ? '#00ffcc88' : '#2a3a50';
        ctx.font = '7px JetBrains Mono, monospace'; ctx.textAlign = 'center';
        ctx.fillText(d === 0 ? 'NOW' : d > 0 ? `+${d}d` : `${d}d`, x, H - PAD_B + 10);
      }

      // NOW line — pulsing
      const nowPulse = 0.6 + Math.sin(t * 3) * 0.4;
      ctx.strokeStyle = `rgba(0,255,204,${nowPulse})`;
      ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(NOW_X, PAD_T - 8); ctx.lineTo(NOW_X, H - PAD_B - 5); ctx.stroke();
      ctx.setLineDash([]);

      // Each domino chain
      dominos.forEach((chain, ci) => {
        const baseY = PAD_T + ci * TRACK_H + TRACK_H / 2;
        const trigX = tx(-3);
        const col = chain.color;

        // Trigger node
        ctx.shadowColor = col; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(trigX, baseY, 11, 0, Math.PI * 2);
        ctx.fillStyle = col + '22'; ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = col; ctx.font = '8px JetBrains Mono, monospace'; ctx.textAlign = 'center';
        ctx.fillText('⚡', trigX, baseY + 3);

        // Chain name
        ctx.fillStyle = col + 'aa'; ctx.font = '6px JetBrains Mono, monospace';
        ctx.fillText(chain.trigger, trigX, baseY - 15);

        // Steps
        chain.steps.forEach((step, si) => {
          const sx = tx(step.time);
          const prevX = si === 0 ? trigX : tx(chain.steps[si - 1].time);
          const isPast = step.time <= 0;
          const isPort = step.stocks.some(s => PORTFOLIO.has(s));
          const sc = step.impact >= 0 ? '#00ffcc' : '#ff2244';

          // Thread
          const wave = Math.sin(t * 2 + si * 1.2) * (isPast ? 0 : 3);
          ctx.strokeStyle = isPast ? sc + '99' : sc + '33';
          ctx.lineWidth = isPast ? 1.5 : 1;
          ctx.setLineDash(isPast ? [] : [4, 3]);
          ctx.beginPath(); ctx.moveTo(prevX + 11, baseY); ctx.lineTo(sx - 9, baseY + wave); ctx.stroke();
          ctx.setLineDash([]);

          // Node
          const nr = isPast ? 10 : 8;
          ctx.shadowColor = sc; ctx.shadowBlur = isPort ? 14 : 5;
          ctx.beginPath(); ctx.arc(sx, baseY + wave, nr, 0, Math.PI * 2);
          ctx.fillStyle = sc + (isPast ? '25' : '12'); ctx.fill();
          ctx.strokeStyle = sc + (isPast ? 'cc' : '44'); ctx.lineWidth = 1.5; ctx.stroke();
          ctx.shadowBlur = 0;

          // Portfolio star
          if (isPort) {
            ctx.fillStyle = '#ffcc00'; ctx.font = '8px JetBrains Mono, monospace'; ctx.textAlign = 'center';
            ctx.fillText('★', sx, baseY + wave - nr - 3);
          }

          // Labels
          ctx.fillStyle = isPast ? '#d0e8ff' : '#3a5070';
          ctx.font = '6px JetBrains Mono, monospace'; ctx.textAlign = 'center';
          ctx.fillText(step.stocks.slice(0, 2).join(' '), sx, baseY + wave + nr + 10);
          ctx.fillStyle = sc + (isPast ? 'cc' : '66'); ctx.font = '7px JetBrains Mono, monospace';
          ctx.fillText((step.impact >= 0 ? '+' : '') + step.impact + '%', sx, baseY + wave + nr + 19);
        });
      });

      ctx.fillStyle = '#1a2a3a'; ctx.font = '6px JetBrains Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText('★ = YOUR HOLDINGS   SOLID = PRICED IN   DASHED = STILL TO COME', W / 2, H - 1);

      t += 0.016;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [chains, snap]);

  return (
    <div>
      <div style={{ fontSize: 7, fontFamily: 'Orbitron, monospace', letterSpacing: 3, color: '#4a5680', marginBottom: 4 }}>
        DOMINO CHAIN TIMELINE
      </div>
      <canvas ref={canvasRef} width={340} height={240}
        style={{ width: '100%', height: 'auto', display: 'block' }}/>
    </div>
  );
}
