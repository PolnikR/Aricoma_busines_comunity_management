// Prototype only: provider scope and table filters stay independent, in memory.
const $ = (selector) => document.querySelector(selector)
const scope = $('#scope')
const toolbar = $('.toolbar')
const nav = $('.view-nav')
const records = ['WEB01', 'WEB02', 'DB01', 'APP01', 'BATCH01', 'BACKUP01'].map((name, index) => ({
  name: `TEST-${name}`, os: index === 2 ? 'Red Hat Enterprise Linux 9' : 'Windows Server 2022',
  on: index < 4, compute: index === 2 ? '4 vCPU · 16 GB' : '2 vCPU · 8 GB',
}))
let provider = 'vm-01'
let powerOnly = false
let previewState = 'success'
let refreshTimer
let scopeOpener
const explanations = {
  strip: 'Recommended: keep the loading conditions visible directly under the view navigation. Locked provider conditions have no remove action; removable table filters appear separately below the toolbar.',
  header: 'Alternative: loading conditions sit beside the view navigation. This saves a row on wide screens, but competes with provider tabs and wraps earlier.',
  compact: 'Alternative: inspect the loading conditions from a toolbar button. It uses less space, but hides the actual values until opened.',
}
function render() {
  const scoped = provider === 'vm-01'
  const source = scoped ? records : records.map(row => ({ ...row, name: row.name.replace('TEST-', 'PROD-') }))
  const query = $('#search').value.trim().toLowerCase()
  const visible = source.filter(row => (!powerOnly || row.on) && `${row.name} ${row.os} ACMTHCICLUSTER`.toLowerCase().includes(query))
  $('#rows').replaceChildren(...visible.map(row => {
    const tr = document.createElement('tr')
    const cells = [row.name, row.os, 'ACMTHCICLUSTER', scoped ? 'ABC Orchestrator' : 'Production', row.compute, 'Connected', row.on ? 'On' : 'Off']
    cells.forEach((value, index) => {
      const td = document.createElement('td')
      if (index === 3) { const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = value; td.append(tag) }
      else if (index === 6) { const status = document.createElement('span'); status.className = `status${row.on ? '' : ' off'}`; const dot = document.createElement('span'); dot.className = 'dot'; dot.setAttribute('aria-hidden', 'true'); status.append(dot, document.createTextNode(value)); td.append(status) }
      else td.textContent = value
      tr.append(td)
    })
    return tr
  }))
  scope.hidden = !scoped
  $('#compact-scope').hidden = !scoped
  $('#active-filter').hidden = !powerOnly
  $('#filter-count').hidden = !powerOnly
  $('#rows').hidden = previewState !== 'success'
  $('#empty').hidden = !(previewState === 'empty' || (previewState === 'success' && visible.length === 0))
  $('#loading').hidden = previewState !== 'loading'
  $('#error').hidden = previewState !== 'error'
  $('.table-scroll').setAttribute('aria-busy', String(previewState === 'loading'))
  $('#result').textContent = previewState === 'success' ? `Showing ${visible.length} of ${source.length} loaded VMs` : { loading: 'Loading inventory…', error: 'Refresh failed', empty: '0 VMs in this scope' }[previewState]
  $('#total').textContent = previewState === 'empty' ? '0' : '6'
  $('#powered').textContent = previewState === 'empty' ? '0' : '4'
  $('#memory').textContent = previewState === 'empty' ? '0 GB' : '56 GB'
  if (previewState === 'empty') { $('#empty h2').textContent = 'No VMs in the provider scope'; $('#empty p').textContent = 'No VMs match the configured prefix and tag. Check the provider configuration.'; $('#reset').hidden = true }
  else { $('#empty h2').textContent = 'No VMs match these table filters'; $('#empty p').textContent = 'The provider loading scope still applies.'; $('#reset').hidden = false }
}
function variant(value) {
  value = Object.hasOwn(explanations, value) ? value : 'strip'
  document.body.dataset.variant = value
  $('#variant').value = value
  if (value === 'header') nav.append(scope)
  else toolbar.before(scope)
  $('#rationale').textContent = explanations[value]
  const url = new URL(location.href); url.searchParams.set('variant', value); history.replaceState(null, '', url)
}
$('#variant').addEventListener('change', event => variant(event.target.value))
$('#state').addEventListener('change', event => { clearTimeout(refreshTimer); previewState = event.target.value; render() })
$('#search').addEventListener('input', render)
document.querySelectorAll('[data-provider]').forEach(button => button.addEventListener('click', () => {
  provider = button.dataset.provider
  document.querySelectorAll('[data-provider]').forEach(item => { item.classList.toggle('active', item === button); if (item === button) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current') })
  $('#search').value = ''; powerOnly = false; render()
}))
document.querySelectorAll('.scope-details').forEach(button => button.addEventListener('click', () => { scopeOpener = button; $('#scope-dialog').showModal() }))
$('#scope-dialog').addEventListener('close', () => scopeOpener?.focus())
$('#filter-dialog').addEventListener('close', () => $('#filter-button').focus())
$('#filter-button').addEventListener('click', () => { $('#power').checked = powerOnly; $('#filter-dialog').showModal() })
$('#cancel-filter').addEventListener('click', () => $('#filter-dialog').close())
$('#filter-form').addEventListener('submit', event => { event.preventDefault(); powerOnly = $('#power').checked; $('#filter-dialog').close(); render() })
function reset() { powerOnly = false; $('#search').value = ''; $('#power').checked = false; render() }
$('#clear-power').addEventListener('click', () => { powerOnly = false; render(); $('#filter-button').focus() })
$('#clear-filters').addEventListener('click', () => { reset(); $('#filter-dialog').close() })
$('#reset').addEventListener('click', () => { reset(); $('#search').focus() })
for (const id of ['compact', 'comfortable']) $(`#${id}`).addEventListener('click', () => {
  document.body.classList.toggle('comfortable', id === 'comfortable')
  $('#compact').setAttribute('aria-pressed', String(id === 'compact')); $('#comfortable').setAttribute('aria-pressed', String(id === 'comfortable'))
})
function refresh() { clearTimeout(refreshTimer); previewState = 'loading'; $('#state').value = 'loading'; render(); refreshTimer = setTimeout(() => { previewState = 'success'; $('#state').value = 'success'; render() }, 700) }
$('#reload').addEventListener('click', refresh)
$('#retry').addEventListener('click', refresh)
$('#theme').addEventListener('click', () => { const dark = document.documentElement.classList.toggle('dark'); $('#theme').textContent = dark ? 'Light theme' : 'Dark theme' })
variant(new URLSearchParams(location.search).get('variant') ?? 'strip')
render()
