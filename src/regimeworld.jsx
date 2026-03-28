import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ── MURMURATION — 5000 particles, boids algorithm ─────────────

const REGIME_CONFIG = {
  BULL:      { color: 0x00ffcc, css: '#00ffcc', cohesion: 0.018, chaos: 0.0004, speed: 0.055, separation: 0.025, label: '5TH DIMENSION' },
  SOFT_BULL: { color: 0x00b4ff, css: '#00b4ff', cohesion: 0.010, chaos: 0.0012, speed: 0.048, separation: 0.022, label: '4TH DIMENSION' },
  SIDEWAYS:  { color: 0xffcc00, css: '#ffcc00', cohesion: 0.004, chaos: 0.003,  speed: 0.040, separation: 0.018, label: '3RD DIMENSION' },
  SOFT_BEAR: { color: 0xff8c00, css: '#ff8c00', cohesion: 0.001, chaos: 0.010,  speed: 0.052, separation: 0.012, label: '2ND DIMENSION' },
  BEAR:      { color: 0xff2244, css: '#ff2244', cohesion: 0.0002,chaos: 0.025,  speed: 0.060, separation: 0.006, label: '1ST DIMENSION' },
};

const N = 4000;

export function RegimeWorld({ regime = 'SIDEWAYS', preview = false }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // ── RENDERER ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.offsetWidth, el.offsetHeight);
    renderer.setClearColor(0x01030a, 1);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, el.offsetWidth / el.offsetHeight, 0.1, 500);
    camera.position.set(0, 0, 8);

    // ── PARTICLES ─────────────────────────────────────────────
    const pos  = new Float32Array(N * 3);
    const vel  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const acc  = new Float32Array(N * 3);

    // Initialise in a loose sphere
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI;
      const r  = 1 + Math.random() * 2;
      pos[i*3]   = r * Math.sin(ph) * Math.cos(th);
      pos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
      pos[i*3+2] = r * Math.cos(ph);
      vel[i*3]   = (Math.random() - 0.5) * 0.02;
      vel[i*3+1] = (Math.random() - 0.5) * 0.02;
      vel[i*3+2] = (Math.random() - 0.5) * 0.02;
      col[i*3] = 0; col[i*3+1] = 1; col[i*3+2] = 0.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: preview ? 0.025 : 0.022,
      vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    // ── GLOW CORE ─────────────────────────────────────────────
    const glowGeo  = new THREE.SphereGeometry(0.3, 16, 16);
    const glowMat  = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.06, side: THREE.BackSide });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowMesh);

    // ── STATE ─────────────────────────────────────────────────
    let currentRegime = regime;
    let time = 0;
    let animFrame;

    const GRID = 8; // spatial grid cells per axis
    const CELL = 10 / GRID;

    function updateColor(r) {
      const cfg = REGIME_CONFIG[r] || REGIME_CONFIG.SIDEWAYS;
      const c = new THREE.Color(cfg.color);
      for (let i = 0; i < N; i++) {
        col[i*3]   = c.r * (0.6 + Math.random() * 0.6);
        col[i*3+1] = c.g * (0.6 + Math.random() * 0.6);
        col[i*3+2] = c.b * (0.6 + Math.random() * 0.6);
      }
      geo.attributes.color.needsUpdate = true;
      glowMat.color.set(cfg.color);
      renderer.setClearColor(
        { BULL:0x000a08, SOFT_BULL:0x000510, SIDEWAYS:0x080600, SOFT_BEAR:0x060200, BEAR:0x060001 }[r] || 0x01030a, 1
      );
    }

    // ── BOIDS ─────────────────────────────────────────────────
    function tick() {
      const cfg = REGIME_CONFIG[currentRegime] || REGIME_CONFIG.SIDEWAYS;
      const { cohesion, chaos, speed, separation } = cfg;

      // Flock centre (sample 300 for perf)
      let cx = 0, cy = 0, cz = 0;
      const S = 300;
      for (let i = 0; i < S; i++) { cx += pos[i*3]; cy += pos[i*3+1]; cz += pos[i*3+2]; }
      cx /= S; cy /= S; cz /= S;

      // Update each boid
      for (let i = 0; i < N; i++) {
        const ix = pos[i*3], iy = pos[i*3+1], iz = pos[i*3+2];

        // Cohesion — fly toward flock centre
        acc[i*3]   = (cx - ix) * cohesion;
        acc[i*3+1] = (cy - iy) * cohesion;
        acc[i*3+2] = (cz - iz) * cohesion;

        // Noise
        acc[i*3]   += (Math.random() - 0.5) * chaos;
        acc[i*3+1] += (Math.random() - 0.5) * chaos;
        acc[i*3+2] += (Math.random() - 0.5) * chaos;

        // Separation — avoid close neighbours (check ~15 random others)
        for (let k = 0; k < 12; k++) {
          const j = Math.floor(Math.random() * N);
          const dx = ix - pos[j*3];
          const dy = iy - pos[j*3+1];
          const dz = iz - pos[j*3+2];
          const d2 = dx*dx + dy*dy + dz*dz;
          if (d2 < 0.12 && d2 > 0) {
            const f = separation / (d2 + 0.001);
            acc[i*3]   += dx * f;
            acc[i*3+1] += dy * f;
            acc[i*3+2] += dz * f;
          }
        }

        // Apply acceleration
        vel[i*3]   += acc[i*3];
        vel[i*3+1] += acc[i*3+1];
        vel[i*3+2] += acc[i*3+2];

        // Speed limit
        const spd = Math.sqrt(vel[i*3]**2 + vel[i*3+1]**2 + vel[i*3+2]**2);
        if (spd > speed) {
          const inv = speed / spd;
          vel[i*3] *= inv; vel[i*3+1] *= inv; vel[i*3+2] *= inv;
        }

        // Move
        pos[i*3]   += vel[i*3];
        pos[i*3+1] += vel[i*3+1];
        pos[i*3+2] += vel[i*3+2];

        // Soft boundary — gentle pull back
        const BOUND = 5;
        if (Math.abs(pos[i*3])   > BOUND) vel[i*3]   *= -0.6;
        if (Math.abs(pos[i*3+1]) > BOUND) vel[i*3+1] *= -0.6;
        if (Math.abs(pos[i*3+2]) > BOUND) vel[i*3+2] *= -0.6;
      }

      geo.attributes.position.needsUpdate = true;
    }

    // ── RENDER LOOP ───────────────────────────────────────────
    function animate() {
      animFrame = requestAnimationFrame(animate);
      time += 0.007;
      tick();

      // Slow orbital camera
      camera.position.x = Math.sin(time * 0.08) * 1.2;
      camera.position.y = Math.cos(time * 0.05) * 0.7;
      camera.position.z = 8 + Math.sin(time * 0.04) * 0.5;
      camera.lookAt(0, 0, 0);

      // Glow pulse
      const gp = 0.8 + Math.sin(time * 2) * 0.2;
      glowMesh.scale.setScalar(gp);

      renderer.render(scene, camera);
    }

    // ── RESIZE ────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth, h = el.offsetHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(el);

    updateColor(regime);
    animate();

    // Expose setRegime
    stateRef.current.setRegime = (r) => {
      currentRegime = r;
      updateColor(r);
    };

    return () => {
      cancelAnimationFrame(animFrame);
      ro.disconnect();
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // React to regime prop changes
  useEffect(() => {
    stateRef.current.setRegime?.(regime);
  }, [regime]);

  return (
    <div ref={mountRef} style={{
      width: '100%',
      height: preview ? 160 : '100%',
      minHeight: preview ? 160 : '100vh',
      position: 'relative',
    }}/>
  );
}

