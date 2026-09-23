// The screen of the phones of the hero scene (hero.js): a mock-up of a mobile app, drawn once, over which the automated
// test is redrawn on every frame. A selection frame moves from one element to the next as in an Appium inspector, taps,
// asserts, and each passed step is appended to the test log at the bottom of the screen.
// Nothing 3D here: a 2D canvas, used as the texture of both phones.

import { accent } from './common.js';
import betclicLogo from '../../assets/marks/betclic.svg?url';
import accorLogo from '../../assets/marks/accor.svg?url';
const ACC = accent(), GREEN = '#3ddc84', RED = '#ff5d5d', INK = '#161b22';
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
const BETCLIC = '#d2161e', ACCOR = '#050033';
const TABS = [72, 180, 300, 408];   // centres of the four tab bar items
const tabRect = (i) => ({ x: TABS[i] - 18, y: 962, w: 36, h: 36, r: 10 });
const ODDS = (i) => ({ x: 234 + i * 72, y: 360, w: 64, h: 40, r: 10 });
const SEARCH_BTN = { x: 332, y: 262, w: 108, h: 48, r: 14 };

/** The tests the phones can play: the hero's, and one per experience with a demo (content: experience[].demo), drawn
 *  in the client's colours with its logo. All have five steps, so one run always lasts CYCLE. `body`: the colour of the
 *  Android phone (null: the site's accent). */
export const SCENARIOS = {
  hero: { style: 'promo', feature: 'smoke.feature', body: null, steps: [
    { rect: R.card, verb: 'swipe', loc: '~promo_card' },
    { rect: R.row1, verb: 'tap', loc: '~offer_row_1' },
    { rect: R.row2, verb: 'assert', loc: '~offer_row_2' },
    { rect: R.cta, verb: 'tap', loc: '~cta_button' },
    { rect: R.tab, verb: 'tap', loc: '~tab_rewards' },
  ] },
  betting: { style: 'betting', feature: 'missions.feature', body: BETCLIC, steps: [
    { rect: ODDS(0), verb: 'tap', loc: '~odds_home' },
    { rect: R.cta, verb: 'tap', loc: '~place_bet' },
    { rect: R.card, verb: 'assert', loc: '~mission_progress' },
    { rect: R.row2, verb: 'assert', loc: '~leaderboard_rank' },
    { rect: tabRect(2), verb: 'tap', loc: '~tab_missions' },
  ] },
  // the 404 page: the test breaks on its last step, the page it expected is not there (`fail`: that step's index)
  notfound: { style: 'promo', feature: 'navigation.feature', body: '#e5484d', fail: 2, steps: [
    { rect: R.card, verb: 'tap', loc: '~open_link' },
    { rect: R.row1, verb: 'tap', loc: '~menu_item' },
    { rect: R.row2, verb: 'assert', loc: '~page_found' },
  ] },
  booking: { style: 'booking', feature: 'booking.feature', body: ACCOR, steps: [
    { rect: SEARCH_BTN, verb: 'tap', loc: '~search_button' },
    { rect: R.row1, verb: 'assert', loc: '~hotel_card_1' },
    { rect: R.row2, verb: 'swipe', loc: '~hotel_list' },
    { rect: R.cta, verb: 'tap', loc: '~book_button' },
    { rect: tabRect(2), verb: 'tap', loc: '~tab_status' },
  ] },
};
const TEXT = {
  betting: {
    en: { mission: 'Mission of the day', missionSub: 'Place 3 bets · win a €5 freebet', match: 'PSG – OM', when: 'Tonight · 21:00',
      odds: ['1.85', '3.40', '4.10'], board: 'Weekly leaderboard', rank: '#12 · 1,250 pts', balance: '€25.00', cta: 'Place bet · €10',
      tabs: ['Sports', 'Live', 'Missions', 'Account'] },
    fr: { mission: 'Mission du jour', missionSub: 'Place 3 paris · 5 € de freebet', match: 'PSG – OM', when: 'Ce soir · 21:00',
      odds: ['1,85', '3,40', '4,10'], board: 'Classement de la semaine', rank: '12e · 1 250 pts', balance: '25,00 €', cta: 'Parier 10 €',
      tabs: ['Sports', 'Live', 'Missions', 'Compte'] },
  },
  booking: {
    en: { where: 'Where to?', city: 'Paris', dates: 'Oct 12 – 14 · 2 guests', search: 'Search', h1: 'Paris Centre', h1sub: '★★★★ · 1.2 km',
      p1: '€189', h2: 'Gare de Lyon', h2sub: '★★★ · 2.4 km', p2: '€142', cta: 'Book · €189', tabs: ['Explore', 'Stays', 'Status', 'Account'] },
    fr: { where: 'Où allez-vous ?', city: 'Paris', dates: '12 – 14 oct. · 2 pers.', search: 'Chercher', h1: 'Paris Centre', h1sub: '★★★★ · 1,2 km',
      p1: '189 €', h2: 'Gare de Lyon', h2sub: '★★★ · 2,4 km', p2: '142 €', cta: 'Réserver · 189 €', tabs: ['Explorer', 'Séjours', 'Statut', 'Compte'] },
  },
};
const lang = () => (document.documentElement.lang === 'fr' ? 'fr' : 'en');

