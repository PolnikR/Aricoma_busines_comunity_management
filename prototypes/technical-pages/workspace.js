// Synthetic fixtures only. No network calls or production mutations.
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const services = ['sap-prd', 'oracle-fin', 'erp-api', 'sql-report', 'web-portal', 'ad-core'];
const platforms = ['VMware', 'IBM Power', 'FlashSystem'];
const resources = Array.from({ length: 24 }, (_, i) => {
  const platform = platforms[i < 12 ? 0 : i < 18 ? 1 : 2];
  const prefix = platform === 'FlashSystem' ? 'vol' : platform === 'IBM Power' ? 'lpar' : 'vm';
  return { id: `RES-${String(i + 1).padStart(4, '0')}`, name: `${prefix}-${services[i % 6]}-${String(Math.floor(i / 6) + 1).padStart(2, '0')}`,
    platform, status: i === 3 || i === 14 ? 'Disconnected' : i % 7 === 0 ? 'Attention' : 'Healthy',
    site: i % 3 === 0 ? 'BRQ-DC02' : 'PRG-DC01', group: i % 5 === 0 ? 'Unassigned' : `rg-${services[i % 6]}`,
    capacity: [128, 256, 512, 1024, 2048, 4096][i % 6], updated: `09:${String(42 - i % 8).padStart(2, '0')}:18`,
    provider: platform === 'VMware' ? 'vcenter-prg-01' : platform === 'IBM Power' ? 'hmc-prg-01' : 'fs7300-prg-01' };
});
const runs = Array.from({ length: 18 }, (_, i) => ({
  id: `RUN-${String(1842 - i).padStart(5, '0')}`, name: `${['validate', 'rehearsal', 'recover'][i % 3]}-${services[i % 6]}`,
  platform: platforms[i % 3], status: i === 0 ? 'Running' : i === 4 || i === 11 ? 'Failed' : 'Completed',
  site: i % 2 === 0 ? 'PRG → BRQ' : 'BRQ → PRG', group: `rg-${services[i % 6]}`,
  duration: i === 0 ? null : 38 + i * 17, updated: `${String(9 - Math.floor(i / 6)).padStart(2, '0')}:${String(42 - i % 6 * 7).padStart(2, '0')}:00`,
  provider: ['vcenter-prg-01', 'hmc-prg-01', 'fs7300-prg-01'][i % 3],
}));
const pages = {
  resources: { title: 'Resources', section: 'Discovery & inventory', description: 'Inspect infrastructure, protection coverage and recovery dependencies.', records: resources,
    columns: [['name', 'RESOURCE NAME'], ['status', 'STATUS'], ['platform', 'PLATFORM'], ['site', 'SITE'], ['capacity', 'GiB'], ['group', 'RECOVERY GROUP'], ['updated', 'DISCOVERED']] },
  runs: { title: 'Recovery runs', section: 'Recovery operations', description: 'Trace execution outcomes, affected groups and recovery activity.', records: runs,
    columns: [['name', 'EXECUTION NAME'], ['status', 'STATUS'], ['platform', 'PLATFORM'], ['site', 'DIRECTION'], ['duration', 'SECONDS'], ['group', 'RECOVERY GROUP'], ['updated', 'STARTED']] },
};
let page = 'resources';
let platform = 'all';
let sort = { key: null, direction: 1 };
let opener = null;
const tones = { Healthy: ['good', '✓'], Completed: ['good', '✓'], Attention: ['warn', '!'], Disconnected: ['bad', '×'], Failed: ['bad', '×'], Running: ['info', '↻'] };
// All interpolated fields below originate exclusively from the fixed fixtures above.
const badge = status => `<span class="badge ${tones[status][0]}"><span aria-hidden="true">${tones[status][1]}</span>${status}</span>`;
const properties = pairs => `<dl class="detail-properties">${pairs.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;

function renderMetrics() {
  const records = pages[page].records;
  const counts = page === 'resources'
    ? [['Discovered resources', records.length, 'across 3 platforms'], ['Assigned to a group', records.filter(r => r.group !== 'Unassigned').length, 'of 24 resources'], ['Require attention', records.filter(r => r.status !== 'Healthy').length, 'including disconnected'], ['Inventory capacity', records.reduce((sum, r) => sum + r.capacity, 0).toLocaleString('en-US'), 'GiB · provisioned']]
    : [['Recovery runs', records.length, '26 Oct · sample window'], ['Completed', records.filter(r => r.status === 'Completed').length, 'finished successfully'], ['Failed', records.filter(r => r.status === 'Failed').length, 'inspection required'], ['In progress', 1, 'running now · fixture']];
  $('#metrics').innerHTML = counts.map(([label, value, note], i) => `<div><dt>${label}</dt><dd><span class="metric-value ${i === 2 ? 'metric-warning' : ''}">${value}</span><span class="metric-note">${note}</span></dd></div>`).join('');
  $('#scope-all').textContent = records.length;
  platforms.forEach((name, i) => { $(`#scope-${['vmware', 'power', 'flash'][i]}`).textContent = records.filter(r => r.platform === name).length; });
}

