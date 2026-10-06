import {best} from '../../shared/storage.js';
const $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let state='ready', last=0;
function setState(next,title='',detail=''){state=next;document.body.dataset.state=next;$('overlay').hidden=next==='playing';$('pauseBtn').disabled=next==='ready'||next==='over';$('pauseBtn').textContent=next==='paused'?'Resume':'Pause';$('message').textContent=title;$('detail').textContent=detail;$('startBtn').textContent=next==='paused'?'Resume':next==='over'?'Play again':"Let's play";parent.postMessage({type:'arcade:state',state:next},location.origin)}
function pause(){if(state==='playing')setState('paused','Take a breather','Your game is waiting.');else if(state==='paused'){last=performance.now();setState('playing')}}
$('pauseBtn').onclick=pause;$('restartBtn').onclick=reset;$('startBtn').onclick=()=>{if(state==='paused')pause();else start()};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
window.addEventListener('blur',()=>{if(state==='playing')pause()});
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='arcade:command')return;if(e.data.command==='restart')reset();if(e.data.command==='pause'&&state==='playing')pause()});
function commonKey(e){if(e.code==='KeyP'&&!e.repeat){e.preventDefault();pause();return true}if(e.code==='KeyR'&&!e.repeat){e.preventDefault();reset();return true}return !!e.target.closest('button')}
function announce(){parent.postMessage({type:'arcade:ready'},location.origin)}

const holes=[...document.querySelectorAll('.hole')];let score=0,remaining=30,mole=-1,clock=0,record=best('whack-a-mole'),hitTimes=new Map();
function hud(){$('stat0').textContent=score;$('stat1').textContent=record;$('stat2').textContent=Math.ceil(remaining)+'s'}
function pick(){const previous=mole;do{mole=Math.floor(Math.random()*9)}while(mole===previous);holes.forEach((h,i)=>{h.classList.toggle('active',i===mole);h.setAttribute('aria-label','Hole '+(i+1)+(i===mole?' — mole visible':''))});clock=0}
function reset(){score=0;remaining=30;mole=-1;clock=0;hitTimes.clear();holes.forEach(h=>h.classList.remove('active','hit'));hud();setState('ready','Quick hands. Big score.','30 seconds. Nine holes. Catch every little troublemaker.')}
function start(){if(state==='over')reset();last=performance.now();setState('playing');pick();document.activeElement.blur()}
function hit(i){if(state!=='playing'||mole!==i)return;score++;record=best('whack-a-mole',score);hud();holes[i].classList.add('hit');hitTimes.set(i,performance.now()+240);pick()}
holes.forEach((h,i)=>{h.addEventListener('pointerdown',e=>{e.preventDefault();hit(i)});h.addEventListener('click',e=>{if(e.detail===0)hit(i)})});
document.addEventListener('keydown',e=>{if(e.code.startsWith('Digit')&&!e.repeat&&state==='playing'){const i=Number(e.code.slice(5))-1;if(i>=0&&i<9){e.preventDefault();hit(i);return}}if(commonKey(e))return;if(e.code==='Space'&&!e.repeat){e.preventDefault();if(state==='ready'||state==='over')start();else pause()}});
function loop(t){const dt=Math.min((t-last)/1000,.05);last=t;for(const [i,end] of hitTimes){if(t>=end){holes[i].classList.remove('hit');hitTimes.delete(i)}}if(state==='playing'){const seconds=Math.ceil(remaining);remaining=Math.max(0,remaining-dt);clock+=dt;if(clock>=Math.max(.42,.85-score*.006))pick();if(seconds!==Math.ceil(remaining))hud();if(remaining===0){mole=-1;holes.forEach(h=>h.classList.remove('active'));setState('over',"Time's up!",score+' moles caught. Your best is '+record+'.')}}requestAnimationFrame(loop)}
reset();requestAnimationFrame(loop);announce();



