import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Run Vite on 127.0.0.1:5191 and a dedicated headless Chrome with
// --remote-debugging-port=9357 --user-data-dir=<temporary QA profile>.
// node scripts/qa/shared-inventory-view-browser.mjs
// Optional focused modes: --quick, --geometry-only, --interactions-only, --standalone-only.
// All config/API calls in this isolated tab are fulfilled locally. No live backend.
const base = process.env.INVENTORY_QA_BASE ?? 'http://127.0.0.1:5191'
const endpoint = process.env.INVENTORY_QA_CDP ?? 'http://127.0.0.1:9357'
const output = process.env.INVENTORY_QA_OUTPUT ?? join(tmpdir(), 'abco-shared-inventory-qa')
const quick = process.argv.includes('--quick')
const interactionsOnly = process.argv.includes('--interactions-only')
const standaloneOnly = process.argv.includes('--standalone-only')
const geometryOnly = process.argv.includes('--geometry-only')
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
const held = []
let mode = 'success'
let inventoryCount = 2
let statePaths = []
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence
  const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)) }, method === 'Page.captureScreenshot' ? 45000 : 15000)
  pending.set(id, { resolve, reject, timer })
  socket.send(JSON.stringify({ id, method, params }))
})
function providers() {
  if (mode === 'no-provider') return []
  return ['source', 'target'].flatMap(role => [
    ['vmware-01', 'VMWARE'], ['vmware-03', 'VMWARE'], ['flash-01', 'FLASHCOPY'], ['power-01', 'IBM_POWER'],
  ].map(([id, type]) => ({ id: role === 'source' ? id : `target-${id}`, name: id, type, role, description: '', ipAddress: '127.0.0.1', credentialId: null, credentialStatus: 'none' })))
}
function fixture(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api/, '')
  const providerId = url.searchParams.get('provider_id') ?? 'vmware-01'
  if (path === '/config.js') return { raw: 'window.__APP_CONFIG__={AUTH_ENABLED:"true",KEYCLOAK_URL:"http://127.0.0.1:5191/qa-auth",KEYCLOAK_REALM:"qa",KEYCLOAK_CLIENT_ID:"qa"};' }
  // Identity is hidden in auth-disabled builds. Fulfill only the localhost dev
  // adapter module with an invented signed-in user; no real token/session exists.
  if (path === '/src/config/keycloak.ts') return { raw: 'export const keycloak={authenticated:true,token:"qa-invented-token",init:async()=>true,loadUserProfile:async()=>({username:"qa",firstName:"QA",lastName:"User",email:"qa@example.test"}),updateToken:async()=>false,logout:async()=>{},login:async()=>{}};' }
  if (statePaths.includes(path)) {
    if (mode === 'loading') return { hold: true }
    if (mode === 'error') return { failure: true }
  }
  if (path === '/get_providers') return { providers: mode === 'empty' && statePaths.includes(path) ? [] : providers() }
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
  if (path === '/get_platform_providers') return { providers: mode === 'empty' && statePaths.includes(path) ? [] : [{ id: 'airflow-qa', name: 'QA Airflow', type: 'AIRFLOW', url: 'https://example.test', port: 22 }] }
  const extra = sharedFixture(path, url)
  if (extra) return extra

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
    if (url.pathname !== '/config.js' && url.pathname !== '/src/config/keycloak.ts' && !url.pathname.startsWith('/api/')) {
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
async function wait(expression, attempts = 450) {
  for (let i = 0; i < attempts; i++) {
    if (await read(expression)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw Error(`Timed out: ${expression}\n${await read('document.body.innerText.slice(-1800)')}`)
}
async function click(expression) {
  await wait(`(() => {const e=${expression};return !!e&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&e.getClientRects().length>0;})()`)
  const point = await read(`(() => { const e=${expression}; if(!e) throw Error('Missing click target'); e.scrollIntoView({block:'nearest',inline:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
}
const viewSelector = '[data-inventory-view]'
async function screenshot(name, clip) {
  await read('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))')
  // Full-document capture can reset nested scrollTop in Chrome. Keep the real
  // viewport so screenshots preserve the same form/table state we measured.
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip ? { clip } : {}) })
  await writeFile(join(output, `${name}.png`), Buffer.from(data, 'base64'))
}

function sharedFixture(path, url) {
  const items = values => mode === 'empty' && statePaths.includes(path) ? [] : values
  const fixtures = {
    '/get_users': { users: items(Array.from({ length: inventoryCount }, (_, i) => ({ id: `qa-user-${i}`, user: `QA User ${i}`, username: `qa-user-${i}`, email: `qa${i}@example.test`, roles: ['viewer'], status: 'Active' }))) },
    '/get_roles_permissions': { permissions: ['view'], roles: items([{ name: 'viewer', permissions: ['view'], description: 'QA viewer', users: ['qa-user-0'], userCount: 1, clientId: 'abco' }]) },
    '/get_identity_clients': { clients: items([{ id: 'qa-client', clientId: 'abco', displayName: 'QA ABCo', protocol: 'openid-connect', rootUrl: '', homeUrl: '', enabled: true, isPublicClient: false, roles: [] }]) },
    '/get_credentials': { credentials: items([{ id: 'qa-credential', name: 'QA credential', username: 'qa', description: 'Invented fixture' }]) },
    '/get_policy_sets': { policy_sets: items([{ id: 'qa-set', name: 'QA policy set', description: 'Invented fixture' }]) },
    '/get_policies': { snapshot_policies: items([{ id: 'qa-snapshot', name: 'QA snapshot', frequency_value: 1, frequency_unit: 'hours', retention_value: 7, retention_unit: 'days' }]) },
    '/get_recovery_app_policies': { recovery_app_policies: items([{ id: 'qa-recovery', name: 'QA recovery', retention_value: 7, retention_unit: 'days' }]) },
    '/get_clean_room_policies': { clean_room_policies: items([{ id: 'qa-clean', name: 'QA clean room' }]) },
    '/get_access_logs': { entries: items([{ timestamp: '2026-11-03T09:00:00Z', user: 'qa', method: 'GET', path: '/qa', status: 200, duration_ms: 4, request_body: null, response_body: null }]) },
    '/get_recovery_apps': { applications: items([{ id: 'qa-app', application: { name: 'QA application', description: 'Invented fixture', environment: 'qa', platform: 'VMWARE', source_provider_id: 'vmware-01', target_provider_id: 'target-vmware-01', tiers: {} }, orchestration: { run_id: 'qa-app-run', pushed: true, provider_id: 'airflow-qa' } }]) },
    '/get_recovery_groups': { recovery_groups: items([{ id: 'qa-group', name: 'QA recovery group', provider_id_vm: 'vmware-01', vms: [{ name: 'TEST-WEB01' }], orchestration: { run_id: 'qa-group-run', pushed: true, provider_id: 'airflow-qa' } }]) },
    '/get_orchestrator_runs': { provider_id: 'airflow-qa', dag_id: url.searchParams.get('dag_id') ?? 'dag_qa-app-run', dag_runs: items([{ dag_run_id: 'qa-run', state: 'success', start_date: '2026-11-03T09:00:00Z', end_date: '2026-11-03T09:01:00Z' }]), total_entries: mode === 'empty' && statePaths.includes(path) ? 0 : 1 },
    '/discovery/cache/history': { runs: items([{ provider_id: 'vmware-01', provider_type: 'VMWARE', triggered_by: 'forced', started_at: '2026-11-03T09:00:00Z', duration_ms: 100, success: true, record_count: 2 }]) },
  }
  return fixtures[path]
}

async function geometry(name) {
  console.log(`Check: ${name}`)
  const value = await read(`(() => {
    const card=document.querySelector('${viewSelector}'); const r=card.getBoundingClientRect(); const s=getComputedStyle(card);
    const rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height}};
    const tablist=card.querySelector('[role=tablist]'); const slot=tablist?card.firstElementChild:null;
    const clips=[];for(let e=card.parentElement;e;e=e.parentElement){const t=getComputedStyle(e);if(/hidden|auto|scroll/.test(t.overflow+t.overflowX+t.overflowY)){const a=e.getBoundingClientRect();clips.push({classes:e.className,left:r.left-a.left,right:a.right-r.right,bottom:a.bottom-r.bottom})}}
    const tabStyles=tablist?[tablist,tablist.parentElement].filter(e=>e!==slot).map(e=>({background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderBottomWidth})):[];
    const scrolls=[...card.querySelectorAll('*')].filter(e=>/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.clientHeight>0&&e.scrollHeight>e.clientHeight+1).map(e=>({tag:e.tagName,classes:e.className,...rect(e),clientHeight:e.clientHeight,scrollHeight:e.scrollHeight}));
    const save=[...card.querySelectorAll('button')].find(e=>/^save/i.test(e.textContent.trim()));
    return {card:rect(card),count:document.querySelectorAll('${viewSelector}').length,border:s.borderTopWidth,radius:s.borderTopLeftRadius,borders:[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],radii:[s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomRightRadius,s.borderBottomLeftRadius],shadow:s.boxShadow,overflow:s.overflow,
      headingX:document.querySelector('h1')?.getBoundingClientRect().x,nestedFrames:card.querySelectorAll('[data-table-surface]').length,
      divider:slot?getComputedStyle(slot).borderBottomWidth:null,tabStyles,clips,scrolls,saveButton:save?rect(save):null,pageWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,windowHeight:innerHeight};})()`)
  results.push({ name, ...value })
  assert.equal(value.count, 1, `${name}: one view frame`)
  assert.equal(value.nestedFrames, 0, `${name}: embedded content has no standalone frame`)
  assert.equal(value.border, '1px', name)
  assert.equal(value.radius, '20px', name)
  assert.deepEqual(value.borders, ['1px', '1px', '1px', '1px'], `${name}: continuous perimeter`)
  assert.deepEqual(value.radii, ['20px', '20px', '20px', '20px'], `${name}: all four corners`)
  assert.equal(value.overflow, 'visible', name)
  assert.notEqual(value.shadow, 'none', name)
  assert.ok(Math.abs(value.card.x - value.headingX) <= 1, `${name}: heading/card alignment`)
  assert.ok(value.pageWidth <= value.windowWidth + 1, `${name}: no document horizontal scroll`)
  if (value.divider) assert.equal(value.divider, '1px', `${name}: navigation owns one divider`)
  for (const style of value.tabStyles) {
    assert.equal(style.background, 'rgba(0, 0, 0, 0)', `${name}: transparent main navigation`)
    assert.equal(style.border, '0px', `${name}: no duplicate tab divider`)
  }
  for (const clip of value.clips) {
    assert.ok(clip.left >= 7.5 && clip.right >= 7.5, `${name}: horizontal shadow gutter ${JSON.stringify(clip)}`)
    // Tall mobile documents scroll naturally; their offscreen bottom is not a clipped shadow.
    if (value.windowWidth >= 1024) assert.ok(clip.bottom >= 7.5, `${name}: bottom shadow gutter ${JSON.stringify(clip)}`)
  }
  await screenshot(name)
  if (value.saveButton && value.windowWidth >= 1024) await formFooterReachable(name)
  return value
}

async function formFooterReachable(name) {
  const inspect = `(() => {const card=document.querySelector('${viewSelector}');const save=[...card.querySelectorAll('button')].find(e=>/^save/i.test(e.textContent.trim()));let owner=save.parentElement;while(owner&&owner!==card&&!(/auto|scroll/.test(getComputedStyle(owner).overflowY)&&owner.scrollHeight>owner.clientHeight+1))owner=owner.parentElement;const a=save.getBoundingClientRect(),b=owner.getBoundingClientRect();return {top:a.top,bottom:a.bottom,ownerTop:b.top,ownerBottom:b.bottom,x:b.x+b.width/2,y:b.y+Math.min(b.height/2,100),height:innerHeight,scrollHeight:owner.scrollHeight,navY:card.querySelector('[role=tablist]')?.getBoundingClientRect().y,documentY:scrollY};})()`
  const before = await read(inspect)
  let after = before
  for (let i = 0; i < 8 && (after.bottom > Math.min(after.height, after.ownerBottom) || after.top < after.ownerTop); i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: after.x, y: after.y, deltaY: Math.max(200, after.bottom - after.ownerBottom + 80), deltaX: 0 })
    await new Promise(resolve => setTimeout(resolve, 100))
    after = await read(inspect)
  }
  assert.ok(after.top >= after.ownerTop - 1 && after.bottom <= Math.min(after.height, after.ownerBottom) + 1, `${name}: form footer reachable through internal scroll ${JSON.stringify(after)}`)
  assert.equal(after.navY, before.navY, `${name}: main navigation stays fixed while form scrolls`)
  assert.equal(after.documentY, before.documentY, `${name}: form scroll does not move the desktop document`)
  results.at(-1).footerReachability = { before, after }
  if (after.bottom !== before.bottom) {
    await screenshot(`${name}-footer-reachable`)
    const afterScreenshot = await read(inspect)
    assert.equal(afterScreenshot.top, after.top, `${name}: screenshot preserves form scroll position`)
    results.at(-1).footerReachability.afterScreenshot = afterScreenshot
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: after.x, y: after.y, deltaY: -after.scrollHeight, deltaX: 0 })
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

let initScript
let loadSequence = 0
async function load(path, { theme = 'light', width = 1600, height = 900, zoom = 1, selector = viewSelector, ready = "!!document.querySelector('[data-inventory-view] tbody tr')" } = {}) {
  if (initScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: initScript }).catch(error => {
    if (error.message !== 'Script not found') throw error
    navigationDiagnostics.push({ path, initializerExpired: true })
  })
  const loadId = ++loadSequence
  initScript = (await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__inventoryQaLoad=${loadId};localStorage.setItem('app-theme',${JSON.stringify(theme)});localStorage.setItem('app-language','en');` })).identifier
  // CSS viewport + raster scale approximates zoom; this is not browser-chrome zoom.
  await send('Emulation.setDeviceMetricsOverride', { width: Math.round(width / zoom), height: Math.round(height / zoom), deviceScaleFactor: zoom, mobile: false })
  const navigationReady = `window.__inventoryQaLoad===${loadId} && location.pathname+location.search===${JSON.stringify(path)}`
  const navigate = async () => {
    const response = await send('Page.navigate', { url: base + path })
    if (response.errorText) throw Error(`Navigation failed: ${response.errorText}`)
  }
  try {
    await navigate()
    await wait(navigationReady, 100)
  } catch (error) {
    navigationDiagnostics.push({ path, loadId, retry: 1, reason: error.message })
    console.warn(`Retry navigation once: ${path}: ${error.message.split('\n')[0]}`)
    await send('Page.stopLoading')
    await navigate()
    await wait(navigationReady)
  }
  await wait(`document.readyState==='complete' && !!document.querySelector('${selector}')`)
  await wait(ready)
  await read('document.fonts.ready.then(()=>true)')
}

