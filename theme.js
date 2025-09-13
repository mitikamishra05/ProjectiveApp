// Theme toggle with persistence
(function(){
  const key = 'app-theme';
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const saved = localStorage.getItem(key);
  const theme = saved || (prefersLight ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);

  function setTheme(next){
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(key, next);
  }

  window.Theme = {
    current: () => document.documentElement.getAttribute('data-theme') || 'dark',
    toggle: () => setTheme(Theme.current()==='dark' ? 'light' : 'dark'),
    set: setTheme,
  };
})();

