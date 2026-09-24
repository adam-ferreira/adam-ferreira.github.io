// Stage mode: an experience with a demo tells its achievements one at a time, next to the phones. The wheel and the arrow
// keys go to the next achievement before the next screen (stage.js asks here first); the rail lists them, the cue under
// them says what scrolling does ("Scroll" until the visitor has moved a story once, "Next: …" on the last
// achievement), and the phones play each one's test (hero.js reads data-step on the device anchor).
// Without stage mode nothing happens here: the achievements stay a list.
const stories = new Map();   // slide → its story

function show(st, i, quiet) {
  if (i === st.cur && !quiet) return false;
  st.steps.forEach((s, k) => {
    s.classList.toggle('is-current', k === i); s.classList.toggle('is-before', k < i); s.classList.toggle('is-after', k > i);
    s.inert = k !== i; s.tabIndex = k === i ? 0 : -1;
  });
  st.tabs.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
  st.root.dataset.at = i === st.steps.length - 1 ? 'last' : i === 0 ? 'first' : 'middle';
  st.cur = i;
  if (st.anchor) st.anchor.dataset.step = String(i);
  if (!quiet) {
    document.documentElement.classList.add('story-learned');   // the visitor knows scrolling moves the story: no more "Scroll"
    window.dispatchEvent(new CustomEvent('cv:sound', { detail: { name: 'tick' } }));   // sound.js, if the sound is on
  }
  return true;
}

function build(slide) {
  const list = slide.querySelector('.story-steps');
  if (!list) return;
  const steps = [...list.children];
  const rail = document.createElement('div');
  rail.className = 'story-rail reveal'; rail.setAttribute('role', 'tablist'); rail.setAttribute('aria-label', list.dataset.label ?? '');
  list.setAttribute('role', 'none');   // the items become tab panels
  const st = { root: slide.querySelector('.story'), steps, tabs: [], anchor: slide.querySelector('.device-anchor'), cur: 0 };
  st.tabs = steps.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'story-tab'; b.id = `${s.id}-tab`; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', s.id);
    b.setAttribute('aria-label', `${i + 1} ${s.querySelector('.story-title')?.textContent ?? ''}`);
    b.addEventListener('click', () => show(st, i));
    s.setAttribute('role', 'tabpanel'); s.setAttribute('aria-labelledby', b.id);
    rail.appendChild(b); return b;
  });
  // the tabs pattern: arrows move along the rail (the stage's own keys must not see them)
  rail.addEventListener('keydown', (e) => {
    const n = steps.length, k = { ArrowRight: st.cur + 1, ArrowLeft: st.cur - 1, Home: 0, End: n - 1 }[e.key];
    if (k === undefined) return;
    e.preventDefault(); e.stopPropagation();
    show(st, (k + n) % n); st.tabs[st.cur].focus();
  });
  list.before(rail);   // under the story's kicker, over its achievements
  stories.set(slide, st);
  show(st, 0, true);
}

/** Can the story of this screen move in this direction (1: forward, -1: back)? */
export const canStep = (slide, dir) => { const st = stories.get(slide); return !!st && st.cur + dir >= 0 && st.cur + dir < st.steps.length; };
/** Moves the story of this screen one achievement; false when there is none to go to (the stage moves on). */
export const step = (slide, dir) => canStep(slide, dir) && show(stories.get(slide), stories.get(slide).cur + dir);
/** A screen arrives: its story starts at the first achievement, or at the last one when coming back from below. */
export function enter(slide, back) {
  const st = stories.get(slide);
  if (st) show(st, back ? st.steps.length - 1 : 0, true);
}

if (document.documentElement.classList.contains('stage')) document.querySelectorAll('.job-demo').forEach(build);
