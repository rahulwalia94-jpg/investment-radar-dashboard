import React, { useState, useEffect } from 'react';

// ── REGIME WORLD — Animated Scene per Market Dimension ────────

function AshParticle({ x, delay, size }) {
  return (
    <div style={{ position: 'absolute', left: x, top: -20,
      width: size, height: size, borderRadius: 1,
      background: '#ff224488', opacity: 0.6,
      animation: `ash-fall ${3 + Math.random()*3}s linear ${delay}s infinite` }}/>
  );
}

function BearWorld() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Sky */}
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #1a0008 0%, #2d0010 40%, #0a0003 100%)' }}/>
      {/* Dim sun */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        width: 40, height: 40, borderRadius: '50%',
        background: 'radial-gradient(circle, #ff224466, #ff224411)',
        boxShadow: '0 0 30px #ff224433' }}/>
      {/* Cracked ground */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} width="100%" height="60" viewBox="0 0 400 60" preserveAspectRatio="xMidYMax meet">
        <polygon points="0,60 0,30 40,25 80,35 120,20 160,30 200,15 240,28 280,22 320,32 360,18 400,28 400,60" fill="#1a0005"/>
        {/* Cracks */}
        <path d="M 80,30 L 90,50 L 85,60" stroke="#ff224444" strokeWidth="1" fill="none"/>
        <path d="M 200,20 L 210,45 L 205,60" stroke="#ff224444" strokeWidth="1" fill="none"/>
        <path d="M 300,25 L 308,50" stroke="#ff224444" strokeWidth="1" fill="none"/>
      </svg>
      {/* Ruined buildings */}
      <svg style={{ position: 'absolute', bottom: 30 }} width="100%" height="100" viewBox="0 0 400 100" preserveAspectRatio="xMidYMax meet">
        {/* Crumbling skyscrapers */}
        <rect x="30" y="20" width="25" height="80" fill="#1a0008" stroke="#ff224422" strokeWidth="1"/>
        <polygon points="30,20 55,20 50,10 35,8" fill="#1a0008"/> {/* broken top */}
        <rect x="30" y="20" width="5" height="20" fill="#ff224422"/> {/* crack */}

        <rect x="100" y="35" width="20" height="65" fill="#150006" stroke="#ff224422" strokeWidth="1"/>
        <rect x="100" y="35" width="20" height="8" fill="#ff224411"/>

        <rect x="170" y="10" width="35" height="90" fill="#1a0008" stroke="#ff224422" strokeWidth="1"/>
        <polygon points="170,10 205,10 200,0 185,5 175,0" fill="#1a0008"/>
        {/* Windows flickering */}
        <rect x="175" y="20" width="5" height="5" fill="#ff224466" style={{ animation: 'flicker 2s ease infinite' }}/>
        <rect x="190" y="30" width="5" height="5" fill="#ff224433"/>
        <rect x="175" y="45" width="5" height="5" fill="#ff224444" style={{ animation: 'flicker 3s ease infinite' }}/>

        <rect x="260" y="40" width="18" height="60" fill="#120004"/>
        <polygon points="260,40 278,40 274,30 264,32" fill="#1a0005"/>

        <rect x="330" y="15" width="40" height="85" fill="#1a0008" stroke="#ff224422" strokeWidth="1"/>
        <rect x="335" y="20" width="6" height="6" fill="#ff224444" style={{ animation: 'flicker 1.5s ease infinite' }}/>
        <rect x="350" y="35" width="6" height="6" fill="#ff224433"/>

        {/* Smoke */}
        <ellipse cx="55" cy="15" rx="15" ry="8" fill="rgba(60,0,10,0.5)"/>
        <ellipse cx="190" cy="5" rx="20" ry="10" fill="rgba(50,0,8,0.4)"/>
        <ellipse cx="350" cy="10" rx="18" ry="9" fill="rgba(60,0,10,0.4)"/>
      </svg>
      {/* Ash particles */}
      {Array.from({length:12}, (_,i) => (
        <AshParticle key={i} x={`${5+i*8}%`} delay={i*0.4} size={Math.random()*3+2}/>
      ))}
      {/* Red fog overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 80%, rgba(255,34,68,0.08), transparent 70%)' }}/>
      {/* Label */}
      <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 8,
        fontFamily: 'Orbitron, monospace', color: '#ff224488', letterSpacing: 3 }}>
        DIMENSION 1 — COLLAPSE
      </div>
    </div>
  );
}