// the clients' logos: the same files as the marks of the hero sentence
const LOGOS = {};
/** Loads the logos drawn on the branded screens; call before drawBase. A logo that fails to load is simply left out. */
export const loadLogos = () => Promise.all(Object.entries({ betclic: betclicLogo, accor: accorLogo }).map(([k, src]) => new Promise((done) => {
  const i = new Image(); i.onload = () => { LOGOS[k] = i; done(); }; i.onerror = () => done(); i.src = src;
})));
const STEP_COUNT = 5;
const STEP = 1.3, SUMMARY = 2.4;
/** Length of one run of the test, in seconds. */
export const CYCLE = STEP_COUNT * STEP + SUMMARY;
const LOG_Y = 696, LOG_DY = 38, SUM_Y = 898;

const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const mix = (a, b, m) => ({ x: a.x + (b.x - a.x) * m, y: a.y + (b.y - a.y) * m, w: a.w + (b.w - a.w) * m, h: a.h + (b.h - a.h) * m, r: a.r + (b.r - a.r) * m });

const label = (g, str, x, y, font, color, align = 'left') => { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(str, x, y); g.textAlign = 'left'; };
const row = (g, r) => { g.fillStyle = '#fff'; rr(g, r.x, r.y, r.w, r.h, r.r); g.fill(); g.strokeStyle = '#e3e7ed'; g.lineWidth = 2; g.stroke(); };
function tabBar(g, labels, active, color) {
  g.fillStyle = '#fff'; g.fillRect(0, 948, SW, 92); g.fillStyle = '#e3e7ed'; g.fillRect(0, 948, SW, 2);
  TABS.forEach((x, i) => {
    g.fillStyle = i === active ? color : '#c9d0da'; rr(g, x - 13, 966, 26, 26, 8); g.fill();
    label(g, labels[i], x, 1012, `600 14px ${SANS}`, i === active ? color : '#8e97a3', 'center');
  });
}

