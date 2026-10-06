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

const canvas=$('canvas'),ctx=canvas.getContext('2d'),W=420,H=560,R=13,GAP=160,PW=58;
let bird,pipes=[],score=0,clock=0,elapsed=0,record=best('flappy-bird');
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);draw()}
function hud(){$('stat0').textContent=score;$('stat1').textContent=record;$('stat2').textContent=Math.floor(elapsed)+'s'}
function reset(){bird={x:110,y:255,v:0};pipes=[];score=clock=elapsed=0;hud();setState('ready','Find your rhythm','A little bird. A big sky. Tap to stay airborne.');draw()}
function start(){if(state==='over')reset();last=performance.now();setState('playing');bird.v=-285;canvas.focus()}
function flap(){if(state==='ready'||state==='over')start();else if(state==='playing')bird.v=-285;else if(state==='paused')pause()}
function collision(p){const x=clamp(bird.x,p.x,p.x+PW);for(const [top,bottom] of [[0,p.y-GAP/2],[p.y+GAP/2,H]]){const y=clamp(bird.y,top,bottom);if((bird.x-x)**2+(bird.y-y)**2<R*R)return true}return false}
function step(dt){elapsed+=dt;clock+=dt;bird.v+=820*dt;bird.y+=bird.v*dt;if(clock>=1.55){clock-=1.55;pipes.push({x:W+5,y:155+Math.random()*230,passed:false})}for(const p of pipes){p.x-=(135+Math.min(score*2,40))*dt;if(!p.passed&&p.x+PW<bird.x-R){p.passed=true;score++;record=best('flappy-bird',score);hud()}}pipes=pipes.filter(p=>p.x+PW>0);if(bird.y<R||bird.y>H-25-R||pipes.some(collision)){record=best('flappy-bird',score);hud();setState('over','A fine flight',score+' gates passed. Take another run.')}if(Math.floor(elapsed)!==Math.floor(elapsed-dt))hud()}
function draw(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#182b3b');g.addColorStop(1,'#40646b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle='#f2dca2';ctx.beginPath();ctx.arc(326,98,32,0,Math.PI*2);ctx.fill();for(let j=0;j<2;j++){ctx.fillStyle=j?'#284b53':'#34545b';ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W;x+=20)ctx.lineTo(x,400+j*55+Math.sin(x/67+j*2)*29);ctx.lineTo(W,H);ctx.fill()}for(const p of pipes){for(const [y,h] of [[0,p.y-GAP/2],[p.y+GAP/2,H-p.y-GAP/2]]){ctx.fillStyle='#18353d';ctx.fillRect(p.x,y,PW,h);ctx.fillStyle='#77b5a2';ctx.fillRect(p.x,y,6,h);ctx.fillStyle='#a2d0ac';ctx.fillRect(p.x-4,y===0?h-12:y,PW+8,12)}}ctx.fillStyle='#122e33';ctx.fillRect(0,H-25,W,25);ctx.fillStyle='#91b49b';ctx.fillRect(0,H-25,W,3);ctx.save();ctx.translate(bird.x,bird.y);ctx.rotate(clamp(bird.v/700,-.45,.9));ctx.fillStyle='#facd77';ctx.beginPath();ctx.ellipse(0,0,17,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#db975b';ctx.beginPath();ctx.ellipse(-5,4,9,5,-.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f59a64';ctx.beginPath();ctx.moveTo(13,-1);ctx.lineTo(25,4);ctx.lineTo(13,7);ctx.fill();ctx.fillStyle='#101114';ctx.beginPath();ctx.arc(7,-5,2.7,0,Math.PI*2);ctx.fill();ctx.restore()}
function loop(t){let dt=Math.min((t-last)/1000,.05);last=t;while(state==='playing'&&dt>0){const s=Math.min(dt,1/120);step(s);dt-=s}draw();requestAnimationFrame(loop)}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();flap()});document.addEventListener('keydown',e=>{if(commonKey(e))return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)flap()}});
new ResizeObserver(resize).observe(canvas);reset();resize();requestAnimationFrame(loop);announce();


