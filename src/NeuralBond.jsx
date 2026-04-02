import React, { useRef, useEffect, useState } from 'react';

const PORTFOLIO = new Set(['NET', 'CEG', 'GLNG']);

export function NeuralBond({ scores, regime }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ shock: null, shockT: 1, t: 0, nodes: [], bonds: [] });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scores) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    // Pick top 20 by score, always include portfolio
    const all = Object.entries(scores)
      .map(([sym, s]) => ({ sym, score: s.score || 50, sector: s.sector || '', cal: s.calibration || {} }))
      .sort((a, b) => b.score - a.score);

    const portStocks = all.filter(s => PORTFOLIO.has(s.sym));
    const top17 = all.filter(s => !PORTFOLIO.has(s.sym)).slice(0, 17);
    const top20 = [...portStocks, ...top17];

    // Place nodes in circle — portfolio at centre-ish
    const nodes = top20.map((s, i) => {
      const isPort = PORTFOLIO.has(s.sym);
      const angle = (i / top20.length) * Math.PI * 2 - Math.PI / 2;
      const r = isPort ? 80 : 130 + (Math.random() - 0.5) * 30;
      return {
        id: s.sym, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        score: s.score, sector: s.sector, isPort,
        color: isPort ? (s.sym === 'NET' ? '#00b4ff' : s.sym === 'CEG' ? '#7b2fff' : '#00ffcc')
          : s.score >= 65 ? '#00ffcc' : s.score >= 50 ? '#ffcc00' : '#ff2244',
        size: isPort ? 16 : 8,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      };
    });

    // Build bonds based on sector correlation + score similarity
    const bonds = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const sameSector = a.sector && b.sector && a.sector === b.sector;
        const scoreDiff = Math.abs(a.score - b.score);
        const portLink = a.isPort || b.isPort;
        let strength = 0;
        if (sameSector) strength += 0.6;
        if (scoreDiff < 10) strength += 0.3;
        if (portLink && sameSector) strength += 0.2;
        if (portLink && scoreDiff < 15) strength += 0.15;
        if (strength > 0.4) bonds.push({ a: i, b: j, strength: Math.min(1, strength) });
      }
    }

    stateRef.current.nodes = nodes;
    stateRef.current.bonds = bonds;

    // Auto shock every 4s
    const shockInterval = setInterval(() => {
      const portIds = nodes.filter(n => n.isPort).map((_, i) => nodes.indexOf(_));
      stateRef.current.shock = portIds[Math.floor(Math.random() * portIds.length)];
      stateRef.current.shockT = 0;
    }, 4000);

    let raf;
    function draw() {
      const { shock, shockT, t, nodes: ns, bonds: bs } = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      // Soft node drift
      ns.forEach(n => {
        if (n.isPort) return;
        n.x += n.vx; n.y += n.vy;
        const dx = n.x - cx, dy = n.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 150) { n.vx -= dx * 0.001; n.vy -= dy * 0.001; }
        if (dist < 80)  { n.vx += dx * 0.002; n.vy += dy * 0.002; }
      });

      // Bonds
      bs.forEach(bond => {
        const a = ns[bond.a], b = ns[bond.b];
        const isShocked = (shock === bond.a || shock === bond.b) && shockT < 1;
        const shockPulse = isShocked ? Math.sin(shockT * Math.PI) * bond.strength : 0;
        const opacity = bond.strength * 0.35 + shockPulse * 0.5;
        const lw = bond.strength * 2 + shockPulse * 4;
        const isPos = (a.score + b.score) / 2 >= 50;
        const col = isPos ? '0,255,204' : '255,34,68';

        ctx.shadowBlur = isShocked ? shockPulse * 15 : 0;
        ctx.shadowColor = isPos ? '#00ffcc' : '#ff2244';
        ctx.strokeStyle = `rgba(${col},${Math.min(1, opacity)})`;
        ctx.lineWidth = Math.max(0.5, lw);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.shadowBlur = 0;

        // Correlation label on strong bonds
        if (bond.strength > 0.7) {
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          ctx.fillStyle = `rgba(${col},0.5)`;
          ctx.font = '6px JetBrains Mono, monospace'; ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(bond.strength * 100)}%`, mx, my);
        }
      });

      // Nodes
      ns.forEach((n, i) => {
        const isShockSrc = shock === i && shockT < 1;
        const pulse = n.isPort ? 1 + Math.sin(t * 2 + n.x) * 0.12 : 1;
        const shockR = isShockSrc ? (1 - shockT) * 20 : 0;
        const r = n.size * pulse + shockR;

        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.5);
        grd.addColorStop(0, n.color + (n.isPort ? '44' : '22'));
        grd.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        ctx.shadowColor = n.color; ctx.shadowBlur = n.isPort ? 15 : 5;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color + (n.isPort ? 'cc' : '88'); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = n.isPort ? '#01030a' : '#d0e8ff';
        ctx.font = `${n.isPort ? 'bold 9' : '7'}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(n.id, n.x, n.y + 3);
        if (n.isPort) {
          ctx.fillStyle = n.color; ctx.font = '7px JetBrains Mono, monospace';
          ctx.fillText('★', n.x, n.y - r - 5);
        }
      });

      stateRef.current.t += 0.016;
      if (stateRef.current.shockT < 1) stateRef.current.shockT += 0.012;
      raf = requestAnimationFrame(draw);
    }

    draw();

    // Click to trigger shock
    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const hit = stateRef.current.nodes.findIndex(n => Math.sqrt((mx - n.x) ** 2 + (my - n.y) ** 2) < n.size * 2);
      if (hit >= 0) { stateRef.current.shock = hit; stateRef.current.shockT = 0; }
    };
    canvas.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(shockInterval);
      canvas.removeEventListener('click', onClick);
    };
  }, [scores, regime]);

  return (
    <div>
      <div style={{ fontSize: 7, fontFamily: 'Orbitron, monospace', letterSpacing: 3, color: '#4a5680', marginBottom: 4 }}>
        NEURAL BOND · TOP 20 STOCKS · TAP TO SHOCK
      </div>
      <canvas ref={canvasRef} width={340} height={340}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'pointer' }}/>
      <div style={{ fontSize: 7, color: '#2a3a50', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', marginTop: 4 }}>
        LINE THICKNESS = CORRELATION · ★ = YOUR HOLDINGS · TAP ANY NODE TO PROPAGATE SHOCK
      </div>
    </div>
  );
}
