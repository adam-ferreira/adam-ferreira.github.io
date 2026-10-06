// Phone (everything but stage mode; the stylesheet keeps both features to narrow screens):
// - the achievements of an experience with a demo are cards the thumb swipes through (Job.css): the dots under them say
//   which one is in view, and a tap on a dot brings its card;
// - the contact bar at the bottom of the screen (PhoneBar.astro): it shows once the hero's name has left the screen
//   (body.name-away, set by scroll.js) and hides while the footer, which has the contact details, is on screen; its share
//   button opens the system share sheet, or copies the page's address where there is none.
import { REDUCED_MOTION, matches } from '../media.js';

const PHONE = '(max-width: 700px)';   // the same breakpoint as Job.css and PhoneBar.css

if (!document.documentElement.classList.contains('stage')) {
  // ---------- the swipeable achievements ----------
  document.querySelectorAll('.job-demo .story-steps').forEach((list) => {
    const steps = [...list.children];
    if (steps.length < 2) return;
    const dots = document.createElement('div');
    dots.className = 'swipe-dots'; dots.setAttribute('aria-hidden', 'true');   // the list stays readable as a list: the dots are a shortcut for the eye and the thumb
    const btns = steps.map((s) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swipe-dot'; b.tabIndex = -1;
      b.addEventListener('click', () => s.scrollIntoView({ inline: 'start', block: 'nearest', behavior: matches(REDUCED_MOTION) ? 'auto' : 'smooth' }));
      dots.appendChild(b); return b;
    });
    list.after(dots);
    const setCurrent = (i) => btns.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    setCurrent(0);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) setCurrent(steps.indexOf(en.target)); });
      }, { root: list, threshold: 0.6 });
      steps.forEach((s) => io.observe(s));
    }
    // reachable with the keyboard on a phone (the arrows then scroll the cards); elsewhere the list does not scroll
    const syncFocus = () => { if (matches(PHONE)) { list.tabIndex = 0; list.setAttribute('aria-label', list.dataset.label ?? ''); } else { list.removeAttribute('tabindex'); list.removeAttribute('aria-label'); } };
    syncFocus(); window.matchMedia(PHONE).addEventListener('change', syncFocus);
  });

  // ---------- the contact bar ----------
  const footer = document.querySelector('.site-footer');
  if (footer && 'IntersectionObserver' in window) {
    new IntersectionObserver((en) => document.body.classList.toggle('footer-in', en[0].isIntersecting)).observe(footer);
  }
  const share = document.querySelector('.phone-bar-share');
  if (share) {
    const label = share.querySelector('.phone-bar-share-label');
    const text = label?.textContent ?? '';
    share.addEventListener('click', async () => {
      const url = location.origin + location.pathname;   // the page itself, without the hash or the query
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url }); } catch { /* the visitor closed the sheet */ }
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        if (label) { label.textContent = share.dataset.copied ?? text; setTimeout(() => { label.textContent = text; }, 1800); }
      } catch { /* no clipboard either: nothing to do */ }
    });
  }
}
