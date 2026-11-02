import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Standalone, isolated browser QA. Every API request is mocked; unknown routes fail closed.
// Start Vite separately, then: node scripts/qa/verify-recovery-application-field-help.mjs
const base = process.env.APP_URL ?? 'http://127.0.0.1:5198'
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'APP_URL must be local')
const runtime = process.env.PLAYWRIGHT_MODULE ?? 'node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs'
const { chromium } = await import(pathToFileURL(resolve(runtime)).href)
const output = resolve('node_modules/.cache/application-field-help-qa')
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
let catalogFailure = false, groupsFailure = false, pushFailure = false, submitConflict = false
page.on('pageerror', error => errors.push(error.message))
page.on('requestfailed', request => {
  const text = `${request.failure()?.errorText}: ${request.url()}`
  const expected = request.failure()?.errorText === 'net::ERR_ABORTED' && request.resourceType() !== 'document'
  consoleFindings.push({ type: 'requestfailed', text, expected })
  if (!expected) errors.push(text)
})
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
    if (submitConflict) return respond({ detail: 'QA application was deployed by another client' }, 409)
    const pushed = params.push_to_orchestrator === 'true'
    const version = body.application.dag_template_version ?? templates.find(item => item.platform === body.application.platform && item.default)?.version
    const saved = { ...body, orchestration: { pushed: pushed && !pushFailure, provider_id: params.provider_id ?? null, run_id: `dag-${body.id}`, ...(pushed && !pushFailure ? { template_version: version } : {}) } }
    records = [...records.filter(item => item.id !== body.id), saved]
    if (pushed && pushFailure) return respond({ detail: 'saved locally, but Airflow push failed: QA offline' }, 502)
    return respond({ applications: records, ...(pushed ? { orchestrator_push: { status: 'pushed', dag_id: saved.orchestration.run_id, dag: '/mock/dag.py' } } : {}) })
  }
  errors.push(`Unexpected API request: ${req.method()} ${path}`)
  return respond({ detail: `Unexpected mocked endpoint ${path}` }, 599)
})

const root = '/recovery-plans/recovery-applications'
const step = (name, language) => page.getByRole('button', { name: catalogs[language][`pages.recoveryBuilder.steps.${name}`], exact: true }).click()
const writes = () => requests.filter(request => request.method !== 'GET')
async function inspectHelp(key, language, screenshotName) {
  const prefix = `recoveryApplications.fieldHelp.${key}`
  const text = catalogs[language]
  const trigger = page.getByRole('button', { name: text[`${prefix}.trigger`], exact: true })
  await trigger.waitFor({ state: 'visible' })
  assert.equal(await trigger.count(), 1, `one trigger for ${key}`)
  assert.equal(await trigger.isEnabled(), true, `${key} remains available`)
  await trigger.hover()
  const panel = page.getByRole('dialog', { name: text[`${prefix}.title`], exact: true })
  await panel.waitFor({ state: 'visible' })
  assert.equal(await panel.getByText(text[`${prefix}.effect.text`], { exact: true }).count(), 1)
  await panel.hover()
  const box = await panel.boundingBox()
  const viewport = page.viewportSize()
  assert(box && box.x >= 0 && box.x + box.width <= viewport.width + 1, 'popover fits viewport')
  if (screenshotName) await page.screenshot({ path: `${output}/${screenshotName}.png`, fullPage: true })
  // Scroll both the viewport's wizard/modal container and the panel itself.
  await panel.evaluate(element => { element.scrollTop = 30 })
  await page.mouse.wheel(0, 80)
  await page.keyboard.press('Escape')
  await panel.waitFor({ state: 'hidden' })
  await trigger.click()
  await panel.waitFor({ state: 'visible' })
  await page.keyboard.press('Tab')
  assert.equal(await panel.evaluate(element => element.contains(document.activeElement)), true, 'Tab enters help portal')
  await page.keyboard.press('Shift+Tab')
  assert.equal(await trigger.evaluate(element => document.activeElement === element), true, 'Shift+Tab returns to trigger')
  await page.keyboard.press('Escape')
  await panel.waitFor({ state: 'hidden' })
  await page.mouse.move(0, 0)
}

