// Barre du haut (Topbar.astro) : le logo recharge la page, en repartant du haut (et en gardant ?fps s'il y est).
var brand = document.querySelector('a.brand');
if (brand) brand.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault();
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  location.replace(location.pathname + location.search);
});
