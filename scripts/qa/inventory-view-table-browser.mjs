import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Run Vite on 127.0.0.1:5191 and a dedicated headless Chrome with
// --remote-debugging-port=9357 --user-data-dir=<temporary QA profile>.
// node scripts/qa/inventory-view-table-browser.mjs [--quick | --interactions-only]
// All config/API calls in this isolated tab are fulfilled locally. No live backend.
const base = process.env.INVENTORY_QA_BASE ?? 'http://127.0.0.1:5191'
const endpoint = process.env.INVENTORY_QA_CDP ?? 'http://127.0.0.1:9357'
const output = process.env.INVENTORY_QA_OUTPUT ?? join(tmpdir(), 'abco-inventory-view-qa')
const quick = process.argv.includes('--quick')
const interactionsOnly = process.argv.includes('--interactions-only')
await mkdir(output, { recursive: true })
const target = await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let sequence = 0
const pending = new Map()
const exceptions = []
const unexpected = []
const results = []
const resourceFailures = []
const held = []
let mode = 'success'
let inventoryCount = 2
let manyProviders = false
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence
  const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)) }, 15000)
  pending.set(id, { resolve, reject, timer })
  socket.send(JSON.stringify({ id, method, params }))
})
function providers() {
  if (mode === 'no-provider') return []
  return ['source', 'target'].flatMap(role => [
    ['vmware-01', 'VMWARE'], ['vmware-03', 'VMWARE'], ['flash-01', 'FLASHCOPY'], ['power-01', 'IBM_POWER'],
    ...(manyProviders ? Array.from({ length: 8 }, (_, i) => [`long-provider-${i}-with-an-unusually-long-identifier`, 'VMWARE']) : []),
  ].map(([id, type]) => ({ id: role === 'source' ? id : `target-${id}`, name: id, type, role, description: '', ipAddress: '127.0.0.1', credentialId: null, credentialStatus: 'none' })))
}
function fixture(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api/, '')
  const providerId = url.searchParams.get('provider_id') ?? 'vmware-01'
  if (path === '/config.js') return { raw: 'window.__APP_CONFIG__={AUTH_ENABLED:"false"};' }
  if (path === '/get_providers') return mode === 'provider-error' ? { failure: true } : { providers: providers() }
  if (path === '/tags') return { count: 0, tags: [] }
  if (['/vms/search', '/get_volumes', '/get_power_vm'].includes(path)) {
    if (mode === 'loading') return { hold: true }
    if (mode === 'inventory-error') return { failure: true }
    const count = mode === 'empty' ? 0 : inventoryCount
    if (path === '/vms/search') return { count, vms: Array.from({ length: count }, (_, i) => ({
      name: `TEST-WEB${String(i + 1).padStart(2, '0')}`, moId: `vm-${i + 1}`, provider_id: providerId, provider_type: 'VMWARE',
      power_state: 'poweredOff', connection_state: 'inaccessible', cluster: 'ACMTHCICLUSTER', tags: ['WEB', 'ABC Orchestrator'],
    })) }
    if (path === '/get_volumes') return { count, volumes: Array.from({ length: count }, (_, i) => ({
      id: String(i), name: `TEST-VOLUME${i + 1}`, status: 'online', capacity: '512 GB', mdisk_grp_id: '0', mdisk_grp_name: 'Pool0', provider_id: providerId,
    })), pools: { 0: { name: 'Pool0', capacity: '2 TB', used_capacity: '1 TB', free_capacity: '1 TB' } }, hosts: {}, clusters: {}, consistency_groups: {} }
    return { count, counts_by_type: { LogicalPartition: count, VirtualIOServer: 0 }, provider_id: providerId,
      vms: Array.from({ length: count }, (_, i) => ({ provider_id: providerId, provider_type: 'IBM_POWER', lpar: {
        PartitionUUID: `partition-${i}`, PartitionName: `TEST-AIX${i + 1}`, PartitionType: 'AIX/Linux', PartitionState: 'running', SystemName: 'POWER-SYSTEM-01',
      } })) }
  }
  if (path === '/vdisks_by_vm') return { name: 'TEST-WEB01', count_vm: 0, count_ibm: 0, vdisks: {} }
  if (path === '/get_platform_providers') return { providers: [{ id: 'airflow-qa', name: 'QA Airflow', type: 'AIRFLOW', url: 'https://example.test', port: 22 }] }
  if (path === '/get_recovery_apps') return { applications: [] }
  if (path === '/get_recovery_groups') return { recovery_groups: [] }
  if (path === '/discovery/cache/config') return { defaults: { vmware: 300, flashsystem: 300, ibm_power: 300 }, history_retention: { retention_days: 7, max_records: 100 } }
  unexpected.push(path)
  return { failure: true }
}
async function fulfill(requestId, body) {
  await send('Fetch.fulfillRequest', {
    requestId, responseCode: body.failure ? 503 : 200,
    responseHeaders: [{ name: 'Content-Type', value: body.raw ? 'text/javascript' : 'application/json' }],
    body: Buffer.from(body.raw ?? JSON.stringify(body.failure ? { detail: 'QA inventory unavailable' } : body)).toString('base64'),
  })
}
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) {
    const task = pending.get(message.id)
    if (task) { clearTimeout(task.timer); pending.delete(message.id); message.error ? task.reject(Error(message.error.message)) : task.resolve(message.result) }
  }
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails)
  if (message.method === 'Network.responseReceived' && message.params.response.status >= 400 && !message.params.response.url.includes('/api/')) resourceFailures.push(message.params.response)
  if (message.method === 'Fetch.requestPaused') {
    const { requestId, request } = message.params
    const url = new URL(request.url)
    if (url.origin !== new URL(base).origin) {
      unexpected.push(`Blocked external origin: ${url.origin}`)
      void send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(error => exceptions.push(error.message))
      return
    }
    if (url.pathname !== '/config.js' && !url.pathname.startsWith('/api/')) {
      void send('Fetch.continueRequest', { requestId }).catch(error => exceptions.push(error.message))
      return
    }
    const body = fixture(request)
    if (body.hold) held.push({ requestId, request })
    else void fulfill(requestId, body).catch(error => {
      // Navigation/query cancellation may abort a mocked request before fulfillment.
      if (error.message !== 'Invalid InterceptionId.') exceptions.push(error.message)
    })
  }
})
const read = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result.value
}
async function wait(expression) {
  for (let i = 0; i < 450; i++) {
    if (await read(expression)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw Error(`Timed out: ${expression}\n${await read('document.body.innerText.slice(-1800)')}`)
}
async function click(expression) {
  const point = await read(`(() => { const e=${expression}; if(!e) throw Error('Missing click target'); e.scrollIntoView({block:'nearest',inline:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
}
const viewSelector = '[data-resource-view]'
async function screenshot(name, clip) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, ...(clip ? { clip } : {}) })
  await writeFile(join(output, `${name}.png`), Buffer.from(data, 'base64'))
}
async function geometry(name) {
  console.log(`Check: ${name}`)
  const value = await read(`(() => {
    const card=document.querySelector('${viewSelector}'); const r=card.getBoundingClientRect(); const style=getComputedStyle(card);
    const rect=e=>{const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right}};
    const nav=card.querySelector('[role=tablist]'); const embedded=card.querySelector('section[aria-label]');
    const viewport=embedded?.querySelector('.overflow-y-auto'); const footer=embedded?.lastElementChild;
    const clips=[]; for(let e=card.parentElement;e;e=e.parentElement){const s=getComputedStyle(e);if(/hidden|auto|scroll/.test(s.overflow)){const a=e.getBoundingClientRect(); clips.push({classes:e.className,left:r.left-a.left,right:a.right-r.right,bottom:a.bottom-r.bottom})}}
    return {card:rect(card),cardCount:document.querySelectorAll('${viewSelector}').length,overflow:style.overflow,radius:style.borderTopLeftRadius,border:style.borderTopWidth,shadow:style.boxShadow,
      headingX:document.querySelector('h1')?.getBoundingClientRect().x,
      nestedFrames:card.querySelectorAll('[data-table-surface]').length,nav:nav?rect(nav):null,navBackground:nav?getComputedStyle(nav).backgroundColor:null,
      navBorder:nav?getComputedStyle(nav).borderBottomWidth:null,navWrapperBorder:nav?getComputedStyle(nav.parentElement).borderBottomWidth:null,
      viewport:viewport?{...rect(viewport),scrollHeight:viewport.scrollHeight,clientHeight:viewport.clientHeight}:null,footer:footer?rect(footer):null,clips,
      pageWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,windowHeight:innerHeight}; })()`)
  assert.equal(value.cardCount, 1, `${name}: one view card`)
  assert.equal(value.nestedFrames, 0, `${name}: no nested frame`)
  assert.equal(value.overflow, 'visible', `${name}: outer frame is not clipped`)
  assert.equal(value.border, '1px')
  assert.equal(value.radius, '20px')
  assert.notEqual(value.shadow, 'none', `${name}: the view retains its shadow`)
  assert.ok(value.pageWidth <= value.windowWidth + 1, `${name}: document must not scroll horizontally`)
  if (value.nav) assert.equal(value.navBackground, 'rgba(0, 0, 0, 0)', `${name}: transparent navigation`)
  if (value.nav) {
    assert.equal(value.navBorder, '0px', `${name}: tablist does not duplicate the divider`)
    assert.equal(value.navWrapperBorder, '0px', `${name}: scroll controls do not duplicate the divider`)
  }
  assert.equal(value.card.x, value.headingX, `${name}: card aligns with page heading`)
  results.push({ name, ...value })
  await screenshot(name)
  return value
}
let initScript
async function load(path, { theme = 'light', width = 1600, height = 900, zoom = 1 } = {}) {
  if (initScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: initScript })
  // App preferences only, in this disposable test profile; no auth material is read.
  initScript = (await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('app-theme',${JSON.stringify(theme)});localStorage.setItem('app-language','en');` })).identifier
  // Changing the CSS viewport and raster scale together reproduces desktop browser zoom.
  await send('Emulation.setDeviceMetricsOverride', { width: Math.round(width / zoom), height: Math.round(height / zoom), deviceScaleFactor: zoom, mobile: false })
  await send('Page.navigate', { url: base + path })
  await wait(`document.readyState==='complete' && !!document.querySelector('${viewSelector}')`)
  if (mode === 'loading') await wait(`!!document.querySelector('${viewSelector} [role=status][aria-busy=true]')`)
  else if (['inventory-error', 'provider-error'].includes(mode)) await wait(`!!document.querySelector('${viewSelector} [role=alert]')`)
  else if (['empty', 'no-provider'].includes(mode)) await wait(`!!document.querySelector('${viewSelector} [role=status] h2')`)
  else await wait(`!!document.querySelector('${viewSelector} tbody tr') && !document.querySelector('${viewSelector} [role=status][aria-busy=true]')`)
  await read('document.fonts.ready.then(()=>true)')
}
try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
  await load('/discovery-inventory/resources')
  const initial = await geometry('initial-light-desktop')
  console.log(`Initial card: x=${initial.card.x}, bottom=${initial.card.bottom}, clipping gaps=${JSON.stringify(initial.clips[0])}`)
  if (!quick) {
    if (!interactionsOnly) for (const role of ['source', 'target']) {
      const path = role === 'source' ? '/discovery-inventory/resources' : '/discovery-inventory/resources-ise'
      for (const theme of ['light', 'dark']) {
        for (const [width, height, zoom] of [[1600, 900, 1], [1280, 600, 1], [800, 900, 1], [390, 844, 1], [1600, 900, 1.25], [1280, 600, 1.25]]) {
          await load(path, { theme, width, height, zoom })
          const info = await geometry(`${role}-${theme}-${width}x${height}-zoom${zoom}`)
          for (const clip of info.clips) assert.ok(clip.left >= 5 && clip.right >= 5 && clip.bottom >= 5, `Shadow space missing: ${JSON.stringify(clip)}`)
          if (info.windowWidth >= 1024 && info.footer) assert.ok(info.footer.bottom <= info.windowHeight, 'Footer remains reachable in short desktop viewport')
        }
      }
    }
    for (const role of ['source', 'target']) {
      const route = role === 'source' ? '/discovery-inventory/resources' : '/discovery-inventory/resources-ise'
      const prefix = role === 'source' ? '' : 'target-'
      for (const [resource, id] of [['vmware', 'vmware-01'], ['flashsystem', 'flash-01'], ['ibm-power', 'power-01']]) {
        for (const state of ['success', 'loading', 'inventory-error', 'empty']) {
          mode = state
          await load(`${route}?resource=${resource}&providerId=${prefix}${id}`)
          await geometry(`${role}-${resource}-${state}`)
          assert.ok(await read(`!!document.querySelector('${viewSelector} [role=tab][aria-selected=true]')`), 'View navigation stays available during inventory states')
          if (state === 'inventory-error') {
            mode = 'success'
            await click(`Array.from(document.querySelectorAll('${viewSelector} [role=alert] button')).find(e=>/retry/i.test(e.textContent))`)
            await wait(`!!document.querySelector('${viewSelector} tbody tr') && !document.querySelector('${viewSelector} [role=alert]')`)
          }
        }
      }
      mode = 'success'
      await load(route)
      await click(`document.querySelectorAll('${viewSelector} [role=tab]')[1]`)
      await wait(`new URL(location.href).searchParams.get('providerId')===${JSON.stringify(prefix + 'vmware-03')}`)
      await wait(`document.querySelector('${viewSelector} [role=tab][aria-selected=true]')?.textContent.includes('vm-03')`)
      for (const [key, provider] of [['Home', 'vmware-01'], ['End', 'power-01'], ['ArrowLeft', 'flash-01'], ['Home', 'vmware-01'], ['ArrowRight', 'vmware-03']]) {
        // Resource types mount different existing page components. Start each key
        // from the selected tab rather than sending it to a previously unmounted node.
        const { root } = await send('DOM.getDocument')
        const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: `${viewSelector} [role=tab][aria-selected=true]` })
        await send('DOM.focus', { nodeId })
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key })
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key })
        await wait(`new URL(location.href).searchParams.get('providerId')===${JSON.stringify(prefix + provider)}`)
        await wait(`document.querySelector('${viewSelector} [role=tab][aria-selected=true]')?.textContent.includes(${JSON.stringify(provider.replace('vmware', 'vm'))})`)
      }
      await wait(`!!document.querySelector('${viewSelector} tbody tr') && !document.querySelector('${viewSelector} [aria-busy=true]')`)
      await geometry(`${role}-keyboard-view-switching`)

      await load(route)
      await click(`document.querySelector('${viewSelector} tbody tr')`)
      await wait(`!!document.querySelector('[role=dialog]')`)
      await screenshot(`${role}-row-detail`)
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape' })
      await wait(`!document.querySelector('[role=dialog]')`)

      mode = 'inventory-error'
      await click(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()==='Refresh')`)
      await wait(`!!document.querySelector('[role=alert]') && !!document.querySelector('${viewSelector} tbody tr')`)
      await geometry(`${role}-cached-refresh-error`)
      mode = 'success'
      await click(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()==='Refresh')`)
      await wait(`!document.querySelector('[role=alert]')`)

      for (const state of ['provider-error', 'no-provider']) {
        mode = state
        await load(route)
        const info = await geometry(`${role}-${state}`)
        if (state === 'no-provider') assert.equal(info.nav, null, 'No orphan navigation when there are no providers')
      }
      mode = 'success'
      manyProviders = true
      await load(route, { width: 800, height: 900 })
      await wait(`Array.from(document.querySelectorAll('${viewSelector} button')).some(e=>/next.*tabs/i.test(e.getAttribute('aria-label')??''))`)
      await geometry(`${role}-overflowing-provider-navigation`)
      await click(`Array.from(document.querySelectorAll('${viewSelector} button')).find(e=>/next.*tabs/i.test(e.getAttribute('aria-label')??''))`)
      await wait(`document.querySelector('${viewSelector} [role=tablist]').scrollLeft>0`)
      manyProviders = false

      inventoryCount = 60
      await load(`${route}?pageSize=50`, { width: 1280, height: 600 })
      const long = await geometry(`${role}-long-table`)
      assert.ok(long.viewport.scrollHeight > long.viewport.clientHeight, 'Long data scrolls within the table viewport')
      const navTop = long.nav.y
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: long.viewport.x + 50, y: long.viewport.y + 30, deltaY: 200, deltaX: 0 })
      await wait(`document.querySelector('${viewSelector} .overflow-y-auto').scrollTop>0`)
      assert.equal(await read(`document.querySelector('${viewSelector} [role=tablist]').getBoundingClientRect().y`), navTop, 'View navigation stays fixed when data scrolls')
      await screenshot(`${role}-long-table-scrolled`)
      inventoryCount = 2
    }
    for (const path of ['/platform-administration/platform-providers', '/recovery-plans/recovery-runs', '/discovery-inventory/discovery-settings']) {
      await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false })
      await send('Page.navigate', { url: base + path })
      await wait(`document.readyState==='complete' && !!document.querySelector('h1') && !document.querySelector('${viewSelector}')`)
      if (path.includes('platform-providers')) await wait(`!!document.querySelector('[data-table-surface] tbody tr')`)
      else if (path.includes('recovery-runs')) await wait(`!!document.querySelector('[data-table-surface]')`)
      else await wait(`!!document.querySelector('form') || document.body.innerText.includes('Cache')`)
      await screenshot(`standalone-${path.split('/').at(-1)}`)
      const normal = await read(`(() => {const e=document.querySelector('[data-table-surface]');if(!e)return null;const s=getComputedStyle(e);return {border:s.borderLeftWidth,radius:s.borderBottomLeftRadius,shadow:s.boxShadow}})()`)
      if (normal) { assert.equal(normal.border, '1px'); assert.equal(normal.radius, '20px'); assert.notEqual(normal.shadow, 'none') }
      results.push({ name: path, standalone: normal })
    }
  }
  assert.deepEqual(exceptions, [], 'No browser runtime exceptions')
  assert.deepEqual(unexpected, [], 'All mocked API endpoints are accounted for')
  assert.deepEqual(resourceFailures, [], 'No failed application assets')
  console.log(`PASS: ${results.length} geometry captures; output ${output}`)
} finally {
  try {
    await screenshot('last-state').catch(error => console.warn(`Diagnostic screenshot unavailable: ${error.message}`))
    await writeFile(join(output, 'results.json'), JSON.stringify({ results, exceptions, unexpected, resourceFailures }, null, 2))
      .catch(error => console.warn(`Diagnostic results unavailable: ${error.message}`))
  } finally {
    socket.close()
    await fetch(`${endpoint}/json/close/${target.id}`).catch(error => console.warn(`QA target cleanup failed: ${error.message}`))
  }
}
