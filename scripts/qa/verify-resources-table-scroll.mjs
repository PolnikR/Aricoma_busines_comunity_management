// Run against a local Vite server. See tasks/resources-table-scroll-measurements.md.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const runtime = process.env.PLAYWRIGHT_MODULE
  ?? 'node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs'
const { chromium } = await import(pathToFileURL(resolve(runtime)).href)
const baseURL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:5177'
assert(['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname), 'Use a local QA server')
const output = process.env.QA_OUTPUT ?? 'node_modules/.cache/resources-table-scroll'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.QA_BROWSER ?? 'msedge', headless: true })
const results = []
const failures = []
const resourcePath = '/discovery-inventory/resources'
const definitions = [['VMWARE', 'vm-01'], ['VMWARE', 'vm-03'], ['FLASHCOPY', 'flash-01'], ['IBM_POWER', 'power-01']]
const providers = ['source', 'target'].flatMap(role => definitions.map(([type, id]) => ({
  id: role === 'source' ? id : `target-${id}`, name: `${type}-${id}`, type, role, credentialStatus: 'ok',
})))
const vms = Array.from({ length: 232 }, (_, i) => ({
  moId: `vm-${i}`, name: `application-${String(i).padStart(3, '0')}`, power_state: 'poweredOn',
  connection_state: 'connected', guest_os: 'Microsoft Windows Server 2016 (64-bit)',
  cluster: 'ACMTHICLUSTER', vcpu: 4, memory_gb: 16, provider_id: 'VMWARE-vmware-vcenter-03',
}))
const settle = page => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))

async function measure(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main')
    const table = main.querySelector('table')
    const surface = table?.closest('section.grid') ?? main.querySelector('section.grid')
    const scroll = surface?.children[1]
    const box = element => {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return { tag: element.tagName, label: element.getAttribute('aria-label'), class: element.className,
        top: rect.top, bottom: rect.bottom, height: rect.height, client: element.clientHeight,
        scroll: element.scrollHeight, scrollTop: element.scrollTop, minHeight: style.minHeight, overflowY: style.overflowY }
    }
    const chain = []
    for (let element = table ?? surface; element; element = element.parentElement) chain.push(box(element))
    const viewport = scroll?.getBoundingClientRect()
    const header = table?.querySelector('thead')?.getBoundingClientRect()
    const rows = [...(table?.querySelectorAll('tbody tr') ?? [])]
    const fullRows = viewport ? rows.filter(row => {
      const rect = row.getBoundingClientRect()
      return rect.top >= Math.max(viewport.top, header?.bottom ?? 0) - 1 && rect.bottom <= viewport.bottom + 1
    }).length : 0
    return { viewport: [innerWidth, innerHeight], main: box(main), chain, scroll: box(scroll), fullRows, rowCount: rows.length,
      rowHeight: rows[0]?.getBoundingClientRect().height, headerHeight: header?.height,
      heading: box(main.querySelector('h1')), toolbar: box(surface?.firstElementChild),
      pagination: box(surface?.lastElementChild),
      outerOverflow: [main, ...main.querySelectorAll('*')].filter(element => !surface?.contains(element)
        && element.scrollHeight > element.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(element).overflowY)).map(box),
    }
  })
}