// The app under test, per scenario: everything above the test log.
const APPS = {
  promo(g) {   // the hero's: an abstract app
    g.fillStyle = INK; rr(g, 24, 84, 176, 28, 9); g.fill();
    g.fillStyle = '#c9d0da'; rr(g, 24, 120, 112, 14, 7); g.fill();
    g.fillStyle = tint(ACC, 0.72); g.beginPath(); g.arc(424, 108, 24, 0, Math.PI * 2); g.fill();
    const gr = g.createLinearGradient(24, 150, 456, 330); gr.addColorStop(0, ACC); gr.addColorStop(1, tint(ACC, 0.35));
    g.fillStyle = gr; rr(g, R.card.x, R.card.y, R.card.w, R.card.h, R.card.r); g.fill();
    g.save(); rr(g, R.card.x, R.card.y, R.card.w, R.card.h, R.card.r); g.clip();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(410, 214, 74, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(452, 316, 50, 0, Math.PI * 2); g.fill(); g.restore();
    g.fillStyle = '#fff'; rr(g, 48, 182, 210, 24, 9); g.fill();
    g.fillStyle = 'rgba(255,255,255,.72)'; rr(g, 48, 218, 150, 14, 7); g.fill();
    g.fillStyle = '#fff'; rr(g, 48, 272, 124, 38, 19); g.fill();
    g.fillStyle = ACC; rr(g, 72, 285, 76, 12, 6); g.fill();
    for (const r of [R.row1, R.row2]) {
      row(g, r);
      g.fillStyle = tint(ACC, 0.82); rr(g, r.x + 14, r.y + 12, 44, 44, 12); g.fill();
      g.fillStyle = '#1f2630'; rr(g, r.x + 74, r.y + 16, 190, 14, 7); g.fill();
      g.fillStyle = '#c9d0da'; rr(g, r.x + 74, r.y + 40, 128, 12, 6); g.fill();
      g.fillStyle = tint(ACC, 0.72); rr(g, r.x + r.w - 72, r.y + 26, 50, 16, 8); g.fill();
    }
    g.fillStyle = INK; rr(g, R.cta.x, R.cta.y, R.cta.w, R.cta.h, R.cta.r); g.fill();
    g.fillStyle = '#fff'; rr(g, 180, 537, 120, 14, 7); g.fill();
    g.fillStyle = '#fff'; g.fillRect(0, 948, SW, 92); g.fillStyle = '#e3e7ed'; g.fillRect(0, 948, SW, 2);
    TABS.forEach((x, i) => { g.fillStyle = i === 0 ? ACC : '#c9d0da'; rr(g, x - 18, 968, 36, 36, 10); g.fill(); });
  },
  betting(g, T) {   // a sports betting app: tonight's match and its odds, the mission of the day, the leaderboard
    if (LOGOS.betclic) g.drawImage(LOGOS.betclic, 24, 80, 117, 40);
    g.fillStyle = '#eef0f4'; rr(g, 330, 82, 126, 36, 18); g.fill();
    label(g, T.balance, 393, 106, `700 17px ${SANS}`, INK, 'center');
    const c = R.card;
    g.fillStyle = '#16161c'; rr(g, c.x, c.y, c.w, c.h, c.r); g.fill();
    label(g, T.mission, 48, 196, `700 24px ${SANS}`, '#fff');
    label(g, T.missionSub, 48, 226, `500 16px ${SANS}`, '#a4abb6');
    g.fillStyle = '#34343d'; rr(g, 48, 258, 330, 14, 7); g.fill();
    g.fillStyle = BETCLIC; rr(g, 48, 258, 220, 14, 7); g.fill();
    label(g, '2 / 3', 432, 271, `700 16px ${SANS}`, '#fff', 'right');
    [0, 1, 2].forEach((i) => { g.fillStyle = i < 2 ? BETCLIC : '#34343d'; g.beginPath(); g.arc(58 + i * 30, 302, 9, 0, Math.PI * 2); g.fill(); });
    row(g, R.row1);
    label(g, T.match, 40, 375, `700 19px ${SANS}`, INK);
    label(g, T.when, 40, 400, `500 14px ${SANS}`, '#8e97a3');
    T.odds.forEach((o, i) => { const b = ODDS(i); g.fillStyle = '#eef0f4'; rr(g, b.x, b.y, b.w, b.h, b.r); g.fill(); label(g, o, b.x + b.w / 2, b.y + 26, `700 16px ${SANS}`, INK, 'center'); });
    const r2 = R.row2; row(g, r2);
    g.fillStyle = '#f5c518'; g.beginPath(); g.arc(r2.x + 34, r2.y + 34, 16, 0, Math.PI * 2); g.fill();
    label(g, T.board, r2.x + 64, r2.y + 41, `600 17px ${SANS}`, INK);
    label(g, T.rank, r2.x + r2.w - 16, r2.y + 41, `700 16px ${SANS}`, BETCLIC, 'right');
    g.fillStyle = BETCLIC; rr(g, R.cta.x, R.cta.y, R.cta.w, R.cta.h, R.cta.r); g.fill();
    label(g, T.cta, SW / 2, R.cta.y + 40, `700 21px ${SANS}`, '#fff', 'center');
    tabBar(g, T.tabs, 2, BETCLIC);
  },
  booking(g, T) {   // a hotel booking app: the search, two results with their price, the loyalty status tab
    if (LOGOS.accor) g.drawImage(LOGOS.accor, 24, 70, 65, 56);
    g.fillStyle = tint(ACCOR, 0.86); g.beginPath(); g.arc(424, 98, 22, 0, Math.PI * 2); g.fill();
    const c = R.card; row(g, c);
    label(g, T.where, 48, 190, `700 22px ${SANS}`, ACCOR);
    g.fillStyle = '#f0f2f6'; rr(g, 48, 204, 392, 46, 12); g.fill();
    label(g, T.city, 64, 234, `700 18px ${SANS}`, INK);
    g.fillStyle = '#f0f2f6'; rr(g, 48, 262, 272, 48, 12); g.fill();
    label(g, T.dates, 64, 292, `500 15px ${SANS}`, '#4a5563');
    const s = SEARCH_BTN; g.fillStyle = ACCOR; rr(g, s.x, s.y, s.w, s.h, s.r); g.fill();
    label(g, T.search, s.x + s.w / 2, s.y + 30, `700 16px ${SANS}`, '#fff', 'center');
    [[R.row1, T.h1, T.h1sub, T.p1, ['#8fb8de', '#d8c3a0']], [R.row2, T.h2, T.h2sub, T.p2, ['#9fb1c9', '#e6d6b8']]].forEach(([r, name, sub, price, cols]) => {
      row(g, r);
      const gr = g.createLinearGradient(r.x + 12, r.y + 10, r.x + 60, r.y + 58); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
      g.fillStyle = gr; rr(g, r.x + 12, r.y + 10, 48, 48, 10); g.fill();
      label(g, name, r.x + 74, r.y + 30, `700 17px ${SANS}`, INK);
      label(g, sub, r.x + 74, r.y + 52, `500 14px ${SANS}`, '#8e97a3');
      label(g, price, r.x + r.w - 16, r.y + 42, `700 19px ${SANS}`, ACCOR, 'right');
    });
    g.fillStyle = ACCOR; rr(g, R.cta.x, R.cta.y, R.cta.w, R.cta.h, R.cta.r); g.fill();
    label(g, T.cta, SW / 2, R.cta.y + 40, `700 21px ${SANS}`, '#fff', 'center');
    tabBar(g, T.tabs, 2, ACCOR);
  },
};

/** The app mock-up, drawn once into its own canvas: everything that never changes during the test. */
export function drawBase(sc = SCENARIOS.hero) {
  const c = document.createElement('canvas'); c.width = SW * TS; c.height = SH * TS;
  const g = c.getContext('2d'); g.scale(TS, TS);
  g.fillStyle = '#f4f6f9'; g.fillRect(0, 0, SW, SH);
  // status bar
  g.fillStyle = INK; g.font = `600 24px ${SANS}`; g.fillText('9:41', 44, 46);
  for (let i = 0; i < 4; i++) g.fillRect(352 + i * 9, 44 - (i + 1) * 5, 6, (i + 1) * 5);
  g.lineWidth = 2; g.strokeStyle = INK; rr(g, 396, 29, 38, 17, 5); g.stroke(); g.fillRect(400, 33, 26, 9); g.fillRect(436, 34, 3, 7);
  APPS[sc.style](g, TEXT[sc.style]?.[lang()]);
  // test log panel
  g.fillStyle = '#0e1116'; rr(g, 16, 598, 448, 336, 24); g.fill();
  g.font = `500 17px ${MONO}`; g.fillStyle = '#8e97a3'; g.fillText('▶ ' + sc.feature, 40, 640);
  const dev = 'iOS · Android'; g.fillText(dev, 440 - g.measureText(dev).width, 640);
  g.fillStyle = '#232a33'; g.fillRect(40, 656, 400, 2);
  g.fillStyle = INK; rr(g, 170, 1022, 140, 6, 3); g.fill();   // home indicator
  return c;
}

// Timeline of one step, as fractions of STEP: the frame fades in (first step) or slides from the previous element, a tap
// ripples, an assertion turns green, then the step's log line fades in. Then the summary, while the frame fades out.
const FADE_IN = 0.2, SLIDE = 0.35, TAP_FROM = 0.5, TAP_LEN = 0.45, CHECKED = 0.55, LOGGED = 0.8, LOG_FADE = 0.12;
const FRAME_OUT = 0.5, SUMMARY_IN = 0.3;   // seconds after the last step

/** The state of the test at time t (s): what drawScreen draws, and whether anything is moving at that instant. */
function phase(t, STEPS) {
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
export function drawScreen(g, base, t, sc = SCENARIOS.hero) {
  const STEPS = sc.steps, s = phase(t, STEPS), step = STEPS[s.k], n = STEPS.length;
  g.setTransform(TS, 0, 0, TS, 0, 0);
  g.drawImage(base, 0, 0, SW, SH);

  // the selection frame slides to the target element, shows its locator, then taps or asserts
  if (s.frame > 0) {
    const r = mix(s.k > 0 ? STEPS[s.k - 1].rect : step.rect, step.rect, s.slide);
    const failed = s.checked && s.k === sc.fail;
    const col = failed ? RED : s.checked ? GREEN : ACC;
    g.save(); g.globalAlpha = s.frame;
    rr(g, r.x - 6, r.y - 6, r.w + 12, r.h + 12, r.r + 6);
    g.fillStyle = failed ? rgba(RED, 0.14) : s.checked ? rgba(GREEN, 0.12) : rgba(ACC, 0.1); g.fill();
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
    const broke = i === sc.fail;
    g.fillStyle = broke ? RED : GREEN; g.fillText(broke ? '✗' : '✓', 44, y);
    g.fillStyle = broke ? RED : '#d7dde6'; g.fillText(STEPS[i].verb.padEnd(7) + STEPS[i].loc, 74, y);
  }
  g.globalAlpha = 1;
  if (s.cursor) {
    const y = LOG_Y + s.k * LOG_DY;
    g.fillStyle = s.blink ? ACC : '#6b7480'; g.fillText('▸', 46, y);
    g.fillStyle = '#6b7480'; g.fillText(step.verb.padEnd(7) + step.loc, 74, y);
  }
  if (!s.inSteps) {
    const broke = sc.fail !== undefined;
    const result = broke ? 'FAILED · 404' : `PASSED ${n}/${n}`;
    g.globalAlpha = s.summary;
    g.font = `700 22px ${MONO}`; g.fillStyle = broke ? RED : GREEN; g.fillText(result, 44, SUM_Y);
    const w = g.measureText(result).width;
    g.font = `500 18px ${MONO}`; g.fillStyle = '#8e97a3'; g.fillText(broke ? '· page not found' : '· 2 devices · 7.8 s', 44 + w + 14, SUM_Y);
    g.globalAlpha = 1;
  }
}

/** Progress of the tap on screen at time t (0 → 1), or -1 when nothing is being tapped: the sound of the taps. */
export const rippleAt = (t, sc = SCENARIOS.hero) => phase(t, sc.steps).ripple;

// What changes on screen at time t: null during a motion (sliding frame, tap ripple, a line appearing), otherwise a key
// for the static state (step, assertion, blinking cursor). Same key ⇒ same image: no need to redraw it.
export function screenKey(t, sc = SCENARIOS.hero) {
  const s = phase(t, sc.steps);
  if (s.moving) return null;
  return s.inSteps ? s.k + '|' + s.checked + '|' + (s.done > s.k) + '|' + (s.cursor ? s.blink : '-') : 'summary';
}

