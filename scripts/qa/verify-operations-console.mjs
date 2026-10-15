import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { openBrowser, measure } from './operations-console-browser.mjs'

const prototype = process.argv.includes('--prototype')
const url = prototype ? pathToFileURL(path.resolve('prototypes/dashboard-modern/operations-console.html')).href : 'http://127.0.0.1:5177/'
const browser = await openBrowser(Number(process.env.CONSOLE_CDP_PORT || 9340))
try {
  for (const [width,height] of [[1366,650],[1280,720],[1440,900],[1920,1080],[2560,1440],[390,844],[320,480]]) {
    for (const theme of ['light','dark']) {
      await browser.viewport(width,height)
      await browser.load(url,{theme})
      const result = await browser.read(measure)
      assert.ok(result.document.scrollHeight <= height+1, `Document overflow ${width}x${height}: ${result.document.scrollHeight}`)
      assert.ok(result.document.scrollWidth <= width+1, 'Horizontal overflow')
      const content = await browser.read(`document.querySelector('main').textContent`)
      for (const value of ['34','23','11','24','16','42','18','128','186','94']) assert.ok(content.includes(value), `Lost metric ${value}`)
      const expectedTheme = await browser.read(`document.documentElement.dataset.theme`)
      assert.equal(expectedTheme,theme,'Theme selection')
      const clipped = await browser.read(`(() => {
        return [...document.querySelectorAll('main section,main article,main p,main h2,main h3,main dt,main dd')].filter(e => {
          if(!e.getClientRects().length) return false;
          const r=e.getBoundingClientRect();
          return r.right>innerWidth+1 || r.bottom>innerHeight+1 || r.left<0 || e.scrollHeight>e.clientHeight+1 || e.scrollWidth>e.clientWidth+1;
        }).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,60)}));
      })()`)
      assert.deepEqual(clipped,[],`Clipped content at ${width}x${height}`)
      if(width===1366 || width===390 || width===1920) await browser.screenshot(`.dashboard-qa/console-${prototype?'prototype':'react'}-${width}-${height}-${theme}.png`)
      console.log(`PASS ${prototype?'prototype':'React'} ${theme} ${width}x${height}`)
    }
  }
  assert.deepEqual(browser.errors,[])
} finally { await browser.close() }
