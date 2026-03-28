// ── VOICE ENGINE — Daniel (UK Male) with ElevenLabs fallback ──

let _voices = [];
let _voicesLoaded = false;

// Pre-load voices — they load async on first call
function loadVoices() {
  return new Promise(resolve => {
    const voices = window.speechSynthesis?.getVoices() || [];
    if (voices.length > 0) { _voices = voices; _voicesLoaded = true; resolve(voices); return; }
    // Wait for voiceschanged event
    window.speechSynthesis?.addEventListener('voiceschanged', () => {
      _voices = window.speechSynthesis.getVoices();
      _voicesLoaded = true;
      resolve(_voices);
    }, { once: true });
    // Fallback timeout
    setTimeout(() => { _voices = window.speechSynthesis?.getVoices() || []; resolve(_voices); }, 1000);
  });
}

function getBestVoice() {
  const v = _voices;
  return (
    v.find(x => x.name === 'Daniel')                                    // macOS Daniel UK
    || v.find(x => x.name.includes('Daniel'))                           // any Daniel
    || v.find(x => x.name.includes('Google UK English Male'))           // Chrome UK male
    || v.find(x => x.name.includes('Google') && x.lang === 'en-GB')    // Chrome UK
    || v.find(x => x.lang === 'en-GB' && !x.name.toLowerCase().includes('female'))
    || v.find(x => x.name.includes('Google') && x.lang.startsWith('en'))
    || v.find(x => x.lang.startsWith('en'))
    || v[0]
  );
}

let currentUtterance = null;

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
  currentUtterance = null;
}

export async function speak(text) {
  if (!text || !window.speechSynthesis) return;
  stopSpeaking();

  // Clean text
  const clean = text
    .replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/#+\s/g, '').replace(/①|②|③|④|⑤|⑥|⑦/g, '')
    .replace(/\n+/g, '. ').trim();

  // Ensure voices loaded
  if (!_voicesLoaded) await loadVoices();

  const u = new SpeechSynthesisUtterance(clean);
  u.rate   = 0.88;
  u.pitch  = 0.95;
  u.volume = 1.0;

  const voice = getBestVoice();
  if (voice) u.voice = voice;

  currentUtterance = u;
  window.speechSynthesis.speak(u);

  return new Promise(resolve => {
    u.onend   = () => { currentUtterance = null; resolve(); };
    u.onerror = () => { currentUtterance = null; resolve(); };
  });
}

// Pre-load on module init
if (typeof window !== 'undefined') {
  loadVoices();
}
