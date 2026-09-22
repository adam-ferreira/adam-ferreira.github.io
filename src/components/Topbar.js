// Top bar (Topbar.astro): the logo reloads the page, starting again from the top (and keeping ?fps if present).
document.querySelector('a.brand')?.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault();
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  location.replace(location.pathname + location.search);
});