async function runCase(test) {
  if (process.env.QA_CASE && !new RegExp(process.env.QA_CASE).test(test.name)) return
  const context = await browser.newContext({ viewport: { width: test.width, height: test.height } })
  const errors = []
  let failInventory = test.state === 'error'
  let releaseLoading
  const loadingGate = new Promise(done => { releaseLoading = done })
  try {
    await context.addInitScript(({ collapsed, sidebar }) => {
      localStorage.setItem('app-language', 'en')
      localStorage.setItem('app-sidebar-expanded', String(sidebar))
      localStorage.setItem('abcm-fe.discovery-inventory.metrics-collapsed.v1', String(collapsed))
    }, { collapsed: !test.expanded, sidebar: test.sidebar !== false })
    await context.route('**/config.js', route => route.fulfill({ contentType: 'text/javascript',
      body: 'window.__APP_CONFIG__={AUTH_ENABLED:"false",KEYCLOAK_URL:"http://localhost/auth",KEYCLOAK_REALM:"qa",KEYCLOAK_CLIENT_ID:"qa"};' }))
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      if (!url.pathname.startsWith('/api/')) return route.continue()
      const providerId = url.searchParams.get('provider_id') ?? 'vm-01'
      const inventoryRequest = ['/api/vms/search', '/api/get_volumes', '/api/get_power_vm'].includes(url.pathname)
      if (inventoryRequest && test.state === 'loading') await loadingGate
      if (inventoryRequest && failInventory) return route.fulfill({ status: 503, json: { detail: 'QA inventory unavailable' } })
      let json
      if (url.pathname === '/api/get_providers') json = { providers: test.providers ? Array.from({ length: 25 }, (_, i) => ({ ...providers[0], id: `vm-${i}`, name: `Provider ${i}` })) : providers }
      else if (url.pathname === '/api/tags') json = { tags: [] }
      else if (url.pathname === '/api/vms/search') json = { count: 232, vms }
      else if (url.pathname === '/api/get_volumes') json = { count: 232, volumes: vms.map((vm, i) => ({ id: String(i), name: vm.name, status: 'online', capacity: '16GB', provider_id: providerId })) }
      else if (url.pathname === '/api/get_power_vm') json = { count: 232, counts_by_type: { LogicalPartition: 232, VirtualIOServer: 0 }, vms: vms.map(vm => ({ lpar: { PartitionUUID: vm.moId, PartitionName: vm.name, PartitionState: 'running', SystemName: 'power-system' }, provider_id: providerId })) }
      else throw new Error(`Unexpected QA request ${url.pathname}`)
      if (inventoryRequest && test.state === 'empty') {
        json.count = 0
        if (json.vms) json.vms = []
        if (json.volumes) json.volumes = []
        if (json.counts_by_type) json.counts_by_type.LogicalPartition = 0
      }
      return route.fulfill({ json })
    })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => errors.push(error.message))
    const url = new URL(test.providers ? '/providers-connectors/providers' : test.ise ? `${resourcePath}-ise` : resourcePath, baseURL)
    url.searchParams.set('resource', test.resource ?? 'vmware')
    url.searchParams.set('pageSize', String(test.pageSize ?? 10))
    await page.goto(url.href)
    if (test.state === 'loading') await page.locator('main section[role="status"]').first().waitFor()
    else if (test.state === 'error') await page.getByRole('alert').first().waitFor()
    else if (test.state === 'empty') await page.getByRole('button', { name: 'Clear filters', exact: true }).waitFor()
    else await page.locator('tbody tr[tabindex="0"]').first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    if (test.density === 'comfortable') await page.getByRole('button', { name: /^comfortable$/i }).click()
    if (test.state === 'cached-error') {
      failInventory = true
      await page.getByRole('button', { name: 'Refresh', exact: true }).click()
      await page.getByRole('alert').first().waitFor()
    }
    if (test.switchTab) {
      await page.getByRole('tab').nth(1).click()
      await page.waitForURL(url => url.searchParams.get('providerId') === 'vm-03')
      await page.locator('tbody tr[tabindex="0"]').first().waitFor()
    }
    await settle(page)
    const before = await measure(page)
    results.push({ test, ...before, errors })
    await page.screenshot({ path: `${output}/${test.name}.png` })
    assert.deepEqual(errors, [], 'No browser exceptions')
    if (!test.state) assert.equal(before.rowCount, test.pageSize ?? 10, 'Requested page size is rendered')
    if (!test.providers && !['loading', 'error'].includes(test.state)) {
      assert.equal(await page.locator('main button[aria-expanded]').first().getAttribute('aria-expanded'), String(Boolean(test.expanded)), 'Metrics keep the selected expanded state')
    }
    if (test.width < 1024) {
      const next = page.getByRole('button', { name: 'Next page', exact: true })
      await next.scrollIntoViewIfNeeded()
      await next.click()
      await page.waitForURL(url => url.searchParams.get('page') === '2')
      console.log(`PASS ${test.name}: mobile pagination reachable`)
      return
    }
    assert.equal(before.outerOverflow.length, 0, 'Desktop route must not scroll outside the table')
    if (test.state === 'loading' || test.state === 'error' || test.state === 'empty') {
      const control = test.state === 'loading' ? page.getByRole('button', { name: 'Refresh', exact: true })
        : test.state === 'error' ? page.getByRole('button', { name: /retry/i }).first()
          : page.getByRole('button', { name: 'Clear filters', exact: true })
      await control.scrollIntoViewIfNeeded()
      const rect = await control.boundingBox()
      assert(rect && rect.y >= 0 && rect.y + rect.height <= test.height, 'State action must be in the viewport')
      // An action can be inside a scrollable error region; verify reachability as well as geometry.
      await control.click({ trial: true })
      const after = await measure(page)
      assert.equal(after.outerOverflow.length, 0, 'Reaching the state action must not overflow the route')
      assert.equal(after.heading.top, before.heading.top, 'Reaching the state action keeps the page heading fixed')
      console.log(`PASS ${test.name}: state control reachable`)
      return
    }
    assert(before.pagination.bottom <= test.height, 'Pagination must stay in the viewport')
    assert(before.fullRows > 0, `At least one whole data row must be visible below the header (region ${before.scroll.client}px, header ${before.headerHeight}px, row ${before.rowHeight}px)`)
    if (before.scroll.scroll > before.scroll.client + 1) {
      const surface = page.locator('section.grid').filter({ has: page.locator('table') }).first()
      const region = await surface.locator(':scope > div').nth(1).boundingBox()
      await page.mouse.move(region.x + 100, region.y + region.height / 2)
      await page.mouse.wheel(0, 200)
      await page.waitForFunction(() => [...document.querySelectorAll('section.grid > div')].some(element => element.scrollTop > 0))
      const after = await measure(page)
      assert(after.scroll.scrollTop > 0, 'Wheel must scroll rows')
      for (const key of ['heading', 'toolbar', 'pagination']) assert.equal(after[key].top, before[key].top, `${key} stays fixed`)
      assert.equal(after.outerOverflow.length, 0)
    }
    if (!test.providers) {
      const last = page.locator('tbody tr[tabindex="0"]').last()
      await last.focus()
      await page.keyboard.press('Tab')
      assert(await page.getByRole('combobox', { name: 'Rows per page' }).evaluate(element => element === document.activeElement), 'Tab from last row reaches pagination')
      const afterKeyboard = await measure(page)
      assert.equal(afterKeyboard.outerOverflow.length, 0, 'Keyboard focus must not make the route scroll')
      assert.equal(afterKeyboard.pagination.top, before.pagination.top, 'Keyboard navigation keeps pagination fixed')
    }
    console.log(`PASS ${test.name}: rows viewport ${before.scroll.client}px, ${before.fullRows} whole rows`)
  } catch (error) {
    failures.push({ name: test.name, message: error.message })
    console.log(`FAIL ${test.name}: ${error.message}`)
  } finally {
    releaseLoading()
    await context.close()
    await writeFile(`${output}/results.json`, JSON.stringify({ results, failures }, null, 2))
  }
}

