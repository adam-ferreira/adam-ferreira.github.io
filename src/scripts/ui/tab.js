// While the visitor is on another tab, its title says the tests are still running (content: ui.tab_away).
const away = document.body.dataset.tabAway, title = document.title;
if (away) document.addEventListener('visibilitychange', () => { document.title = document.hidden ? away : title; });
