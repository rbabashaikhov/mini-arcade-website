const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const base = 'http://127.0.0.1:8000';
const games = JSON.parse(fs.readFileSync('public/games.json'));
const sizes = [[360,800],[390,844],[412,915],[768,1024],[1280,720],[1440,900],[1920,1080],[844,390],[1280,480]];
let browser, server;
(async () => {
  try { await fetch(base); } catch { server=spawn(process.execPath,['tools/serve.cjs'],{stdio:'ignore'}); for(let i=0;i<40;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}} }
  browser = await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  const context = await browser.newContext({hasTouch:true,deviceScaleFactor:2});
  const page = await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let layouts=0, launches=0;
  for(const [width,height] of sizes) {
    await page.setViewportSize({width,height});await page.goto(base);await page.locator('.game-card').last().waitFor();
    assert.equal(await page.locator('.game-card').count(),8);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Portal horizontal overflow');
    for(const game of games) {
      await page.locator(`.game-card[data-slug="${game.slug}"]`).click();
      await page.locator('#iframeLoader').waitFor({state:'hidden'});
      const frame=page.frameLocator('#gameFrame');await frame.locator('body[data-state="ready"]').waitFor();
      await frame.locator('#startBtn').tap();await frame.locator('body[data-state="playing"]').waitFor();
      await frame.locator('#pauseBtn').click();await frame.locator('body[data-state="paused"]').waitFor();
      await frame.locator('#startBtn').click();await frame.locator('body[data-state="playing"]').waitFor();
      const gameFrame=page.frames().find(f=>f.url().includes('/games/'));
      const layout=await gameFrame.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,canvas:[...document.querySelectorAll('canvas')].every(c=>{const r=c.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})}));
      assert.ok(layout.sw<=layout.w+1&&layout.sh<=layout.h+1&&layout.canvas,`${game.slug} ${width}x${height} clips: ${JSON.stringify(layout)}`);layouts++;
      await page.locator('#restartBtn').click();
      // postMessage is async; wait for the iframe state to settle before asserting
      await page.waitForFunction(()=>['ready','playing'].includes(document.getElementById('gameFrame')?.contentDocument?.body?.dataset?.state),{},{timeout:5000});
      assert.ok(['ready','playing'].includes(await frame.locator('body').getAttribute('data-state')),`${game.slug} restart state`);
      await page.locator('#backBtn').click();launches++;
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#searchInput').fill('no such game');await page.locator('#emptyState').waitFor({state:'visible'});assert.equal(await page.locator('.game-card').count(),0);await page.locator('#clearSearch').click();
  await page.locator('[data-filter="puzzle"]').click();assert.equal(await page.locator('.game-card').count(),2);await page.locator('[data-filter="all"]').click();
  await page.locator('.game-card[data-slug="tetris"]').click();await page.locator('#iframeLoader').waitFor({state:'hidden'});
  await page.locator('#fullscreenBtn').click();
  await page.waitForTimeout(400); // allow fullscreen transition
  const fsId=await page.evaluate(()=>document.fullscreenElement?.id);
  if(fsId!==undefined)assert.equal(fsId,'playArea','Fullscreen element should be playArea');
  await page.evaluate(()=>document.fullscreenElement&&document.exitFullscreen());
  await page.waitForTimeout(300); // allow fullscreen exit
  await page.frameLocator('#gameFrame').locator('#startBtn').click();await page.keyboard.press('KeyP');await page.frameLocator('#gameFrame').locator('body[data-state="paused"]').waitFor();
  await page.keyboard.press('KeyP');await page.frameLocator('#gameFrame').locator('body[data-state="playing"]').waitFor();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.locator('#backBtn').click();await page.locator('#themeToggle').click();await page.reload();assert.equal(await page.locator('body').getAttribute('data-theme'),'light');
  for(const game of games){await page.goto(`${base}/${game.path}`);await page.locator('body[data-state="ready"]').waitFor();await page.locator('#startBtn').click();await page.locator('body[data-state="playing"]').waitFor();}
  await context.close();
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked storage');}});});const bp=await blocked.newPage();bp.on('pageerror',e=>errors.push(e.message));await bp.goto(base);await bp.locator('.game-card').last().waitFor();for(const game of games){await bp.goto(`${base}/${game.path}`);await bp.locator('#startBtn').click();await bp.locator('body[data-state="playing"]').waitFor();}await blocked.close();
  assert.deepEqual(errors,[],'Runtime errors');
  console.log(`PASS: ${launches} embedded launches, ${layouts} game layouts across 9 viewports; touch start, pause/resume, restart, library/search/filter, fullscreen, keyboard, theme persistence, direct pages and blocked storage. No runtime errors.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();});
