// Sound design, synthesised with the Web Audio API (no audio file): a breath on each screen change, a tick when the
// mouse reaches something interactive, the pills knocking in the footer, the phones' taps. Off by default; the switch
// in the top bar turns it on and the choice is remembered. The other scripts only send an event:
// window.dispatchEvent(new CustomEvent('cv:sound', { detail: { name, ... } })), which costs nothing while it is off.
const KEY = 'cv-sound';
const btn = document.querySelector('.sound-toggle');
const HOT = 'a, button, [role="switch"], .mark.is-3d, .brand, .is-over-pill, .device-anchor, html.stage .hero-stage';
let ctx = null, out = null, noise = null, on = false;

function init() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
  out = ctx.createGain(); out.gain.value = 0.9; out.connect(comp);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);   // one second of white noise, for breaths and knocks
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
const envelope = (gain, t, attack, peak, release) => {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
};
const tone = (type, from, to, dur, peak) => {
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
  envelope(g, t, 0.003, peak, dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
};

const SOUNDS = {
  whoosh({ back }) {   // band-passed noise, swept up going forward, down going back
    const t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(back ? 2600 : 420, t); f.frequency.exponentialRampToValueAtTime(back ? 420 : 2600, t + 0.8);
    envelope(g, t, 0.32, 0.14, 0.62);
    src.connect(f).connect(g).connect(out); src.start(t); src.stop(t + 1);
  },
  tick() { tone('sine', 2300, 1500, 0.05, 0.03); },
  tap() { tone('triangle', 900, 420, 0.06, 0.025); },
  impact({ v = 1 }) {   // a pill hitting something: a knock, louder and brighter when harder
    const k = Math.min(1, v), t = ctx.currentTime;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; f.type = 'lowpass'; f.frequency.value = 700 + 2200 * k;
    envelope(g, t, 0.002, 0.03 + 0.16 * k, 0.08);
    src.connect(f).connect(g).connect(out); src.start(t, Math.random() * 0.8); src.stop(t + 0.14);
    tone('sine', 150 + 90 * k, 60, 0.12, 0.05 + 0.14 * k);
  },
};
const MIN_GAP = { whoosh: 250, tick: 70, tap: 150, impact: 40 };   // ms between two of the same sound
const last = {};
window.addEventListener('cv:sound', (e) => {
  if (!on || !ctx || document.hidden) return;
  const { name } = e.detail, now = performance.now();
  if (!SOUNDS[name] || now - (last[name] || 0) < MIN_GAP[name]) return;
  last[name] = now;
  SOUNDS[name](e.detail);
});

// a tick when the mouse reaches something interactive
let hot = null;
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse' || !on) return;
  const h = e.target instanceof Element ? e.target.closest(HOT) : null;
  if (h && h !== hot) window.dispatchEvent(new CustomEvent('cv:sound', { detail: { name: 'tick' } }));
  hot = h;
});

function set(v, remember) {
  on = v;
  btn?.setAttribute('aria-pressed', String(v)); btn?.classList.toggle('is-on', v);
  if (btn) btn.title = v ? btn.dataset.titleOn : btn.dataset.titleOff;
  if (v) { if (!ctx) init(); ctx.resume(); } else ctx?.suspend();
  if (remember) try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (_) {}
}
btn?.addEventListener('click', () => {
  set(!on, true);
  if (on) window.dispatchEvent(new CustomEvent('cv:sound', { detail: { name: 'tick' } }));
});
// remembered on: a browser only lets sound start after a gesture, so it resumes on the first one
let saved = null;
try { saved = localStorage.getItem(KEY); } catch (_) {}
if (saved === 'on' && btn) {
  btn.classList.add('is-on'); btn.setAttribute('aria-pressed', 'true'); btn.title = btn.dataset.titleOn;
  const arm = () => { set(true, false); ['pointerdown', 'keydown'].forEach((t) => window.removeEventListener(t, arm)); };
  ['pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, arm));
}
