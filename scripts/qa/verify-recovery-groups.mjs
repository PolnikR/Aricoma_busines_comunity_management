import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Dedicated browser and mocked API only. Never provisions or contacts a real BE.
const base = process.env.APP_URL ?? 'http://127.0.0.1:5197'
const runtime = process.env.PLAYWRIGHT_MODULE ?? 'node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs'
const { chromium } = await import(pathToFileURL(resolve(runtime)).href)
const output = resolve('node_modules/.cache/recovery-groups-qa')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' })
await context.addInitScript(() => { localStorage.setItem('app-language', new URL(location.href).searchParams.get('qa-language') ?? 'en') })
const page = await context.newPage()
page.setDefaultTimeout(20000)
const requests = [], results = [], errors = [], consoleFindings = []
let records = [], poolFailure = false, targetPool = 'PoolB'
const providers = [
  { id: 'vmware', name: 'QA vCenter', type: 'VMWARE' },
  { id: 'power', name: 'QA HMC', type: 'IBM_POWER' },
  { id: 'source', name: 'QA Source', type: 'FLASHCOPY', partnerProviderId: 'target' },
  { id: 'target', name: 'QA Target', type: 'FLASHCOPY', partnerProviderId: 'source', role: 'target' },
  { id: 'source2', name: 'QA Source 2', type: 'FLASHCOPY', partnerProviderId: 'target2' },
  { id: 'target2', name: 'QA Target 2', type: 'FLASHCOPY', partnerProviderId: 'source2', role: 'target' },
].map(provider => ({ role: 'source', ipAddress: '127.0.0.1', credentialStatus: 'ok', backingStorageProviderIds: ['source'], ...provider }))
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => {
  if (!['warning', 'error'].includes(message.type())) return
  const text = message.text()
  const expected = text.includes('Failed to load resource') && text.includes('403')
  consoleFindings.push({ type: message.type(), text, expected })
  if (!expected) errors.push(text)
})
await context.route('**/config.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.__APP_CONFIG__={AUTH_ENABLED:"false"};' }))
await context.route('**/api/**', async route => {
  const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(/^\/api/, '')
  if (!url.pathname.startsWith('/api/')) return route.continue()
  const body = req.postData() ? req.postDataJSON() : undefined
  requests.push({ path, params: Object.fromEntries(url.searchParams), body })
  const id = url.searchParams.get('provider_id')
  let data
  if (path === '/get_providers') data = { providers }
  else if (path === '/get_platform_providers') data = { providers: [{ id: 'airflow', name: 'QA Airflow', type: 'AIRFLOW', credentialStatus: 'ok', role: 'source' }] }
  else if (path === '/get_recovery_groups') data = { recovery_groups: records }
  else if (path === '/get_policy_sets') data = { policy_sets: [{ id: 'policy', name: 'QA Policy', description: 'Browser fixture' }] }
  else if (path === '/vms/search') data = { count: 1, vms: [{ name: 'VM-01', provider_id: 'vmware', provider_type: 'VMWARE' }] }
  else if (path === '/get_power_vm') data = { count: 1, counts_by_type: { LogicalPartition: 1, VirtualIOServer: 0 }, vms: [{ provider_id: 'power', provider_type: 'IBM_POWER', lpar: { PartitionName: 'LPAR-01', PartitionUUID: 'qa-lpar', PartitionType: 'LogicalPartition' } }] }
  else if (path === '/vdisks_by_vm') data = { name: url.searchParams.get('vm_name'), count_vm: 1, count_ibm: 1, vdisks: { '1': { name: 'VOL-01' } } }
  else if (path === '/get_volumes') {
    if (id?.startsWith('target') && poolFailure) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'VIEW_INVENTORY denied in QA fixture' }) })
    const name = id === 'target2' ? 'Other target pool' : id === 'target' ? targetPool : 'PoolA'
    data = { count: 1, provider_id: id, provider_type: 'FLASHCOPY', volumes: [{ name: 'VOL-01', mdisk_grp_id: '42', mdisk_grp_name: name }], pools: { '42': { name, free_capacity: '10TB', capacity: '20TB' } } }
  }
  else if (path === '/get_metro_mirror_relationships') data = { provider_id: id, consistency_group_id: '9', volumes: [{ name: 'VOL-01', status: 'ok', auxiliary_name: 'AUX-01', consistency_group_id: '9' }] }
  else if (path === '/submit_recovery_group') {
    if (url.searchParams.get('push_to_orchestrator') === 'true') return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'missing permission: MANAGE_METRO_MIRROR' }) })
    assert.equal(url.searchParams.get('push_to_orchestrator'), 'false', 'QA must not push/provision')
    assert.equal(url.searchParams.get('provider_id'), 'airflow')
    const record = { ...body, orchestration: { run_id: `qa-${body.id}`, pushed: false, provider_id: 'airflow' } }
    records = [...records.filter(item => item.id !== body.id), record]
    data = { recovery_groups: records }
  }
  else if (path === '/get_recovery_group_inventory') {
    const record = records.find(item => item.orchestration.run_id === url.searchParams.get('run_id'))
    data = { recovery_group_id: record?.id ?? 'qa', recovery_group_name: record?.name ?? 'QA', run_id: url.searchParams.get('run_id'), volumes: {} }
  }
  else if (path === '/get_orchestrator_runs') data = { provider_id: 'airflow', dag_runs: [], total_entries: 0 }
  else if (path === '/tags') data = { tags: [] }
  else data = { policies: [], snapshot_policies: [], recovery_app_policies: [], clean_room_policies: [], credentials: [], applications: [] }
  await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
})
const next = () => page.getByRole('button', { name: 'Next', exact: true }).click()
const step = name => page.getByRole('button', { name, exact: true }).click()
const poolRequests = id => requests.filter(req => req.path === '/get_volumes' && req.params.provider_id === id).length
const navigate = url => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
async function helper(trigger, expected) {
  const button = page.getByRole('button', { name: trigger, exact: true })
  await button.waitFor()
  const email = page.locator('#recovery-group-email')
  const before = await email.count() ? await email.inputValue() : null
  const values = await page.locator('input, select, textarea').evaluateAll(elements => elements.map(element => [element.id, element.value]))
  await button.click()
  assert((await page.getByRole('dialog').last().innerText()).includes(expected))
  await page.keyboard.press('Escape')
  assert.equal(await email.count() ? await email.inputValue() : null, before)
  assert.deepEqual(await page.locator('input, select, textarea').evaluateAll(elements => elements.map(element => [element.id, element.value])), values)
  assert.equal(await button.evaluate(element => element === document.activeElement), true, 'help must restore keyboard focus')
}
try {
  for (const platform of ['VMWARE', 'IBM_POWER']) for (const mode of ['local', 'existing', 'managed']) {
    const name = `QA ${platform} ${mode}`, workload = platform === 'VMWARE' ? 'VM-01' : 'LPAR-01'
    await navigate(`${base}/recovery-plans/recovery-groups/create`)
    await page.locator('#recovery-group-name').fill(name)
    await page.locator('#recovery-group-description').fill('Browser regression fixture')
    await page.locator('#recovery-group-email').fill('ops@example.com')
    await helper('About notification email', 'target partner FlashSystem')
    assert.equal(await page.locator('label[for="recovery-group-id"] button, label[for="recovery-group-name"] button, label[for="recovery-group-description"] button').count(), 0)
    await next()
    await page.locator('#group-topology').selectOption(mode === 'local' ? 'local' : 'metro_mirror')
    await page.locator('#topology-source').selectOption('source')
    if (mode === 'managed') {
      await page.locator('#metro-mode').selectOption('managed')
      await page.locator('#target-pool option[value="PoolB"]').waitFor({ state: 'attached' })
      await page.locator('#target-pool').selectOption('PoolB')
      const count = poolRequests('target')
      await step('Details')
      await step('Storage topology')
      assert.equal(poolRequests('target'), count, 'warm target cache must avoid duplicate requests')
      await page.locator('#topology-source').selectOption('source2')
      await page.locator('#target-pool option[value="Other target pool"]').waitFor({ state: 'attached' })
      assert.equal(await page.locator('#target-pool').inputValue(), '')
      assert.equal(await page.locator('#target-pool option[value="PoolB"]').count(), 0)
      await page.locator('#topology-source').selectOption('source')
      await page.locator('#target-pool').selectOption('PoolB')
    }
    await next()
    await page.getByRole('button', { name: platform === 'VMWARE' ? /VMware/ : /IBM Power/ }).click()
    await next()
    await page.getByRole('button', { name: platform === 'VMWARE' ? /QA vCenter/ : /QA HMC/ }).click()
    await helper(platform === 'VMWARE' ? 'About VMware discovery' : 'About IBM Power discovery', platform === 'VMWARE' ? 'VMFS NAA' : 'VFC WWPN')
    await next()
    await page.locator('[draggable="true"]').filter({ hasText: workload }).dragTo(page.getByLabel('Selected recovery group virtual machines', { exact: true }))
    await next()
    await page.getByLabel('Selected recovery group volumes', { exact: true }).getByText('VOL-01', { exact: true }).waitFor()
    if (mode === 'existing') await page.getByRole('textbox', { name: /Auxiliary/ }).fill('AUX-01')
    await next()
    await page.getByRole('button', { name: /QA Policy/ }).click()
    await next()
    await page.getByRole('button', { name: 'Create Recovery Group', exact: true }).click()
    await page.waitForURL('**/recovery-plans/recovery-groups')
    const saved = records.find(record => record.name === name)
    assert(saved, 'POST must persist fixture record')
    assert.equal(saved.notificationEmail, 'ops@example.com')
    assert.equal(saved.provider_id_vm, platform === 'VMWARE' ? 'vmware' : 'power')
    assert.deepEqual(saved.vms.map(vm => vm.name), [workload])
    assert.equal(saved.volumes[0].name, 'VOL-01')
    if (mode === 'managed') { assert.deepEqual(saved.metro_mirror, { mode: 'managed', target_pool: 'PoolB' }); assert(!saved.volumes[0].auxiliary_name) }
    if (mode === 'existing') { assert(!('target_pool' in saved.metro_mirror)); assert.equal(saved.metro_mirror.consistency_group_id, '9') }
    await page.reload()
    await page.getByText(name, { exact: true }).click()
    await page.getByText('ops@example.com', { exact: true }).waitFor()
    if (mode === 'managed') await page.getByText('PoolB', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    assert.equal(await page.locator('#recovery-group-email').inputValue(), 'ops@example.com')
    await page.locator('#recovery-group-email').fill('')
    if (mode === 'managed') {
      await step('Storage topology')
      assert.equal(await page.locator('#target-pool').inputValue(), 'PoolB')
      await page.locator('#target-pool').selectOption('')
    }
    await step('Orchestration')
    await page.getByRole('button', { name: 'Save Recovery Group', exact: true }).click()
    await page.waitForURL('**/recovery-plans/recovery-groups')
    const updated = records.find(record => record.id === saved.id)
    assert.equal(updated.notificationEmail, null)
    if (mode === 'managed') assert.deepEqual(updated.metro_mirror, { mode: 'managed' })
    results.push({ platform, mode, createEditDisplay: 'pass', postGetRoundTrip: 'mocked-pass' })
    console.log(`PASS ${platform} ${mode} Create/Edit/Display`)
    await page.screenshot({ path: `${output}/${platform}-${mode}.png`, fullPage: true })
  }
  const managed = records.find(record => record.provider_id_vm === 'vmware' && record.metro_mirror?.mode === 'managed')
  assert(managed)
  records.push({ ...managed, id: 'edge_group', name: 'QA pool edge cases', notificationEmail: 'saved@example.com', metro_mirror: { mode: 'managed', target_pool: 'Removed pool' }, orchestration: { run_id: 'qa-edge', pushed: false, provider_id: 'airflow' } })
  poolFailure = true
  await navigate(`${base}/recovery-plans/recovery-groups/edge_group/edit`)
  await step('Storage topology')
  assert.equal(await page.locator('#target-pool').inputValue(), 'Removed pool')
  await page.getByText('Target inventory is unavailable or access was denied. Your choice is preserved; the backend checks the pool during provisioning.', { exact: true }).waitFor()
  await step('Orchestration')
  await page.getByRole('switch', { name: 'Deploy to orchestrator', exact: true }).click()
  await page.getByRole('button', { name: 'Save Recovery Group', exact: true }).click()
  await page.getByText('missing permission: MANAGE_METRO_MIRROR', { exact: true }).waitFor()
  await page.getByRole('switch', { name: 'Deploy to orchestrator', exact: true }).click()
  await step('Storage topology')
  await page.getByText('Updating target pools…', { exact: true }).waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Retry', exact: true }).waitFor()
  poolFailure = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await page.locator('#target-pool option[value="PoolB"]').waitFor({ state: 'attached' })
  assert.equal(await page.locator('#target-pool').inputValue(), 'Removed pool')
  await page.getByText('This pool is not in the discovered target inventory. The backend will check it during provisioning.', { exact: true }).waitFor()
  await page.screenshot({ path: `${output}/missing-pool-preserved.png`, fullPage: true })
  results.push({ pool403RetryMissingEditPreserved: 'pass', backend403ShownWithoutMockPermissionGate: 'pass', provisioning: 'mocked-denial-only' })
  // Locale/viewport help checks on the real Details UI; only a non-sensitive preference is set.
  for (const language of ['en', 'sk', 'cs']) {
    const catalog = JSON.parse(await readFile(`src/locales/${language}.json`, 'utf8'))
    await page.setViewportSize({ width: language === 'en' ? 1440 : 390, height: 844 })
    await navigate(`${base}/recovery-plans/recovery-groups/create?qa-language=${language}`)
    await helper(catalog['recoveryGroups.fieldHelp.email.trigger'], catalog['recoveryGroups.fieldHelp.email.intro'])
    await page.screenshot({ path: `${output}/details-${language}.png`, fullPage: true })
    await page.locator('#recovery-group-name').fill('Locale QA')
    await page.locator('#recovery-group-description').fill('Locale fixture')
    await page.getByRole('button', { name: catalog['buttons.next'], exact: true }).click()
    await page.locator('#group-topology').selectOption('metro_mirror')
    await page.locator('#topology-source').selectOption('source')
    await page.locator('#metro-mode').selectOption('managed')
    await helper(catalog['recoveryGroups.fieldHelp.topology.trigger'], catalog['recoveryGroups.fieldHelp.topology.intro'])
    await helper(catalog['recoveryGroups.fieldHelp.targetPool.trigger'], catalog['recoveryGroups.fieldHelp.targetPool.intro'])
    await page.getByRole('button', { name: catalog['buttons.next'], exact: true }).click()
    await page.getByRole('button', { name: new RegExp(catalog['pages.recoveryGroupBuilder.type.workloads.vmware.title']) }).click()
    await page.getByRole('button', { name: catalog['buttons.next'], exact: true }).click()
    await helper(catalog['recoveryGroups.fieldHelp.compute.generic.trigger'], catalog['recoveryGroups.fieldHelp.compute.generic.intro'])
    await page.getByRole('button', { name: /QA vCenter/ }).click()
    await helper(catalog['recoveryGroups.fieldHelp.compute.vmware.trigger'], 'VMFS NAA')
    await page.getByRole('button', { name: catalog['pages.recoveryGroupBuilder.steps.type'], exact: true }).click()
    await page.getByRole('button', { name: new RegExp(catalog['pages.recoveryGroupBuilder.type.workloads.ibmPower.title']) }).click()
    await page.getByRole('button', { name: catalog['buttons.next'], exact: true }).click()
    await helper(catalog['recoveryGroups.fieldHelp.compute.generic.trigger'], catalog['recoveryGroups.fieldHelp.compute.generic.intro'])
    await page.getByRole('button', { name: /QA HMC/ }).click()
    await helper(catalog['recoveryGroups.fieldHelp.compute.ibmPower.trigger'], 'VFC WWPN')
    await navigate(`${base}/recovery-plans/recovery-groups/edge_group/edit?qa-language=${language}`)
    await page.getByRole('button', { name: catalog['pages.recoveryGroupBuilder.steps.topology'], exact: true }).click()
    await helper(catalog['recoveryGroups.fieldHelp.topology.trigger'], catalog['recoveryGroups.fieldHelp.topology.intro'])
    await helper(catalog['recoveryGroups.fieldHelp.targetPool.trigger'], catalog['recoveryGroups.fieldHelp.targetPool.intro'])
    await page.getByRole('button', { name: catalog['pages.recoveryGroupBuilder.steps.provider'], exact: true }).click()
    await helper(catalog['recoveryGroups.fieldHelp.compute.vmware.trigger'], 'VMFS NAA')
    const power = records.find(record => record.provider_id_vm === 'power')
    await navigate(`${base}/recovery-plans/recovery-groups/${power.id}/edit?qa-language=${language}`)
    await page.getByRole('button', { name: catalog['pages.recoveryGroupBuilder.steps.provider'], exact: true }).click()
    await helper(catalog['recoveryGroups.fieldHelp.compute.ibmPower.trigger'], 'VFC WWPN')
    await navigate(`${base}/recovery-plans/recovery-groups?qa-language=${language}`)
    await page.getByText(power.name, { exact: true }).click()
    await helper(catalog['recoveryGroups.fieldHelp.compute.ibmPower.trigger'], 'VFC WWPN')
    await page.keyboard.press('Escape')
    await page.getByText('QA pool edge cases', { exact: true }).click()
    await helper(catalog['recoveryGroups.fieldHelp.compute.vmware.trigger'], 'VMFS NAA')
    await helper(catalog['recoveryGroups.fieldHelp.email.trigger'], catalog['recoveryGroups.fieldHelp.email.intro'])
    await helper(catalog['recoveryGroups.fieldHelp.targetPool.trigger'], catalog['recoveryGroups.fieldHelp.targetPool.intro'])
    await page.screenshot({ path: `${output}/display-${language}.png`, fullPage: true })
    results.push({ language, viewportHelp: 'pass' })
  }
  assert.deepEqual(errors, [])
} catch (error) {
  results.push({ failure: error.message, url: page.url() })
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
  throw error
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ mode: 'mocked-browser', results, errors, consoleFindings, requests, liveBackend: 'not-run', managedProvisioning: 'not-run' }, null, 2))
  await browser.close()
  console.log(JSON.stringify({ output, results, errors }, null, 2))
}
