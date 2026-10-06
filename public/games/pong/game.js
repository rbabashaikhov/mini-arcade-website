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

const canvas=$('canvas'),ctx=canvas.getContext('2d'),W=800,H=500,keys=new Set();
let py=200,ay=200,ball,score=0,cpu=0,serveTime=0,reaction=0,target=250,record=best('pong');
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);draw()}
function hud(){$('stat0').textContent=score;$('stat1').textContent=cpu;$('stat2').textContent=record}
function serve(direction=1){ball={x:400,y:250,vx:direction*330,vy:(Math.random()-.5)*200};py=ay=200;serveTime=.8}
function reset(){score=cpu=0;keys.clear();serve();hud();setState('ready','Meet your match','First to 7. Angle your shots with the paddle edges.');draw()}
function start(){if(state==='over')reset();last=performance.now();setState('playing');canvas.focus()}
function point(player){if(player){score++;record=best('pong',score)}else cpu++;hud();if(score===7||cpu===7){setState('over',score===7?'You take the match':'One more match?',score+' — '+cpu+' · First to seven.')}else serve(player?1:-1)}
function step(dt){if(keys.has('ArrowUp')||keys.has('KeyW'))py-=470*dt;if(keys.has('ArrowDown')||keys.has('KeyS'))py+=470*dt;py=clamp(py,8,H-98);reaction-=dt;if(reaction<=0){target=ball.vx>0?ball.y:250;reaction=.14}ay=clamp(ay+clamp(target-ay-45,-280*dt,280*dt),8,H-98);if(serveTime>0){serveTime-=dt;return}
ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;if(ball.y<8){ball.y=8;ball.vy=Math.abs(ball.vy)}if(ball.y>H-8){ball.y=H-8;ball.vy=-Math.abs(ball.vy)}
for(const p of [{x:30,y:py,dir:1},{x:758,y:ay,dir:-1}]){if(ball.vx*p.dir<0&&ball.x+8>=p.x&&ball.x-8<=p.x+12&&ball.y+8>=p.y&&ball.y-8<=p.y+90){const angle=clamp((ball.y-p.y-45)/45,-1,1)*1.05,speed=Math.min(650,Math.hypot(ball.vx,ball.vy)+22);ball.vx=p.dir*Math.cos(angle)*speed;ball.vy=Math.sin(angle)*speed;ball.x=p.dir===1?p.x+20:p.x-8}}
if(ball.x< -12)point(false);else if(ball.x>W+12)point(true)}
function draw(){ctx.fillStyle='#14171d';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#343941';ctx.lineWidth=2;ctx.setLineDash([7,13]);ctx.beginPath();ctx.moveTo(400,18);ctx.lineTo(400,482);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#232832';ctx.strokeRect(12,12,776,476);ctx.fillStyle='#87cfff';ctx.fillRect(30,py,12,90);ctx.fillStyle='#f4f1e9';ctx.fillRect(758,ay,12,90);ctx.beginPath();ctx.arc(ball.x,ball.y,8,0,Math.PI*2);ctx.fill();if(serveTime>0&&state==='playing'){ctx.font='700 16px system-ui';ctx.textAlign='center';ctx.fillStyle='#a4a5ad';ctx.fillText('GET READY',400,310)}}
function loop(t){let dt=Math.min((t-last)/1000,.05);last=t;if(state==='playing'){while(dt>0&&state==='playing'){const stepTime=Math.min(dt,1/240);step(stepTime);dt-=stepTime}}draw();requestAnimationFrame(loop)}
document.addEventListener('keydown',e=>{if(commonKey(e))return;if(['ArrowUp','ArrowDown','KeyW','KeyS','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat){if(state==='ready'||state==='over')start();else if(state==='paused')pause()}}});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
function move(e){if(state!=='playing')return;const r=canvas.getBoundingClientRect();py=clamp((e.clientY-r.top)*H/r.height-45,8,H-98)}
canvas.addEventListener('pointerdown',e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);move(e)});canvas.addEventListener('pointermove',move);
new ResizeObserver(resize).observe(canvas);reset();resize();requestAnimationFrame(loop);announce();


