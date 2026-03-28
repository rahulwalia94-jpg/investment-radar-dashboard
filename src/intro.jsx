import React, { useState, useEffect } from 'react';

// ── LAUNCH SEQUENCE: Black → GET READY → BOOM → World ─────────

export function IntroAnimation({ regime = 'BEAR', onComplete }) {
  const [phase, setPhase] = useState('get-ready'); // get-ready | exploding | done

  const REGIME_COLORS = {
    BULL:      '#00ffcc', SOFT_BULL: '#00b4ff',
    SIDEWAYS:  '#ffcc00', SOFT_BEAR: '#ff8c00', BEAR: '#ff2244',
  };
  const color = REGIME_COLORS[regime] || '#00ffcc';

  useEffect(() => {
    // Phase 1: GET READY pulses for 2.5s
    const t1 = setTimeout(() => setPhase('exploding'), 2500);
    // Phase 2: BOOM explosion for 0.8s then done
    const t2 = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === 'done') return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000008',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>

      {/* Stars */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }}>
        {Array.from({ length: 120 }, (_, i) => (
          <circle key={i}
            cx={`${(i * 137.5) % 100}%`}
            cy={`${(i * 73.1) % 100}%`}
            r={i % 5 === 0 ? 1.5 : 0.6}
            fill="white"
            opacity={0.3 + (i % 4) * 0.2}/>
        ))}
      </svg>

      {/* Phase 1: GET READY */}
      {phase === 'get-ready' && (
        <div style={{
          textAlign: 'center',
          animation: 'get-ready-in 0.4s cubic-bezier(0.2,0,0,1) forwards',
        }}>
          {/* Heartbeat rings */}
          <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 32px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', inset: i * 16,
                borderRadius: '50%',
                border: `1.5px solid ${color}`,
                opacity: 0.4 - i * 0.1,
                animation: `heartbeat 1.2s ease infinite`,
                animationDelay: `${i * 0.15}s`,
              }}/>
            ))}
            {/* Core */}
            <div style={{
              position: 'absolute', inset: '40%',
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 30px ${color}, 0 0 60px ${color}44`,
              animation: 'heartbeat 1.2s ease infinite',
            }}/>
          </div>

          <div style={{
            fontSize: 42, fontWeight: 900, letterSpacing: 10,
            fontFamily: 'Orbitron, monospace',
            color: '#ffffff',
            textShadow: `0 0 40px ${color}, 0 0 80px ${color}66`,
            animation: 'heartbeat 1.2s ease infinite',
            lineHeight: 1,
          }}>
            GET<br/>READY
          </div>

          <div style={{
            marginTop: 20, fontSize: 9, letterSpacing: 6,
            fontFamily: 'JetBrains Mono, monospace',
            color: `${color}88`,
            animation: 'heartbeat 1.2s ease infinite',
          }}>
            DIMENSIONAL MARKET INTELLIGENCE
          </div>
        </div>
      )}

      {/* Phase 2: EXPLOSION */}
      {phase === 'exploding' && (
        <>
          {/* Flash white */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'white',
            animation: 'flash-white 0.15s ease forwards',
            zIndex: 10,
          }}/>

          {/* Shockwaves */}
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: 100, height: 100,
              marginLeft: -50, marginTop: -50,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              animation: `shockwave 0.8s cubic-bezier(0,0.5,0.5,1) ${i * 0.08}s forwards`,
              zIndex: 5,
            }}/>
          ))}

          {/* BOOM text */}
          <div style={{
            position: 'relative', zIndex: 6,
            fontSize: 72, fontWeight: 900,
            fontFamily: 'Orbitron, monospace',
            color: color,
            textShadow: `0 0 60px ${color}, 0 0 120px ${color}`,
            animation: 'get-ready-out 0.6s cubic-bezier(0.4,0,1,1) forwards',
            letterSpacing: 8,
          }}>
            BOOM
          </div>
        </>
      )}
    </div>
  );
}
