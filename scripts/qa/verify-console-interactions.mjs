import assert from 'node:assert/strict'
import { openBrowser, measure } from './operations-console-browser.mjs'

const browser = await openBrowser(Number(process.env.CONSOLE_CDP_PORT || 9340))
const url = 'http://127.0.0.1:5177/'
const select = async (selector, value) => {
  await browser.read(`(() => {const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`)
  await browser.settle()
}
const escape = async () => {
  await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await browser.settle()
}
const bounds = async () => {
  if(!await browser.read('!!document.querySelector(".operations-console")')) {
    throw new Error(`Dashboard disappeared: ${JSON.stringify({errors:browser.errors,body:await browser.read('document.body.innerText.slice(0,1600)')})}`)
  }
  const result = await browser.read(measure)
  assert.ok(result.document.scrollHeight <= result.viewport[1] + 1)
  assert.ok(result.document.scrollWidth <= result.viewport[0] + 1)
  const overflow = await browser.read(`(() => {
    const root=document.querySelector('.operations-console'), b=root.getBoundingClientRect();
    return [...root.querySelectorAll('section,button,p,th,td,dt,dd')].filter(e=>{
      if(!e.getClientRects().length)return false;
      const r=e.getBoundingClientRect();
      return r.bottom>b.bottom+1 || r.right>b.right+1 || e.scrollWidth>e.clientWidth+1 || e.scrollHeight>e.clientHeight+1;
    }).map(e=>({text:e.textContent.slice(0,80),width:e.clientWidth,sw:e.scrollWidth,height:e.clientHeight,sh:e.scrollHeight}));
  })()`)
  assert.deepEqual(overflow, [])
}

try {
  for (const language of ['en', 'sk', 'cs']) for (const theme of ['light', 'dark']) {
    for (const [width, height] of [[1366,650],[320,480],[960,540]]) {
      await browser.viewport(width,height)
      await browser.load(url,{language,theme})
      const paged=await browser.read('!!document.querySelector(".console-section-nav select").getClientRects().length')
      // Typography stress only: actual metric semantics are covered by fixture tests.
      await browser.read(`(() => {for(const e of document.querySelectorAll('.health-kpi-number,.resource-count,.console-chart-total strong,.console-stats dd,.console-topology-root strong,.console-topology-node strong,.console-issue-count,.console-platform-values strong'))e.textContent='12 345';})()`)
      for(let page=0;page<(paged?11:1);page++) {
        if(paged)await select('.console-section-nav select',String(page))
        await bounds()
      }
      console.log(`PASS five-digit typography ${width}x${height} ${language} ${theme}`)
    }
  }
  for(const language of ['en','sk','cs']) for(const theme of ['light','dark']) for(const [width,height] of [[1366,650],[320,480]]) {
    await browser.viewport(width,height)
    await browser.load(url,{theme,language})
    for(const state of ['loading','unknown','empty','partial','demo']) {
      await browser.click('.demo-tag')
      await select('[role="dialog"] select',state)
      await escape()
      const paged=width===320
      for(let page=0;page<(paged?11:1);page++) {
        if(paged)await select('.console-section-nav select',String(page))
        await bounds()
      }
      console.log(`PASS state ${state} ${width}x${height} ${language} ${theme}`)
    }
  }
  await browser.viewport(1920,1080)
  await browser.load(url)
  await browser.click('.resource:nth-child(2)')
  await browser.viewport(320,480)
  assert.ok(await browser.read('document.querySelector("[role=dialog]").contains(document.activeElement)'))
  await escape()
  assert.ok(await browser.read('document.activeElement===document.querySelector(".console-section-nav select")'))
  console.log('PASS dialog focus across resize')
  await browser.click('.refresh')
  assert.ok(await browser.read('document.querySelector(".update-state").textContent.includes("unchanged")'))
  for(const [width,height] of [[390,844],[1024,768],[1366,650]]) {
    await browser.viewport(width,height)
    await browser.load(url)
    // Navigate through the router, retaining the shell, to verify route opt-in release.
    await browser.read(`(() => {history.pushState({},'', '/platform-administration/configuration');dispatchEvent(new PopStateEvent('popstate'));})()`)
    for(let i=0;i<100;i++) {
      if(await browser.read('!document.querySelector(".dashboard-host") && !!document.querySelector("h1")'))break
      await new Promise(resolve=>setTimeout(resolve,100))
    }
    assert.equal(await browser.read('!!document.querySelector(".dashboard-host,[data-content-fit=viewport]")'),false)
    assert.equal(await browser.read('document.querySelector("main").classList.contains("overflow-hidden")'),false)
  }
  console.log('PASS refresh and default-scroll route transition')
  assert.deepEqual(browser.errors,[],'Browser errors')
} finally { await browser.close() }