// ── REGIME SELECTOR ───────────────────────────────────────────
export function RegimeSelector({ current, onSelect }) {
  const [selected, setSelected] = React.useState(current);

  React.useEffect(() => { setSelected(current); }, [current]);

  const all    = ['BEAR','SOFT_BEAR','SIDEWAYS','SOFT_BULL','BULL'];
  const colors = { BEAR:'#ff2244', SOFT_BEAR:'#ff8c00', SIDEWAYS:'#ffcc00', SOFT_BULL:'#00b4ff', BULL:'#00ffcc' };
  const labels = { BEAR:'BEAR', SOFT_BEAR:'S.BEAR', SIDEWAYS:'SIDE', SOFT_BULL:'S.BULL', BULL:'BULL' };
  const dims   = { BEAR:'1ST', SOFT_BEAR:'2ND', SIDEWAYS:'3RD', SOFT_BULL:'4TH', BULL:'5TH' };

  return (
    <div>
      {/* Preview world */}
      <div style={{ marginBottom: 12, borderRadius: 14, overflow: 'hidden', height: 160 }}>
        <RegimeWorld regime={selected} preview={true}/>
      </div>

      {/* Pills */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        {all.map(r => (
          <button key={r} onClick={() => { setSelected(r); onSelect?.(r); }} style={{
            padding: '5px 11px', borderRadius: 20, fontSize: 8,
            fontFamily: 'Orbitron, monospace', fontWeight: 700,
            border: `1px solid ${colors[r]}${selected === r ? '88' : '22'}`,
            background: selected === r ? `${colors[r]}18` : 'transparent',
            color: colors[r], letterSpacing: 1,
            boxShadow: selected === r ? `0 0 14px ${colors[r]}33` : 'none',
            transition: 'all 0.2s', position: 'relative',
          }}>
            {labels[r]}
            {/* Real regime indicator */}
            {r === current && (
              <div style={{ position:'absolute', top:-3, right:-3, width:6, height:6,
                borderRadius:'50%', background:colors[r],
                boxShadow:`0 0 8px ${colors[r]}` }}/>
            )}
          </button>
        ))}
      </div>

      {selected !== current && (
        <div style={{ textAlign:'center', marginTop:8, fontSize:8,
          fontFamily:'JetBrains Mono, monospace', color:'#3a5070' }}>
          Algorithm: <span style={{ color:colors[current], fontWeight:700 }}>{current}</span>
          {' '}· Previewing: <span style={{ color:colors[selected] }}>{selected}</span>
        </div>
      )}
    </div>
  );
}
