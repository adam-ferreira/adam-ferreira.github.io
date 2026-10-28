// The Lab page: each experiment starts once it comes near the screen (computer: when the browser is idle after load;
// phone: on the first gesture), and replaces its poster. Without WebGL the posters stay, and the "new problem" button
// stays hidden: it would have nothing to change.
import { webglOk, bootLazily, whenNear } from '../3d/common.js';
import { POSTER_SEED, formatSeed, randomSeed } from './boulder-problem.js';

function boulder() {
  const stage = document.querySelector('.lab-boulder'), canvas = stage?.querySelector('canvas');
  const text = document.querySelector('.lab-problem'), button = document.querySelector('.lab-new');
  if (!canvas || !text || !button) return;
  // ?problem=0412: a problem shared by its number
  const asked = parseInt(new URLSearchParams(location.search).get('problem') ?? '', 10);
  const seed = asked >= 1 && asked <= 9999 ? asked : POSTER_SEED;
  const describe = (p) => {
    text.textContent = text.dataset.template.replace('{seed}', formatSeed(p.seed)).replace('{moves}', p.moves).replace('{grade}', p.grade);
  };
  whenNear(stage, async () => {
    const { mount } = await import('./boulder.js');
    const lab = await mount(canvas, { seed, pop: seed !== POSTER_SEED, onProblem: describe });
    button.hidden = false;
    button.addEventListener('click', () => {
      const n = randomSeed();
      lab.show(n);
      history.replaceState(null, '', `?problem=${formatSeed(n)}#boulder`);
    });
  }, '50% 0px');
}

function ripples() {
  const stage = document.querySelector('.lab-ripples'), canvas = stage?.querySelector('canvas');
  if (!canvas) return;
  whenNear(stage, async () => (await import('./ripples.js')).mount(canvas), '50% 0px');
}

// on a phone, the first gesture only: the posters already show the first frame, and a phone's GPU and battery are
// spent once the visitor engages (measured on 2026-10-28: starting at 5 s cost the page 3.2 s of blocking time in Lighthouse)
if (webglOk()) bootLazily(() => { boulder(); ripples(); }, 1500, 300, 0);
