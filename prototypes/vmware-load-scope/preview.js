// Prototype only: provider scope and table filters stay independent, in memory.
const $ = (selector) => document.querySelector(selector)
const records = ['WEB01', 'WEB02', 'DB01', 'APP01', 'BATCH01', 'BACKUP01'].map((name, index) => ({
  name: `TEST-${name}`, os: index === 2 ? 'Red Hat Enterprise Linux 9' : 'Windows Server 2022',
  on: index < 4, compute: index === 2 ? '4 vCPU · 16 GB' : '2 vCPU · 8 GB',
}))
let provider = 'vm-01'
let powerOnly = false
let previewState = 'success'
let refreshTimer
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
  $('#provider-conditions').hidden = !scoped
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
$('#state').addEventListener('change', event => { clearTimeout(refreshTimer); previewState = event.target.value; render() })
$('#search').addEventListener('input', render)
const providerList = $('.view-nav')
const providerTabs = [...document.querySelectorAll('[data-provider]')]
function selectProvider(button) {
  provider = button.dataset.provider
  providerTabs.forEach(item => {
    item.classList.toggle('active', item === button)
    item.setAttribute('aria-selected', String(item === button))
    item.tabIndex = item === button ? 0 : -1
  })
  $('#vm-panel').setAttribute('aria-labelledby', button.id)
  button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  $('#search').value = ''; powerOnly = false; render()
}
providerTabs.forEach(button => {
  button.addEventListener('click', () => selectProvider(button))
  button.addEventListener('keydown', event => {
    const visibleTabs = providerTabs.filter(tab => !tab.hidden)
    const index = visibleTabs.indexOf(button)
    const next = { ArrowRight: (index + 1) % visibleTabs.length, ArrowLeft: (index - 1 + visibleTabs.length) % visibleTabs.length, Home: 0, End: visibleTabs.length - 1 }[event.key]
    if (next === undefined) return
    event.preventDefault()
    selectProvider(visibleTabs[next])
    visibleTabs[next].focus({ preventScroll: true })
  })
})
function updateProviderScroll() {
  $('.provider-nav').style.setProperty('--visible-providers', Math.min(4, providerTabs.filter(tab => !tab.hidden).length))
  const max = Math.max(0, providerList.scrollWidth - providerList.clientWidth)
  $('#previous-provider').hidden = max <= 1
  $('#next-provider').hidden = max <= 1
  $('#previous-provider').disabled = providerList.scrollLeft <= 1
  $('#next-provider').disabled = providerList.scrollLeft >= max - 1
}
for (const [id, direction] of [['previous-provider', -1], ['next-provider', 1]]) {
  $(`#${id}`).addEventListener('click', () => {
    const stride = providerTabs[0].getBoundingClientRect().width + 4
    const visibleCount = Math.max(1, Math.floor((providerList.clientWidth + 4) / stride))
    const nextIndex = Math.round(providerList.scrollLeft / stride) + direction * visibleCount
    providerList.scrollTo({ left: Math.max(0, nextIndex * stride), behavior: 'smooth' })
  })
}
providerList.addEventListener('scroll', updateProviderScroll, { passive: true })
new ResizeObserver(updateProviderScroll).observe(providerList)
window.addEventListener('resize', updateProviderScroll)
$('#provider-count').addEventListener('change', event => {
  providerTabs.forEach((tab, index) => { tab.hidden = index >= Number(event.target.value) })
  if (providerTabs.find(tab => tab.dataset.provider === provider)?.hidden) selectProvider(providerTabs[0])
  updateProviderScroll()
})
updateProviderScroll()
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
render()