async function inspectWizard(platform, language, readOnly) {
  const suffix = platform === 'power' ? 'ibmPower' : 'vmware'
  const before = writes().length
  for (const name of ['details', 'tiers', 'policySet', 'orchestration']) {
    await step(name, language)
    const fields = page.locator('main input, main select, main textarea, main button[role="switch"]')
    if (readOnly) {
      for (const field of await fields.all()) assert.equal(await field.isDisabled(), true, `${name} control locked`)
      if (name === 'details') {
        const input = page.locator('#application-name'), value = await input.inputValue()
        await input.click({ force: true })
        await page.keyboard.type('blocked-change')
        assert.equal(await input.inputValue(), value)
      }
      if (name === 'tiers') {
        const data = await page.locator('main').evaluate(element => {
          const target = element.querySelector('[draggable]')
          if (!target) return { attempted: false }
          const transfer = new DataTransfer()
          transfer.setData('recovery-group-id', 'vmware-other-group')
          const start = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: transfer })
          target.dispatchEvent(start)
          target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
          return { attempted: true, prevented: start.defaultPrevented }
        })
        if (data.attempted) assert.equal(data.prevented, true, 'read-only drag capture blocks DnD')
      }
    }
    const keys = name === 'details' ? [`source.${suffix}`, `target.${suffix}`, 'email']
      : name === 'tiers' ? [`tierOrder.${suffix}.${platform === 'power' ? 'v2' : 'v1'}`, `workloads.${suffix}`]
      : name === 'policySet' ? [`policySet.${suffix}`] : [`template.${suffix}`, 'push', 'airflow']
    for (const key of keys) await inspectHelp(key, language, key.startsWith('source.') ? `${platform}-${language}-${readOnly ? 'readonly' : 'edit'}` : undefined)
  }
  assert.equal(writes().length, before, 'help/read-only attempts never write')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'page fits viewport')
}

