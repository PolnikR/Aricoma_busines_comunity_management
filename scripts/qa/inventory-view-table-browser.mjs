import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Run Vite on 127.0.0.1:5191 and a dedicated headless Chrome with
// --remote-debugging-port=9357 --user-data-dir=<temporary QA profile>.
// Optional scopes: --quick, --interactions-only, --phase6-only,
// --phase6-interactions-only, --phase6-footer-only.
// All config/API calls in this isolated tab are fulfilled locally. No live backend.
const base = process.env.INVENTORY_QA_BASE ?? 'http://127.0.0.1:5191'
const endpoint = process.env.INVENTORY_QA_CDP ?? 'http://127.0.0.1:9357'
const output = process.env.INVENTORY_QA_OUTPUT ?? join(tmpdir(), 'abco-inventory-view-qa')
const quick = process.argv.includes('--quick')
const interactionsOnly = process.argv.includes('--interactions-only')
const phase6Only = process.argv.includes('--phase6-only')
const phase6InteractionsOnly = process.argv.includes('--phase6-interactions-only')
const phase6FooterOnly = process.argv.includes('--phase6-footer-only')
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
const navigationDiagnostics = []
const interactionDiagnostics = []
const interceptionCancellations = []
const pageEvents = []
const rendererCrashes = []
const requests = []
const held = []
let mode = 'success'
let inventoryCount = 2
let manyProviders = false
let phase6 = false
let providerCount = 5
let scope = 'both-5'
let providerScopeOverrides = {}
let completed = false
let legacyCaptures = 0
let phase6Captures = 0
const scopeTags = ['WEB', 'DR', 'Critical', 'Tier-1', 'Backup']
function configuredScope(role) {
  const prefix = role === 'source' ? 'SRC-' : 'TGT-'
  if (scope === 'readable') return { vmPrefix: 'TEST-', vmTags: ['Nekriticke-produkcne', 'Archiv', 'WEB'] }
  if (scope === 'none') return { vmPrefix: ' ', vmTags: [' ', ''] }
  if (scope === 'prefix') return { vmPrefix: prefix }
  if (scope === 'tag-1') return { vmTags: [' WEB ', 'WEB', ' '] }
  if (scope === 'both-1') return { vmPrefix: prefix, vmTags: ['WEB'] }
  if (scope === 'both-2') return { vmPrefix: prefix, vmTags: [' WEB ', 'DR', 'WEB', ' '] }
  if (scope === 'tag-2') return { vmTags: ['WEB', 'DR'] }
  if (scope === 'tag-5') return { vmTags: scopeTags }
  if (scope === 'long') return { vmPrefix: `${prefix}literal[prod].*-`, vmTags: [`WEB-${'a'.repeat(160)}`, `DR-${'b'.repeat(180)}`, ...scopeTags.slice(2)] }
  return { vmPrefix: prefix, vmTags: scopeTags }
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence
  const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)) }, method === 'Page.captureScreenshot' ? 45000 : 15000)
  pending.set(id, { resolve, reject, timer })
  socket.send(JSON.stringify({ id, method, params }))
})
function providers() {
  if (mode === 'no-provider') return []
  if (phase6) return ['source', 'target'].flatMap(role => [
    ['vmware-01', 'VMWARE'], ['vmware-03', 'VMWARE'], ['flash-01', 'FLASHCOPY'], ['power-01', 'IBM_POWER'],
    ...['05', '06', '07', '08', '09'].map(id => [`vmware-${id}`, 'VMWARE']),
    ['provider-with-an-unusually-long-identifier', 'VMWARE'],
  ].slice(0, providerCount).map(([id, type]) => ({
    id: role === 'source' ? id : `target-${id}`, name: id, type, role,
    description: '', ipAddress: '127.0.0.1', credentialId: null, ...configuredScope(role), ...providerScopeOverrides[role === 'source' ? id : `target-${id}`],
  })))
  return ['source', 'target'].flatMap(role => [
    ['vmware-01', 'VMWARE'], ['vmware-03', 'VMWARE'], ['flash-01', 'FLASHCOPY'], ['power-01', 'IBM_POWER'],
    ...(manyProviders ? Array.from({ length: 8 }, (_, i) => [`long-provider-${i}-with-an-unusually-long-identifier`, 'VMWARE']) : []),
  ].map(([id, type]) => ({ id: role === 'source' ? id : `target-${id}`, name: id, type, role, description: '', ipAddress: '127.0.0.1', credentialId: null, credentialStatus: 'none' })))
}
function scopedVms(providerId) {
  const role = providerId.startsWith('target-') ? 'target' : 'source'
  const prefix = role === 'source' ? 'SRC-' : 'TGT-'
  const rows = [
    ['FIRST', ['WEB'], 'poweredOn', 2, 4, 'cluster-a'],
    ['SECOND', ['DR'], 'poweredOff', 4, 8, 'cluster-b'],
    ['BOTH', ['WEB', 'DR'], 'poweredOn', 8, 16, 'cluster-a'],
    ['EXCLUDED', ['OTHER'], 'poweredOn', 64, 128, 'cluster-excluded'],
    ['LOWERCASE', ['web'], 'poweredOn', 128, 256, 'cluster-case'],
    ['OUTSIDE', ['WEB'], 'poweredOn', 16, 32, 'cluster-outside'],
  ]
  if (scope === 'long') rows[0] = ['FIRST', configuredScope(role).vmTags.slice(0, 1), 'poweredOn', 2, 4, 'cluster-a']
  return Array.from({ length: inventoryCount > 6 ? Math.ceil(inventoryCount / 6) : 1 }, (_, repeat) => rows.map(([suffix, tags, power_state, vcpu, memory_gb, cluster], i) => ({
    name: `${suffix === 'OUTSIDE' ? 'OTHER-' : (scope === 'long' || scope === 'readable') ? configuredScope(role).vmPrefix : prefix}${suffix}`,
    moId: `${providerId}-vm-${repeat}-${i}`, provider_id: providerId, provider_type: 'VMWARE',
    tags, power_state, vcpu, memory_gb, cluster, connection_state: 'connected',
  }))).flat()
}
function fixture(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api/, '')
  const providerId = url.searchParams.get('provider_id') ?? 'vmware-01'
  if (url.pathname.startsWith('/api/')) {
    const body = request.postData ? JSON.parse(request.postData) : null
    requests.push({ path, method: request.method, providerId, body, phase6, scope, providerCount })
    if (request.method !== 'GET' && !(path === '/vms/search' && request.method === 'POST')) {
      unexpected.push(`Blocked mutation: ${request.method} ${path}`)
      return { failure: true }
    }
  }
  if (path === '/config.js') return { raw: 'window.__APP_CONFIG__={AUTH_ENABLED:"false"};' }
  if (path === '/get_providers') return mode === 'provider-error' ? { failure: true } : { providers: providers() }
  if (path === '/tags') return { count: 0, tags: [] }
  if (['/vms/search', '/get_volumes', '/get_power_vm'].includes(path)) {
    if (mode === 'loading') return { hold: true }
    if (mode === 'inventory-error') return { failure: true }
    if (phase6 && path === '/vms/search') {
      const body = request.postData ? JSON.parse(request.postData) : {}
      const invalid = Object.keys(body).filter(key => !['folder_name', 'tag', 'name_prefix', 'force_refresh'].includes(key))
      if (invalid.length || (body.tag !== undefined && typeof body.tag !== 'string')) {
        unexpected.push(`Unsupported VMware body: ${JSON.stringify(body)}`)
        return { failure: true }
      }
      const vms = mode === 'empty' ? [] : scopedVms(providerId).filter(vm => (!body.name_prefix || vm.name.startsWith(body.name_prefix)) && (!body.tag || vm.tags.includes(body.tag)))
      requests.at(-1).rawNames = vms.map(vm => vm.name)
      return { count: vms.length, vms }
    }
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
  if (['Page.frameNavigated','Page.frameStartedLoading','Page.frameStoppedLoading','Runtime.executionContextsCleared','Network.loadingFailed'].includes(message.method)) {
    pageEvents.push({ method: message.method, at: new Date().toISOString(), navigation, params: message.params })
  }
  if (message.method === 'Inspector.targetCrashed') rendererCrashes.push({ at: new Date().toISOString(), navigation, params: message.params })
  if (message.id) {
    const task = pending.get(message.id)
    if (task) { clearTimeout(task.timer); pending.delete(message.id); message.error ? task.reject(Error(message.error.message)) : task.resolve(message.result) }
  }
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails)
  if (message.method === 'Page.javascriptDialogOpening') {
    unexpected.push(`Unexpected ${message.params.type} dialog: ${message.params.message}`)
    void send('Page.handleJavaScriptDialog', { accept: true }).catch(error => exceptions.push(error.message))
  }
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
      void send('Fetch.continueRequest', { requestId }).catch(error => {
        if (error.message === 'Invalid InterceptionId.') interceptionCancellations.push({ action: 'continue', url: request.url })
        else exceptions.push(error.message)
      })
      return
    }
    const body = fixture(request)
    if (body.hold) held.push({ requestId, request })
    else void fulfill(requestId, body).catch(error => {
      // Navigation/query cancellation may abort a mocked request before fulfillment.
      if (error.message === 'Invalid InterceptionId.') interceptionCancellations.push({ action: 'fulfill', url: request.url })
      else exceptions.push(error.message)
    })
  }
})
const read = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result.value
}
async function wait(expression, attempts = 450) {
  for (let i = 0; i < attempts; i++) {
    if (await read(expression)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw Error(`Timed out: ${expression}\n${await read('document.body.innerText.slice(-1800)')}`)
}
async function click(expression) {
  await foreground()
  await wait(`(() => {const e=${expression};if(!e||e.disabled||e.getAttribute('aria-disabled')==='true')return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;})()`)
  const point = await read(`(() => { const e=${expression}; if(!e) throw Error('Missing click target'); e.scrollIntoView({block:'nearest',inline:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
}
async function keyPress(key, modifiers = 0) {
  await foreground()
  const code = { Escape: 27, Tab: 9, Home: 36, End: 35, ArrowLeft: 37, ArrowRight: 39 }[key]
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers })
}
const viewSelector = '[data-inventory-view]'
const documentState = `({url:location.href,readyState:document.readyState,marker:window.__inventoryQaRun,body:document.body?.innerText.slice(0,1200),html:document.body?.innerHTML.slice(0,1200)})`
function requireDocument(value, name) {
  if (!value.missing) return
  const diagnostic = { name, document: value.document, navigation, recentEvents: pageEvents.slice(-12), rendererCrashes }
  interactionDiagnostics.push({ step: 'missing-view-frame', ...diagnostic })
  throw Error(`View frame disappeared: ${JSON.stringify(diagnostic)}`)
}
async function screenshot(name, clip) {
  await read('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))')
  // Full-document capture can reset nested scrollers in Chrome; preserve the tested viewport.
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip ? { clip } : {}) })
  await writeFile(join(output, `${name}.png`), Buffer.from(data, 'base64'))
}
async function geometry(name) {
  console.log(`Check: ${name}`)
  const value = await read(`(() => {
    const card=document.querySelector('${viewSelector}'); if(!card)return {missing:true,document:${documentState}};const r=card.getBoundingClientRect(); const style=getComputedStyle(card);
    const rect=e=>{const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right}};
    const nav=card.querySelector('[role=tablist]'); const embedded=card.querySelector('section[aria-label]');
    const viewport=embedded?.querySelector('.overflow-y-auto'); const footer=embedded?.lastElementChild;
    const clips=[]; for(let e=card.parentElement;e;e=e.parentElement){const s=getComputedStyle(e);if(/hidden|auto|scroll/.test(s.overflow)){const a=e.getBoundingClientRect(); clips.push({classes:e.className,left:r.left-a.left,right:a.right-r.right,bottom:a.bottom-r.bottom})}}
    return {card:rect(card),cardCount:document.querySelectorAll('${viewSelector}').length,overflow:style.overflow,radius:style.borderTopLeftRadius,border:style.borderTopWidth,shadow:style.boxShadow,
      headingX:document.querySelector('h1')?.getBoundingClientRect().x,
      nestedFrames:card.querySelectorAll('[data-table-surface]').length,nav:nav?rect(nav):null,navBackground:nav?getComputedStyle(nav).backgroundColor:null,
      navBorder:nav?getComputedStyle(nav).borderBottomWidth:null,navWrapperBorder:nav?getComputedStyle(nav.parentElement).borderBottomWidth:null,navParentIsSlot:nav?.parentElement===card.firstElementChild,slotBorder:nav?getComputedStyle(card.firstElementChild).borderBottomWidth:null,
      viewport:viewport?{...rect(viewport),scrollHeight:viewport.scrollHeight,clientHeight:viewport.clientHeight}:null,footer:footer?rect(footer):null,clips,
      pageWidth:document.documentElement.scrollWidth,pageClientWidth:document.documentElement.clientWidth,bodyMinWidth:getComputedStyle(document.body).minWidth,windowWidth:innerWidth,windowHeight:innerHeight}; })()`)
  requireDocument(value, name)
  assert.equal(value.cardCount, 1, `${name}: one view card`)
  assert.equal(value.nestedFrames, 0, `${name}: no nested frame`)
  assert.equal(value.overflow, 'visible', `${name}: outer frame is not clipped`)
  assert.equal(value.border, '1px')
  assert.equal(value.radius, '20px')
  assert.notEqual(value.shadow, 'none', `${name}: the view retains its shadow`)
  assert.ok(value.pageWidth <= value.pageClientWidth + 1, `${name}: document must not scroll horizontally inside the usable viewport`)
  if (value.nav) assert.equal(value.navBackground, 'rgba(0, 0, 0, 0)', `${name}: transparent navigation`)
  if (value.nav) {
    assert.equal(value.slotBorder, '1px', `${name}: navigation slot owns one divider`)
    assert.equal(value.navBorder, '0px', `${name}: tablist does not duplicate the divider`)
    assert.equal(value.navWrapperBorder, value.navParentIsSlot ? '1px' : '0px', `${name}: only the navigation slot owns the divider`)
  }
  assert.equal(value.card.x, value.headingX, `${name}: card aligns with page heading`)
  results.push({ name, ...value })
  await screenshot(name)
  return value
}
let initScript
let navigation = 0
async function load(path, { theme = 'light', width = 1600, height = 900, zoom = 1, classicScrollbar = false } = {}) {
  if (initScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: initScript }).catch(error => {
    if (error.message !== 'Script not found') throw error
    navigationDiagnostics.push({ path, initializerExpired: true })
  })
  // App preferences only, in this disposable test profile; no auth material is read.
  initScript = (await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__inventoryQaRun=new URL(location.href).searchParams.get('inventory-qa-run');localStorage.setItem('app-theme',${JSON.stringify(theme)});localStorage.setItem('app-language','en');localStorage.setItem('abcm-fe.discovery-inventory.metrics-collapsed.v1',${JSON.stringify(phase6 ? 'false' : 'true')});` })).identifier
  // CSS viewport and raster scale approximate zoom; this is not browser-chrome zoom.
  await send('Emulation.setDeviceMetricsOverride', { width: Math.round(width / zoom), height: Math.round(height / zoom), deviceScaleFactor: zoom, mobile: false })
  const destination = new URL(base + path)
  destination.searchParams.set('inventory-qa-run', String(++navigation))
  const navigationReady = `window.__inventoryQaRun===${JSON.stringify(String(navigation))} && location.href===${JSON.stringify(destination.href)}`
  const navigate = async () => {
    const response = await send('Page.navigate', { url: destination.href })
    if (response.errorText) throw Error(`Navigation failed: ${response.errorText}`)
  }
  try {
    await navigate()
    await wait(navigationReady, 100)
  } catch (error) {
    navigationDiagnostics.push({ path, retry: 1, reason: error.message })
    await send('Page.stopLoading')
    await navigate()
    await wait(navigationReady)
  }
  await wait(`document.readyState==='complete' && !!document.querySelector('${viewSelector}')`)
  if (mode === 'loading') await wait(`!!document.querySelector('${viewSelector} [role=status][aria-busy=true]')`)
  else if (['inventory-error', 'provider-error'].includes(mode)) await wait(`!!document.querySelector('${viewSelector} [role=alert]')`)
  else if (['empty', 'no-provider'].includes(mode) || (phase6 && providerCount === 0)) await wait(`!!document.querySelector('${viewSelector} [role=status] h2')`)
  else await wait(`!!document.querySelector('${viewSelector} tbody tr') && !document.querySelector('${viewSelector} [role=status][aria-busy=true]')`)
  await read('document.fonts.ready.then(()=>true)')
  if (classicScrollbar) await read(`document.documentElement.style.overflowY='scroll';new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))`)
}
const rowsReady = `!!document.querySelector('${viewSelector} tbody tr td:not([colspan])') && !document.querySelector('${viewSelector} [aria-busy=true]')`
const scopeTrigger = `document.querySelector('[data-provider-scope] button[aria-haspopup=dialog]')`
const scopePanel = `document.getElementById(document.querySelector('[data-provider-scope] button[aria-haspopup=dialog]')?.getAttribute('aria-controls'))`
async function foreground() {
  if (!await read('document.hasFocus()')) await send('Page.bringToFront')
  await wait('document.hasFocus()')
}
async function focus(selector) {
  await foreground()
  const { root } = await send('DOM.getDocument')
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector })
  assert.ok(nodeId, `Focus target: ${selector}`)
  await send('DOM.focus', { nodeId })
}
async function resize(width, height = 900) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
  await read('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))')
}
async function footerReachability(name, frame) {
  if (!frame.footer || frame.windowWidth < 1024 || frame.footer.bottom <= frame.windowHeight) return
  const inspect = `(() => {const card=document.querySelector('${viewSelector}'),footer=card.querySelector('section[aria-label]').lastElementChild;let owner=card.parentElement;while(owner&&!(/auto|scroll/.test(getComputedStyle(owner).overflowY)&&owner.scrollHeight>owner.clientHeight+1))owner=owner.parentElement;const r=owner?.getBoundingClientRect();return {footerBottom:footer.getBoundingClientRect().bottom,viewportHeight:innerHeight,owner:owner?{classes:owner.className,scrollTop:owner.scrollTop,maxScroll:owner.scrollHeight-owner.clientHeight,x:Math.min(r.right,innerWidth)-2,y:Math.max(r.y,0)+20}:null};})()`
  const before = await read(inspect)
  results.at(-1).footerReachability = { before }
  assert.ok(before.owner, `${name}: a short viewport offers a scroll owner for the footer`)
  await foreground()
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: before.owner.x, y: before.owner.y, deltaY: 100, deltaX: 0 })
  await wait(`(${inspect}).footerBottom<=innerHeight`)
  const after = await read(inspect)
  results.at(-1).footerReachability.after = after
  await screenshot(`${name}-footer-reached`)
  assert.ok(after.footerBottom <= after.viewportHeight, `${name}: footer becomes reachable by native outer scrolling`)
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: before.owner.x, y: before.owner.y, deltaY: -100, deltaX: 0 })
  await wait(`Math.abs((${inspect}).owner.scrollTop-${before.owner.scrollTop})<=1`)
}
async function scopeGeometry(name, expectedProviderId) {
  const frame = await geometry(name)
  const value = await read(`(() => {
    const card=document.querySelector('${viewSelector}');if(!card)return {missing:true,document:${documentState}};const nav=card.querySelector('[role=tablist]'),summary=card.querySelector('[data-provider-scope]');
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,text:e.textContent}};
    const tabs=nav?[...nav.querySelectorAll('[role=tab]')]:[];
    return {provider:summary?.dataset.providerScope??null,summary:summary?rect(summary):null,regions:summary?[...summary.querySelectorAll('[role=region]')].map(rect):[],navigationChildren:nav?.parentElement.parentElement.parentElement.children.length,
      nav:nav?rect(nav):null,availableWidth:nav?.parentElement.parentElement.clientWidth,scrollLeft:nav?.scrollLeft,gap:nav?getComputedStyle(nav).columnGap:null,tabs:tabs.map(t=>({...rect(t),label:t.getAttribute('aria-label'),selected:t.getAttribute('aria-selected'),tabIndex:t.tabIndex})),
      names:tabs.map(t=>({ ...rect(t.firstElementChild.firstElementChild),display:getComputedStyle(t.firstElementChild.firstElementChild).display,textOverflow:getComputedStyle(t.firstElementChild.firstElementChild).textOverflow })),
      badges:tabs.map(t=>({tab:rect(t),badge:rect(t.firstElementChild.lastElementChild)})),controls:nav?[...nav.parentElement.querySelectorAll('button:not([role=tab])')].map(e=>({...rect(e),disabled:e.disabled})):[],
      trigger:summary?.querySelector('[aria-haspopup=dialog]')?.textContent??null};})()`)
  requireDocument(value, name)
  results.at(-1).phase6 = { scope, providerCount, expectedProviderId, ...value }
  assert.equal(value.tabs.length, providerCount, `${name}: exact visible-role provider count`)
  assert.equal(value.provider, expectedProviderId, `${name}: metadata follows selected configured provider`)
  if (!value.nav) return value
  const tagCount = expectedProviderId ? (configuredScope('source').vmTags?.filter(tag => tag.trim()).map(tag => tag.trim()) ?? []) : []
  const uniqueTagCount = new Set(tagCount).size
  assert.equal(value.trigger, uniqueTagCount > 1 ? `+${uniqueTagCount - 1}` : null, `${name}: one visible tag, remainder in +N`)
  assert.equal(value.gap, '4px', `${name}: small consistent gap matches spike`)
  assert.ok(value.nav.width < frame.card.width, `${name}: navigation is narrower than card`)
  assert.ok(value.nav.width >= value.tabs[0].width - 1, `${name}: one whole provider slot fits`)
  for (const label of value.names) {
    assert.ok(label.display !== 'none' && label.clientWidth > 0, `${name}: provider name is visible: ${label.text}`)
    assert.ok(label.scrollWidth <= label.clientWidth + 1 && label.textOverflow !== 'ellipsis', `${name}: entire provider name is readable: ${label.text}`)
  }
  for (const { tab, badge } of value.badges) {
    if (badge.text.length < 15) assert.ok(badge.x >= tab.x && badge.right <= tab.right, `${name}: short badge fits ${badge.text}`)
  }
  for (let i = 1; i < value.tabs.length; i++) {
    assert.ok(Math.abs(value.tabs[i].x - value.tabs[i - 1].right - 4) <= 1, `${name}: natural tabs have no blank slots`)
  }
  if (value.trigger) {
    const tagGap = await read(`(() => {const s=document.querySelector('[data-provider-scope]'),t=s.querySelector('[data-provider-tag-index="0"]'),b=s.querySelector('button[aria-haspopup=dialog]');const r=document.createRange();r.selectNodeContents(t);return {gap:b.getBoundingClientRect().x-r.getBoundingClientRect().right,fits:t.scrollWidth<=t.clientWidth+1 && t.getBoundingClientRect().height<=parseFloat(getComputedStyle(t).lineHeight)+1};})()`)
    if (tagGap.fits) assert.ok(tagGap.gap <= 9, `${name}: +N follows tag text without stretched blank space`)
  }
  if (value.summary) {
    assert.ok(value.regions.every(region => region.scrollWidth <= region.clientWidth + 1), `${name}: scope values do not need horizontal scrolling`)
    assert.ok(value.regions.every(region => region.clientWidth > 0), `${name}: prefix/tag regions have positive readable width`)
    assert.ok(value.summary.y < value.nav.bottom && value.summary.bottom > value.nav.y, `${name}: summary remains on same band`)
    const navigationRight = value.controls.at(-1)?.right ?? value.nav.right
    assert.ok(navigationRight <= value.summary.x + 1, `${name}: summary does not overlap navigation`)
    assert.ok(value.summary.right <= frame.card.right, `${name}: summary fits card`)
  } else assert.equal(value.navigationChildren, 1, `${name}: no metadata wrapper or reserved block`)
  await footerReachability(name, frame)
  return value
}
async function assertOr(role, name, requestStart) {
  const expected = {
    none: { rows: ['FIRST','SECOND','BOTH','EXCLUDED','LOWERCASE','OUTSIDE'], metrics: ['6','5','5','444 GB'], cpu: '222', raw: 6 },
    prefix: { rows: ['FIRST','SECOND','BOTH','EXCLUDED','LOWERCASE'], metrics: ['5','4','4','412 GB'], cpu: '206', raw: 5 },
    'tag-1': { rows: ['FIRST','BOTH','OUTSIDE'], metrics: ['3','3','2','52 GB'], cpu: '26', raw: 3 },
    'both-1': { rows: ['FIRST','BOTH'], metrics: ['2','2','1','20 GB'], cpu: '10', raw: 2 },
    'tag-2': { rows: ['FIRST','SECOND','BOTH','OUTSIDE'], metrics: ['4','3','3','60 GB'], cpu: '30', raw: 6 },
    'tag-5': { rows: ['FIRST','SECOND','BOTH','OUTSIDE'], metrics: ['4','3','3','60 GB'], cpu: '30', raw: 6 },
    'both-2': { rows: ['FIRST','SECOND','BOTH'], metrics: ['3','2','2','28 GB'], cpu: '14', raw: 5 },
    'both-5': { rows: ['FIRST','SECOND','BOTH'], metrics: ['3','2','2','28 GB'], cpu: '14', raw: 5 },
  }[scope]
  const id = role === 'source' ? 'vmware-01' : 'target-vmware-01'
  const prefix = role === 'source' ? 'SRC-' : 'TGT-'
  const actual = await read(`({rows:[...document.querySelectorAll('${viewSelector} tbody tr')].map(e=>e.querySelector('td')?.textContent.trim()),metrics:[...document.querySelectorAll('article strong')].map(e=>e.textContent),metricText:[...document.querySelectorAll('article')].map(e=>e.textContent)})`)
  assert.deepEqual(actual.rows, expected.rows.map(suffix => `${suffix === 'OUTSIDE' ? 'OTHER-' : prefix}${suffix}`), `${name}: exact OR rows (second-only included, both once)`)
  assert.deepEqual(actual.metrics, expected.metrics, `${name}: provider-scoped metrics`)
  assert.ok(actual.metricText.at(-1).includes(`${expected.cpu} total vCPU`), `${name}: scoped CPU metric`)
  const search = requests.slice(requestStart).filter(request => request.path === '/vms/search' && request.providerId === id)
  assert.equal(search.length, 1, `${name}: one foreground request, no tag fan-out`)
  const body = {}
  if (scope === 'prefix' || scope.startsWith('both')) body.name_prefix = prefix
  if (scope.endsWith('-1')) body.tag = 'WEB'
  assert.deepEqual(search[0].body, body, `${name}: real singular-tag API contract`)
  assert.equal(search[0].rawNames.length, expected.raw, `${name}: complete raw wire response`)
  results.at(-1).orEvidence = { ...actual, request: search[0], expected }
}
async function popover(name) {
  await click(scopeTrigger)
  await wait(`!!${scopePanel} && getComputedStyle(${scopePanel}).visibility==='visible'`)
  const panel = await read(`(() => {const e=${scopePanel},r=e.getBoundingClientRect(),t=${scopeTrigger};return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:r.width,height:r.height,viewportWidth:document.documentElement.clientWidth,viewportHeight:innerHeight,role:e.getAttribute('role'),modal:e.getAttribute('aria-modal'),portal:e.parentElement===document.body,tags:[...e.querySelectorAll('li')].map(e=>e.textContent),title:e.querySelector('h3')?.textContent,trigger:t.getAttribute('aria-label')};})()`)
  results.at(-1).popover = panel
  await screenshot(`${name}-popover`)
  assert.equal(panel.role, 'dialog')
  assert.notEqual(panel.modal, 'true')
  assert.equal(panel.portal, true)
  assert.ok(panel.x >= 8 && panel.right <= panel.viewportWidth - 8, `${name}: both panel horizontal boundaries`)
  assert.ok(panel.y >= 8 && panel.bottom <= panel.viewportHeight - 8, `${name}: panel vertical boundaries`)
  assert.deepEqual(panel.tags, scope === 'long' ? configuredScope('source').vmTags : scopeTags)
  assert.ok(panel.title.includes('5') && panel.trigger.includes('5'), `${name}: total count accessible`)
  await keyPress('Tab')
  await wait(`document.activeElement===${scopePanel}`)
  await keyPress('Tab', 8)
  await wait(`document.activeElement===${scopeTrigger}`)
  await keyPress('Tab')
  await keyPress('Escape')
  await wait(`!${scopePanel} && document.activeElement===${scopeTrigger}`)
}
async function phase6Interactions(role, path, id) {
  const prefix = role === 'source' ? '' : 'target-'
  const route = path.split('?')[0]
  const secondId = `${prefix}vmware-03`
  const selected = `document.querySelector('${viewSelector} [role=tab][aria-selected=true]')`
  const next = `Array.from(document.querySelectorAll('${viewSelector} button')).find(e=>/next.*tabs/i.test(e.getAttribute('aria-label')??''))`
  const previous = `Array.from(document.querySelectorAll('${viewSelector} button')).find(e=>/previous.*tabs/i.test(e.getAttribute('aria-label')??''))`
  providerCount = 10
  scope = 'both-5'
  await load(path, { width: 1440 })
  await new Promise(resolve => setTimeout(resolve, 1100)) // Allow the existing idle background prefetch to settle.
  const before = await read(`({url:location.href,selected:${selected}.getAttribute('aria-label'),left:document.querySelector('[role=tablist]').scrollLeft,width:document.querySelector('[role=tablist]').clientWidth,slot:document.querySelector('[role=tab]').getBoundingClientRect().width,max:document.querySelector('[role=tablist]').scrollWidth-document.querySelector('[role=tablist]').clientWidth})`)
  const requestCount = requests.filter(request => ['/vms/search','/get_volumes','/get_power_vm'].includes(request.path)).length
  assert.equal(await read(`${previous}.disabled`), true, 'Start arrow disabled')
  const arrowX = await read(`${next}.getBoundingClientRect().x`)
  await click(next)
  const expectedLeft = Math.min(before.max, Math.max(160, before.width * 0.8))
  await wait(`Math.abs(document.querySelector('[role=tablist]').scrollLeft-${expectedLeft})<=1`)
  assert.equal(await read(`${next}.getBoundingClientRect().x`), arrowX, 'Next arrow stays fixed after scrolling')
  assert.equal(await read('location.href'), before.url, 'Scroll controls do not change selection URL')
  assert.equal(await read(`${selected}.getAttribute('aria-label')`), before.selected, 'Scroll controls do not select provider')
  assert.equal(requests.filter(request => ['/vms/search','/get_volumes','/get_power_vm'].includes(request.path)).length, requestCount, 'Scroll controls do not fetch inventory')
  while (!await read(`${next}.disabled`)) {
    const left = await read(`document.querySelector('[role=tablist]').scrollLeft`)
    await click(next)
    await wait(`document.querySelector('[role=tablist]').scrollLeft>${left}+1`)
    await read('new Promise(resolve=>setTimeout(()=>resolve(true),350))')
  }
  assert.equal(await read(`${next}.disabled`), true, 'End arrow disabled')
  let currentProvider = 'vmware-01'
  const badge = provider => {
    const suffix = /(\d+)$/.exec(provider)?.[1]
    return suffix ? `${provider.startsWith('vmware') ? 'vm' : provider.startsWith('flash') ? 'flash' : 'power'}-${suffix}` : prefix + provider
  }
  for (const [key, provider] of [['End','power-01'],['ArrowRight','provider-with-an-unusually-long-identifier'],['Home','provider-with-an-unusually-long-identifier'],['ArrowLeft','power-01'],['Home','provider-with-an-unusually-long-identifier'],['ArrowRight','vmware-01']]) {
    await wait(`${selected}?.firstElementChild.lastElementChild.textContent===${JSON.stringify(badge(currentProvider))}`)
    await focus(`${viewSelector} [role=tab][aria-selected=true]`)
    await wait(`document.activeElement===${selected} && ${selected}.firstElementChild.lastElementChild.textContent===${JSON.stringify(badge(currentProvider))}`)
    interactionDiagnostics.push({ role, key, before: await read(`({url:location.href,selected:${selected}.textContent,focused:document.activeElement.textContent})`) })
    await keyPress(key)
    await wait(`new URL(location.href).searchParams.get('providerId')===${JSON.stringify(prefix + provider)}`)
    await wait(`${selected}?.firstElementChild.lastElementChild.textContent===${JSON.stringify(badge(provider))}`)
    await wait(rowsReady)
    interactionDiagnostics.at(-1).after = await read(`({url:location.href,selected:${selected}.textContent,focused:document.activeElement.textContent})`)
    currentProvider = provider
    assert.equal(await read(`document.querySelectorAll('${viewSelector} [role=tab][tabindex="0"]').length`), 1, 'One roving keyboard tab stop')
  }
  await scopeGeometry(`phase6-${role}-arrow-keyboard-navigation`, id)
  await resize(320)
  await wait(`(() => {const t=${selected}.getBoundingClientRect(),v=document.querySelector('[role=tablist]').getBoundingClientRect();return t.x>=v.x-1&&t.right<=v.right+1;})()`)
  const swipeRect = await read(`(() => {const r=document.querySelector('[role=tablist]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,left:document.querySelector('[role=tablist]').scrollLeft};})()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: swipeRect.x, y: swipeRect.y, deltaX: 160, deltaY: 0 })
  await wait(`document.querySelector('[role=tablist]').scrollLeft>${swipeRect.left}+1`)
  const wheelLeft = await read(`document.querySelector('[role=tablist]').scrollLeft`)
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: swipeRect.x + 30, y: swipeRect.y }] })
  for (const delta of [10,30,50]) {
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: swipeRect.x + 30 - delta, y: swipeRect.y }] })
    await new Promise(resolve => setTimeout(resolve, 30))
  }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(`document.querySelector('[role=tablist]').scrollLeft>${wheelLeft}+1`)
  assert.equal(await read(`new URL(location.href).searchParams.get('providerId')`), id, 'Wheel/touch scrolling does not select')
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await screenshot(`phase6-${role}-touch-wheel-navigation`)

  providerCount = 5
  await load(path, { width: 320 })
  await click(scopeTrigger)
  await wait(`!!${scopePanel}`)
  await click(`document.querySelector('${viewSelector} h2')??document.querySelector('h1')`)
  await wait(`!${scopePanel}`)
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await foreground()
  const tapProbe = `(() => {const t=${scopeTrigger},r=t.getBoundingClientRect(),point={x:r.x+r.width/2,y:r.y+r.height/2},hit=document.elementFromPoint(point.x,point.y);return {point,rect:{x:r.x,y:r.y,width:r.width,height:r.height},focused:document.hasFocus(),connected:t.isConnected,hitsTrigger:hit===t||t.contains(hit)};})()`
  const firstTapFrame = await read(tapProbe)
  await read('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))')
  const tap = await read(tapProbe)
  assert.deepEqual(tap.rect, firstTapFrame.rect, 'Native tap target remains stable after touch emulation')
  assert.ok(tap.focused && tap.connected && tap.hitsTrigger, 'Native tap starts on the connected trigger in the focused page')
  await read(`window.__inventoryQaTouchEvents=[];for(const type of ['pointerdown','touchstart','pointerup','touchend','focusin','click'])document.addEventListener(type,event=>queueMicrotask(()=>window.__inventoryQaTouchEvents.push({type:event.type,trusted:event.isTrusted,defaultPrevented:event.defaultPrevented,target:event.target?.getAttribute?.('aria-label')??event.target?.tagName})),true);true`)
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...tap.point, id: 1, radiusX: 1, radiusY: 1, force: 1 }] })
  await new Promise(resolve => setTimeout(resolve, 80))
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(`window.__inventoryQaTouchEvents.some(event=>event.type==='click')`)
  await wait(`!!${scopePanel}`)
  const tapEvents = await read('window.__inventoryQaTouchEvents')
  interactionDiagnostics.push({ role, step: 'native-80ms-touch-tap', firstTapFrame, tap, events: tapEvents })
  for (const type of ['pointerdown','touchstart','pointerup','touchend','click']) assert.ok(tapEvents.some(event => event.type === type && event.trusted && !event.defaultPrevented), `Native tap delivers trusted ${type}`)
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await click(`(${scopePanel}).querySelector('button')`)
  await wait(`!${scopePanel}`)

  await load(path, { width: 1440 })
  await click(scopeTrigger)
  await wait(`!!${scopePanel}`)
  await click(`document.querySelectorAll('${viewSelector} [role=tab]')[1]`)
  await wait(`document.querySelector('[data-provider-scope]')?.dataset.providerScope===${JSON.stringify(secondId)}`)
  await wait(`!document.querySelector('[role=dialog]')`)
  assert.equal(await read(`!!${scopePanel}`), false, 'Identical-scope provider change dismisses old panel')
  providerScopeOverrides = { [secondId]: { vmTags: ['DR','Critical','Tier-1','Backup','Different'] } }
  await load(path)
  await click(scopeTrigger)
  await click(`document.querySelectorAll('${viewSelector} [role=tab]')[1]`)
  await wait(`document.querySelector('[data-provider-scope]')?.dataset.providerScope===${JSON.stringify(secondId)}`)
  await wait(`!document.querySelector('[role=dialog]')`)
  assert.ok(await read(`document.querySelector('[data-provider-scope]').textContent.includes('DR')`), 'New configured tags shown immediately')
  providerScopeOverrides = {}

  scope = 'both-2'
  await load(path, { width: 1099 })
  await focus('[data-provider-scope]')
  for (let i = 0; i < 3; i++) await keyPress('Tab')
  await wait(`!!${scopePanel} && document.activeElement===${scopeTrigger}`)
  interactionDiagnostics.push({ role, step: 'initial-1099-native-tab', ...await read(`({pageFocused:document.hasFocus(),active:document.activeElement.outerHTML,expanded:${scopeTrigger}.getAttribute('aria-expanded'),connected:${scopeTrigger}.isConnected,panel:!!${scopePanel}})`) })
  await keyPress('Escape')
  await load(path, { width: 1100 })
  await focus('[data-provider-scope] button[aria-haspopup=dialog]')
  await wait(`!!${scopePanel}`)
  await resize(1099)
  await wait(`document.activeElement===${scopeTrigger} && !!${scopePanel}`)
  await keyPress('Tab')
  await resize(1100)
  await wait(`document.activeElement===${scopePanel}`)
  assert.equal(await read(`${scopeTrigger}.textContent`), '+1', 'Two-tag scope retains +1 across resize')
  await keyPress('Escape')
  await focus(`${viewSelector} [role=tab][aria-selected=true]`)
  const external = await read('document.activeElement.outerHTML')
  await resize(1099)
  assert.equal(await read('document.activeElement.outerHTML'), external, 'Resize preserves external focus')
  await screenshot(`phase6-${role}-resize-focus-boundaries`)

  scope = 'both-5'
  for (const state of ['loading','inventory-error','empty']) {
    mode = state
    await load(path)
    await scopeGeometry(`phase6-${role}-configured-${state}`, id)
    if (state === 'inventory-error') {
      mode = 'success'
      await click(`Array.from(document.querySelectorAll('${viewSelector} [role=alert] button')).find(e=>/retry/i.test(e.textContent))`)
      await wait(rowsReady)
    }
    if (state === 'loading') {
      await click(`document.querySelectorAll('${viewSelector} [role=tab]')[1]`)
      await wait(`document.querySelector('[data-provider-scope]')?.dataset.providerScope===${JSON.stringify(secondId)}`)
      await screenshot(`phase6-${role}-provider-switch-while-loading`)
    }
  }
  mode = 'success'
  await load(path)
  const refreshStart = requests.length
  mode = 'inventory-error'
  await click(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()==='Refresh')`)
  await wait(`!!document.querySelector('[role=alert]') && ${rowsReady}`)
  await scopeGeometry(`phase6-${role}-configured-cached-refresh-error`, id)
  await foreground()
  mode = 'success'
  // Cached-refresh notices are siblings before the shared view frame.
  await click(`Array.from(document.querySelectorAll('[role=alert] button')).find(e=>/retry/i.test(e.textContent))`)
  await wait(`!document.querySelector('[role=alert]') && ${rowsReady}`)
  const forced = requests.slice(refreshStart).filter(request => request.path === '/vms/search' && request.providerId === id && request.body.force_refresh)
  assert.ok(forced.length >= 2 && forced.every(request => !('tag' in request.body) && request.body.name_prefix === (role === 'source' ? 'SRC-' : 'TGT-')), 'Refresh/retry retain prefix and no singular multi-tag filter')
  mode = 'provider-error'
  await load(path)
  await geometry(`phase6-${role}-provider-list-error-no-scope`)
  assert.equal(await read(`document.querySelector('[data-provider-scope]')`), null)
  mode = 'success'

  inventoryCount = 60
  await load(`${path}&pageSize=10`, { width: 1280, height: 600 })
  assert.equal(await read(`document.querySelectorAll('${viewSelector} tbody tr').length`), 10, 'Only page rows rendered')
  assert.deepEqual(await read(`[...document.querySelectorAll('article strong')].map(e=>e.textContent)`), ['30','20','2','280 GB'], 'Metrics represent whole scoped dataset before pagination')
  await load(`${path}&pageSize=50`, { width: 1280, height: 600 })
  const long = await scopeGeometry(`phase6-${role}-long-scoped-table`, id)
  const scroll = await read(`(() => {const e=document.querySelector('${viewSelector} .overflow-y-auto'),r=e.getBoundingClientRect();return {x:r.x+50,y:r.y+30,nav:document.querySelector('[role=tablist]').getBoundingClientRect().y,document:scrollY};})()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: scroll.x, y: scroll.y, deltaY: 240, deltaX: 0 })
  await wait(`document.querySelector('${viewSelector} .overflow-y-auto').scrollTop>0`)
  const scrollTop = await read(`document.querySelector('${viewSelector} .overflow-y-auto').scrollTop`)
  await popover(`phase6-${role}-long-scoped-table`)
  await screenshot(`phase6-${role}-long-scoped-table-scrolled`)
  assert.equal(await read(`document.querySelector('${viewSelector} .overflow-y-auto').scrollTop`), scrollTop, 'Popover and capture preserve data scroll')
  assert.equal(await read(`document.querySelector('[role=tablist]').getBoundingClientRect().y`), scroll.nav, 'Data scroll leaves navigation fixed')
  assert.equal(await read('scrollY'), scroll.document, 'Data scroll does not scroll document')
  results.at(-1).dataScroll = { scrollTop, afterCapture: scrollTop, navigation: long.nav }
  inventoryCount = 2
  await load(`${route}?resource=vmware&providerId=not-an-existing-provider`)
  await wait(rowsReady)
  assert.equal(await read(`document.querySelector('[data-provider-scope]')?.dataset.providerScope`), id, 'Invalid deep link uses role-correct fallback')
}
async function phase6Cases() {
  phase6 = true
  mode = 'success'
  providerCount = 5
  scope = 'both-5'
  for (const role of ['source', 'target']) {
    const route = role === 'source' ? '/discovery-inventory/resources' : '/discovery-inventory/resources-ise'
    const id = role === 'source' ? 'vmware-01' : 'target-vmware-01'
    const path = `${route}?resource=vmware&providerId=${id}`
    if (phase6FooterOnly) {
      await load(path, { width: 1280, height: 600, zoom: 1.25 })
      await scopeGeometry('phase6-focused-short-viewport-footer', id)
      break
    }
    if (phase6InteractionsOnly) {
      await phase6Interactions(role, path, id)
      continue
    }
    for (const width of [1440, 320]) {
      await load(path, { width, height: quick && width === 320 ? 844 : 900, classicScrollbar: quick && width === 320 })
      const name = `phase6-${role}-both-5-${width}`
      await scopeGeometry(name, id)
      await popover(name)
      await click(`[...document.querySelectorAll('${viewSelector} button')].find(e=>/^Filters/.test(e.textContent))`)
      await wait(`!!document.querySelector('#modal-tag-filter')`)
      assert.equal(await read(`document.querySelector('#modal-tag-filter').disabled`), true, 'Provider-configured tag dropdown is fully disabled')
      for (const tag of scopeTags) assert.ok(await read(`document.querySelector('#modal-tag-filter').textContent.includes(${JSON.stringify(tag)})`), 'Disabled field retains every loaded tag')
      const disabledTagPoint = await read(`(() => {const r=document.querySelector('#modal-tag-filter').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...disabledTagPoint, button: 'left', clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...disabledTagPoint, button: 'left', clickCount: 1 })
      assert.equal(await read(`!!document.querySelector('[role=group][aria-label="Tag"]')`), false, 'Disabled tag dropdown cannot open')
      await screenshot(`${name}-loaded-filter-tags`)
      await keyPress('Escape')
      await wait(`!document.querySelector('[role=dialog][aria-modal=true]')`)

    }
    scope = 'readable'
    for (const width of [1440, 320]) {
      await load(path, { width })
      const name = `phase6-${role}-readable-scope-${width}`
      await scopeGeometry(name, id)
      if (width === 1440) {
        const heights = await read(`[...document.querySelectorAll('[data-provider-scope] [role=region]')].map(e=>({height:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight)}))`)
        assert.ok(heights.every(e=>e.height<=e.line+1), 'TEST- and Nekriticke-produkcne fit on one desktop line')
      }
    }
    for (const variant of ['none', 'prefix', 'tag-1', 'both-1', 'tag-2', 'both-2', 'tag-5', 'both-5']) {
      scope = variant
      const start = requests.length
      await load(path, { width: 1440 })
      const name = `phase6-${role}-scope-${scope}`
      await scopeGeometry(name, scope === 'none' ? null : id)
      await assertOr(role, name, start)
    }
    if (quick) continue
    scope = 'both-5'
    for (const theme of ['light', 'dark']) for (const [width, height, zoom] of [[320,844,1],[768,900,1],[1024,900,1],[1440,900,1],[1280,600,1],[1600,900,1.25],[1280,600,1.25]]) {
      await load(path, { theme, width, height, zoom, classicScrollbar: width === 320 && height === 844 })
      const name = `phase6-${role}-${theme}-${width}x${height}-zoom${zoom}`
      await scopeGeometry(name, id)
      await popover(name)
    }
    for (const count of [0,1,2,4,5,10]) for (const variant of ['none', 'both-5']) {
      providerCount = count
      scope = variant
      await load(path)
      await scopeGeometry(`phase6-${role}-${count}-providers-${scope}`, count && scope !== 'none' ? id : null)
    }
    providerCount = 5
    scope = 'both-5'
    for (const width of [1535,1536]) {
      await load(path, { width })
      await scopeGeometry(`phase6-${role}-slot-boundary-${width}`, id)
    }
    for (const variant of ['none','prefix','tag-1','long']) {
      scope = variant
      await load(path, { width: 320 })
      const name = `phase6-${role}-mobile-${scope}`
      await scopeGeometry(name, scope === 'none' ? null : id)
      if (scope === 'long') await popover(name)
    }
    scope = 'both-5'
    for (const [resource, provider] of [['flashsystem','flash-01'],['ibm-power','power-01']]) {
      await load(`${route}?resource=${resource}&providerId=${role === 'target' ? 'target-' : ''}${provider}`, { width: 320 })
      await scopeGeometry(`phase6-${role}-${resource}-mobile-badge`, null)
    }
    await phase6Interactions(role, path, id)
  }
}
try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Inspector.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
  if (!phase6Only && !phase6InteractionsOnly && !phase6FooterOnly) {
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
        await keyPress(key)
        await wait(`new URL(location.href).searchParams.get('providerId')===${JSON.stringify(prefix + provider)}`)
        await wait(`document.querySelector('${viewSelector} [role=tab][aria-selected=true]')?.textContent.includes(${JSON.stringify(provider.replace('vmware', 'vm'))})`)
      }
      await wait(`!!document.querySelector('${viewSelector} tbody tr') && !document.querySelector('${viewSelector} [aria-busy=true]')`)
      await geometry(`${role}-keyboard-view-switching`)

      await load(route)
      await click(`document.querySelector('${viewSelector} tbody tr')`)
      await wait(`!!document.querySelector('[role=dialog]')`)
      await screenshot(`${role}-row-detail`)
      await keyPress('Escape')
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
      const nonce = String(++navigation)
      await send('Page.navigate', { url: `${base}${path}?inventory-qa-run=${nonce}` })
      await wait(`document.readyState==='complete' && window.__inventoryQaRun===${JSON.stringify(nonce)} && !!document.querySelector('h1') && !!document.querySelector('${viewSelector}')`)
      if (path.includes('platform-providers')) await wait(`!!document.querySelector('${viewSelector} tbody tr')`)
      else if (path.includes('recovery-runs')) await wait(`!!document.querySelector('${viewSelector} [role=tablist]')`)
      else await wait(`!!document.querySelector('#discovery-cache-retention-days')`)
      await geometry(`shared-smoke-${path.split('/').at(-1)}`)
    }
  }
  }
  legacyCaptures = results.length
  if (!quick && !interactionsOnly && !phase6Only && !phase6InteractionsOnly && !phase6FooterOnly) assert.equal(legacyCaptures, 64, 'All previous resource captures remain covered')
  if (phase6Only || phase6InteractionsOnly || phase6FooterOnly || (!quick && !interactionsOnly)) await phase6Cases()
  phase6Captures = results.length - legacyCaptures
  assert.deepEqual(exceptions, [], 'No browser runtime exceptions')
  assert.deepEqual(unexpected, [], 'All mocked API endpoints are accounted for')
  assert.deepEqual(resourceFailures, [], 'No failed application assets')
  assert.deepEqual(rendererCrashes, [], 'No renderer crashes')
  completed = true
  console.log(`PASS: ${results.length} geometry captures (legacy ${legacyCaptures}, phase6 ${phase6Captures}); output ${output}`)
} finally {
  try {
    await screenshot('last-state').catch(error => console.warn(`Diagnostic screenshot unavailable: ${error.message}`))
    await writeFile(join(output, 'results.json'), JSON.stringify({ completed, legacyCaptures, phase6Captures, results, requests, exceptions, unexpected, resourceFailures, navigationDiagnostics, interactionDiagnostics, interceptionCancellations, pageEvents, rendererCrashes, limits: ['Invented local fixtures; no live backend or authentication integration.', '125% is CSS viewport/raster emulation, not native browser zoom.', 'Browser proves full wire response and scoped UI; raw cache immutability is covered by focused query/component tests.'] }, null, 2))
      .catch(error => console.warn(`Diagnostic results unavailable: ${error.message}`))
  } finally {
    // Keep interception attached until the tab is gone, so pending API reads
    // cannot be released to Vite's proxy during cleanup.
    try {
      const response = await fetch(`${endpoint}/json/close/${target.id}`)
      assert.ok(response.ok, `QA target cleanup failed: ${response.status}`)
    } finally {
      socket.close()
      for (const { timer } of pending.values()) clearTimeout(timer)
    }
  }
}
