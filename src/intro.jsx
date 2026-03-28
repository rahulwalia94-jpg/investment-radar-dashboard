// ── INTRO ANIMATION: Space → India → Mumbai → NSE → Dashboard ──

export function IntroAnimation({ onComplete }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000008', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Stars layer */}
      <div style={{ position: 'absolute', inset: 0, animation: 'stars-fade 0.5s ease forwards' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          {Array.from({length: 200}, (_, i) => (
            <circle key={i}
              cx={`${Math.random()*100}%`} cy={`${Math.random()*100}%`}
              r={Math.random()*1.5 + 0.3}
              fill="white" opacity={Math.random()*0.8 + 0.2}/>
          ))}
          {/* Milky way band */}
          <ellipse cx="50%" cy="50%" rx="45%" ry="8%" fill="none"
            stroke="rgba(200,200,255,0.06)" strokeWidth="40"/>
        </svg>
      </div>

      {/* Phase 1: Earth from space (0-1.2s) */}
      <div style={{ position: 'absolute', animation: 'earth-zoom 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s both' }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <defs>
            <radialGradient id="earth-g" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#4fc3f7"/>
              <stop offset="60%" stopColor="#1565c0"/>
              <stop offset="100%" stopColor="#0a1a3a"/>
            </radialGradient>
            <radialGradient id="atmo" cx="50%" cy="50%">
              <stop offset="70%" stopColor="transparent"/>
              <stop offset="100%" stopColor="rgba(100,180,255,0.3)"/>
            </radialGradient>
          </defs>
          <circle cx="90" cy="90" r="88" fill="url(#atmo)"/>
          <circle cx="90" cy="90" r="80" fill="url(#earth-g)"/>
          {/* Continents */}
          <ellipse cx="100" cy="70" rx="28" ry="20" fill="#2e7d32" opacity="0.8"/>
          <ellipse cx="55" cy="80" rx="18" ry="22" fill="#2e7d32" opacity="0.7"/>
          <ellipse cx="115" cy="100" rx="12" ry="16" fill="#388e3c" opacity="0.75"/>
          <ellipse cx="75" cy="115" rx="20" ry="8" fill="#1b5e20" opacity="0.6"/>
          {/* India highlight */}
          <ellipse cx="108" cy="82" rx="7" ry="10" fill="#ffcc00" opacity="0.5"
            style={{ animation: 'pulse-ring 2s ease-out infinite' }}/>
          {/* Clouds */}
          <ellipse cx="60" cy="55" rx="25" ry="6" fill="rgba(255,255,255,0.3)"/>
          <ellipse cx="120" cy="110" rx="20" ry="5" fill="rgba(255,255,255,0.2)"/>
        </svg>
      </div>

      {/* Phase 2: India subcontinent (1.2-2.4s) */}
      <div style={{ position: 'absolute', animation: 'india-zoom 1.2s cubic-bezier(0.4,0,0.2,1) 1.2s both' }}>
        <svg width="200" height="220" viewBox="0 0 200 220">
          <defs>
            <radialGradient id="india-glow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(255,204,0,0.3)"/>
              <stop offset="100%" stopColor="transparent"/>
            </radialGradient>
          </defs>
          {/* Glow bg */}
          <ellipse cx="100" cy="110" rx="90" ry="100" fill="url(#india-glow)"/>
          {/* India shape (simplified) */}
          <path d="M 70,20 L 140,25 L 160,60 L 155,90 L 140,120 L 120,160 L 100,200 L 80,160 L 60,120 L 45,90 L 40,60 Z"
            fill="#1a3a1a" stroke="#2e7d32" strokeWidth="1.5"/>
          {/* Rivers */}
          <path d="M 90,40 Q 95,80 100,120" fill="none" stroke="#4fc3f7" strokeWidth="1" opacity="0.6"/>
          <path d="M 110,50 Q 105,90 100,120" fill="none" stroke="#4fc3f7" strokeWidth="1" opacity="0.6"/>
          {/* Cities as dots */}
          <circle cx="95" cy="45" r="2" fill="#ffcc00" opacity="0.8"/>  {/* Delhi */}
          <circle cx="85" cy="140" r="3" fill="#ff6b35" opacity="0.9"/>  {/* Mumbai */}
          <circle cx="115" cy="145" r="2" fill="#ffcc00" opacity="0.8"/>  {/* Chennai */}
          <circle cx="105" cy="120" r="2" fill="#4fc3f7" opacity="0.8"/>  {/* Hyderabad */}
          {/* Mumbai label */}
          <text x="90" y="158" fill="#ff6b35" fontSize="8" fontFamily="JetBrains Mono">MUMBAI</text>
          {/* Pulsing Mumbai */}
          <circle cx="85" cy="140" r="8" fill="none" stroke="#ff6b35" strokeWidth="1"
            style={{ animation: 'pulse-ring 1.5s ease-out infinite' }}/>
        </svg>
      </div>

      {/* Phase 3: Mumbai aerial (2.4-3.6s) */}
      <div style={{ position: 'absolute', animation: 'mumbai-zoom 1.2s cubic-bezier(0.4,0,0.2,1) 2.4s both' }}>
        <svg width="300" height="200" viewBox="0 0 300 200">
          {/* Sea */}
          <rect width="300" height="200" fill="#0a1a2a"/>
          {/* City lights grid */}
          {Array.from({length: 40}, (_, i) => (
            <circle key={i} cx={30 + (i%8)*30 + Math.random()*10} cy={20 + Math.floor(i/8)*35 + Math.random()*10}
              r={Math.random()*2+1} fill="#ffcc00" opacity={Math.random()*0.6+0.3}/>
          ))}
          {/* Coastline */}
          <path d="M 0,120 Q 50,100 100,110 Q 150,120 200,105 Q 250,90 300,100 L 300,200 L 0,200 Z"
            fill="#0d2a1a" opacity="0.8"/>
          {/* Marine drive curve */}
          <path d="M 60,110 Q 100,90 150,95 Q 180,97 210,100"
            fill="none" stroke="#ffcc00" strokeWidth="2" opacity="0.6"/>
          {/* NSE building highlight */}
          <rect x="140" y="75" width="20" height="35" fill="#00b4ff" opacity="0.8"
            style={{ animation: 'city-pulse 2s ease infinite' }}/>
          <text x="128" y="70" fill="#00b4ff" fontSize="7" fontFamily="JetBrains Mono">NSE</text>
        </svg>
      </div>

      {/* Phase 4: NSE Trading floor (3.6-5s) */}
      <div style={{ position: 'absolute', animation: 'nse-zoom 1.4s cubic-bezier(0.4,0,0.2,1) 3.6s both',
        textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 280, height: 180 }}>
          {/* Trading floor bg */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,20,40,0.95)',
            border: '1px solid rgba(0,180,255,0.3)', borderRadius: 8,
            boxShadow: '0 0 40px rgba(0,180,255,0.2)' }}/>
          {/* Ticker */}
          <div style={{ position: 'absolute', top: 8, left: 0, right: 0,
            fontSize: 8, fontFamily: 'JetBrains Mono', color: '#00ffcc',
            padding: '4px 8px', background: 'rgba(0,255,204,0.05)',
            borderBottom: '1px solid rgba(0,255,204,0.1)',
            whiteSpace: 'nowrap', overflow: 'hidden' }}>
            NIFTY 50 ▼ 23,306 · SENSEX ▼ 76,810 · HAL ▲ 4.2% · ONGC ▲ 1.8% · TCS ▼ 0.4% · RELIANCE ▼ 1.1% · HDFCBANK ▼ 0.8%
          </div>
          {/* Price grid */}
          <div style={{ position: 'absolute', top: 30, left: 10, right: 10,
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
            {[
              ['HAL', '+4.2%', '#00ffcc'], ['BEL', '+2.1%', '#00ffcc'],
              ['ONGC', '+1.8%', '#00ffcc'], ['TCS', '-0.4%', '#ff2244'],
              ['RELIANCE', '-1.1%', '#ff2244'], ['INFY', '+0.8%', '#00ffcc'],
              ['HDFC', '-0.8%', '#ff2244'], ['ICICI', '-0.3%', '#ff2244'],
            ].map(([s, p, c]) => (
              <div key={s} style={{ background: `${c}10`, border: `1px solid ${c}25`,
                borderRadius: 4, padding: '3px 5px', textAlign: 'center' }}>
                <div style={{ fontSize: 6, color: '#3a5070', fontFamily: 'JetBrains Mono' }}>{s}</div>
                <div style={{ fontSize: 8, color: c, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{p}</div>
              </div>
            ))}
          </div>
          {/* Logo */}
          <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#3a5070',
              letterSpacing: 4 }}>NATIONAL STOCK EXCHANGE OF INDIA</div>
          </div>
          {/* Scanline */}
          <div style={{ position: 'absolute', left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(0,255,204,0.4), transparent)',
            animation: 'scanline 2s linear infinite', opacity: 0.5 }}/>
        </div>
      </div>

      {/* Phase 5: Dashboard title reveal (5-6s) */}
      <div style={{ position: 'absolute', textAlign: 'center',
        animation: 'dash-reveal 0.8s cubic-bezier(0.4,0,0.2,1) 5s both' }}
        onAnimationEnd={onComplete}>
        <div style={{ position: 'relative', width: 8, height: 8, margin: '0 auto 20px',
          borderRadius: '50%', background: '#00ffcc', boxShadow: '0 0 20px #00ffcc' }}>
          <div style={{ position: 'absolute', inset: -4, borderRadius: '50%',
            border: '1px solid #00ffcc44', animation: 'pulse-ring 1s ease-out infinite' }}/>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 6,
          fontFamily: 'Orbitron, monospace', color: '#00ffcc',
          textShadow: '0 0 40px #00ffcc',
          animation: 'title-glow 2s ease infinite' }}>
          INVESTMENT RADAR
        </div>
        <div style={{ fontSize: 9, letterSpacing: 8, color: '#3a5070', marginTop: 8,
          fontFamily: 'JetBrains Mono, monospace' }}>PRO · DIMENSIONAL INTELLIGENCE</div>
        <div style={{ marginTop: 20, fontSize: 8, color: '#1a3050', letterSpacing: 3,
          fontFamily: 'JetBrains Mono, monospace',
          animation: 'flicker 0.5s ease infinite' }}>
          LOADING MARKET DIMENSIONS...
        </div>
      </div>
    </div>
  );
}