function openDetail(button) {
  const record = pages[page].records.find(r => r.id === button.dataset.record);
  opener = button;
  $('#detail-entity').textContent = page === 'resources' ? 'Resource' : 'Recovery run';
  $('#detail-title').textContent = record.name;
  $('#detail-status').innerHTML = badge(record.status);
  $('#detail-meta').textContent = record.id;
  $('#detail-content').innerHTML = properties([['Platform', record.platform], ['Provider', record.provider], [page === 'resources' ? 'Location' : 'Direction', record.site], ['Recovery group', record.group], [page === 'resources' ? 'Provisioned' : 'Duration', page === 'resources' ? `${record.capacity.toLocaleString('en-US')} GiB` : record.duration === null ? 'In progress' : `${record.duration} s`], ['Captured at', `${record.updated} CET`]]);
  $('#detail-dialog').showModal();
  $('#close-detail').focus();
}

function renderTable() {
  const search = $('#search').value.trim().toLowerCase();
  const rows = pages[page].records.filter(r => (platform === 'all' || r.platform === platform) && ($('#status').value === 'all' || r.status === $('#status').value) && Object.values(r).join(' ').toLowerCase().includes(search));
  if (sort.key) rows.sort((a, b) => {
    const left = a[sort.key], right = b[sort.key];
    if (left === null) return 1;
    if (right === null) return -1;
    return sort.direction * (typeof left === 'number' ? left - right : String(left).localeCompare(String(right)));
  });
  $('#columns').innerHTML = `<tr>${pages[page].columns.map(([key, label]) => `<th scope="col" aria-sort="${sort.key === key ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}" class="${['capacity', 'duration'].includes(key) ? 'numeric' : ''}"><button data-sort="${key}">${label} <span aria-hidden="true">${sort.key === key ? sort.direction === 1 ? '↑' : '↓' : '↕'}</span></button></th>`).join('')}</tr>`;
  $('#rows').innerHTML = rows.map((r, i) => `<tr>${pages[page].columns.map(([key]) => {
    if (key === 'name') return `<td><span class="row-index">${String(i + 1).padStart(2, '0')}</span><button class="record-name" data-record="${r.id}" aria-label="Inspect ${r.name}">${r.name}</button></td>`;
    if (key === 'status') return `<td>${badge(r.status)}</td>`;
    return `<td class="${['capacity', 'duration'].includes(key) ? 'numeric' : ['group', 'site', 'updated'].includes(key) ? 'mono' : ''}">${r[key] === null ? '—' : typeof r[key] === 'number' ? r[key].toLocaleString('en-US') : r[key]}</td>`;
  }).join('')}</tr>`).join('');
  $('#filter-count').textContent = `${rows.length} / ${pages[page].records.length} records`;
  $('#row-count').textContent = `${rows.length ? `1–${rows.length}` : '0'} of ${rows.length} matching records · all results shown`;
  $('#empty').hidden = rows.length !== 0;
}

function resetFilters() {
  platform = 'all'; $('#search').value = ''; $('#status').value = 'all';
  $$('[data-platform]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.platform === platform)));
  renderTable();
}
function switchPage(next) {
  page = next; sort = { key: null, direction: 1 }; opener = null;
  $('#page-title').textContent = $('#breadcrumb-page').textContent = pages[page].title;
  $('#breadcrumb-section').textContent = pages[page].section;
  $('#page-description').textContent = pages[page].description;
  $('#table-caption').textContent = `Sample ${pages[page].title.toLowerCase()}`;
  $('#total-badge').textContent = pages[page].records.length;
  $('#status').innerHTML = '<option value="all">All statuses</option>' + [...new Set(pages[page].records.map(r => r.status))].map(status => `<option>${status}</option>`).join('');
  $$('[data-page]').forEach(button => { if (button.dataset.page === page) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
  document.title = `ABCO · ${pages[page].title} · Design preview`;
  renderMetrics(); resetFilters();
}
$$('[data-page]').forEach(button => button.addEventListener('click', () => switchPage(button.dataset.page)));
$$('[data-platform]').forEach(button => button.addEventListener('click', () => {
  platform = button.dataset.platform;
  $$('[data-platform]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderTable();
}));
$('#search').addEventListener('input', renderTable);
$('#status').addEventListener('change', renderTable);
$('#reset').addEventListener('click', resetFilters);
$('#columns').addEventListener('click', event => {
  const button = event.target.closest('[data-sort]'); if (!button) return;
  sort = { key: button.dataset.sort, direction: sort.key === button.dataset.sort ? -sort.direction : 1 };
  renderTable(); $(`[data-sort="${sort.key}"]`).focus();
});
$('#rows').addEventListener('click', event => {
  const button = event.target.closest('[data-record]'); if (!button) return;
  openDetail(button);
});
$('#close-detail').addEventListener('click', () => $('#detail-dialog').close());
$('#detail-dialog').addEventListener('close', () => { $('#detail-content').replaceChildren(); opener?.focus(); });
$('#detail-dialog').addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const buttons = $$('#detail-dialog button');
  if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
  else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
});
$('#detail-dialog').addEventListener('click', event => {
  const box = $('#detail-dialog').getBoundingClientRect();
  if (event.target === $('#detail-dialog') && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) $('#detail-dialog').close();
});
$('#density').addEventListener('click', () => {
  const comfortable = $('#data-table').classList.toggle('comfortable');
  $('#density').setAttribute('aria-pressed', String(comfortable));
  $('#density').textContent = `Density: ${comfortable ? 'comfortable' : 'compact'}`;
});
$('#theme').addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  $('#theme').setAttribute('aria-pressed', String(dark)); $('#theme').textContent = dark ? 'Light theme' : 'Dark theme';
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !$('#detail-dialog').open && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input,select,textarea,button,[contenteditable]')) { event.preventDefault(); $('#search').focus(); }
});
switchPage('resources');
