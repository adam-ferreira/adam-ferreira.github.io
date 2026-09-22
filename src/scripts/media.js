// The media queries shared by the page's scripts, written once. They must match the stylesheet, which cannot read them:
// CSS has no variables in media queries. The breakpoints used there are 1100 x 680 (stage.css, screens.css, Job.css),
// 861/860 px (Hero.css, smooth scrolling), 640 px and 560 px (phones).
// Only constants and pure functions here: BaseHead.astro imports STAGE at build time to write it into the boot script,
// which runs before the first paint and cannot import anything.

/** Computer with a mouse and a window large enough: stage mode (one screen at a time). */
export const STAGE = '(min-width: 1100px) and (min-height: 680px) and (hover: hover) and (pointer: fine)';
/** Large enough with a mouse: the 3D starts without waiting for a gesture, and the scrolling is smoothed. */
export const DESKTOP = '(min-width: 861px) and (hover: hover) and (pointer: fine)';
export const MOUSE = '(hover: hover) and (pointer: fine)';
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const DARK = '(prefers-color-scheme: dark)';

export const matches = (q) => window.matchMedia(q).matches;
