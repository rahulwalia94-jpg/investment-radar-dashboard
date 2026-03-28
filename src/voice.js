// ── VOICE ENGINE — ElevenLabs + Browser TTS fallback ──────────

const ELEVENLABS_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam — professional male
const ELEVENLABS_MODEL    = 'eleven_turbo_v2';

// Get API key from env (set in Vite env vars)
const EL_KEY = import.meta.env.VITE_ELEVENLABS_KEY || '';

let speaking = false;
let audioContext = null;

export function stopSpeaking() {
  speaking = false;
  window.speechSynthesis?.cancel();
  if (audioContext) { audioContext.close(); audioContext = null; }
}

async function speakElevenLabs(text) {
  if (!EL_KEY) return false;
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': EL_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
        }),
      }
    );
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioContext.decodeAudioData(buf);
    const source = audioContext.createBufferSource();
    source.buffer = decoded;
    source.connect(audioContext.destination);
    source.start(0);
    return true;
  } catch {
    return false;
  }
}

function speakBrowser(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.88; u.pitch = 1.0; u.volume = 1.0;
  // Find best available voice
  const voices = window.speechSynthesis.getVoices();
  const best = voices.find(v => v.name.includes('Daniel'))       // UK male
    || voices.find(v => v.name.includes('Google UK'))
    || voices.find(v => v.name.includes('Google') && v.lang === 'en-GB')
    || voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
    || voices.find(v => v.lang.startsWith('en') && !v.name.includes('Female'));
  if (best) u.voice = best;
  window.speechSynthesis.speak(u);
}

export async function speak(text) {
  if (!text) return;
  stopSpeaking();
  speaking = true;
  const clean = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#+\s/g, '').trim();
  const used = await speakElevenLabs(clean);
  if (!used && speaking) speakBrowser(clean);
}
