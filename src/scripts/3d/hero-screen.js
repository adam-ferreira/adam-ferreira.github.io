// The screen of the phones of the hero scene (hero.js): a mock-up of a mobile app, drawn once, over which the automated
// test is redrawn on every frame. A selection frame moves from one element to the next as in an Appium inspector, taps,
// asserts, and each passed step is appended to the test log at the bottom of the screen.
// Nothing 3D here: a 2D canvas, used as the texture of both phones.

const cssVar = (name, fallback) => (getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);
/** The site's accent (--accent in the stylesheet): a single setting for the page, the phones and the cursor. */
export const ACC = cssVar('--accent', '#ffb627');
const GREEN = '#3ddc84', INK = '#161b22';
const rgbOf = (h) => { const m = h.replace('#', ''); const n = parseInt(m.length === 3 ? m.replace(/./g, '$&$&') : m, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => `rgba(${rgbOf(h).join(',')},${a})`;
const tint = (h, t) => `rgb(${rgbOf(h).map((c) => Math.round(c + (255 - c) * t)).join(',')})`;   // towards white
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SW = 480, SH = 1040, TS = 1.5;   // 480 × 1040 mockup, texture drawn at 1.5× the resolution
const R = {
  card: { x: 24, y: 150, w: 432, h: 180, r: 22 },
  row1: { x: 24, y: 346, w: 432, h: 68, r: 16 },
  row2: { x: 24, y: 426, w: 432, h: 68, r: 16 },
  cta: { x: 24, y: 512, w: 432, h: 64, r: 32 },
  tab: { x: 162, y: 968, w: 36, h: 36, r: 10 },
};
const STEPS = [
  { rect: R.card, verb: 'swipe', loc: '~promo_card' },
  { rect: R.row1, verb: 'tap', loc: '~offer_row_1' },
  { rect: R.row2, verb: 'assert', loc: '~offer_row_2' },
  { rect: R.cta, verb: 'tap', loc: '~cta_button' },
  { rect: R.tab, verb: 'tap', loc: '~tab_rewards' },
];
const STEP = 1.3, SUMMARY = 2.4;
/** Length of one run of the test, in seconds. */
export const CYCLE = STEPS.length * STEP + SUMMARY;
const LOG_Y = 696, LOG_DY = 38, SUM_Y = 898;

const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const mix = (a, b, m) => ({ x: a.x + (b.x - a.x) * m, y: a.y + (b.y - a.y) * m, w: a.w + (b.w - a.w) * m, h: a.h + (b.h - a.h) * m, r: a.r + (b.r - a.r) * m });

/** The app mock-up, drawn once into its own canvas: everything that never changes during the test. */
export function drawBase() {
  const c = document.createElement('canvas'); c.width = SW * TS; c.height = SH * TS;
  const g = c.getContext('2d'); g.scale(TS, TS);
  g.fillStyle = '#f4f6f9'; g.fillRect(0, 0, SW, SH);
  // status bar
  g.fillStyle = INK; g.font = `600 24px ${SANS}`; g.fillText('9:41', 44, 46);
  for (let i = 0; i < 4; i++) g.fillRect(352 + i * 9, 44 - (i + 1) * 5, 6, (i + 1) * 5);
  g.lineWidth = 2; g.strokeStyle = INK; rr(g, 396, 29, 38, 17, 5); g.stroke(); g.fillRect(400, 33, 26, 9); g.fillRect(436, 34, 3, 7);
  // header
  rr(g, 24, 84, 176, 28, 9); g.fill();
  g.fillStyle = '#c9d0da'; rr(g, 24, 120, 112, 14, 7); g.fill();
  g.fillStyle = tint(ACC, 0.72); g.beginPath(); g.arc(424, 108, 24, 0, Math.PI * 2); g.fill();
  // featured card
  const gr = g.createLinearGradient(24, 150, 456, 330); gr.addColorStop(0, ACC); gr.addColorStop(1, tint(ACC, 0.35));
  g.fillStyle = gr; rr(g, R.card.x, R.card.y, R.card.w, R.card.h, R.card.r); g.fill();
  g.save(); rr(g, R.card.x, R.card.y, R.card.w, R.card.h, R.card.r); g.clip();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(410, 214, 74, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(452, 316, 50, 0, Math.PI * 2); g.fill(); g.restore();
  g.fillStyle = '#fff'; rr(g, 48, 182, 210, 24, 9); g.fill();
  g.fillStyle = 'rgba(255,255,255,.72)'; rr(g, 48, 218, 150, 14, 7); g.fill();
  g.fillStyle = '#fff'; rr(g, 48, 272, 124, 38, 19); g.fill();
  g.fillStyle = ACC; rr(g, 72, 285, 76, 12, 6); g.fill();
  // two list rows
  for (const r of [R.row1, R.row2]) {
    g.fillStyle = '#fff'; rr(g, r.x, r.y, r.w, r.h, r.r); g.fill();
    g.strokeStyle = '#e3e7ed'; g.lineWidth = 2; g.stroke();
    g.fillStyle = tint(ACC, 0.82); rr(g, r.x + 14, r.y + 12, 44, 44, 12); g.fill();
    g.fillStyle = '#1f2630'; rr(g, r.x + 74, r.y + 16, 190, 14, 7); g.fill();
    g.fillStyle = '#c9d0da'; rr(g, r.x + 74, r.y + 40, 128, 12, 6); g.fill();
    g.fillStyle = tint(ACC, 0.72); rr(g, r.x + r.w - 72, r.y + 26, 50, 16, 8); g.fill();
  }
  // primary button
  g.fillStyle = INK; rr(g, R.cta.x, R.cta.y, R.cta.w, R.cta.h, R.cta.r); g.fill();
  g.fillStyle = '#fff'; rr(g, 180, 537, 120, 14, 7); g.fill();
  // test log panel
  g.fillStyle = '#0e1116'; rr(g, 16, 598, 448, 336, 24); g.fill();
  g.font = `500 17px ${MONO}`; g.fillStyle = '#8e97a3'; g.fillText('▶ smoke.feature', 40, 640);
  const dev = 'iOS · Android'; g.fillText(dev, 440 - g.measureText(dev).width, 640);
  g.fillStyle = '#232a33'; g.fillRect(40, 656, 400, 2);
  // tab bar
  g.fillStyle = '#fff'; g.fillRect(0, 948, SW, 92); g.fillStyle = '#e3e7ed'; g.fillRect(0, 948, SW, 2);
  [72, 180, 300, 408].forEach((x, i) => { g.fillStyle = i === 0 ? ACC : '#c9d0da'; rr(g, x - 18, 968, 36, 36, 10); g.fill(); });
  g.fillStyle = INK; rr(g, 170, 1022, 140, 6, 3); g.fill();
  return c;
}

// Timeline of one step, as fractions of STEP: the frame fades in (first step) or slides from the previous element, a tap
// ripples, an assertion turns green, then the step's log line fades in. Then the summary, while the frame fades out.
const FADE_IN = 0.2, SLIDE = 0.35, TAP_FROM = 0.5, TAP_LEN = 0.45, CHECKED = 0.55, LOGGED = 0.8, LOG_FADE = 0.12;
const FRAME_OUT = 0.5, SUMMARY_IN = 0.3;   // seconds after the last step

/** The state of the test at time t (s): what drawScreen draws, and whether anything is moving at that instant. */
function phase(t) {
  t = ((t % CYCLE) + CYCLE) % CYCLE;   // the first frame's timestamp can precede the start: never a negative time
  const n = STEPS.length, stepsEnd = n * STEP, inSteps = t < stepsEnd;
  const k = inSteps ? Math.floor(t / STEP) : n - 1;
  const p = inSteps ? (t - k * STEP) / STEP : 1;
  const tap = STEPS[k].verb !== 'assert', since = t - stepsEnd;   // since: time spent in the summary
  const s = {
    t, k, p, inSteps,
    frame: inSteps ? (k === 0 ? Math.min(1, p / FADE_IN) : 1) : Math.max(0, 1 - since / FRAME_OUT),   // opacity of the selection frame
    slide: ease(Math.min(1, p / SLIDE)),                                           // progress from the previous element
    checked: !tap && p > CHECKED,                                                  // an assertion that passed
    ripple: tap && inSteps && p > TAP_FROM && p < TAP_FROM + TAP_LEN ? (p - TAP_FROM) / TAP_LEN : -1,   // tap progress
    done: inSteps ? k + (p > LOGGED ? 1 : 0) : n,                                  // log lines shown
    lineIn: inSteps && p > LOGGED ? Math.min(1, (p - LOGGED) / LOG_FADE) : 1,       // opacity of the newest line
    cursor: inSteps && p <= LOGGED,                                                // the current step's grey line
    blink: Math.floor(t * 4) % 2,
    summary: inSteps ? 0 : Math.min(1, since / SUMMARY_IN),                        // opacity of the result line
    moving: false,
  };
  s.moving = inSteps ? (k === 0 ? p < FADE_IN : p < SLIDE) || s.ripple >= 0 || s.lineIn < 1 : since < FRAME_OUT;
  return s;
}

/** The screen at time t (s): the mock-up, then the test playing over it. */
export function drawScreen(g, base, t) {
  const s = phase(t), step = STEPS[s.k], n = STEPS.length;
  g.setTransform(TS, 0, 0, TS, 0, 0);
  g.drawImage(base, 0, 0, SW, SH);

  // the selection frame slides to the target element, shows its locator, then taps or asserts
  if (s.frame > 0) {
    const r = mix(s.k > 0 ? STEPS[s.k - 1].rect : step.rect, step.rect, s.slide);
    const col = s.checked ? GREEN : ACC;
    g.save(); g.globalAlpha = s.frame;
    rr(g, r.x - 6, r.y - 6, r.w + 12, r.h + 12, r.r + 6);
    g.fillStyle = s.checked ? rgba(GREEN, 0.12) : rgba(ACC, 0.1); g.fill();
    g.lineWidth = 4; g.strokeStyle = col; g.stroke();
    g.font = `600 19px ${MONO}`;
    const lw = g.measureText(step.loc).width + 20, lx = Math.min(r.x - 6, SW - 8 - lw), ly = r.y - 6 - 34;
    g.fillStyle = col; rr(g, lx, ly, lw, 28, 8); g.fill();
    g.fillStyle = '#16100c'; g.fillText(step.loc, lx + 10, ly + 20);
    if (s.ripple >= 0) {
      const q = s.ripple;
      const cx = step.verb === 'swipe' ? r.x + r.w * (0.78 - 0.5 * ease(q)) : r.x + r.w / 2, cy = r.y + r.h / 2;
      g.fillStyle = rgba(ACC, 0.35 * (1 - q)); g.beginPath(); g.arc(cx, cy, 12 + q * 44, 0, Math.PI * 2); g.fill();
      g.fillStyle = rgba(ACC, 0.9 * (1 - q * 0.6)); g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  // the log: one green line per passed step, the current step in grey
  g.font = `500 20px ${MONO}`;
  for (let i = 0; i < s.done; i++) {
    g.globalAlpha = i === s.done - 1 ? s.lineIn : 1;
    const y = LOG_Y + i * LOG_DY;
    g.fillStyle = GREEN; g.fillText('✓', 44, y);
    g.fillStyle = '#d7dde6'; g.fillText(STEPS[i].verb.padEnd(7) + STEPS[i].loc, 74, y);
  }
  g.globalAlpha = 1;
  if (s.cursor) {
    const y = LOG_Y + s.k * LOG_DY;
    g.fillStyle = s.blink ? ACC : '#6b7480'; g.fillText('▸', 46, y);
    g.fillStyle = '#6b7480'; g.fillText(step.verb.padEnd(7) + step.loc, 74, y);
  }
  if (!s.inSteps) {
    const result = `PASSED ${n}/${n}`;
    g.globalAlpha = s.summary;
    g.font = `700 22px ${MONO}`; g.fillStyle = GREEN; g.fillText(result, 44, SUM_Y);
    const w = g.measureText(result).width;
    g.font = `500 18px ${MONO}`; g.fillStyle = '#8e97a3'; g.fillText('· 2 devices · 7.8 s', 44 + w + 14, SUM_Y);
    g.globalAlpha = 1;
  }
}

// What changes on screen at time t: null during a motion (sliding frame, tap ripple, a line appearing), otherwise a key
// for the static state (step, assertion, blinking cursor). Same key ⇒ same image: no need to redraw it.
export function screenKey(t) {
  const s = phase(t);
  if (s.moving) return null;
  return s.inSteps ? s.k + '|' + s.checked + '|' + (s.done > s.k) + '|' + (s.cursor ? s.blink : '-') : 'summary';
}

