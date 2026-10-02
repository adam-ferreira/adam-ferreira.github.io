// The screen of the phones of the hero scene (hero.js): a mock-up of a mobile app, drawn once, over which the automated
// test plays. A selection frame moves from one element to the next as in an Appium inspector, taps, asserts, and each
// passed step is appended to the test log at the bottom of the screen.
// Nothing 3D here: the mock-up and the test's texts as 2D canvases, and what the test shows at each instant as a list
// of shapes and texts, which screen-overlay.js draws over the mock-up.

import { accent } from './common.js';
import { DESKTOP, matches } from '../media.js';
import betclicLogo from '../../assets/marks/betclic.svg?url';
import accorLogo from '../../assets/marks/accor.svg?url';
const ACC = accent(), GREEN = '#3ddc84', RED = '#ff5d5d', AMBER = '#f5b841', INK = '#161b22';
const rgbOf = (h) => { const m = h.replace('#', ''); const n = parseInt(m.length === 3 ? m.replace(/./g, '$&$&') : m, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const tint = (h, t) => `rgb(${rgbOf(h).map((c) => Math.round(c + (255 - c) * t)).join(',')})`;   // towards white
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// 480 × 1040 mockup, drawn at 1.5× the resolution on a computer; at 1× on a phone, where the screen shows far smaller
// (a new test is one texture upload, which Safari makes slow: 2.25× fewer pixels)
export const SW = 480, SH = 1040, TS = matches(DESKTOP) ? 1.5 : 1;
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

// The other screens of the stories: missions, leaderboard, bet slip (Betclic); results, confirmation, status, hotel (Accor)
const MIS = (i) => ({ x: 24, y: 196 + i * 96, w: 432, h: 84, r: 16 }), MIS_CHIP = (i) => ({ x: 318, y: 210 + i * 96, w: 122, h: 28, r: 14 });
const LB = (i) => ({ x: 24, y: 196 + i * 64, w: 432, h: 54, r: 14 });
const SLIP = { x: 0, y: 286, w: 480, h: 312, r: 28 }, SLIP_PICK = { x: 24, y: 354, w: 432, h: 64, r: 14 };
const SLIP_BOOST = { x: 24, y: 430, w: 432, h: 50, r: 14 }, SLIP_CTA = { x: 24, y: 500, w: 432, h: 64, r: 32 };
const FILTER = (i) => ({ x: [24, 128, 232][i], y: 196, w: [96, 96, 84][i], h: 34, r: 17 }), HOT = (i) => ({ x: 24, y: 246 + i * 84, w: 432, h: 74, r: 14 });
const CONF_CARD = { x: 24, y: 384, w: 432, h: 100, r: 18 }, CONF_BTN = { x: 24, y: 500, w: 432, h: 58, r: 29 }, NOTIF = { x: 16, y: 16, w: 448, h: 84, r: 20 };
const STATUS_CARD = { x: 24, y: 150, w: 432, h: 172, r: 22 }, BENEFIT = (i) => ({ x: 24, y: 340 + i * 62, w: 432, h: 50, r: 14 });
const PHOTO = { x: 24, y: 140, w: 432, h: 190, r: 20 };

/** The story of each experience with a demo (stage mode, src/scripts/ui/story.js): one short test per achievement, in
 *  the order of the content's bullets. A step without `rect` happens off screen (an API call, a CI job): only its log
 *  line shows. `screen`: the app's screen it happens on (APPS). `tone`: the log line's mark (pass by default). `keep`:
 *  the frames stay on the elements already visited.
 *  `result` / `note`: the summary line. At most five steps: a run always lasts CYCLE. */
export const STORIES = {
  betting: [
    { feature: 'semantics · inspector', keep: true, result: 'IDS 5/5', note: '· in the app code', steps: [
      { rect: ODDS(0), verb: 'id', loc: '~odds_home' },
      { rect: R.card, verb: 'id', loc: '~mission_progress' },
      { rect: R.row2, verb: 'id', loc: '~leaderboard_rank' },
      { rect: R.cta, verb: 'id', loc: '~place_bet' },
      { rect: tabRect(2), verb: 'id', loc: '~tab_missions' },
    ] },
    { feature: 'missions.feature', screen: 'missions', note: '· data by API', steps: [
      { verb: 'api', loc: 'POST /bets', tone: 'info' },
      { verb: 'api', loc: 'POST /bets/settle', tone: 'info' },
      { rect: MIS(0), verb: 'assert', loc: '~mission_progress' },
      { rect: MIS_CHIP(0), verb: 'assert', loc: '~mission_reward' },
    ] },
    { feature: 'nightly · 86 scenarios', screen: 'leaderboard', result: 'TRIAGED', note: '· 1 bug → Jira', steps: [
      { verb: 'run', loc: 'Android + iOS', tone: 'info' },
      { verb: 'flaky', loc: 'rerun, no ticket', tone: 'warn' },
      { verb: 'env', loc: 'down, no ticket', tone: 'warn' },
      { verb: 'bug', loc: 'ticket in Jira', tone: 'fail' },
    ] },
    { feature: 'place_bet.feature', screen: 'betslip', note: '· fixed at the root', steps: [
      { rect: SLIP_CTA, verb: 'tap', loc: '~place_bet', tone: 'fail' },
      { verb: 'debug', loc: 'a11y tree', tone: 'info' },
      { verb: 'fix', loc: 'in the framework', tone: 'info' },
      { rect: SLIP_CTA, verb: 'tap', loc: '~place_bet' },
    ] },
    { feature: 'release train', screen: 'betslip', note: '· several markets', steps: [
      { verb: 'run', loc: 'FR · PT · PL · CI · CM', tone: 'info' },
      { verb: 'check', loc: 'social feed', tone: 'info' },
      { rect: SLIP_PICK, verb: 'assert', loc: '~bet_pick' },
      { rect: SLIP_CTA, verb: 'tap', loc: '~place_bet' },
    ] },
  ],
  booking: [
    { feature: 'framework · upgrade', note: '· 3 squads', steps: [
      { verb: 'bump', loc: 'Java 25', tone: 'info' },
      { verb: 'bump', loc: 'Appium client', tone: 'info' },
      { verb: 'remove', loc: 'dead code', tone: 'info' },
      { rect: SEARCH_BTN, verb: 'tap', loc: '~search_button' },
      { rect: R.row1, verb: 'assert', loc: '~hotel_card_1' },
    ] },
    { feature: 'ActionHelper · waits', note: '· shared by 3 squads', steps: [
      { verb: 'remove', loc: 'Thread.sleep', tone: 'info' },
      { verb: 'poll', loc: 'until visible', tone: 'info' },
      { rect: SEARCH_BTN, verb: 'tap', loc: '~search_button' },
      { rect: R.row1, verb: 'assert', loc: '~hotel_card_1' },
    ] },
    { feature: 'BrowserStack farm', screen: 'results', note: '· 10 different devices', steps: [
      { rect: FILTER(0), verb: 'tap', say: 'iPhone', loc: 'price filter' },
      { rect: HOT(1), verb: 'swipe', say: 'Pixel', loc: 'hotel list' },
      { rect: HOT(2), verb: 'tap', say: 'tablet', loc: 'hotel card' },
      { rect: HOT(3), verb: 'assert', say: 'iPad ⟲', loc: 'landscape' },
    ] },
    { feature: 'gitlab-ci · nightly', screen: 'confirm', result: 'PIPELINE RED', resultTone: 'fail', note: '· as it should', steps: [
      { verb: 'run', loc: 'booking suite', tone: 'info' },
      { verb: 'gate', loc: 'below 90%', tone: 'fail' },
      { verb: 'report', loc: 'Jira · Xray', tone: 'info' },
      { verb: 'notify', loc: 'Slack · its team', tone: 'info' },
    ] },
    { feature: 'coverage', screen: 'status', note: '· new ground', steps: [
      { verb: 'flag', loc: 'on · off' },
      { verb: 'build', loc: 'TestFlight' },
      { verb: 'build', loc: 'Firebase' },
      { rect: tabRect(2), verb: 'tap', loc: '~tab_status' },
      { rect: STATUS_CARD, verb: 'assert', loc: 'webview · WAF' },
    ] },
    { feature: 'booking.spec.ts · wdio', screen: 'detail', note: '· TypeScript', steps: [
      { rect: PHOTO, verb: 'swipe', loc: '~photo_gallery' },
      { rect: R.cta, verb: 'tap', loc: '~book_button' },
      { verb: 'locale', loc: 'fr-FR · en-GB' },
      { verb: 'both', loc: 'iOS · Android' },
    ] },
  ],
};
/** The test the phones play: step `step` of a demo's story, or (step null, or no story) the demo's own test. */
export const scenarioFor = (name, step) => {
  const base = SCENARIOS[name] || SCENARIOS.hero, story = step == null ? null : STORIES[name]?.[step];
  return story ? (story.full ??= { ...base, ...story }) : base;
};
const TAPS = new Set(['tap', 'swipe']);   // the verbs that tap the screen; the others check it
const TEXT = {
  betting: {
    en: { mission: 'Mission of the day', missionSub: 'Place 3 bets · win a €5 freebet', match: 'PSG – OM', when: 'Tonight · 21:00',
      odds: ['1.85', '3.40', '4.10'], board: 'Weekly leaderboard', rank: '#12 · 1,250 pts', balance: '€25.00', cta: 'Place bet · €10',
      tabs: ['Sports', 'Live', 'Missions', 'Account'],
      missionsTitle: 'Missions', missions: [['Place 3 bets', 2, 3, '€5 freebet'], ['Bet on 2 sports', 1, 2, 'Boost +10%'], ['Win a live bet', 0, 1, '50 pts'], ['Weekly challenge', 3, 5, 'Reward game']],
      ranks: ['1', '2', '3', '10', '11', '12'], pts: ['2,840', '2,610', '2,395', '1,330', '1,290', '1,250'], you: 'You',
      slip: 'Bet slip', pick: 'Paris SG to win', boost: 'Boost +10%', boosted: '1.85 → 2.04' },
    fr: { mission: 'Mission du jour', missionSub: 'Place 3 paris · 5 € de freebet', match: 'PSG – OM', when: 'Ce soir · 21:00',
      odds: ['1,85', '3,40', '4,10'], board: 'Classement de la semaine', rank: '12e · 1 250 pts', balance: '25,00 €', cta: 'Parier 10 €',
      tabs: ['Sports', 'Live', 'Missions', 'Compte'],
      missionsTitle: 'Missions', missions: [['Placer 3 paris', 2, 3, '5 € freebet'], ['Parier sur 2 sports', 1, 2, 'Boost +10 %'], ['Gagner un pari live', 0, 1, '50 pts'], ['Défi de la semaine', 3, 5, 'Jeu bonus']],
      ranks: ['1', '2', '3', '10', '11', '12'], pts: ['2 840', '2 610', '2 395', '1 330', '1 290', '1 250'], you: 'Vous',
      slip: 'Ticket', pick: 'Victoire du Paris SG', boost: 'Boost +10 %', boosted: '1,85 → 2,04' },
  },
  booking: {
    en: { where: 'Where to?', city: 'Paris', dates: 'Oct 12 – 14 · 2 guests', search: 'Search', cta: 'Book · €189', tabs: ['Explore', 'Stays', 'Status', 'Account'],
      hotels: [['Paris Centre', '★★★★ · 1.2 km', '€189'], ['Gare de Lyon', '★★★ · 2.4 km', '€142'], ['Montmartre', '★★★★ · 3.1 km', '€158'], ['La Défense', '★★★ · 6.8 km', '€121']],
      resultsTitle: 'Paris · Oct 12 – 14', filters: ['Price', 'Stars', 'Map'],
      confirmed: 'Booking confirmed', confirmSub: 'Paris Centre · Oct 12 – 14', confirmRows: ['2 guests · 2 nights', 'Total · €378'], calendar: 'Add to calendar',
      slack: ['Slack · QA bot', 'Your team: 2 failed tests'],
      statusTitle: 'Your status', tier: 'Silver', points: '2,450 pts', toNext: 'Gold next', webview: 'webview', benefits: ['Late check-out', 'Welcome drink', 'Room upgrade'],
      amenities: ['Wi-Fi', 'Breakfast', 'Spa'], night: '€189 / night' },
    fr: { where: 'Où allez-vous ?', city: 'Paris', dates: '12 – 14 oct. · 2 pers.', search: 'Chercher', cta: 'Réserver · 189 €', tabs: ['Explorer', 'Séjours', 'Statut', 'Compte'],
      hotels: [['Paris Centre', '★★★★ · 1,2 km', '189 €'], ['Gare de Lyon', '★★★ · 2,4 km', '142 €'], ['Montmartre', '★★★★ · 3,1 km', '158 €'], ['La Défense', '★★★ · 6,8 km', '121 €']],
      resultsTitle: 'Paris · 12 – 14 oct.', filters: ['Prix', 'Étoiles', 'Carte'],
      confirmed: 'Réservation confirmée', confirmSub: 'Paris Centre · 12 – 14 oct.', confirmRows: ['2 pers. · 2 nuits', 'Total · 378 €'], calendar: 'Ajouter au calendrier',
      slack: ['Slack · QA bot', 'Votre équipe : 2 tests en échec'],
      statusTitle: 'Votre statut', tier: 'Silver', points: '2 450 pts', toNext: 'prochain : Gold', webview: 'webview', benefits: ['Départ tardif', 'Boisson de bienvenue', 'Surclassement'],
      amenities: ['Wi-Fi', 'Petit-déj.', 'Spa'], night: '189 € / nuit' },
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

function missionCard(g, T) {
  label(g, T.mission, 48, 196, `700 24px ${SANS}`, '#fff');
  label(g, T.missionSub, 48, 226, `500 16px ${SANS}`, '#a4abb6');
  g.fillStyle = '#34343d'; rr(g, 48, 258, 330, 14, 7); g.fill();
  g.fillStyle = BETCLIC; rr(g, 48, 258, 220, 14, 7); g.fill();
  label(g, '2 / 3', 432, 271, `700 16px ${SANS}`, '#fff', 'right');
  [0, 1, 2].forEach((i) => { g.fillStyle = i < 2 ? BETCLIC : '#34343d'; g.beginPath(); g.arc(58 + i * 30, 302, 9, 0, Math.PI * 2); g.fill(); });
}
const thumb = (g, x, y, s, cols) => {   // a hotel photo: a two-tone gradient
  const gr = g.createLinearGradient(x, y, x + s, y + s); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
  g.fillStyle = gr; rr(g, x, y, s, s, 10); g.fill();
};
const PHOTOS = [['#8fb8de', '#d8c3a0'], ['#9fb1c9', '#e6d6b8'], ['#b9a3c9', '#e8cfa8'], ['#8ec1b8', '#d9d2b0']];
const title = (g, str, y = 176) => label(g, str, 24, y, `700 26px ${SANS}`, INK);

// Betclic's top bar (logo, balance) and Accor's (logo, avatar), on every screen of their app
function betclicTop(g, T) {
  if (LOGOS.betclic) g.drawImage(LOGOS.betclic, 24, 80, 117, 40);
  g.fillStyle = '#eef0f4'; rr(g, 330, 82, 126, 36, 18); g.fill();
  label(g, T.balance, 393, 106, `700 17px ${SANS}`, INK, 'center');
}
function accorTop(g) {
  if (LOGOS.accor) g.drawImage(LOGOS.accor, 24, 70, 65, 56);
  g.fillStyle = tint(ACCOR, 0.86); g.beginPath(); g.arc(424, 98, 22, 0, Math.PI * 2); g.fill();
}

// The app under test: per scenario (`style`), per screen (`screen`, "home" by default); everything above the test log.
// In a story, each achievement shows the screen of the app where it happened.
const APPS = {
  promo: {
    home(g) {   // the hero's: an abstract app
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
  },
  betting: {   // a sports betting app
    home(g, T) {   // tonight's match and its odds, the mission of the day, the leaderboard
      betclicTop(g, T);
      const c = R.card;
      g.fillStyle = '#16161c'; rr(g, c.x, c.y, c.w, c.h, c.r); g.fill();
      missionCard(g, T);
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
    missions(g, T) {   // the missions, their progress and their reward
      betclicTop(g, T); title(g, T.missionsTitle);
      T.missions.forEach(([name, done, of, reward], i) => {
        const r = MIS(i), c = MIS_CHIP(i); row(g, r);
        label(g, name, r.x + 20, r.y + 34, `700 18px ${SANS}`, INK);
        g.fillStyle = '#eef0f4'; rr(g, r.x + 20, r.y + 52, 230, 10, 5); g.fill();
        g.fillStyle = BETCLIC; rr(g, r.x + 20, r.y + 52, Math.max(10, 230 * done / of), 10, 5); g.fill();
        label(g, `${done} / ${of}`, r.x + 266, r.y + 62, `700 14px ${SANS}`, '#4a5563');
        g.fillStyle = '#fdecec'; rr(g, c.x, c.y, c.w, c.h, c.r); g.fill();
        label(g, reward, c.x + c.w / 2, c.y + 19, `700 13px ${SANS}`, BETCLIC, 'center');
      });
      tabBar(g, T.tabs, 2, BETCLIC);
    },
    leaderboard(g, T) {   // the week's leaderboard, the player's own row highlighted
      betclicTop(g, T); title(g, T.board);
      T.ranks.forEach((rank, i) => {
        const r = LB(i), me = i === T.ranks.length - 1;
        g.fillStyle = me ? '#fdecec' : '#fff'; rr(g, r.x, r.y, r.w, r.h, r.r); g.fill();
        g.strokeStyle = me ? BETCLIC : '#e3e7ed'; g.lineWidth = 2; g.stroke();
        label(g, rank, r.x + 22, r.y + 34, `800 17px ${SANS}`, i < 3 ? '#c99a06' : '#4a5563');
        g.fillStyle = me ? BETCLIC : ['#f5c518', '#c9d0da', '#d9a066', '#dfe3ea', '#dfe3ea'][i]; g.beginPath(); g.arc(r.x + 78, r.y + 27, 15, 0, Math.PI * 2); g.fill();
        if (me) label(g, T.you, r.x + 104, r.y + 33, `700 16px ${SANS}`, INK);
        else { g.fillStyle = '#c9d0da'; rr(g, r.x + 104, r.y + 21, 120 - i * 8, 12, 6); g.fill(); }
        label(g, T.pts[i], r.x + r.w - 18, r.y + 34, `700 15px ${SANS}`, me ? BETCLIC : INK, 'right');
      });
      tabBar(g, T.tabs, 2, BETCLIC);
    },
    betslip(g, T) {   // the bet slip over tonight's match: the pick, the boost offered at placing time, the button
      APPS.betting.home(g, T);
      g.fillStyle = 'rgba(10,12,16,.5)'; g.fillRect(0, 0, SW, SH);
      g.fillStyle = '#fff'; rr(g, SLIP.x, SLIP.y, SLIP.w, SLIP.h, [SLIP.r, SLIP.r, 0, 0]); g.fill();
      g.fillStyle = '#d6dbe3'; rr(g, SW / 2 - 24, SLIP.y + 10, 48, 5, 3); g.fill();
      label(g, T.slip, 24, SLIP.y + 50, `700 22px ${SANS}`, INK);
      const p = SLIP_PICK; row(g, p);
      label(g, T.pick, p.x + 18, p.y + 28, `700 16px ${SANS}`, INK);
      label(g, T.match, p.x + 18, p.y + 50, `500 14px ${SANS}`, '#8e97a3');
      label(g, T.odds[0], p.x + p.w - 18, p.y + 40, `800 18px ${SANS}`, INK, 'right');
      const b = SLIP_BOOST; g.fillStyle = '#fff7da'; rr(g, b.x, b.y, b.w, b.h, b.r); g.fill();
      label(g, `⚡ ${T.boost}`, b.x + 18, b.y + 31, `700 15px ${SANS}`, '#a07800');
      label(g, T.boosted, b.x + b.w - 18, b.y + 31, `700 15px ${SANS}`, '#a07800', 'right');
      const c = SLIP_CTA; g.fillStyle = BETCLIC; rr(g, c.x, c.y, c.w, c.h, c.r); g.fill();
      label(g, T.cta, SW / 2, c.y + 40, `700 21px ${SANS}`, '#fff', 'center');
    },
  },
  booking: {   // a hotel booking app
    home(g, T) {   // the search, two results with their price
      accorTop(g);
      const c = R.card; row(g, c);
      label(g, T.where, 48, 190, `700 22px ${SANS}`, ACCOR);
      g.fillStyle = '#f0f2f6'; rr(g, 48, 204, 392, 46, 12); g.fill();
      label(g, T.city, 64, 234, `700 18px ${SANS}`, INK);
      g.fillStyle = '#f0f2f6'; rr(g, 48, 262, 272, 48, 12); g.fill();
      label(g, T.dates, 64, 292, `500 15px ${SANS}`, '#4a5563');
      const s = SEARCH_BTN; g.fillStyle = ACCOR; rr(g, s.x, s.y, s.w, s.h, s.r); g.fill();
      label(g, T.search, s.x + s.w / 2, s.y + 30, `700 16px ${SANS}`, '#fff', 'center');
      [R.row1, R.row2].forEach((r, i) => {
        const [name, sub, price] = T.hotels[i]; row(g, r); thumb(g, r.x + 12, r.y + 10, 48, PHOTOS[i]);
        label(g, name, r.x + 74, r.y + 30, `700 17px ${SANS}`, INK);
        label(g, sub, r.x + 74, r.y + 52, `500 14px ${SANS}`, '#8e97a3');
        label(g, price, r.x + r.w - 16, r.y + 42, `700 19px ${SANS}`, ACCOR, 'right');
      });
      g.fillStyle = ACCOR; rr(g, R.cta.x, R.cta.y, R.cta.w, R.cta.h, R.cta.r); g.fill();
      label(g, T.cta, SW / 2, R.cta.y + 40, `700 21px ${SANS}`, '#fff', 'center');
      tabBar(g, T.tabs, 2, ACCOR);
    },
    results(g, T) {   // the search results: filters, four hotels
      accorTop(g); title(g, T.resultsTitle);
      T.filters.forEach((f, i) => { const r = FILTER(i); g.fillStyle = i === 0 ? ACCOR : '#eef0f4'; rr(g, r.x, r.y, r.w, r.h, r.r); g.fill(); label(g, f, r.x + r.w / 2, r.y + 23, `600 15px ${SANS}`, i === 0 ? '#fff' : INK, 'center'); });
      T.hotels.forEach(([name, sub, price], i) => {
        const r = HOT(i); row(g, r); thumb(g, r.x + 12, r.y + 11, 52, PHOTOS[i]);
        label(g, name, r.x + 78, r.y + 32, `700 17px ${SANS}`, INK);
        label(g, sub, r.x + 78, r.y + 54, `500 14px ${SANS}`, '#8e97a3');
        label(g, price, r.x + r.w - 16, r.y + 44, `700 19px ${SANS}`, ACCOR, 'right');
      });
      tabBar(g, T.tabs, 0, ACCOR);
    },
    confirm(g, T) {   // the booking confirmed, and the CI's Slack message that just came in over it
      accorTop(g);
      g.fillStyle = '#e3f6ea'; g.beginPath(); g.arc(240, 236, 52, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#1f9d55'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(216, 238); g.lineTo(234, 256); g.lineTo(266, 220); g.stroke(); g.lineCap = 'butt';
      label(g, T.confirmed, SW / 2, 332, `700 26px ${SANS}`, INK, 'center');
      label(g, T.confirmSub, SW / 2, 362, `500 16px ${SANS}`, '#4a5563', 'center');
      const c = CONF_CARD; row(g, c);
      T.confirmRows.forEach((t, i) => label(g, t, c.x + 20, c.y + 38 + i * 36, `${i ? 700 : 500} 17px ${SANS}`, i ? ACCOR : INK));
      const b = CONF_BTN; g.strokeStyle = ACCOR; g.lineWidth = 2; rr(g, b.x, b.y, b.w, b.h, b.r); g.stroke();
      label(g, T.calendar, SW / 2, b.y + 37, `700 18px ${SANS}`, ACCOR, 'center');
      const n = NOTIF; g.fillStyle = 'rgba(22,27,34,.94)'; rr(g, n.x, n.y, n.w, n.h, n.r); g.fill();
      [['#e01e5a', 0, 0], ['#36c5f0', 1, 0], ['#2eb67d', 0, 1], ['#ecb22e', 1, 1]].forEach(([col, dx, dy]) => { g.fillStyle = col; rr(g, n.x + 20 + dx * 17, n.y + 22 + dy * 17, 14, 14, 4); g.fill(); });
      label(g, T.slack[0], n.x + 70, n.y + 36, `700 15px ${SANS}`, '#fff');
      label(g, T.slack[1], n.x + 70, n.y + 60, `500 15px ${SANS}`, '#c3c9d2');
      tabBar(g, T.tabs, 1, ACCOR);
    },
    status(g, T) {   // the loyalty status, a webview behind the company's WAF
      accorTop(g);
      const c = STATUS_CARD, gr = g.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
      gr.addColorStop(0, '#9aa3b0'); gr.addColorStop(1, '#e4e8ee'); g.fillStyle = gr; rr(g, c.x, c.y, c.w, c.h, c.r); g.fill();
      label(g, T.statusTitle, c.x + 24, c.y + 40, `600 16px ${SANS}`, 'rgba(5,0,51,.7)');
      label(g, T.tier, c.x + 24, c.y + 86, `800 34px ${SANS}`, ACCOR);
      g.fillStyle = 'rgba(255,255,255,.55)'; rr(g, c.x + 24, c.y + 116, 300, 10, 5); g.fill();
      g.fillStyle = ACCOR; rr(g, c.x + 24, c.y + 116, 220, 10, 5); g.fill();
      label(g, `${T.points} · ${T.toNext}`, c.x + 24, c.y + 150, `600 14px ${SANS}`, 'rgba(5,0,51,.75)');
      g.fillStyle = 'rgba(5,0,51,.85)'; rr(g, c.x + c.w - 112, c.y + 20, 92, 26, 13); g.fill();
      label(g, `🔒 ${T.webview}`, c.x + c.w - 66, c.y + 38, `600 12px ${MONO}`, '#fff', 'center');
      T.benefits.forEach((t, i) => {
        const r = BENEFIT(i); row(g, r);
        g.fillStyle = tint(ACCOR, 0.88); g.beginPath(); g.arc(r.x + 28, r.y + r.h / 2, 11, 0, Math.PI * 2); g.fill();
        label(g, t, r.x + 52, r.y + 32, `600 16px ${SANS}`, INK);
      });
      tabBar(g, T.tabs, 2, ACCOR);
    },
    detail(g, T) {   // a hotel: its photos, its amenities, the button to book
      accorTop(g);
      const p = PHOTO, gr = g.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
      gr.addColorStop(0, PHOTOS[0][0]); gr.addColorStop(1, PHOTOS[0][1]); g.fillStyle = gr; rr(g, p.x, p.y, p.w, p.h, p.r); g.fill();
      [0, 1, 2, 3].forEach((i) => { g.fillStyle = i ? 'rgba(255,255,255,.55)' : '#fff'; g.beginPath(); g.arc(SW / 2 - 27 + i * 18, p.y + p.h - 18, 5, 0, Math.PI * 2); g.fill(); });
      const [name, sub] = T.hotels[0];
      label(g, name, 24, 370, `700 24px ${SANS}`, INK);
      label(g, sub, 24, 396, `500 15px ${SANS}`, '#8e97a3');
      T.amenities.forEach((a, i) => { const r = { x: 24 + i * 112, y: 414, w: 100, h: 32, r: 16 }; g.fillStyle = '#eef0f4'; rr(g, r.x, r.y, r.w, r.h, r.r); g.fill(); label(g, a, r.x + r.w / 2, r.y + 21, `600 14px ${SANS}`, INK, 'center'); });
      label(g, T.night, 24, 488, `700 20px ${SANS}`, ACCOR);
      g.fillStyle = ACCOR; rr(g, R.cta.x, R.cta.y, R.cta.w, R.cta.h, R.cta.r); g.fill();
      label(g, T.cta, SW / 2, R.cta.y + 40, `700 21px ${SANS}`, '#fff', 'center');
      tabBar(g, T.tabs, 0, ACCOR);
    },
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
  APPS[sc.style][sc.screen ?? 'home'](g, TEXT[sc.style]?.[lang()]);
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
  const tap = TAPS.has(STEPS[k].verb) && !!STEPS[k].rect, since = t - stepsEnd;   // since: time spent in the summary
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

const MARKS = { pass: ['✓', GREEN], fail: ['✗', RED], warn: ['~', AMBER], info: ['→', ACC] };
const toneOf = (sc, i) => sc.steps[i].tone ?? (i === sc.fail ? 'fail' : 'pass');
const said = (st) => (st.say ?? st.verb).padEnd(7) + st.loc;

// The test is drawn by the GPU over the still mock-up (screen-overlay.js): the frames and the tap ripples as shapes, the
// texts from an atlas drawn once per test. Nothing is uploaded while it plays (a repainted screen was one texture upload
// per frame, which Safari makes slow).
const ROW_X = 40, ROW_W = 436, ROW_H = 38, ROW_BASE = 28, LABEL_H = 28, GAP = 4;
const COLOR = { acc: ACC, green: GREEN, red: RED };
const FILL = { acc: 0.1, green: 0.12, red: 0.14 };   // the tint inside a frame
const rgba01 = (h, a) => [...rgbOf(h).map((c) => c / 255), a];

/** The texts of one test, drawn once: each step's log line (done, and current in grey), its locator's label in the
 *  frame's three colours, the cursor, the result. `cells`: where each one sits in the atlas (mock-up pixels). */
export function drawAtlas(sc = SCENARIOS.hero) {
  const STEPS = sc.steps, n = STEPS.length, cells = {};
  const m = document.createElement('canvas').getContext('2d'); m.font = `600 19px ${MONO}`;
  let h = 0;
  const cell = (id, w, ch) => { cells[id] = { x: 0, y: h, w, h: ch }; h += ch + GAP; };
  STEPS.forEach((st, i) => {
    cell(`done${i}`, ROW_W, ROW_H); cell(`cur${i}`, ROW_W, ROW_H);
    if (st.rect) for (const k in COLOR) cell(`label${i}${k}`, Math.ceil(m.measureText(st.loc).width) + 20, LABEL_H);
  });
  cell('caret', 28, ROW_H); cell('summary', ROW_W, ROW_H);
  const c = document.createElement('canvas'); c.width = Math.ceil(ROW_W * TS); c.height = Math.ceil(h * TS);
  const g = c.getContext('2d'); g.scale(TS, TS);
  const at = (id, draw) => { const { x, y } = cells[id]; g.save(); g.translate(x, y); draw(); g.restore(); };
  STEPS.forEach((st, i) => {
    const tone = toneOf(sc, i), [mark, col] = MARKS[tone];
    g.font = `500 20px ${MONO}`;
    at(`done${i}`, () => { g.fillStyle = col; g.fillText(mark, 44 - ROW_X, ROW_BASE); g.fillStyle = tone === 'fail' ? RED : '#d7dde6'; g.fillText(said(st), 74 - ROW_X, ROW_BASE); });
    at(`cur${i}`, () => { g.fillStyle = '#6b7480'; g.fillText(said(st), 74 - ROW_X, ROW_BASE); });
    if (st.rect) for (const k in COLOR) at(`label${i}${k}`, () => {
      g.fillStyle = COLOR[k]; rr(g, 0, 0, cells[`label${i}${k}`].w, LABEL_H, 8); g.fill();
      g.font = `600 19px ${MONO}`; g.fillStyle = '#16100c'; g.fillText(st.loc, 10, 20);
    });
  });
  at('caret', () => { g.font = `500 20px ${MONO}`; g.fillStyle = '#fff'; g.fillText('▸', 46 - ROW_X, ROW_BASE); });   // white: tinted when drawn
  at('summary', () => {
    const broke = sc.fail !== undefined, red = broke || sc.resultTone === 'fail';
    const result = sc.result ?? (broke ? 'FAILED · 404' : `PASSED ${n}/${n}`);
    g.font = `700 22px ${MONO}`; g.fillStyle = red ? RED : GREEN; g.fillText(result, 44 - ROW_X, ROW_BASE);
    const w = g.measureText(result).width;
    g.font = `500 18px ${MONO}`; g.fillStyle = '#8e97a3'; g.fillText(sc.note ?? (broke ? '· page not found' : '· 2 devices · 7.8 s'), 44 - ROW_X + w + 14, ROW_BASE);
  });
  return { canvas: c, cells, w: ROW_W, h };
}

/** What the test shows at time t (s), in drawing order: shapes ({ box, fill, line, lineW, alpha }: a rounded rectangle,
 *  colours as [r, g, b, a] from 0 to 1) and atlas cells ({ cell, x, y, alpha, tint }), in mock-up pixels. */
export function screenList(t, sc, cells) {
  const STEPS = sc.steps, s = phase(t, STEPS), step = STEPS[s.k], n = STEPS.length, list = [];
  // the selection frame on an element, with its locator above it
  const frame = (i, r, k, alpha) => {
    list.push({ box: { x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12, r: r.r + 6 }, fill: rgba01(COLOR[k], FILL[k]), line: rgba01(COLOR[k], 1), lineW: 4, alpha });
    const c = cells[`label${i}${k}`];
    list.push({ cell: c, x: Math.min(r.x - 6, SW - 8 - c.w), y: r.y - 6 - 34, alpha });
  };
  // `keep`: the elements already visited stay framed
  if (sc.keep) for (let i = 0; i < (s.inSteps ? s.k : n); i++) if (STEPS[i].rect) frame(i, STEPS[i].rect, 'green', 1);
  // the selection frame slides to the target element (or fades in, after a step off screen), then taps or asserts
  if (s.frame > 0 && step.rect) {
    const prev = s.k > 0 ? STEPS[s.k - 1].rect : null;
    const r = mix(prev || step.rect, step.rect, s.slide);
    const alpha = !prev && s.inSteps ? Math.min(1, s.p / FADE_IN) : s.frame;
    const tap = TAPS.has(step.verb), failed = toneOf(sc, s.k) === 'fail' && (s.checked || (tap && s.p > CHECKED));
    frame(s.k, r, failed ? 'red' : s.checked ? 'green' : 'acc', alpha);
    if (s.ripple >= 0) {
      const q = s.ripple;
      const cx = step.verb === 'swipe' ? r.x + r.w * (0.78 - 0.5 * ease(q)) : r.x + r.w / 2, cy = r.y + r.h / 2;
      const dot = (rad, a) => list.push({ box: { x: cx - rad, y: cy - rad, w: 2 * rad, h: 2 * rad, r: rad }, fill: rgba01(ACC, a), alpha: 1 });
      dot(12 + q * 44, 0.35 * (1 - q)); dot(11, 0.9 * (1 - q * 0.6));
    }
  }
  // the log: one line per step done, marked by its outcome; the current step in grey
  for (let i = 0; i < s.done; i++) list.push({ cell: cells[`done${i}`], x: ROW_X, y: LOG_Y + i * LOG_DY - ROW_BASE, alpha: i === s.done - 1 ? s.lineIn : 1 });
  if (s.cursor) {
    const y = LOG_Y + s.k * LOG_DY - ROW_BASE;
    list.push({ cell: cells.caret, x: ROW_X, y, alpha: 1, tint: rgba01(s.blink ? ACC : '#6b7480', 1) });
    list.push({ cell: cells[`cur${s.k}`], x: ROW_X, y, alpha: 1 });
  }
  if (!s.inSteps) list.push({ cell: cells.summary, x: ROW_X, y: SUM_Y - ROW_BASE, alpha: s.summary });
  return list;
}

/** Progress of the tap on screen at time t (0 → 1), or -1 when nothing is being tapped: the sound of the taps. */
export const rippleAt = (t, sc = SCENARIOS.hero) => phase(t, sc.steps).ripple;

