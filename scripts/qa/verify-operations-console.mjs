import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { openBrowser, measure } from './operations-console-browser.mjs'

const prototype = process.argv.includes('--prototype')
const quick = process.argv.includes('--quick')
const url = prototype ? pathToFileURL(path.resolve('prototypes/dashboard-modern/operations-console.html')).href : 'http://127.0.0.1:5177/'
const browser = await openBrowser(Number(process.env.CONSOLE_CDP_PORT || 9340))
const results = []
const desktop = quick ? [[1366,650],[1920,1080]] : [[1280,720],[1366,650],[1366,768],[1440,900],[1536,864],[1600,900],[1920,1080],[2560,1440]]
const small = quick ? [[390,844],[320,480]] : [[1024,768],[768,1024],[390,844],[320,568],[320,480]]
const visibleContent = `(() => {
  const main=document.querySelector('.operations-console') || document.querySelector('main');
  return [...main.querySelectorAll('strong,.health-kpi-number,.console-stats dd,.panel-stats dd,.console-issue-count,.resource-count,.resource-meter-info b,.console-topology-node dd>span,.console-platform-values>span')]
    .filter(e=>e.getClientRects().length).map(e=>e.textContent.trim().replace(/\\s+/g,' '));
})()`
const boundsCheck = `(() => {
  const root=document.querySelector('.operations-console') || document.querySelector('main');
  const bounds=root.getBoundingClientRect();
  return [...root.querySelectorAll('section,article,p,h2,h3,th,td,dt,dd,button,span,strong')].filter(e=>{
    if(!e.getClientRects().length || e.closest('svg,[aria-hidden="true"]'))return false;
    const r=e.getBoundingClientRect();
    if(!r.width || !r.height)return false;
    return r.right>bounds.right+1 || r.bottom>bounds.bottom+1 || r.left<bounds.left-1 || r.top<bounds.top-1 || e.scrollWidth>e.clientWidth+1 || e.scrollHeight>e.clientHeight+1;
  }).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,70),width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight}));
})()`

async function verifyBounds(context) {
  const result = await browser.read(measure)
  assert.ok(result.document.scrollHeight <= context.height+1, `Document overflow ${JSON.stringify(context)}: ${result.document.scrollHeight}`)
  assert.ok(result.document.scrollWidth <= context.width+1, `Horizontal overflow ${JSON.stringify(context)}`)
  if(!prototype) {
    for(const key of ['width','height']) assert.ok(Math.abs(result.host[key]-result.dashboard[key]) <= 2, `Unused ${key}: ${JSON.stringify(context)}`)
    const mode=await browser.read('document.querySelector(".operations-console").dataset.layout')
    if(context.width>=1280) assert.notEqual(mode,'sections',`Desktop hides metrics: ${JSON.stringify(context)}`)
  }
  assert.deepEqual(await browser.read(boundsCheck),[],`Clipped content: ${JSON.stringify(context)}`)
  return result
}

async function verifyPages(context) {
  const pageSelect = prototype ? '#section-select' : '.console-section-nav select'
  const next = prototype ? '#next' : '.console-section-nav button:last-child'
  const paged = await browser.read(`!!document.querySelector('${pageSelect}')?.getClientRects().length`)
  const content = new Set()
  let result
  const count = paged ? await browser.read(`document.querySelector('${pageSelect}').options.length`) : 1
  for(let page=0;page<count;page++) {
    result = await verifyBounds({...context,page})
    for(const value of await browser.read(visibleContent))content.add(value)
    if(page+1<count) await browser.click(next)
  }
  for(const value of ['3','7','4','5','34','23','11','26','8','24','16','42','18','128','32','186','94']) assert.ok(content.has(value),`Lost metric ${value}: ${JSON.stringify(context)}`)
  if(!prototype) for(const value of ['108 / 128','30 / 32','178 / 186','91 / 94'])assert.ok(content.has(value),`Lost resource ratio ${value}`)
  assert.equal(await browser.read('document.documentElement.dataset.theme'), context.theme)
  const otherTheme=results.find(entry=>entry.width===context.width && entry.height===context.height && entry.language===context.language && entry.expanded===context.expanded && entry.theme!==context.theme)
  if(otherTheme) {
    assert.deepEqual(result.host,otherTheme.host,'Theme changed host geometry')
    assert.deepEqual(result.dashboard,otherTheme.dashboard,'Theme changed dashboard geometry')
    assert.deepEqual(result.panels,otherTheme.panels,'Theme changed panel geometry')
  }
  results.push({...context,pages:count,host:result.host,dashboard:result.dashboard,panels:result.panels})
  console.log(`PASS ${prototype?'prototype':'React'} ${context.width}x${context.height} ${context.theme} ${context.language} ${context.expanded?'expanded':'collapsed'} (${count} pages)`)
}

try {
  const selectedLanguage = process.argv.find(argument => argument.startsWith('--language='))?.split('=')[1]
  const languages = selectedLanguage ? [selectedLanguage] : quick || prototype ? ['en'] : ['en','sk','cs']
  for(const [width,height] of [...desktop,...small]) {
    for(const language of languages) for(const theme of ['light','dark']) for(const expanded of (quick || prototype || width<1280 ? [true] : [true,false])) {
      const context={width,height,theme,language,expanded}
      await browser.viewport(width,height)
      await browser.load(url,context)
      await verifyPages(context)
      if(width>=1280 && [1366,1920].includes(width)) {
        for(const density of ['compact','spacious']) {
          const selector=prototype?`.density button[data-density="${density}"]`:`.density-option:nth-child(${density==='compact'?2:3})`
          await browser.click(selector)
          await verifyBounds({...context,density})
        }
      }
      if(language==='en' && expanded && [1366,1920,390].includes(width)) await browser.screenshot(`.dashboard-qa/console-${prototype?'prototype':'react'}-${width}-${height}-${theme}.png`)
    }
  }
  assert.deepEqual(browser.errors,[],'Browser errors')
  await mkdir('.dashboard-qa',{recursive:true})
  await writeFile(`.dashboard-qa/console-${prototype?'prototype':'react'}${quick?'-quick':''}-results.json`,JSON.stringify(results,null,2))
} finally { await browser.close() }