const identity = '/platform-administration/identity-access'
const discovery = '/discovery-inventory/discovery-settings'
const rowsReady = `!!document.querySelector('${viewSelector} tbody tr td:not([colspan])') && !document.querySelector('${viewSelector} [aria-busy=true]') && !document.querySelector('${viewSelector} [role=alert]')`
const errorReady = `!!document.querySelector('${viewSelector} [role=alert]') && !document.querySelector('${viewSelector} [aria-busy=true]')`
const configReady = `!!document.querySelector('${viewSelector} input') && !document.querySelector('${viewSelector} [aria-busy=true]')`
const routes = [
  ['identity-users', identity, ['/get_users']],
  ['identity-clients', `${identity}?section=clients`, ['/get_identity_clients']],
  ['identity-roles', `${identity}?section=realm-roles`, ['/get_roles_permissions']],
  ['providers', '/providers-connectors/providers', ['/get_providers']],
  ['credentials', '/providers-connectors/credentials', ['/get_credentials']],
  ['platform-providers', '/platform-administration/platform-providers', ['/get_platform_providers']],
  ['applications', '/recovery-plans/recovery-applications', ['/get_recovery_apps']],
  ['groups', '/recovery-plans/recovery-groups', ['/get_recovery_groups']],
  ['snapshot', '/recovery-plans/recovery-policies/snapshot', ['/get_policies']],
  ['application-recovery', '/recovery-plans/recovery-policies/application-recovery', ['/get_recovery_app_policies']],
  ['clean-room', '/recovery-plans/recovery-policies/clean-room', ['/get_clean_room_policies']],
  ['policy-sets', '/recovery-plans/policy-sets', ['/get_policy_sets']],
  ['audit', '/platform-administration/audit-retention', ['/get_access_logs']],
]
const representatives = [
  ['identity', identity, rowsReady],
  ['resources', '/discovery-inventory/resources', rowsReady],
  ['recovery-runs', '/recovery-plans/recovery-runs', rowsReady],
  ['discovery-settings', discovery, configReady],
]
const limits = [
  'Invented local API fixtures only; no live backend/authentication integration.',
  'Identity route uses AUTH_ENABLED=true with its localhost Keycloak adapter module mocked; real authentication is excluded.',
  '125% is CSS viewport/raster-scale emulation, not native browser zoom.',
  'Screenshots and computed geometry do not prove pixel-perfect shadow/contrast or screen-reader behavior.',
  'Create/update/delete submissions and real orchestration are deliberately excluded.',
  'Resource-specific lifecycle coverage remains in inventory-view-table-browser.mjs; standalone loading/skeleton defaults require separate focused component tests.',
]
let completed = false
try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
  if (!interactionsOnly && !standaloneOnly) {
    for (const [name, path, ready] of representatives) for (const theme of ['light', 'dark']) {
      for (const [width, height, zoom] of (quick ? [[1600, 900, 1]] : [[1600, 900, 1], [1280, 600, 1], [800, 900, 1], [390, 844, 1], [1600, 900, 1.25]])) {
        await load(path, { theme, width, height, zoom, ready })
        await geometry(`${name}-${theme}-${width}x${height}-zoom${zoom}`)
      }
    }
    if (!quick) for (const [name, path] of routes) for (const theme of ['light', 'dark']) for (const [width, height] of [[1600, 900], [390, 844]]) {
      await load(path, { theme, width, height, ready: rowsReady })
      await geometry(`${name}-${theme}-${width}`)
    }
  }
  if (!quick && !standaloneOnly && !geometryOnly) {
    for (const [name, path, paths] of routes) {
      statePaths = paths
      for (const state of ['loading', 'error', 'empty']) {
        mode = state
        const ready = state === 'loading' ? `!!document.querySelector('${viewSelector} [aria-busy=true]')` : state === 'error' ? errorReady : `!document.querySelector('${viewSelector} [aria-busy=true]') && !document.querySelector('${viewSelector} [role=alert]') && (!!document.querySelector('${viewSelector} [role=status] h2') || !!document.querySelector('${viewSelector} td[colspan]'))`
        await load(path, { ready })
        await geometry(`${name}-${state}`)
        if (state === 'error') {
          mode = 'success'
          await click(`Array.from(document.querySelectorAll('${viewSelector} button')).find(e=>/retry/i.test(e.textContent))`)
          await wait(rowsReady)
          await geometry(`${name}-retry-success`)
        }
      }
      mode = 'success'
      statePaths = []
    }
    // Cached refresh failures retain the prior rows. Identity list sections have
    // no refresh action; their retry paths are covered above instead.
    for (const name of ['providers', 'credentials', 'platform-providers', 'applications', 'groups', 'snapshot', 'application-recovery', 'clean-room', 'policy-sets', 'audit']) {
      const [, path, paths] = routes.find(route => route[0] === name)
      await load(path, { ready: rowsReady })
      statePaths = paths
      mode = 'error'
      await click(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()==='Refresh')`)
      await wait(`!!document.querySelector('${viewSelector} [role=alert]') && !!document.querySelector('${viewSelector} tbody tr')`)
      await geometry(`${name}-cached-refresh-error`)
      mode = 'success'
      await click(`Array.from(document.querySelectorAll('${viewSelector} [role=alert] button')).find(e=>/retry/i.test(e.textContent))`)
      await wait(`!document.querySelector('${viewSelector} [role=alert]') && ${rowsReady}`)
      statePaths = []
    }
    await load(identity, { ready: rowsReady })
    await click(`document.querySelector('${viewSelector} tbody tr[tabindex]')`)
    await wait(`!!document.querySelector('[role=dialog]')`)
    await screenshot('identity-user-detail')
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape' })
    await wait(`!document.querySelector('[role=dialog]')`)
    await click(`Array.from(document.querySelectorAll('${viewSelector} [role=tab]')).find(e=>e.textContent.includes('Clients'))`)
    await wait(`new URL(location.href).searchParams.get('section')==='clients' && ${rowsReady}`)
    await geometry('identity-list-navigation')
    for (const [name, path, paths, successReady] of [
      ['recovery-runs', '/recovery-plans/recovery-runs', ['/get_recovery_apps', '/get_recovery_groups'], rowsReady],
      ['discovery-configuration', discovery, ['/discovery/cache/config'], configReady],
      ['discovery-history', `${discovery}?tab=history`, ['/discovery/cache/history'], rowsReady],
    ]) {
      statePaths = paths
      for (const state of (name === 'discovery-configuration' ? ['loading', 'error'] : ['loading', 'error', 'empty'])) {
        mode = state
        const ready = state === 'loading' ? `!!document.querySelector('${viewSelector} [aria-busy=true]')` : state === 'error' ? errorReady : `!document.querySelector('${viewSelector} [aria-busy=true]') && !document.querySelector('${viewSelector} [role=alert]') && (!!document.querySelector('${viewSelector} [role=status] h2') || !!document.querySelector('${viewSelector} td[colspan]'))`
        await load(path, { ready })
        await geometry(`${name}-${state}`)
        if (state === 'error') {
          mode = 'success'
          await click(`Array.from(document.querySelectorAll('${viewSelector} [role=alert] button')).find(e=>/retry/i.test(e.textContent))`)
          await wait(successReady)
          await geometry(`${name}-retry-success`)
        }
      }
      mode = 'success'
      statePaths = []
    }
    // Identity settings are intentionally local preview data in the existing app.
    await load(`${identity}?section=realm-settings`, { ready: configReady })
    await geometry('identity-realm-settings-form')
    for (const tab of ['history', 'notifications']) {
      await load(`${discovery}?tab=${tab}`, { ready: tab === 'history' ? rowsReady : `!!document.querySelector('${viewSelector} #notification-recipient')` })
      await geometry(`discovery-${tab}`)
    }
    for (const tab of ['applications', 'groups']) {
      await load(`/recovery-plans/recovery-runs?tab=${tab}`, { ready: rowsReady })
      await wait(`document.querySelector('${viewSelector} tbody')?.innerText.includes('success')`)
      await geometry(`recovery-runs-${tab}`)
      await click(`document.querySelector('${viewSelector} tbody tr[tabindex]')`)
      await wait(`!!document.querySelector('[role=dialog]') && document.querySelector('[role=dialog]').innerText.includes('qa-run')`)
      await screenshot(`recovery-runs-${tab}-history-detail`)
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape' })
      await wait(`!document.querySelector('[role=dialog]')`)
    }
    statePaths = ['/get_orchestrator_runs']
    for (const state of ['loading', 'error', 'empty']) {
      mode = state
      const ready = state === 'loading' ? `!!document.querySelector('${viewSelector} tbody [role=status]')` : state === 'error' ? `Array.from(document.querySelectorAll('${viewSelector} tbody button')).some(e=>/retry/i.test(e.textContent))` : `document.querySelector('${viewSelector} tbody')?.innerText.toLowerCase().includes('no runs')`
      await load('/recovery-plans/recovery-runs', { ready })
      await geometry(`recovery-runs-latest-${state}`)
      if (state === 'error') {
        mode = 'success'
        await click(`Array.from(document.querySelectorAll('${viewSelector} tbody button')).find(e=>/retry/i.test(e.textContent))`)
        await wait(`document.querySelector('${viewSelector} tbody')?.innerText.includes('success')`)
        await geometry('recovery-runs-latest-retry')
      }
    }
    mode = 'success'
    statePaths = []
    inventoryCount = 60
    await load(identity, { width: 1280, height: 600, ready: rowsReady })
    const long = await geometry('identity-long-table')
    assert.ok(long.scrolls.length > 0, 'Long identity list has an internal vertical viewport')
    inventoryCount = 2
  }
  for (const theme of ['light', 'dark']) for (const [width, height] of [[1600, 900], [390, 844]]) {
    await load('/recovery-actions/history', { theme, width, height, selector: '[data-table-surface]', ready: `!!document.querySelector('[data-table-surface] tbody tr td:not([colspan])')` })
    const standalone = await read(`(() => {const e=document.querySelector('[data-table-surface]'),s=getComputedStyle(e);return {viewCount:document.querySelectorAll('${viewSelector}').length,count:document.querySelectorAll('[data-table-surface]').length,border:s.borderTopWidth,radius:s.borderTopLeftRadius,shadow:s.boxShadow,pageWidth:document.documentElement.scrollWidth,windowWidth:innerWidth}})()`)
    assert.equal(standalone.viewCount, 0, 'Recovery actions history stays outside inventory scope')
    assert.equal(standalone.count, 1, 'One standalone table surface')
    assert.equal(standalone.border, '1px')
    assert.equal(standalone.radius, '20px')
    assert.notEqual(standalone.shadow, 'none')
    assert.ok(standalone.pageWidth <= standalone.windowWidth + 1, 'Standalone document has no horizontal overflow')
    const name = `standalone-recovery-actions-history-${theme}-${width}`
    results.push({ name, standalone })
    await screenshot(name)
    console.log(`Check: ${name}`)
  }
  assert.deepEqual(exceptions, [], 'No runtime exceptions')
  assert.deepEqual(unexpected, [], 'No unmocked API or external origins')
  assert.deepEqual(resourceFailures, [], 'No failed application assets')
  completed = true
  console.log(`PASS: ${results.length} geometry captures; output ${output}`)
} finally {
  try {
    await screenshot('last-state').catch(error => console.warn(error.message))
    await writeFile(join(output, 'results.json'), JSON.stringify({ completed, results, exceptions, unexpected, resourceFailures, navigationDiagnostics, limits }, null, 2))
      .catch(error => console.warn(`Diagnostic results unavailable: ${error.message}`))
  } finally {
    socket.close()
    await fetch(`${endpoint}/json/close/${target.id}`).catch(error => console.warn(error.message))
  }
}