function SoftBearWorld() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #1a0e00 0%, #2d1800 40%, #0a0800 100%)' }}/>
      {/* Overcast sun */}
      <div style={{ position: 'absolute', top: 25, left: '50%', transform: 'translateX(-50%)',
        width: 35, height: 35, borderRadius: '50%',
        background: 'radial-gradient(circle, #ff8c0055, #ff8c0011)',
        boxShadow: '0 0 25px #ff8c0022' }}/>
      {/* Clouds */}
      <svg style={{ position: 'absolute', top: 10, left: 0 }} width="100%" height="60" viewBox="0 0 400 60">
        <ellipse cx="80" cy="25" rx="50" ry="18" fill="#1a1000" opacity="0.8"/>
        <ellipse cx="200" cy="20" rx="70" ry="20" fill="#1a1100" opacity="0.9"/>
        <ellipse cx="320" cy="28" rx="55" ry="16" fill="#1a1000" opacity="0.8"/>
      </svg>
      {/* City — partially lit */}
      <svg style={{ position: 'absolute', bottom: 0 }} width="100%" height="110" viewBox="0 0 400 110" preserveAspectRatio="xMidYMax meet">
        <rect x="20" y="40" width="22" height="70" fill="#1a1000" stroke="#ff8c0022" strokeWidth="1"/>
        <rect x="70" y="20" width="30" height="90" fill="#1a1100" stroke="#ff8c0022" strokeWidth="1"/>
        <rect x="70" y="20" width="30" height="5" fill="#ff8c0033"/>
        <rect x="150" y="10" width="40" height="100" fill="#1a1000" stroke="#ff8c0022" strokeWidth="1"/>
        <rect x="240" y="30" width="28" height="80" fill="#1a1100"/>
        <rect x="310" y="15" width="35" height="95" fill="#1a1000" stroke="#ff8c0022" strokeWidth="1"/>
        {/* Some lit windows */}
        {[[75,30],[78,45],[155,20],[158,40],[315,25],[318,45]].map(([x,y],i) => (
          <rect key={i} x={x} y={y} width="5" height="5"
            fill="#ff8c0044" style={{ animation: `flicker ${2+i*0.5}s ease infinite` }}/>
        ))}
      </svg>
      <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 8,
        fontFamily: 'Orbitron, monospace', color: '#ff8c0088', letterSpacing: 3 }}>
        DIMENSION 2 — FALLING
      </div>
    </div>
  );
}

function SidewaysWorld() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #0a0e1a 0%, #0d1220 60%, #050810 100%)' }}/>
      {/* Normal moon/sun */}
      <div style={{ position: 'absolute', top: 20, right: '20%',
        width: 30, height: 30, borderRadius: '50%',
        background: 'radial-gradient(circle, #ffcc0055, transparent)',
        boxShadow: '0 0 20px #ffcc0022' }}/>
      {/* Normal city */}
      <svg style={{ position: 'absolute', bottom: 0 }} width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax meet">
        <rect x="15" y="60" width="20" height="60" fill="#0d1428" stroke="#ffcc0015" strokeWidth="1"/>
        <rect x="55" y="30" width="28" height="90" fill="#0a1020" stroke="#ffcc0018" strokeWidth="1"/>
        <rect x="130" y="15" width="35" height="105" fill="#0d1428" stroke="#ffcc0015" strokeWidth="1"/>
        <rect x="200" y="45" width="25" height="75" fill="#0a1020"/>
        <rect x="260" y="20" width="32" height="100" fill="#0d1428" stroke="#ffcc0015" strokeWidth="1"/>
        <rect x="330" y="35" width="28" height="85" fill="#0a1020"/>
        {/* Normal windows */}
        {[[58,40],[62,55],[133,25],[138,45],[263,30],[268,50],[268,70]].map(([x,y],i) => (
          <rect key={i} x={x} y={y} width="5" height="4" fill="#ffcc0033"/>
        ))}
        {/* Streets */}
        <rect x="0" y="115" width="400" height="5" fill="#0a0e18"/>
        <rect x="90" y="110" width="3" height="10" fill="#ffcc0033"/>
        <rect x="180" y="110" width="3" height="10" fill="#ffcc0033"/>
        <rect x="295" y="110" width="3" height="10" fill="#ffcc0033"/>
      </svg>
      <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 8,
        fontFamily: 'Orbitron, monospace', color: '#ffcc0088', letterSpacing: 3 }}>
        DIMENSION 3 — STABLE
      </div>
    </div>
  );
}

