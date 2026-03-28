// ── DOMINO CHAIN VISUALIZATION ─────────────────────────────────

import React, { useState } from 'react';

export function DominoChains({ chains, scores }) {
  if (!chains || chains.length === 0) return null;
  const c = scores || {};

  return (
    <div style={{ background: 'rgba(10,20,40,0.7)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(123,47,255,0.15)', borderRadius: 20,
      padding: '16px 18px', marginBottom: 10 }}>

      <div style={{ fontSize: 8, fontFamily: 'Orbitron, monospace', letterSpacing: 3,
        color: '#7b2fff', marginBottom: 14 }}>⚡ DOMINO CHAINS</div>

      {chains.slice(0, 3).map((chain, ci) => {
        const trigColor = '#ff8c00';
        const posStocks = (chain.positive || []).slice(0, 4);
        const negStocks = (chain.negative || []).slice(0, 3);

        return (
          <div key={ci} style={{ marginBottom: ci < chains.length - 1 ? 16 : 0,
            paddingBottom: ci < chains.length - 1 ? 16 : 0,
            borderBottom: ci < chains.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>

            {/* Trigger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                background: 'rgba(255,140,0,0.12)', border: '1px solid rgba(255,140,0,0.3)',
                color: '#ff8c00', flexShrink: 0 }}>
                ⚡ {chain.trigger?.slice(0, 30)}
              </div>
              {'→'.repeat(Math.min((chain.severity || 1), 5)).split('').map((_, i) => (
                <div key={i} style={{ width: 6, height: 1,
                  background: `rgba(255,140,0,${0.8 - i*0.15})`,
                  boxShadow: '0 0 4px #ff8c00' }}/>
              ))}
            </div>

            {/* Mechanism */}
            {chain.mechanism && (
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                color: '#3a5070', marginBottom: 10, lineHeight: 1.5,
                paddingLeft: 12, borderLeft: '2px solid rgba(255,140,0,0.2)' }}>
                {chain.mechanism?.slice(0, 80)}
              </div>
            )}

            {/* SVG thread visualization */}
            <div style={{ position: 'relative', overflowX: 'auto' }}>
              <svg width={Math.max(340, (posStocks.length + negStocks.length) * 80 + 80)}
                height="70" style={{ display: 'block' }}>

                {/* Trigger node */}
                <g>
                  <circle cx="35" cy="35" r="18" fill="rgba(255,140,0,0.12)"
                    stroke="#ff8c0055" strokeWidth="1.5"/>
                  <text x="35" y="32" textAnchor="middle" fill="#ff8c00"
                    fontSize="6" fontFamily="Orbitron">TRIGGER</text>
                  <text x="35" y="42" textAnchor="middle" fill="#ff8c0088"
                    fontSize="5" fontFamily="JetBrains Mono">
                    {(chain.trigger||'').slice(0,8)}
                  </text>
                </g>

                {/* Positive stocks */}
                {posStocks.map((p, i) => {
                  const x = 100 + i * 75;
                  const score = c[p.stock]?.score || 50;
                  return (
                    <g key={`pos-${i}`}>
                      {/* Thread */}
                      <line x1="53" y1="35" x2={x-18} y2="25"
                        stroke="#00ffcc" strokeWidth="1.5" strokeDasharray="3,2"
                        style={{ animation: 'thread-pulse 2s ease infinite', animationDelay: `${i*0.3}s` }}/>
                      {/* Node */}
                      <circle cx={x} cy="25" r="16" fill="rgba(0,255,204,0.1)"
                        stroke="#00ffcc44" strokeWidth="1.5"
                        style={{ animation: 'domino-glow 2s ease infinite', animationDelay: `${i*0.3}s` }}/>
                      <text x={x} y="22" textAnchor="middle" fill="#00ffcc"
                        fontSize="7" fontWeight="700" fontFamily="JetBrains Mono">{p.stock}</text>
                      <text x={x} y="32" textAnchor="middle" fill="#00ffcc88"
                        fontSize="6" fontFamily="JetBrains Mono">+{p.adj}</text>
                    </g>
                  );
                })}

                {/* Negative stocks */}
                {negStocks.map((p, i) => {
                  const x = 100 + i * 75;
                  return (
                    <g key={`neg-${i}`}>
                      <line x1="53" y1="35" x2={x-18} y2="55"
                        stroke="#ff2244" strokeWidth="1.5" strokeDasharray="3,2"
                        style={{ animation: 'thread-pulse 2s ease infinite', animationDelay: `${i*0.3+0.5}s` }}/>
                      <circle cx={x} cy="55" r="16" fill="rgba(255,34,68,0.1)"
                        stroke="#ff224444" strokeWidth="1.5"
                        style={{ animation: 'domino-glow 2s ease infinite', animationDelay: `${i*0.3+0.5}s` }}/>
                      <text x={x} y="52" textAnchor="middle" fill="#ff2244"
                        fontSize="7" fontWeight="700" fontFamily="JetBrains Mono">{p.stock}</text>
                      <text x={x} y="62" textAnchor="middle" fill="#ff224488"
                        fontSize="6" fontFamily="JetBrains Mono">{p.adj}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
              {posStocks.length > 0 && (
                <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                  color: '#00ffcc88' }}>↑ {posStocks.map(p=>p.stock).join(' ')}</div>
              )}
              {negStocks.length > 0 && (
                <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                  color: '#ff224488' }}>↓ {negStocks.map(p=>p.stock).join(' ')}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
