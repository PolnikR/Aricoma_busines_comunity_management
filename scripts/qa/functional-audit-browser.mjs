import assert from 'node:assert/strict'

// Run against a dedicated headless browser (CDP :9351) and Vite (:5189).
// Every API/config request is intercepted in this tab; no live backend is used.
const base = 'http://127.0.0.1:5189'
const target = await fetch('http://127.0.0.1:9351/json/new?about:blank', { method: 'PUT' }).then(r => r.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let sequence = 0
const pending = new Map()
const errors = []
const canceledRequests = new Set()
const fulfillmentTasks = []
const requests = []
let runsFail = false
let inventoryFail = false
let deleted = false
let credentialDeleted = false
let provider = { id: 'infra-a', name: 'Source provider', description: 'QA source', type: 'VMWARE', role: 'source', ipAddress: '127.0.0.1', credentialId: 'cred-a', credentialStatus: 'ok', vmTags: ['first', 'second'] }
const app = { id: 'finance-app', application: { name: 'Finance Recovery', description: 'QA app', environment: 'prod', platform: 'VMWARE', source_provider_id: 'infra-a', target_provider_id: 'infra-a', tiers: {} }, orchestration: { run_id: 'qa', pushed: true, provider_id: 'airflow-a' } }
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence
  const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)) }, 15000)
  pending.set(id, { resolve, reject, timer })
  socket.send(JSON.stringify({ id, method, params }))
})
function reply(request) {
  const url = new URL(request.url)
  requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), body: request.postData })
  if (url.pathname === '/config.js') return { raw: 'window.__APP_CONFIG__={AUTH_ENABLED:"false"};' }
  const path = url.pathname.replace('/api', '')
  if (path === '/get_providers') return { providers: [{ ...provider, credentialStatus: credentialDeleted ? 'missing' : 'ok' }] }
  if (path === '/submit_provider') { provider = { ...provider, ...JSON.parse(request.postData) }; return { providers: [provider] } }
  if (path === '/get_credentials') return { credentials: credentialDeleted ? [] : [{ id: 'cred-a', name: 'QA credential', username: 'qa', description: 'QA only' }] }
  if (path === '/delete_credential') { credentialDeleted = true; return { credentials: [] } }
  if (path === '/get_platform_providers') return { providers: [{ id: 'airflow-a', name: 'QA Airflow', type: 'AIRFLOW', url: 'https://example.test', port: 22 }] }
  if (path === '/get_recovery_apps') return { applications: deleted ? [] : [app, { ...app, id: 'alternate-app', application: { ...app.application, name: 'Alternate Recovery' } }] }
  if (path === '/delete_recovery_app') { deleted = true; return { applications: [] } }
  if (path === '/get_recovery_groups') return { recovery_groups: [] }
  if (path === '/get_orchestrator_runs') return runsFail ? { failure: true } : { provider_id: 'airflow-a', dag_id: 'dag_qa', dag_runs: [{ dag_run_id: 'run-' + (url.searchParams.get('offset') || '0'), state: 'success' }], total_entries: 30 }
  if (path === '/get_recovery_app_inventory') return inventoryFail ? { failure: true } : { recovery_app_id: 'finance-app', recovery_app_name: 'Cached inventory', run_id: 'qa', compute_provider_id: 'infra-a', recovered_datastores: [], tiers: [] }
  if (path === '/vms/search') return { vms: [] }
  if (path === '/tags') return { tags: [] }
  if (path === '/get_policy_sets') return { policy_sets: [] }
  throw Error(`Unexpected API request: ${path}`)
}
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) {
    const task = pending.get(message.id)
    if (!task) return
    pending.delete(message.id)
    clearTimeout(task.timer)
    if (message.error) task.reject(Error(message.error.message)); else task.resolve(message.result)
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.description || arg.value))
  if (message.method === 'Network.loadingFailed' && message.params.canceled) canceledRequests.add(message.params.requestId)
  if (message.method === 'Fetch.requestPaused') {
    const { requestId, request, networkId } = message.params
    try {
      const body = reply(request)
      fulfillmentTasks.push(send('Fetch.fulfillRequest', { requestId, responseCode: body.failure ? 503 : 200, responseHeaders: [{ name: 'Content-Type', value: body.raw ? 'text/javascript' : 'application/json' }], body: Buffer.from(body.raw || JSON.stringify(body.failure ? { detail: 'QA unavailable' } : body)).toString('base64') }).catch(async error => {
        // A route change/query cancellation can abort a request before CDP fulfills it.
        // Ignore only the precise protocol error backed by a Network cancellation event.
        await new Promise(resolve => setTimeout(resolve, 100))
        if (error.message !== 'Invalid InterceptionId.' || !canceledRequests.has(networkId)) errors.push(error.message)
      }))
    } catch (error) { errors.push(error.message); void send('Fetch.failRequest', { requestId, errorReason: 'Failed' }) }
  }
})
const read = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result.value
}
const wait = async expression => {
  for (let i = 0; i < 200; i++) {
    if (await read(expression)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw Error(`Browser condition timed out: ${expression}\n${await read('document.body.innerText.slice(-2200)')}`)
}
const visible = `e => e.getClientRects().length > 0`
const button = (text, scope = 'document') => `Array.from(${scope}.querySelectorAll('button')).filter(${visible}).find(e => e.textContent.trim() === ${JSON.stringify(text)})`
const click = async expression => {
  await wait(`(() => {try {return !!(${expression})} catch {return false}})()`)
  const point = await read(`(() => { const e = ${expression}; if (!e) throw Error('Missing click target'); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
}
const fill = async (selector, text) => {
  await click(`document.querySelector(${JSON.stringify(selector)})`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 })
  await send('Input.insertText', { text })
}
const row = name => `Array.from(document.querySelectorAll('tbody tr')).find(e => e.textContent.includes(${JSON.stringify(name)}))`
const navigate = async path => {
  await send('Page.navigate', { url: base + path })
  await wait(`document.readyState === 'complete' && !!document.querySelector('h1')`)
}
const spa = path => read(`history.pushState({},'',${JSON.stringify(path)});window.dispatchEvent(new PopStateEvent('popstate'));true`)
try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: base + '/api/*' }, { urlPattern: base + '/config.js' }] })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('app-language','en');let qaOffset=0;const now=Date.now.bind(Date);Date.now=()=>now()+qaOffset;window.qaAdvanceClock=()=>{qaOffset+=16*60*1000;for(const state of ['hidden','visible']){Object.defineProperty(document,'visibilityState',{configurable:true,value:state});window.dispatchEvent(new Event('visibilitychange'))}};` })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await navigate('/recovery-plans/recovery-applications')
  await wait(`!!(${row('Finance Recovery')})`)
  await fill('input[type=search]', 'FINANCE RECOVERY')
  await wait(`!!(${row('Finance Recovery')}) && !(${row('Alternate Recovery')})`)
  console.log('PASS browser A4 displayed-name search')
  await click(row('Finance Recovery'))
  await wait(`!!document.querySelector('[role=dialog]')`)
  await click(`Array.from(document.querySelectorAll('[role=dialog] nav button')).find(e=>e.textContent.includes('Inventory'))`)
  await wait(`document.body.innerText.includes('Cached inventory')`)
  inventoryFail = true
  await read('window.qaAdvanceClock();true')
  await wait(`document.body.innerText.includes('Showing the last known data')`)
  assert.equal(await read(`document.body.innerText.includes('Cached inventory')`), true)
  inventoryFail = false
  await click(button('Retry', "document.querySelector('[role=dialog]')"))
  await wait(`!document.body.innerText.includes('Showing the last known data')`)
  console.log('PASS browser A6 cached app inventory + background 503 + Retry')
  await click(button('Delete', "document.querySelector('[role=dialog]')"))
  await wait(`document.querySelectorAll('[role=dialog]').length > 1`)
  await click(button('Delete', "Array.from(document.querySelectorAll('[role=dialog]')).at(-1)"))
  await wait(`document.body.innerText.includes('The rollback outcome cannot be confirmed')`)
  assert.equal(requests.filter(r=>r.path==='/api/delete_recovery_app').length,1)
  console.log('PASS browser A10 missing optional report, one delete request')
  deleted = false
  runsFail = true
  await navigate('/recovery-plans/recovery-runs')
  await wait(`!!(${button('Retry')})`)
  runsFail = false
  await click(button('Retry'))
  await wait(`!document.body.innerText.includes('Latest run unavailable')`)
  console.log('PASS browser A3 latest-run Retry recovers from 503')
  await click(row('Finance Recovery'))
  await wait(`!!document.querySelector('[role=dialog] button[aria-label="Page 3"]')`)
  await click(`document.querySelector('[role=dialog] button[aria-label="Page 3"]')`)
  await wait(`document.querySelector('[role=dialog]').textContent.includes('Page 3 of 3')`)
  await spa('/recovery-plans/recovery-runs?entityType=application&entityId=alternate-app')
  await wait(`document.querySelector('[role=dialog]').textContent.includes('Page 1 of 3')`)
  console.log('PASS browser A9 URL entity switch resets history page')
  await navigate('/providers-connectors/providers')
  await wait(`!!(${row('Source provider')})`)
  await click(row('Source provider'))
  await click(button('Edit', "document.querySelector('[role=dialog]')"))
  await wait(`!!document.querySelector('#create-name')`)
  assert.equal(await read(`document.querySelector('#create-port')===null`),true)
  await fill('#create-name', 'Renamed provider')
  await click(button('Edit provider', "document.querySelector('[role=dialog]')"))
  await wait(`!!(${row('Renamed provider')}) && !document.querySelector('#create-name')`)
  const payload=JSON.parse(requests.findLast(r=>r.path==='/api/submit_provider').body)
  assert.deepEqual(payload.vmTags,['first','second'])
  assert.equal('port' in payload,false)
  console.log('PASS browser A7/A8 no infra port, two tags retained after rename')
  const previousInventory=requests.filter(r=>r.path==='/api/vms/search').length
  await spa('/discovery-inventory/resources')
  await wait(`!!document.querySelector('h1')`)
  for(let i=0;i<100 && requests.filter(r=>r.path==='/api/vms/search').length<=previousInventory;i++) await new Promise(resolve=>setTimeout(resolve,100))
  assert.ok(requests.filter(r=>r.path==='/api/vms/search').length>previousInventory,'provider save must invalidate prefetched resource inventory')
  console.log('PASS browser A1 provider save -> Resources refetch')
  await spa('/providers-connectors/credentials')
  await wait(`!!(${row('QA credential')})`)
  await click(row('QA credential'))
  await wait(`!!document.querySelector('[role=dialog]')`)
  await click(button('Delete', "document.querySelector('[role=dialog]')"))
  await wait(`document.querySelectorAll('[role=dialog]').length > 1`)
  await click(button('Delete', "Array.from(document.querySelectorAll('[role=dialog]')).at(-1)"))
  await wait(`!(${row('QA credential')}) && !document.querySelector('[role=dialog]')`)
  await spa('/providers-connectors/providers')
  await wait(`!!(${row('Renamed provider')})`)
  assert.equal(credentialDeleted,true)
  assert.ok(await read(`(${row('Renamed provider')}).textContent.toLowerCase().includes('missing')`))
  console.log('PASS browser A2 credential deletion updates dependent provider status')
  await Promise.all(fulfillmentTasks)
  assert.deepEqual(errors,[])
  console.log(`PASS browser runtime exceptions: 0; intercepted requests: ${requests.length}`)
} finally {
  await send('Page.close').catch(()=>undefined)
  socket.close()
  for(const task of pending.values()) { clearTimeout(task.timer); task.reject(Error('Browser closed')) }
}