function SoftBullWorld() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #001a2a 0%, #002035 60%, #001020 100%)' }}/>
      {/* Rising sun */}
      <div style={{ position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
        width: 50, height: 50, borderRadius: '50%',
        background: 'radial-gradient(circle, #00b4ff66, transparent)',
        boxShadow: '0 0 40px #00b4ff33' }}/>
      {/* Rays */}
      <svg style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)' }} width="120" height="80" viewBox="0 0 120 80">
        {[0,30,60,90,120,150].map(a => (
          <line key={a} x1="60" y1="60" x2={60+50*Math.cos(a*Math.PI/180)} y2={60-50*Math.sin(a*Math.PI/180)} stroke="#00b4ff22" strokeWidth="1"/>
        ))}
      </svg>
      {/* Growing city with cranes */}
      <svg style={{ position: 'absolute', bottom: 0 }} width="100%" height="130" viewBox="0 0 400 130" preserveAspectRatio="xMidYMax meet">
        {/* Buildings under construction */}
        <rect x="20" y="50" width="22" height="80" fill="#001828" stroke="#00b4ff25" strokeWidth="1"/>
        <rect x="65" y="25" width="30" height="105" fill="#001525" stroke="#00b4ff25" strokeWidth="1"/>
        <rect x="130" y="10" width="38" height="120" fill="#001828" stroke="#00b4ff25" strokeWidth="1"/>
        <rect x="200" y="30" width="28" height="100" fill="#001525"/>
        <rect x="260" y="5" width="35" height="125" fill="#001828" stroke="#00b4ff25" strokeWidth="1"/>
        <rect x="330" y="20" width="30" height="110" fill="#001525"/>

        {/* Construction crane */}
        <line x1="340" y1="20" x2="340" y2="0" stroke="#00b4ff55" strokeWidth="2"/>
        <line x1="320" y1="2" x2="370" y2="2" stroke="#00b4ff55" strokeWidth="2"
          style={{ transformOrigin: '340px 2px', animation: 'crane-move 4s ease infinite' }}/>
        <line x1="360" y1="2" x2="360" y2="15" stroke="#00b4ff44" strokeWidth="1"/>

        {/* Lit windows - more lights */}
        {[[68,35],[73,50],[73,65],[133,20],[138,40],[143,60],[263,15],[268,35],[273,55],[265,75]].map(([x,y],i) => (
          <rect key={i} x={x} y={y} width="5" height="4" fill="#00b4ff44"/>
        ))}
        {/* Ground */}
        <rect x="0" y="125" width="400" height="5" fill="#001020"/>
      </svg>
      <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 8,
        fontFamily: 'Orbitron, monospace', color: '#00b4ff88', letterSpacing: 3 }}>
        DIMENSION 4 — LIFTING
      </div>
    </div>
  );
}

function BullWorld() {
  const [shuttle, setShuttle] = React.useState(false);
  React.useEffect(() => {
    const id = setInterval(() => setShuttle(s => !s), 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Golden sky */}
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #001a0f 0%, #002a15 40%, #001508 100%)' }}/>
      {/* Stars */}
      <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%">
        {Array.from({length:30}, (_,i) => (
          <circle key={i} cx={`${Math.random()*100}%`} cy={`${Math.random()*50}%`}
            r={Math.random()*1.5+0.5} fill="white" opacity={Math.random()*0.6+0.2}/>
        ))}
      </svg>
      {/* Sun */}
      <div style={{ position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)',
        width: 45, height: 45, borderRadius: '50%',
        background: 'radial-gradient(circle, #00ffcc88, #00ffcc22)',
        boxShadow: '0 0 50px #00ffcc44, 0 0 100px #00ffcc22' }}/>
      {/* Skyscrapers */}
      <svg style={{ position: 'absolute', bottom: 0 }} width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMax meet">
        <rect x="10" y="70" width="20" height="70" fill="#001a0a" stroke="#00ffcc15" strokeWidth="1"/>
        <rect x="50" y="45" width="28" height="95" fill="#001508" stroke="#00ffcc18" strokeWidth="1"/>
        <polygon points="50,45 78,45 64,30" fill="#001a0a"/>
        <rect x="120" y="15" width="38" height="125" fill="#001a0a" stroke="#00ffcc18" strokeWidth="1"/>
        <polygon points="120,15 158,15 139,0" fill="#001508"/>
        {/* Antenna */}
        <line x1="139" y1="0" x2="139" y2="-8" stroke="#00ffcc88" strokeWidth="1"/>
        <circle cx="139" cy="-10" r="2" fill="#00ffcc" style={{ animation: 'pulse-ring 1.5s ease infinite' }}/>

        <rect x="185" y="30" width="30" height="110" fill="#001508"/>
        <polygon points="185,30 215,30 200,18" fill="#001a0a"/>

        <rect x="245" y="8" width="42" height="132" fill="#001a0a" stroke="#00ffcc15" strokeWidth="1"/>
        <polygon points="245,8 287,8 266,0" fill="#001508"/>
        <line x1="266" y1="0" x2="266" y2="-10" stroke="#00ffcc88" strokeWidth="1"/>

        <rect x="318" y="25" width="32" height="115" fill="#001508" stroke="#00ffcc15" strokeWidth="1"/>
        <polygon points="318,25 350,25 334,12" fill="#001a0a"/>

        {/* Bright windows */}
        {[[53,55],[57,70],[57,85],[123,25],[128,45],[133,65],[250,18],[255,38],[260,58],[250,78]].map(([x,y],i) => (
          <rect key={i} x={x} y={y} width="5" height="4"
            fill={i%3===0 ? '#00ffcc55' : '#00ffcc33'}/>
        ))}
        {/* Ground glow */}
        <rect x="0" y="135" width="400" height="5" fill="#001008"/>
        <ellipse cx="200" cy="138" rx="180" ry="3" fill="#00ffcc11"/>
      </svg>

      {/* Space shuttle */}
      {shuttle && (
        <div style={{ position: 'absolute', bottom: 80, left: '35%',
          animation: 'shuttle-launch 3s cubic-bezier(0.4,0,0.2,1) forwards' }}>
          <svg width="16" height="30" viewBox="0 0 16 30">
            <polygon points="8,0 14,20 12,20 12,30 4,30 4,20 2,20" fill="#00ffcc88"/>
            <ellipse cx="8" cy="28" rx="5" ry="3" fill="#ff6b3588" opacity="0.8"/>
            {/* Flame */}
            <ellipse cx="8" cy="32" rx="3" ry="6" fill="#ffcc0066"/>
          </svg>
        </div>
      )}
      <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 8,
        fontFamily: 'Orbitron, monospace', color: '#00ffcc88', letterSpacing: 3 }}>
        DIMENSION 5 — ASCENDING
      </div>
    </div>
  );
}