try {
  const matrix = process.argv.includes('--matrix')
  const sizes = matrix ? [[1366, 768], [1280, 600], [1204, 777], [1507, 795], [1505, 971], [1884, 994]] : [[1366, 768], [1280, 600]]
  const flows = matrix ? [{ resource: 'vmware' }, { resource: 'flashsystem' }, { resource: 'ibm-power' },
    { resource: 'vmware', ise: true }, { resource: 'flashsystem', ise: true }, { resource: 'ibm-power', ise: true }, { providers: true }] : [{}]
  for (const flow of flows) {
    const name = flow.providers ? 'providers' : `${flow.ise ? 'ise-' : ''}${flow.resource ?? 'vmware'}`
    for (const [width, height] of sizes) await runCase({ ...flow, name: `${name}-${width}x${height}`, width, height })
    if (!matrix || flow.providers) continue
    for (const pageSize of [25, 50]) await runCase({ ...flow, name: `${name}-rows-${pageSize}`, pageSize, width: 1366, height: 768 })
    for (const height of [600, 971]) {
      await runCase({ ...flow, name: `${name}-comfortable-${height}`, density: 'comfortable', width: 1280, height })
      await runCase({ ...flow, name: `${name}-expanded-${height}`, expanded: true, width: 1280, height })
    }
    await runCase({ ...flow, name: `${name}-sidebar-collapsed`, sidebar: false, width: 1280, height: 600 })
    await runCase({ ...flow, name: `${name}-comfortable-expanded-600`, density: 'comfortable', expanded: true, width: 1280, height: 600 })
    await runCase({ ...flow, name: `${name}-mobile`, width: 390, height: 844 })
  }
  if (matrix) {
    await runCase({ name: 'vmware-tab-switch', switchTab: true, width: 1366, height: 768 })
    for (const state of ['loading', 'empty', 'error', 'cached-error']) {
      for (const height of [600, 971]) await runCase({ name: `vmware-${state}-${height}`, state, width: 1280, height })
    }
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ results, failures }, null, 2))
  await browser.close()
}
assert.equal(failures.length, 0, JSON.stringify(failures, null, 2))
