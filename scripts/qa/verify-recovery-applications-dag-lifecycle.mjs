import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Standalone, isolated browser QA. Every API request is mocked; unknown routes fail closed.
// Start Vite separately, then: node scripts/qa/verify-recovery-applications-dag-lifecycle.mjs
const base = process.env.APP_URL ?? 'http://127.0.0.1:5198'
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'APP_URL must be local')
const runtime = process.env.PLAYWRIGHT_MODULE ?? 'node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs'
const { chromium } = await import(pathToFileURL(resolve(runtime)).href)
const output = resolve('node_modules/.cache/application-lifecycle-qa')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', serviceWorkers: 'block' })
await context.addInitScript(() => localStorage.setItem('app-language', new URL(location.href).searchParams.get('qa-language') ?? 'en'))
const page = await context.newPage()
page.setDefaultTimeout(15000)
const requests = [], results = [], errors = [], consoleFindings = []
const catalogs = Object.fromEntries(await Promise.all(['en', 'sk', 'cs'].map(async language => [language, JSON.parse(await readFile(`src/locales/${language}.json`, 'utf8'))])))
const providers = ['vmware', 'power'].flatMap(platform => ['source', 'target'].map(role => ({
  id: `${platform}-${role}`, name: `QA ${platform} ${role}`, type: platform === 'vmware' ? 'VMWARE' : 'IBM_POWER',
  role, ipAddress: '127.0.0.1', credentialStatus: 'ok',
})))
const groups = ['vmware', 'power'].map(platform => ({ id: `${platform}-group`, name: `QA ${platform} group`,
  provider_id_vm: `${platform}-source`, provider_id_volume: 'storage', policy_set_id: 'policy', topology: 'local',
  orchestration: { pushed: true, provider_id: 'airflow-stored', run_id: `group-${platform}` },
  vms: [{ name: platform === 'vmware' ? 'VM-01' : 'LPAR-01' }], volumes: [{ name: 'VOL-01' }],
}))
// A second source of each type proves that type compatibility alone is insufficient.
for (const platform of ['vmware', 'power']) {
  providers.push({ ...providers.find(provider => provider.id === platform + '-source'), id: platform + '-other-source', name: 'QA other ' + platform + ' source' })
  groups.push({ ...structuredClone(groups.find(group => group.id === platform + '-group')), id: platform + '-other-group', name: 'QA other ' + platform + ' group', provider_id_vm: platform + '-other-source' })
}
const templates = [
  { platform: 'VMWARE', version: 'v1', default: true, description: 'QA VMware template description' },
  { platform: 'IBM_POWER', version: 'v1', default: true, description: 'QA Power legacy description' },
  { platform: 'IBM_POWER', version: 'v2', default: false, description: 'QA Power current description' },
]
function application(id, platform = 'vmware', pushed = false) {
  const group = groups.find(item => item.id === `${platform}-group`)
  return { id, policy_set_id: 'policy', application: { name: `QA-${id}`, description: 'Browser lifecycle fixture', environment: 'dev',
    platform: platform === 'vmware' ? 'VMWARE' : 'IBM_POWER', source_provider_id: `${platform}-source`, target_provider_id: `${platform}-target`,
    notificationEmail: null, dag_template_version: null,
    tiers: { database: { order: 1, description: 'Database tier', recovery_group: { id: group.id, name: group.name, vms: structuredClone(group.vms) } } },
  }, orchestration: { pushed, provider_id: 'airflow-stored', run_id: `dag-${id}`, ...(pushed ? { template_version: platform === 'vmware' ? 'v1' : 'v2' } : {}) } }
}
let records = [application('vmware-draft'), application('power-draft', 'power')]
let catalogFailure = false, groupsFailure = false, pushFailure = false, rollbackMode = 'ok', rollbackGate
page.on('pageerror', error => errors.push(error.message))
page.on('dialog', async dialog => { errors.push(`Unexpected browser ${dialog.type()}: ${dialog.message()}`); await dialog.dismiss() })
page.on('console', message => {
  if (!['warning', 'error'].includes(message.type())) return
  const text = message.text()
  const expected = /Failed to load resource.*(?:403|409|502|503)/.test(text)
  consoleFindings.push({ type: message.type(), text, expected })
  if (!expected) errors.push(text)
})
await context.route('**/*', async route => {
  const req = route.request(), url = new URL(req.url())
  if (url.pathname === '/config.js') return route.fulfill({ contentType: 'text/javascript', body: 'window.__APP_CONFIG__={AUTH_ENABLED:"false"};' })
  if (!url.pathname.startsWith('/api/')) {
    if (url.origin === new URL(base).origin) return route.continue()
    errors.push(`Blocked external request: ${url.origin}${url.pathname}`)
    return route.abort('blockedbyclient')
  }
  const path = url.pathname.slice(4), params = Object.fromEntries(url.searchParams), body = req.postData() ? req.postDataJSON() : undefined
  const entry = { method: req.method(), path, params, ...(body ? { body } : {}) }
  requests.push(entry)
  const respond = (data, status = 200) => {
    entry.responseStatus = status
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  }
  if (path === '/get_providers') return respond({ providers })
  if (path === '/get_platform_providers') return respond({ providers: ['airflow-other', 'airflow-stored'].map(id => ({ id, name: `QA ${id}`, type: 'AIRFLOW', role: 'source', credentialStatus: 'ok', url: 'http://127.0.0.1:8080' })) })
  if (path === '/get_recovery_groups') return groupsFailure ? respond({ detail: 'QA groups unavailable' }, 503) : respond({ recovery_groups: groups })
  if (path === '/get_policy_sets') return respond({ policy_sets: [{ id: 'policy', name: 'QA Policy', description: 'Lifecycle policy fixture' }] })
  if (path === '/get_policies') return respond({ policies: [] })
  if (path === '/get_recovery_app_policies') return respond({ recovery_app_policies: [] })
  if (path === '/get_clean_room_policies') return respond({ clean_room_policies: [] })
  if (path === '/get_recovery_apps') return respond({ applications: records })
  if (path === '/get_dag_template_versions') return catalogFailure
    ? respond({ detail: 'QA template catalog unavailable' }, 503)
    : respond({ templates: templates.filter(item => !params.platform || item.platform.toLowerCase() === params.platform.toLowerCase()) })
  if (path === '/get_orchestrator_runs') return respond({ provider_id: params.provider_id, dag_runs: [], total_entries: 0 })
  if (path === '/get_recovery_app_inventory') return respond({ recovery_app_id: params.recovery_app_id ?? 'qa', recovery_app_name: 'QA inventory',
    run_id: params.run_id ?? 'qa', compute_provider_id: params.compute_provider_id ?? 'vmware-target', recovered_datastores: [], tiers: [] })
  if (path === '/submit_recovery_dag') {
    assert.equal(req.method(), 'POST')
    const pushed = params.push_to_orchestrator === 'true'
    const version = body.application.dag_template_version ?? templates.find(item => item.platform === body.application.platform && item.default)?.version
    const saved = { ...body, orchestration: { pushed: pushed && !pushFailure, provider_id: params.provider_id ?? null, run_id: `dag-${body.id}`, ...(pushed && !pushFailure ? { template_version: version } : {}) } }
    records = [...records.filter(item => item.id !== body.id), saved]
    if (pushed && pushFailure) return respond({ detail: 'saved locally, but Airflow push failed: QA offline' }, 502)
    return respond({ applications: records, ...(pushed ? { orchestrator_push: { status: 'pushed', dag_id: saved.orchestration.run_id, dag: '/mock/dag.py' } } : {}) })
  }
  if (path === '/rollback_app_from_orchestrator') {
    assert.equal(req.method(), 'POST')
    assert.deepEqual(Object.keys(params), ['recovery_app_id'], 'rollback must use stored providers and only application ID')
    assert.equal(body, undefined, 'rollback must not send a body')
    if (rollbackGate) await rollbackGate
    if (['403', '409'].includes(rollbackMode)) return respond({ detail: `QA rollback ${rollbackMode}` }, Number(rollbackMode))
    const clean = ['ok', 'skipped'].includes(rollbackMode)
    const record = records.find(item => item.id === params.recovery_app_id)
    assert(record, 'rollback preserves an existing application')
    if (clean) record.orchestration.pushed = false
    const rollback = { status: rollbackMode, airflow: { status: clean ? 'ok' : 'failed', dag_id: record.orchestration.run_id },
      ibm: { status: 'ok', errors: [] }, compute: { status: clean ? 'ok' : 'failed', errors: clean ? [] : ['QA compute cleanup failed'] }, vcenter: { status: 'ok', errors: [] } }
    return respond(clean ? { applications: records, rollback } : { detail: { message: 'QA rollback cleanup incomplete', rollback } }, clean ? 200 : 502)
  }
  errors.push(`Unexpected API request: ${req.method()} ${path}`)
  return respond({ detail: `Unexpected mocked endpoint ${path}` }, 599)
})
const navigate = path => page.goto(`${base}/recovery-plans/recovery-applications${path}`, { waitUntil: 'domcontentloaded' })
const step = (name, language = 'en') => page.getByRole('button', { name: catalogs[language][`pages.recoveryBuilder.steps.${name}`], exact: true }).click()
const save = async () => {
  const before = requests.length
  await Promise.all([
    page.waitForRequest(request => new URL(request.url()).pathname === '/api/submit_recovery_dag'),
    page.getByRole('button', { name: catalogs.en['buttons.saveApplication'], exact: true }).click(),
  ])
  const beforeSubmit = requests.slice(before).filter(request => request.path !== '/submit_recovery_dag')
  assert.equal(beforeSubmit.some(request => ['/get_providers', '/get_recovery_groups'].includes(request.path)), false, 'Save must not preflight provider/group GETs')
}
const screenshot = name => page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
const submitRequests = () => requests.filter(req => req.path === '/submit_recovery_dag')
async function edit(id) {
  await navigate(`/${id}/edit`)
  await page.locator('#application-name').waitFor()
  if (!records.find(record => record.id === id)?.orchestration?.pushed) {
    await page.waitForFunction(() => document.querySelector('#application-name')?.matches(':enabled'))
  }
}
async function assertReadOnly(id, language = 'en') {
  await navigate(`/${id}/edit?qa-language=${language}`)
  const count = submitRequests().length
  await page.getByText(catalogs[language]['recovery.application.lifecycle.readOnly'], { exact: true }).waitFor()
  for (const name of ['details', 'tiers', 'policySet', 'orchestration']) {
    await step(name, language)
    const enabled = await page.locator('main input, main select, main textarea').evaluateAll(elements => elements.filter(element => !element.matches(':disabled')).map(element => element.id))
    assert.deepEqual(enabled, [], `${name}: deployed fields must be disabled`)
    if (name === 'details') {
      const input = page.locator('#application-name'), original = await input.inputValue()
      await input.click({ force: true })
      await page.keyboard.type('blocked-change')
      assert.equal(await input.inputValue(), original, 'keyboard cannot change a deployed application')
    }
  }
  const saveButton = page.getByRole('button', { name: catalogs[language]['buttons.saveApplication'], exact: true })
  if (await saveButton.count()) assert.equal(await saveButton.isDisabled(), true)
  assert.equal(submitRequests().length, count)
}
async function rollback(id, mode) {
  rollbackMode = mode
  await navigate('')
  const row = page.getByRole('row').filter({ hasText: `QA-${id}` })
  await row.getByRole('button', { name: /actions/i }).click()
  await page.getByRole('menuitem', { name: 'Rollback', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('heading', { name: 'Rollback recovery application', exact: true }).waitFor()
  const before = requests.filter(req => req.path === '/rollback_app_from_orchestrator').length
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.equal(requests.filter(req => req.path === '/rollback_app_from_orchestrator').length, before)
  await row.getByRole('button', { name: /actions/i }).click()
  await page.getByRole('menuitem', { name: 'Rollback', exact: true }).click()
  let release
  rollbackGate = new Promise(resolve => { release = resolve })
  try {
    await page.getByRole('dialog').getByRole('button', { name: 'Rollback', exact: true }).click()
    const pendingButton = page.getByRole('dialog').getByRole('button', { name: 'Rolling back...', exact: true })
    await pendingButton.waitFor()
    assert.equal(await pendingButton.isDisabled(), true, 'pending rollback cannot be repeated')
    await page.keyboard.press('Enter')
  } finally { release(); rollbackGate = undefined }
  if (['403', '409'].includes(mode)) await page.getByText(mode === '403'
    ? catalogs.en['recovery.application.lifecycle.rollbackForbidden'] : 'QA rollback 409', { exact: true }).waitFor()
  else {
    await page.getByRole('dialog').getByText('Airflow', { exact: true }).waitFor()
    await page.getByRole('dialog').getByText('IBM FlashCopy', { exact: true }).waitFor()
    await screenshot(`rollback-${mode}`)
    await page.keyboard.press('Escape')
  }
  assert.equal(requests.filter(req => req.path === '/rollback_app_from_orchestrator').length, before + 1)
  assert(records.some(record => record.id === id), 'standalone rollback must preserve application')
  results.push({ scenario: `rollback-${mode}`, result: 'pass' })
  console.log(`PASS rollback-${mode}`)
}
try {
  // Phase 1 functional checks over the real wizard, all requests still mocked.
  for (const platform of ['vmware', 'power']) {
    const id = platform + '-functional'
    const record = application(id, platform)
    if (platform === 'power') record.application.target_provider_id = 'power-source'
    record.application.tiers.second = { ...structuredClone(record.application.tiers.database), order: 2 }
    records.push(record)
    await edit(id)
    const email = page.locator('#application-notification-email')
    await email.fill('invalid')
    assert.equal(await page.getByRole('button', { name: 'Next', exact: true }).isDisabled(), true)
    assert.equal(submitRequests().filter(request => request.body.id === id).length, 0)
    await email.fill('Team@Example.test')
    await step('tiers')
    assert.equal(await page.getByText('QA other ' + platform + ' group', { exact: true }).count(), 0, 'another source must not appear in sidebar')
    await step('orchestration')
    if (platform === 'power') {
      await page.locator('#recovery-application-template-version').selectOption('v2')
      assert.equal(await page.getByRole('button', { name: 'Save Application', exact: true }).isDisabled(), true)
      await page.getByText(/IBM Power v2: LPAR.*database, second/).waitFor()
      await step('tiers')
      await page.getByRole('checkbox', { name: 'LPAR-01', exact: true }).last().uncheck()
      await step('orchestration')
      assert.equal(await page.getByRole('button', { name: 'Save Application', exact: true }).isEnabled(), true)
      await step('tiers')
      await page.getByRole('checkbox', { name: 'LPAR-01', exact: true }).last().check()
      await step('orchestration')
      assert.equal(await page.getByRole('button', { name: 'Save Application', exact: true }).isDisabled(), true)
      await page.locator('#recovery-application-template-version').selectOption('v1')
    }
    await save()
    await page.waitForURL('**/recovery-plans/recovery-applications')
    assert.equal(submitRequests().at(-1).body.application.notificationEmail, 'Team@Example.test')
    assert.equal(Object.keys(submitRequests().at(-1).body.application.tiers).length, 2, 'v1 keeps repeated names across tiers')
    await edit(id)
    assert.equal(await email.inputValue(), 'Team@Example.test')
    await email.fill('')
    await step('orchestration')
    await save()
    await page.waitForURL('**/recovery-plans/recovery-applications')
    assert.equal(submitRequests().at(-1).body.application.notificationEmail, null)
    const mismatch = application(platform + '-source-mismatch', platform)
    mismatch.application.source_provider_id = platform + '-other-source'
    records.push(mismatch)
    await edit(mismatch.id)
    await step('tiers')
    await page.getByText(/uses source.*but the application uses/).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Orchestration', exact: true }).isDisabled(), true)
    assert.equal(submitRequests().filter(request => request.body.id === mismatch.id).length, 0)
    const missing = application(platform + '-workload-missing', platform)
    missing.application.tiers.database.recovery_group.vms = [{ name: 'missing-workload' }]
    records.push(missing)
    await edit(missing.id)
    await step('tiers')
    await page.getByText(/Workload.*missing-workload.*no longer belongs/).waitFor()
    assert.equal(submitRequests().filter(request => request.body.id === missing.id).length, 0)
    results.push({ scenario: platform + '-functional-email-source-membership-duplicates', result: 'pass' })
    console.log('PASS ' + platform + '-functional-email-source-membership-duplicates')
  }
  const sameTier = application('power-same-tier', 'power')
  sameTier.application.dag_template_version = 'v2'
  sameTier.application.tiers.database.recovery_group.vms.push({ name: 'LPAR-01' })
  records.push(sameTier)
  await edit(sameTier.id)
  await step('orchestration')
  await page.getByText(/IBM Power v2: LPAR.*repeated in tier/).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Save Application', exact: true }).isDisabled(), true)
  await page.locator('#recovery-application-template-version').selectOption('v1')
  assert.equal(await page.getByRole('button', { name: 'Save Application', exact: true }).isEnabled(), true)
  await save()
  await page.waitForURL('**/recovery-plans/recovery-applications')
  results.push({ scenario: 'power-v2-same-tier-v1-switch', result: 'pass' })
  groupsFailure = true
  await edit('vmware-draft')
  await step('tiers')
  await page.getByText('QA groups unavailable', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Orchestration', exact: true }).isDisabled(), true)
  groupsFailure = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await page.getByText('QA vmware group', { exact: true }).first().waitFor()
  results.push({ scenario: 'query-error-retry-no-preflight', result: 'pass' })
  // Remove transient invalid fixtures before lifecycle list/table assertions.
  records = records.filter(record => ['vmware-draft', 'power-draft'].includes(record.id))
  for (const [platform, version] of [['vmware', null], ['power', null], ['power', 'v2'], ['power', 'v1']]) {
    const id = `${platform}-draft`
    await edit(id)
    await step('orchestration')
    const select = page.locator('#recovery-application-template-version')
    await select.locator('option[value="v1"]').waitFor({ state: 'attached' })
    assert.equal(await select.inputValue(), records.find(record => record.id === id).application.dag_template_version ?? 'v1', 'configured selection or catalog default is shown')
    await select.selectOption(version ?? 'v1')
    await save()
    await page.waitForURL('**/recovery-plans/recovery-applications')
    const request = submitRequests().at(-1)
    assert.equal(request.params.push_to_orchestrator, 'false')
    assert.equal(request.body.application.dag_template_version ?? null, version === 'v2' ? 'v2' : null, 'selecting the default keeps null on the wire')
    await edit(id)
    await step('orchestration')
    assert.equal(await select.inputValue(), version ?? 'v1', 'configured version survives GET/edit round trip')
    await screenshot(`${platform}-${version ?? 'default'}-save-only`)
    results.push({ scenario: `${platform}-${version ?? 'default'}-save-only`, result: 'pass' })
    console.log(`PASS ${platform}-${version ?? 'default'}-save-only`)
  }
  await navigate('/create')
  await page.locator('#application-file-name').fill('created_lifecycle')
  await page.locator('#application-name').fill('QA-created-lifecycle')
  await page.locator('#application-description').fill('Created through the actual wizard')
  await page.locator('#application-platform').selectOption('vmware-source')
  await page.locator('#application-target-provider').selectOption('vmware-target')
  await step('tiers')
  await page.locator('[draggable="true"]').filter({ hasText: 'QA vmware group' }).dragTo(page.getByLabel('Unassigned recovery group', { exact: true }))
  await step('details')
  await page.locator('#application-platform').selectOption('vmware-other-source')
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.equal(await page.locator('#application-platform').inputValue(), 'vmware-source')
  await page.locator('#application-platform').selectOption('vmware-other-source')
  await page.getByRole('dialog').getByRole('button', { name: 'Change provider', exact: true }).click()
  await step('tiers')
  await page.getByLabel('Unassigned recovery group', { exact: true }).waitFor()
  await step('details')
  await page.locator('#application-platform').selectOption('power-source')
  assert.equal(await page.locator('#application-target-provider').inputValue(), '')
  await page.locator('#application-platform').selectOption('vmware-source')
  await page.locator('#application-target-provider').selectOption('vmware-target')
  await step('tiers')
  await page.locator('[draggable="true"]').filter({ hasText: 'QA vmware group' }).dragTo(page.getByLabel('Unassigned recovery group', { exact: true }))
  results.push({ scenario: 'source-confirm-cancel-confirm-platform-reset', result: 'pass' })
  await step('policySet')
  await page.getByRole('button', { name: /QA Policy/ }).click()
  await step('orchestration')
  await save()
  await page.waitForURL('**/recovery-plans/recovery-applications')
  assert.equal(records.filter(record => record.id === 'created_lifecycle').length, 1)
  results.push({ scenario: 'create-save-only', result: 'pass' })
  pushFailure = true
  await edit('created_lifecycle')
  await step('orchestration')
  await page.getByRole('switch').click()
  await page.locator('#recovery-application-orchestration-provider').selectOption('airflow-stored')
  await save()
  await page.getByText(catalogs.en['recovery.application.lifecycle.pushSavedLocally'], { exact: true }).waitFor()
  assert.equal(records.find(record => record.id === 'created_lifecycle').orchestration.pushed, false)
  assert.equal(records.filter(record => record.id === 'created_lifecycle').length, 1)
  pushFailure = false
  await save()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  await page.waitForURL('**/recovery-plans/recovery-applications')
  assert.equal(records.filter(record => record.id === 'created_lifecycle').length, 1)
  results.push({ scenario: 'create-push-502-local-save-retry', result: 'pass' })
  // A failed catalog can be retried without losing a stored explicit version.
  catalogFailure = true
  await edit('power-draft')
  await step('orchestration')
  await page.getByRole('button', { name: 'Retry', exact: true }).waitFor()
  catalogFailure = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await page.locator('#recovery-application-template-version option[value="v2"]').waitFor({ state: 'attached' })
  assert.equal(await page.locator('#recovery-application-template-version').inputValue(), 'v1')
  results.push({ scenario: 'catalog-retry-preserves-version', result: 'pass' })
  // Push both platforms, inspect every read-only step, then rollback and re-push.
  for (const platform of ['vmware', 'power']) {
    const id = `${platform}-draft`
    await edit(id)
    await step('orchestration')
    await page.getByRole('switch').click()
    await page.locator('#recovery-application-orchestration-provider').selectOption('airflow-stored')
    await save()
    await page.getByRole('dialog').waitFor()
    await page.keyboard.press('Escape')
    await page.waitForURL('**/recovery-plans/recovery-applications')
    assert.equal(records.find(item => item.id === id).orchestration.pushed, true)
    const deployedRow = page.getByRole('row').filter({ hasText: `QA-${id}` })
    await deployedRow.getByRole('button', { name: /actions/i }).click()
    const inspectEdit = page.getByRole('menuitem', { name: 'Edit', exact: true })
    assert.equal(await inspectEdit.isEnabled(), true, 'pushed Edit must open a read-only wizard')
    await inspectEdit.click()
    await page.getByText(catalogs.en['recovery.application.lifecycle.readOnly'], { exact: true }).waitFor()
    await assertReadOnly(id)
    await screenshot(`${platform}-readonly`)
    await rollback(id, 'ok')
    await edit(id)
    assert.equal(await page.locator('#application-name').isEnabled(), true)
    await step('orchestration')
    await page.getByRole('switch').click()
    await page.locator('#recovery-application-orchestration-provider').selectOption('airflow-stored')
    await save()
    await page.getByRole('dialog').waitFor()
    await page.keyboard.press('Escape')
    results.push({ scenario: `${platform}-push-readonly-rollback-repush`, result: 'pass' })
  }
  for (const mode of ['partial', 'failed', '403', '409', 'skipped']) {
    const id = 'power-draft'
    await rollback(id, mode)
    if (mode !== 'skipped') await assertReadOnly(id)
  }
  const display = application('version-display', 'power', true)
  display.application.dag_template_version = 'v1'
  display.orchestration.template_version = 'v2'
  records.push(display)
  await navigate('')
  await page.getByText(display.application.name, { exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Orchestration', exact: true }).click()
  const deployedLabel = page.getByText(catalogs.en['recovery.application.lifecycle.deployedVersion'], { exact: true })
  await deployedLabel.waitFor()
  assert.equal(await deployedLabel.locator('..').locator('dd').innerText(), 'v2', 'deployed display must not use configured v1')
  await screenshot('deployed-version-display')
  await page.keyboard.press('Escape')
  await rollback(display.id, 'ok')
  await navigate('')
  await page.getByText(display.application.name, { exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Orchestration', exact: true }).click()
  const configuredLabel = page.getByText(catalogs.en['recovery.application.lifecycle.configuredVersion'], { exact: true })
  await configuredLabel.waitFor()
  assert.equal(await configuredLabel.locator('..').locator('dd').innerText(), 'v1')
  await page.getByText(catalogs.en['recovery.application.lifecycle.historicalRun'], { exact: true }).waitFor()
  assert.equal(await deployedLabel.count(), 0, 'rollback retained version is historical, not deployed')
  await screenshot('configured-version-history-display')
  await page.keyboard.press('Escape')
  results.push({ scenario: 'configured-deployed-version-history-display', result: 'pass' })
  // Direct deployed URLs remain inspectable even when all stored references are gone.
  const broken = application('missing-references', 'power', true)
  broken.policy_set_id = 'missing-policy'
  broken.application.source_provider_id = 'missing-source'
  broken.application.target_provider_id = 'missing-target'
  broken.application.tiers.database.recovery_group.id = 'missing-group'
  broken.application.dag_template_version = 'missing-version'
  records.push(broken)
  for (const language of ['en', 'sk', 'cs']) {
    await page.setViewportSize({ width: language === 'en' ? 1440 : 390, height: 844 })
    await assertReadOnly(broken.id, language)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'page must fit viewport')
    await screenshot(`readonly-missing-references-${language}`)
    results.push({ scenario: `readonly-missing-references-${language}`, result: 'pass' })
  }
  assert.deepEqual(errors, [])
} catch (error) {
  results.push({ failure: error.message, url: page.url() })
  await screenshot('failure')
  throw error
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify({ mode: 'mocked-browser', base, results, errors, consoleFindings, liveBackend: 'not-run', provisioning: 'not-run' }, null, 2))
  await writeFile(`${output}/network.json`, JSON.stringify(requests, null, 2))
  await browser.close()
  console.log(JSON.stringify({ output, results, errors }, null, 2))
}
