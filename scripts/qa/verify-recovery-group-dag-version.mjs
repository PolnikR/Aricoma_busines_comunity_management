import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Isolated Edge and loopback UI only. All API requests are intercepted.
const base = process.env.APP_URL ?? 'http://127.0.0.1:5199'
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname))
const runtime = process.env.PLAYWRIGHT_MODULE ?? 'node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs'
const { chromium } = await import(pathToFileURL(resolve(runtime)).href)
const output = resolve('node_modules/.cache/recovery-group-dag-version-qa')
await mkdir(output, { recursive: true })
const catalogs = Object.fromEntries(await Promise.all(['en', 'sk', 'cs'].map(async lang => [lang, JSON.parse(await readFile(`src/locales/${lang}.json`, 'utf8'))])))
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' })
await context.addInitScript(() => localStorage.setItem('app-language', new URL(location.href).searchParams.get('qa-language') ?? 'en'))
const page = await context.newPage()
page.setDefaultTimeout(15000)
const requests = [], results = [], errors = [], consoleFindings = []
const root = '/recovery-plans/recovery-groups'
const fresh = () => ({ id: 'qa_group', name: 'QA DAG Group', description: 'DAG version browser fixture', provider_id_volume: 'source',
  policy_set_id: 'policy', volumes: [{ name: 'VOL' }], topology: 'local', dag_template_version: 'v1',
  orchestration: { pushed: false, provider_id: 'airflow' } })
