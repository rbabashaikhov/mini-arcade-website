import { get, set } from './shared/storage.js';
const $ = id => document.getElementById(id);
let games = [], filter = 'all', active = null, timeout, launchId = 0;
const frame = $('gameFrame');
function theme(mode) { document.body.dataset.theme = mode; set('theme', mode); $('themeToggle').setAttribute('aria-label', `Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`); }
theme(get('theme', 'dark') === 'light' ? 'light' : 'dark');
$('themeToggle').onclick = () => theme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
function render() {
  const query = $('searchInput').value.trim().toLowerCase();
  const list = games.filter(g => (filter === 'all' || g.category === filter) && `${g.title} ${g.description} ${g.tags.join(' ')}`.toLowerCase().includes(query));
  $('gamesCount').textContent = String(list.length).padStart(2, '0');
  $('cardsGrid').replaceChildren(...list.map(g => {
    const button = document.createElement('button'); button.className = 'game-card'; button.dataset.slug = g.slug; button.style.setProperty('--game-accent', g.accent); button.setAttribute('aria-label', `Play ${g.title}`);
    button.innerHTML = `<div class="card-art"><img src="assets/thumbs/${g.slug}.svg" alt="" loading="lazy"><span class="card-number">${String(games.indexOf(g)+1).padStart(2,'0')} / ARCADE LAB</span><span class="card-play">↗</span></div><div class="card-info"><div class="card-topline"><h3>${g.title}</h3><span>${g.category}</span></div><p>${g.description}</p><div class="card-meta"><span>${g.difficulty}</span><span>${g.inputLabel}</span></div></div>`;
    button.onclick = () => launch(g.slug); return button;
  }));
  $('emptyState').hidden = list.length !== 0;
}
function command(value) { frame.contentWindow?.postMessage({type:'arcade:command', command:value}, location.origin); }
function library() { command('pause'); $('playView').hidden = true; $('libraryView').hidden = false; clearTimeout(timeout); history.replaceState(null, '', location.pathname); window.scrollTo(0,0); }
async function launch(slug) {
  const game = games.find(g => g.slug === slug); if (!game) return;
  const id = ++launchId; active = game; set('last-game', slug);
  $('libraryView').hidden = true; $('playView').hidden = false;
  $('nowPlayingTitle').textContent = game.title; $('gameDescription').textContent = game.description;
  $('gameCategory').textContent = `${game.category.toUpperCase()} / ${game.difficulty.toUpperCase()}`;
  $('controlsHint').textContent = game.controls; $('openBtn').href = game.path;
  frame.title = `${game.title} — Arcade Lab`; $('iframeLoader').hidden = false; $('retryBtn').hidden = true;
  $('loadMessage').textContent = 'Warming up the arcade…'; $('playStatus').textContent = 'LOADING';
  history.replaceState(null, '', `#play/${slug}`); window.scrollTo(0,0); clearTimeout(timeout);
  timeout = setTimeout(() => fail(id), 10000);
  try { const response = await fetch(game.path, {method:'HEAD'}); if (!response.ok) throw Error('Unavailable'); if (id !== launchId) return; frame.src = game.path; }
  catch { fail(id); }
}
function fail(id) { if(id !== launchId) return; clearTimeout(timeout); $('iframeLoader').hidden = false; $('loadMessage').textContent = 'This game could not load. Give it another try.'; $('retryBtn').hidden = false; $('playStatus').textContent = 'UNAVAILABLE'; }
window.addEventListener('message', event => {
  if(event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if(event.data?.type === 'arcade:ready') { clearTimeout(timeout); $('iframeLoader').hidden = true; $('playStatus').textContent = 'READY WHEN YOU ARE'; }
  if(event.data?.type === 'arcade:state') $('playStatus').textContent = ({ready:'READY WHEN YOU ARE',playing:'IN THE ZONE',paused:'TAKE YOUR TIME',over:'ONE MORE ROUND?'})[event.data.state] || '';
});
$('restartBtn').onclick = () => { command('restart'); frame.focus(); };
$('retryBtn').onclick = () => launch(active.slug);
$('backBtn').onclick = () => { library(); document.querySelector(`[data-slug="${active?.slug}"]`)?.focus({preventScroll:true}); };
$('libraryBtn').onclick = library;
document.querySelector('.brand').onclick = e => { e.preventDefault(); library(); };
$('fullscreenBtn').onclick = async () => {
  try { if(document.fullscreenElement) await document.exitFullscreen(); else await $('playArea').requestFullscreen(); frame.focus(); }
  catch { $('playStatus').textContent = 'Fullscreen unavailable — try Open in new tab ↗'; }
};
document.addEventListener('fullscreenchange', () => { $('fullscreenBtn').innerHTML = document.fullscreenElement ? '⛶ <span>Exit fullscreen</span>' : '⛶ <span>Fullscreen</span>'; });
$('searchInput').oninput = render;
document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed',String(b===button)); }); render(); });
$('clearSearch').onclick = () => { $('searchInput').value=''; document.querySelector('[data-filter="all"]').click(); };
$('featureBtn').onclick = () => launch('tetris');
$('surpriseBtn').onclick = () => launch(games[Math.floor(Math.random()*games.length)]?.slug);
try {
  const response = await fetch('games.json'); if(!response.ok) throw Error('Library unavailable'); games=await response.json(); render();
  const saved=get('last-game'); if(games.some(g=>g.slug===saved)) { const g=games.find(g=>g.slug===saved); $('surpriseBtn').innerHTML=`Continue ${g.title} <span>↗</span>`; $('surpriseBtn').onclick=()=>launch(saved); }
  const route=location.hash.match(/^#play\/(.+)$/); if(route) { if(games.some(g=>g.slug===route[1])) launch(route[1]); else $('libraryStatus').textContent='That game is unavailable. Choose another from the collection.'; }
} catch { $('libraryStatus').textContent='The library could not load. Reload the page to try again.'; $('surpriseBtn').disabled=true; }
