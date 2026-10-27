const designs = {
  precision: ['01 / Precision', 'IBM Carbon inšpirácia: ostré hrany, sivé vrstvy, pevná mriežka a modrá primárna akcia. Dôraz na skenovanie dát.'],
  enterprise: ['02 / Enterprise', 'Hitachi inšpirácia: svetlé pracovisko, výrazná typografia a decentný červený akcent. Viac priestoru medzi záznamami.'],
  operations: ['03 / Operations', 'Vlastná technická konzola: kompaktné riadky, oceľová modrá a trvalo viditeľný inšpektor. Detail bez straty kontextu.'],
}
const records = [
  { id: 'tier2-apps', name: 'Tier 2 applications', description: 'Policy set using the medium-tier, 1-hour cadence, clean room', snapshot_policy_id: 'snapshot-1h', recovery_app_policy_id: 'medium-tier', clean_room_policy_id: 'clean-room-standard' },
  { id: 'test_1_hour_ps', name: 'test_1_hour_ps', description: 'Policy set using the Every 15 minutes', snapshot_policy_id: 'snapshot-15m', recovery_app_policy_id: 'standard-recovery', clean_room_policy_id: 'clean-room-standard' },
  { id: 'power-lab-ps', name: 'Power lab policy set', description: 'IBM Power end-to-end test', snapshot_policy_id: 'power-snapshot', recovery_app_policy_id: 'power-recovery', clean_room_policy_id: null },
  { id: 'power-lab-wwpn-ps-exp', name: 'Power lab explicit WWPN policy set', description: 'IBM Power end-to-end test with manual WWPN entry', snapshot_policy_id: 'power-snapshot', recovery_app_policy_id: 'power-wwpn-recovery', clean_room_policy_id: null },
]
const requested = new URLSearchParams(location.search).get('design')
const design = Object.hasOwn(designs, requested) ? requested : 'precision'
document.body.dataset.design = design
document.body.dataset.density = 'compact'
document.querySelector(`[data-design="${design}"] a[data-design="${design}"]`).setAttribute('aria-current', 'page')
document.getElementById('design-title').textContent = designs[design][0]
document.getElementById('design-description').textContent = designs[design][1]
const rows = document.getElementById('rows')
const dialog = document.getElementById('record-dialog')
let selectedId = design === 'operations' ? records[0].id : null

function element(tag, text, className) {
  const node = document.createElement(tag)
  node.textContent = text
  if (className) node.className = className
  return node
}
function details(record, target, inspector = false) {
  target.replaceChildren()
  const heading = element('h2', record.name)
  if (inspector) heading.id = 'inspector-title'
  target.append(heading, element('span', record.id, 'identifier'), element('p', record.description))
  const list = document.createElement('dl')
  for (const [label, key] of [['Snapshot policy', 'snapshot_policy_id'], ['Recovery policy', 'recovery_app_policy_id'], ['Clean room policy', 'clean_room_policy_id']]) {
    list.append(element('dt', label), element('dd', record[key] ?? 'Not configured'))
  }
  target.append(list)
}
function openRecord(record, json) {
  selectedId = record.id
  render()
  details(record, document.getElementById('inspection'), true)
  if (design === 'operations' && !json) return
  document.getElementById('dialog-title').textContent = json ? 'Policy set JSON' : 'Policy set details'
  const content = document.getElementById('dialog-content')
  if (json) content.replaceChildren(element('pre', JSON.stringify(record, null, 2)))
  else details(record, content)
  dialog.showModal()
}
function render() {
  const query = document.getElementById('search').value.toLowerCase().trim()
  const filtered = records.filter(record => [record.name, record.id, record.description].some(value => value.toLowerCase().includes(query)))
  rows.replaceChildren()
  for (const record of filtered) {
    const row = document.createElement('tr')
    row.dataset.selected = String(record.id === selectedId)
    const name = document.createElement('td')
    const button = element('button', record.name, 'record-name')
    button.addEventListener('click', () => openRecord(record, false))
    name.append(button, element('span', record.id, 'identifier'))
    const count = element('td', '', 'numeric')
    count.append(element('span', String([record.snapshot_policy_id, record.recovery_app_policy_id, record.clean_room_policy_id].filter(Boolean).length), 'count'))
    const action = document.createElement('td')
    const view = element('button', '{ } View', 'view-json')
    view.setAttribute('aria-label', `View JSON for ${record.name}`)
    view.addEventListener('click', () => openRecord(record, true))
    action.append(view)
    row.append(name, element('td', record.description, 'description'), count, action)
    rows.append(row)
  }
  if (!filtered.length) {
    const row = document.createElement('tr')
    const empty = element('td', 'No matching policy sets. Try a different name or ID.')
    empty.colSpan = 4
    row.append(empty)
    rows.append(row)
  }
  document.getElementById('results').textContent = filtered.length ? `Showing 1–${filtered.length} of ${filtered.length}` : '0 matching records'
}
document.getElementById('search').addEventListener('input', render)
document.querySelectorAll('button[data-density]').forEach(button => button.addEventListener('click', () => {
  document.body.dataset.density = button.dataset.density
  document.querySelectorAll('button[data-density]').forEach(item => item.setAttribute('aria-pressed', String(item === button)))
}))
document.getElementById('close-dialog').addEventListener('click', () => dialog.close())
document.getElementById('refresh').addEventListener('click', () => {
  render()
  document.getElementById('notice').textContent = 'Preview refreshed. These four sample records are stored locally in this template.'
})
document.getElementById('add').addEventListener('click', () => {
  document.getElementById('dialog-title').textContent = 'Design preview'
  document.getElementById('dialog-content').replaceChildren(element('p', 'This template demonstrates the table design. Creating policy sets is available in the application.'))
  dialog.showModal()
})
details(records[0], document.getElementById('inspection'), true)
render()