let record = fresh(), catalogError = false, pushResult = 'pushed'
page.on('pageerror', error => errors.push(error.message))
page.on('dialog', dialog => dialog.accept())
page.on('console', message => {
  if (!['warning', 'error'].includes(message.type())) return
  const text = message.text(), expected = /Failed to load resource.*(?:400|502|503)/.test(text)
  consoleFindings.push({ text, expected })
  if (!expected) errors.push(text)
})
await context.route('**/*', async route => {
  const req = route.request(), url = new URL(req.url())
  if (url.pathname === '/config.js') return route.fulfill({ contentType: 'text/javascript', body: 'window.__APP_CONFIG__={AUTH_ENABLED:"false"};' })
  if (!url.pathname.startsWith('/api/')) {
    if (url.origin === new URL(base).origin) return route.continue()
    errors.push(`External request blocked: ${url.origin}`)
    return route.abort('blockedbyclient')
  }
  const path = url.pathname.slice(4), params = Object.fromEntries(url.searchParams)
  const body = req.postData() ? req.postDataJSON() : undefined
  requests.push({ path, method: req.method(), params, body })
  const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  if (path === '/get_providers') return respond({ providers: [{ id: 'source', name: 'QA Source', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok' }] })
  if (path === '/get_platform_providers') return respond({ providers: [{ id: 'airflow', name: 'QA Airflow', type: 'AIRFLOW', role: 'source', credentialStatus: 'ok' }] })
  if (path === '/get_recovery_groups') return respond({ recovery_groups: [record] })
  if (path === '/get_policy_sets') return respond({ policy_sets: [{ id: 'policy', name: 'QA Policy', description: 'Fixture' }] })
  if (path === '/get_group_dag_template_versions') {
    assert.equal(params.platform, 'flashcopy')
    return catalogError ? respond({ detail: 'QA catalog offline' }, 503) : respond({ templates: [
      { platform: 'hitachi', version: 'other', default: true, description: 'Other platform' },
      { platform: 'flashcopy', version: 'v1', default: false, description: 'Original version' },
      { platform: 'flashcopy', version: 'future', default: true, description: 'Backend-selected default' },
    ] })
  }
  if (path === '/submit_recovery_group') {
    const push = params.push_to_orchestrator === 'true'
    if (push && pushResult === 'failed') return respond({ detail: 'QA saved locally, but Airflow push failed' }, 502)
    const pushed = push && pushResult === 'pushed'
    record = { ...body, orchestration: { provider_id: 'airflow', pushed,
      ...(pushed ? { run_id: 'qa-dag', template_version: body.dag_template_version ?? 'future' } : {}) } }
    return respond({ recovery_groups: [record], ...(push ? { orchestrator_push: pushed
      ? { status: 'pushed', dag_id: 'qa-dag', dag: '/mock/dag.py' }
      : { status: 'skipped', reason: 'QA skipped' } } : {}) })
  }
  if (path === '/get_orchestrator_runs') return respond({ provider_id: 'airflow', dag_runs: [], total_entries: 0 })
  if (path === '/get_recovery_group_inventory') return respond({ recovery_group_id: record.id, recovery_group_name: record.name, run_id: params.run_id, volumes: {} })
  if (path === '/get_policies') return respond({ policies: [] })
  if (path === '/get_recovery_app_policies') return respond({ recovery_app_policies: [] })
  if (path === '/get_clean_room_policies') return respond({ clean_room_policies: [] })
  errors.push(`Unexpected API ${req.method()} ${path}`)
  return respond({ detail: 'Unexpected QA endpoint' }, 599)
})
const navigate = path => page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 60000 })
async function edit(lang = 'en') {
  await navigate(`${root}/qa_group/edit?qa-language=${lang}`)
  await page.getByRole('button', { name: catalogs[lang]['pages.recoveryGroupBuilder.steps.orchestration'], exact: true }).click()
  await page.locator('#recovery-group-template-version').waitFor()
}
const save = lang => page.getByRole('button', { name: catalogs[lang]['pages.recoveryGroupEditor.saveButton'], exact: true }).click()
const writes = () => requests.filter(req => req.path === '/submit_recovery_group')
try {
  for (const lang of ['en', 'sk', 'cs']) {
    record = fresh()
    await edit(lang)
    const select = page.getByLabel(catalogs[lang]['recoveryGroups.dagTemplate.templateLabel'], { exact: true })
    await page.locator('#recovery-group-template-version option[value="future"]').waitFor({ state: 'attached' })
    assert.equal(await select.inputValue(), 'v1')
    assert.equal(await select.locator('option[value="other"]').count(), 0)
    await page.getByRole('button', { name: catalogs[lang]['recoveryGroups.fieldHelp.template.trigger'], exact: true }).click()
    assert((await page.getByRole('dialog').last().innerText()).includes('FlashCopy'))
    await page.keyboard.press('Escape')
    assert.equal(await select.inputValue(), 'v1')
    await select.focus()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Enter')
    assert.equal(await select.inputValue(), 'future')
    await page.keyboard.press('Tab')
    await page.screenshot({ path: `${output}/selector-${lang}.png`, fullPage: true })
    await save(lang)
    await page.waitForURL(`**${root}`)
    assert.equal(writes().at(-1).body.dag_template_version, null)
    await page.getByText('QA DAG Group', { exact: true }).click()
    assert((await page.locator('main').innerText()).includes(catalogs[lang]['recoveryGroups.dagTemplate.backendDefault']))
    assert((await page.locator('main').innerText()).includes(catalogs[lang]['recoveryGroups.dagTemplate.notDeployed']))
    await page.screenshot({ path: `${output}/detail-${lang}.png`, fullPage: true })
    results.push(`${lang}: selector/help/keyboard/default-null/detail`)
  }
  record = fresh(); catalogError = true
  await edit()
  await page.getByText(catalogs.en['recoveryGroups.dagTemplate.templateUnavailable'], { exact: true }).waitFor()
  assert.equal(await page.locator('#recovery-group-template-version').inputValue(), 'v1')
  assert(await page.getByRole('button', { name: catalogs.en['pages.recoveryGroupEditor.saveButton'], exact: true }).isEnabled())
  catalogError = false
  await page.getByRole('button', { name: catalogs.en['buttons.retry'], exact: true }).click()
  await page.locator('#recovery-group-template-version option[value="future"]').waitFor({ state: 'attached' })
  await page.locator('#recovery-group-template-version').selectOption('v1')
  await save('en'); await page.waitForURL(`**${root}`)
  assert.equal(writes().at(-1).body.dag_template_version, 'v1')
  results.push('catalog failure/retry preserves explicit version without Save gate')

  for (const outcome of ['pushed', 'skipped', 'failed']) {
    record = fresh(); pushResult = outcome
    await edit()
    await page.getByRole('switch', { name: 'Deploy to orchestrator', exact: true }).click()
    const reads = requests.filter(req => req.path === '/get_recovery_groups').length
    const before = writes().length
    await save('en')
    if (outcome === 'failed') {
      await page.getByText('QA saved locally, but Airflow push failed', { exact: true }).waitFor()
      assert.equal(requests.filter(req => req.path === '/get_recovery_groups').length, reads)
      assert.equal(writes().length, before + 1)
      assert.equal(await page.locator('#recovery-group-template-version').inputValue(), 'v1')
    } else {
      await page.getByRole('dialog').last().waitFor()
      assert.equal(record.orchestration.pushed, outcome === 'pushed')
      await edit()
      assert.equal(await page.locator('#recovery-group-template-version').isDisabled(), outcome === 'pushed')
      assert.equal(await page.getByRole('button', { name: 'Save Recovery Group', exact: true }).isDisabled(), outcome === 'pushed')
    }
    results.push(`push ${outcome}: existing flow and lock`)
  }
  assert.deepEqual(errors, [])
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
  throw error
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify({ results, requests, errors, consoleFindings }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ scenarios: results.length, results, output }, null, 2))