export function RegimeWorld({ regime, preview = false, selectable = false, onSelect }) {
  const worlds = {
    BEAR: BearWorld,
    SOFT_BEAR: SoftBearWorld,
    SIDEWAYS: SidewaysWorld,
    SOFT_BULL: SoftBullWorld,
    BULL: BullWorld,
  };
  const W = worlds[regime] || SidewaysWorld;
  return (
    <div onClick={onSelect} style={{
      cursor: selectable ? 'pointer' : 'default',
      height: preview ? 160 : '100vh',
      overflow: 'hidden',
      borderRadius: preview ? 16 : 0,
    }}>
      <W/>
    </div>
  );
}

export function RegimeSelector({ current, onSelect }) {
  const [selected, setSelected] = React.useState(current);
  const all = ['BEAR','SOFT_BEAR','SIDEWAYS','SOFT_BULL','BULL'];
  const colors = { BEAR:'#ff2244', SOFT_BEAR:'#ff8c00', SIDEWAYS:'#ffcc00', SOFT_BULL:'#00b4ff', BULL:'#00ffcc' };
  const labels = { BEAR:'BEAR', SOFT_BEAR:'S.BEAR', SIDEWAYS:'SIDE', SOFT_BULL:'S.BULL', BULL:'BULL' };

  return (
    <div>
      {/* World preview */}
      <div style={{ marginBottom: 12 }}>
        <RegimeWorld regime={selected} preview={true} selectable={false}/>
      </div>
      {/* Selector pills */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {all.map(r => (
          <button key={r} onClick={() => { setSelected(r); onSelect?.(r); }}
            style={{ padding: '5px 10px', borderRadius: 20, fontSize: 8,
              fontFamily: 'Orbitron, monospace', fontWeight: 700,
              border: `1px solid ${colors[r]}${selected === r ? '88' : '22'}`,
              background: selected === r ? `${colors[r]}20` : 'transparent',
              color: colors[r], letterSpacing: 1,
              boxShadow: selected === r ? `0 0 15px ${colors[r]}33` : 'none',
              transition: 'all 0.2s',
              position: 'relative',
            }}>
            {labels[r]}
            {r === current && (
              <div style={{ position: 'absolute', top: -3, right: -3,
                width: 6, height: 6, borderRadius: '50%',
                background: colors[r], boxShadow: `0 0 8px ${colors[r]}` }}/>
            )}
          </button>
        ))}
      </div>
      {selected !== current && (
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 8,
          fontFamily: 'JetBrains Mono, monospace', color: '#3a5070' }}>
          Algorithm says: <span style={{ color: colors[current], fontWeight: 700 }}>{current}</span>
          {' '}· You're previewing: <span style={{ color: colors[selected] }}>{selected}</span>
        </div>
      )}
    </div>
  );
}