try {
  records = ['vmware', 'power'].flatMap(platform => [false, true].map(pushed => {
    const record = application(`${platform}-${pushed ? 'pushed' : 'draft'}`, platform, pushed)
    record.application.dag_template_version = platform === 'power' ? 'v2' : null
    if (platform === 'power') record.application.target_provider_id = 'power-source'
    return record
  }))
  for (const [index, language] of ['en', 'sk', 'cs'].entries()) {
    await page.setViewportSize([{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 360, height: 800 }][index])
    for (const platform of ['vmware', 'power']) {
      for (const readOnly of [false, true]) {
        const id = `${platform}-${readOnly ? 'pushed' : 'draft'}`
        await page.goto(`${base}${root}/${id}/edit?qa-language=${language}`)
        await page.locator('#application-name').waitFor()
        if (readOnly) await page.getByText(catalogs[language]['recovery.application.lifecycle.readOnly'], { exact: true }).waitFor()
        else {
          await page.waitForFunction(() => document.querySelector('#application-name')?.matches(':enabled'))
          await step('orchestration', language)
          await page.getByRole('switch').check()
          await page.locator('#recovery-application-orchestration-provider').selectOption('airflow-stored')
        }
        await inspectWizard(platform, language, readOnly)
        if (!readOnly) {
          // Verify the first subsequent mocked Push still sends exactly the stored configuration.
          const expected = structuredClone(records.find(record => record.id === id))
          const before = writes().length
          await Promise.all([
            page.waitForResponse(response => new URL(response.url()).pathname === '/api/submit_recovery_dag'),
            page.getByRole('button', { name: catalogs[language]['buttons.saveApplication'], exact: true }).click(),
          ])
          assert.equal(writes().length, before + 1)
          assert.deepEqual(writes().at(-1).body.application, expected.application, 'help preserves exact payload')
          await page.getByRole('dialog').waitFor({ state: 'visible' })
          await page.keyboard.press('Escape')
          await page.waitForURL(`**${root}`)
    await page.getByText('QA-vmware-pushed', { exact: true }).waitFor()
          // Reset the mocked deployed record for the next language.
          records.find(record => record.id === id).orchestration.pushed = false
        }
        results.push({ platform, language, mode: readOnly ? 'readonly' : 'edit', result: 'pass' })
      }
      await page.goto(`${base}${root}?qa-language=${language}`)
      await page.getByText(`QA-${platform}-pushed`, { exact: true }).click()
      const detail = page.getByRole('dialog', { name: catalogs[language]['drawer.applicationDetail'], exact: true })
      await inspectHelp(`source.${platform === 'power' ? 'ibmPower' : 'vmware'}`, language)
      assert.equal(await detail.isVisible(), true, 'help Escape preserves DetailView')
      await detail.getByRole('button', { name: catalogs[language]['details.tabs.orchestration'], exact: true }).click()
      await inspectHelp('push', language)
      await inspectHelp('airflow', language)
      results.push({ platform, language, mode: 'detail', result: 'pass' })
    }
  }
  // Exercise Create platform changes in every language, then discard through the real UI.
  for (const language of ['en', 'sk', 'cs']) {
    await page.goto(`${base}${root}/create?qa-language=${language}`)
    await page.locator('#application-platform').waitFor()
    await inspectHelp('source.generic', language)
    await page.locator('#application-platform').selectOption('vmware-source')
    await inspectHelp('source.vmware', language)
    await page.locator('#application-platform').selectOption('power-source')
    await inspectHelp('source.ibmPower', language)
    results.push({ language, mode: 'create-platform-switch', result: 'pass' })
    await page.getByRole('button', { name: catalogs[language]['buttons.cancel'], exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: catalogs[language]['recovery.builder.discardDialog.confirm'], exact: true }).click()
    await page.waitForURL(`**${root}`)
    await page.getByText('QA-vmware-pushed', { exact: true }).waitFor()
  }
  const missing = application('missing-power', 'power', true)
  missing.application.source_provider_id = 'gone'
  missing.application.target_provider_id = 'gone'
  records.push(missing)
  await page.goto(`${base}${root}/missing-power/edit?qa-language=en`)
  await inspectHelp('source.ibmPower', 'en')
  results.push({ mode: 'missing-provider-retains-stored-platform', result: 'pass' })
  catalogFailure = true
  await page.goto(`${base}${root}/missing-power/edit?qa-language=en`)
  await step('tiers', 'en')
  await inspectHelp('tierOrder.generic', 'en')
  catalogFailure = false
  results.push({ mode: 'catalog-error-generic-execution-help', result: 'pass' })
  await page.goto(`${base}${root}/vmware-draft/edit?qa-language=en`)
  await page.waitForFunction(() => document.querySelector('#application-name')?.matches(':enabled'))
  await step('orchestration', 'en')
  await page.getByRole('switch').check()
  await page.locator('#recovery-application-orchestration-provider').selectOption('airflow-stored')
  // Simulate a deployment by another client while the local form is editable.
  records.find(record => record.id === 'vmware-draft').orchestration.pushed = true
  submitConflict = true
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/submit_recovery_dag' && response.status() === 409),
    page.getByRole('button', { name: catalogs.en['buttons.saveApplication'], exact: true }).click(),
  ])
  await page.getByText(catalogs.en['recovery.application.lifecycle.readOnly'], { exact: true }).waitFor()
  await inspectWizard('vmware', 'en', true)
  submitConflict = false
  results.push({ mode: 'delayed-409-lock-retains-help-blocks-mutation', result: 'pass' })
  assert.deepEqual(errors, [])
} catch (error) {
  results.push({ failure: error.message, url: page.url() })
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
  throw error
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify({ mode: 'mocked-browser', results, errors, consoleFindings, liveBackend: 'not-run' }, null, 2))
  await writeFile(`${output}/network.json`, JSON.stringify(requests, null, 2))
  await browser.close()
  console.log(JSON.stringify({ output, results, errors }, null, 2))
}
