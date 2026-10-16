/* Standalone browser template. Only local fixtures are rendered; no API requests. */
const number = value => value === null ? '—' : new Intl.NumberFormat('en-US').format(value);
const sum = (rows, key) => rows.some(row => row[key] === null) ? null : rows.reduce((total, row) => total + row[key], 0);
const pill = (text, tone = '') => `<span class="pill ${tone}">${text}</span>`;
const colors = { good: 'var(--green)', blue: 'var(--blue)', teal: 'var(--teal)', warn: 'var(--amber)', bad: 'var(--red)', unknown: 'var(--unknown)' };
const swatch = tone => `<i class="swatch" style="--segment:${colors[tone]}" aria-hidden="true"></i>`;
const table = (label, headers, rows) => `<div class="table-wrap" tabindex="0" role="region" aria-label="${label}"><table><caption class="sr-only">${label} — simulated data</caption><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const panel = (title, subtitle, body, { action = '', foot = '', full = false, raw = false } = {}) => `<section class="panel ${full ? 'span-all' : ''}" aria-label="${title}"><header class="panel-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${action || '<span class="section-number">DEMO</span>'}</header>${raw ? body : `<div class="panel-body">${body}</div>`}${foot ? `<div class="panel-foot">${foot}</div>` : ''}</section>`;
const kpi = (label, value, foot, unit = '', symbol = '◇') => `<div class="kpi"><div class="kpi-label">${label}<span class="kpi-symbol" aria-hidden="true">${symbol}</span></div><div class="kpi-value">${number(value)}<small>${unit}</small></div><div class="kpi-foot">${foot}</div></div>`;
const kpis = items => `<section class="kpis" aria-label="Key statistics">${items.join('')}</section>`;
function donut(segments, center, label) {
  const total = segments.reduce((n, segment) => n + segment.value, 0);
  let offset = 0;
  const circles = segments.map(segment => {
    const length = total ? segment.value / total * 100 : 0;
    const circle = `<circle cx="90" cy="90" r="70" pathLength="100" stroke="${colors[segment.tone]}" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-offset}"/>`;
    offset += length;
    return circle;
  }).join('');
  return `<div class="chart-layout"><div class="donut"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="70" stroke="var(--line)"/>${circles}</svg><div class="donut-center"><strong>${center}</strong><span>${label}</span></div></div><div class="legend">${segments.map(s => `<div class="legend-row"><span>${swatch(s.tone)}${s.label}</span><strong>${number(s.value)}</strong></div>`).join('')}</div></div>`;
}
function bar(label, value, total, tone = 'blue', context = '') {
  const width = value === null || !total ? 0 : value / total * 100;
  return `<div class="metric-row"><div class="bar-label"><span>${label}</span><strong>${number(value)}${context ? ` <small>${context}</small>` : ''}</strong></div><div class="bar-track" aria-hidden="true">${value === null ? '<span class="unavailable"></span>' : `<span style="width:${width}%;--segment:${colors[tone]}"></span>`}</div></div>`;
}
const link = (view, label) => `<a class="panel-link" href="#${view}">${label} <span aria-hidden="true">↗</span></a>`;
const systems = dashboardData.systems;
const groupCount = sum(dashboardData.groups, 'local') + sum(dashboardData.groups, 'remote');
const deployed = sum(dashboardData.applications, 'deployed');
const appCount = deployed + sum(dashboardData.applications, 'notDeployed');
let vendor = 'all';
let currentView = 'overall';
function activity(recoveryOnly = false) {
  const rows = dashboardData.activity.filter(row => !recoveryOnly || row.type === 'recovery');
  return panel('Recent Activity', 'Latest operations · 16 Oct 2026 · CEST', table('Recent Activity', ['Started', 'Operation', 'Resource', 'Platform', 'Result', 'Duration'], rows.map(row => [
    `<span class="mono">${row.time}</span>`, `<span class="operation-icon" aria-hidden="true">${row.type === 'snapshot' ? '▣' : '↻'}</span>${row.operation}`,
    `<span class="mono">${row.resource}</span>`, row.platform, pill(row.status, row.status === 'Succeeded' ? 'good' : row.status === 'Failed' ? 'bad' : 'blue'), row.duration,
  ])), { full: true, raw: true, foot: 'Illustrative history. Running operations have no final duration or outcome.' });
}
function protection(rows, storage = false) {
  const current = sum(rows, 'snapshotCurrent'), stale = sum(rows, 'snapshotStale'), none = sum(rows, 'snapshotNone');
  const total = sum(rows, 'volumes');
  const segments = [{ label: 'Current snapshot', value: current, tone: 'blue' }, { label: 'Stale snapshot', value: stale, tone: 'warn' }, { label: 'No snapshot', value: none, tone: 'bad' }];
  return panel(storage ? 'Snapshot Protection' : 'Protection Overview', 'Volume coverage · last-known inventory', donut(segments, `${Math.round(current / total * 100)}%`, 'current coverage') +
    `<div class="submetrics"><div>Local protection<strong>${number(sum(rows, 'localProtected'))}</strong></div><div>Remote protection<strong>${number(sum(rows, 'remoteProtected'))}</strong></div></div>`,
    { action: storage ? '' : link('storage', 'Explore protection'), foot: `${number(current + stale)} volumes have a snapshot; ${number(none)} have none. Local / Remote may overlap. A stale snapshot misses the policy interval.` });
}
function overall() {
  const available = systems.filter(s => s.available).length + sum(dashboardData.compute, 'online');
  const total = systems.length + sum(dashboardData.compute, 'count');
  const resources = [...dashboardData.compute, ...['ibm', 'hitachi'].map(v => ({ name: v === 'ibm' ? 'IBM FlashSystem' : 'Hitachi VSP', count: systems.filter(s => s.vendor === v).length, online: systems.filter(s => s.vendor === v && s.available).length }))];
  const infra = panel('Infrastructure Overview', 'Availability by compute platform and storage vendor', `<div class="resource-grid">${resources.map(r => `<div class="resource"><span class="resource-icon" aria-hidden="true">▤</span><div class="resource-info"><div class="resource-name">${r.name}</div><div class="resource-meta"><strong>${r.count}</strong><span>${r.online}/${r.count} available</span></div></div></div>`).join('')}</div>`, { foot: 'Demo availability checks · 10:00 CEST. Counts represent registered systems / providers.' });
  const issues = [
    ['Connection failures', 'Providers with a failed availability check', total - available, 'bad'],
    ['Snapshot failures', 'Failed operations in the last 24 hours', sum(systems, 'failedOperations'), 'bad'],
    ['Replication issues', 'Relationships requiring attention', sum(systems, 'replicationProblem'), 'warn'],
    ['Recovery failures', 'Failed executions in the last 24 hours', dashboardData.recovery.failed, 'bad'],
  ];
  const issuePanel = panel('Operational Issues', 'Signals that need an operator’s attention', issues.map(([title, description, value, tone]) => `<div class="issue-row"><span class="issue-icon ${tone}" aria-hidden="true">!</span><div><h3>${title}</h3><p>${description}</p></div><strong>${value}</strong></div>`).join(''), { action: pill('Attention required', 'warn') });
  const recovery = panel('Recovery Overview', 'Orchestration across both storage vendors', `<div class="recovery-summary"><div><strong>${groupCount}</strong><small>Recovery Groups</small></div><div><strong>${appCount}</strong><small>Applications</small></div><div><strong>${dashboardData.recovery.configurations}</strong><small>Deployed configs</small></div></div><div class="topology"><div class="site"><span class="site-icon" aria-hidden="true">▤</span><div><strong>${sum(dashboardData.groups, 'local')} Local</strong><small>RECOVERY GROUPS</small></div></div><div class="route" aria-hidden="true"></div><div class="site"><span class="site-icon" aria-hidden="true">▤</span><div><strong>${sum(dashboardData.groups, 'remote')} Remote</strong><small>RECOVERY GROUPS</small></div></div></div><p class="note">${deployed} of ${appCount} applications have deployed configurations. Deployment alone does not verify recoverability.</p>`, { action: link('recovery', 'Explore recovery') });
  return kpis([
    kpi('Infrastructure availability', available, `${pill(`${total - available} unavailable`, 'warn')} of ${total} registered resources`, `/ ${total}`, '▤'),
    kpi('Volumes with snapshots', sum(systems, 'snapshotCurrent') + sum(systems, 'snapshotStale'), `${pill('80 stale', 'warn')} 80 without a snapshot`, '/ 1,360', '◉'),
    kpi('Replication relationships', sum(systems, 'replicationSynced'), `${pill('6 issues', 'warn')} 8 synchronizing`, '/ 122', '⇄'),
    kpi('Recovery executions', dashboardData.recovery.succeeded, `${pill('2 failed', 'bad')} 1 running · last 24h`, 'succeeded', '↻'),
  ]) + `<div class="grid">${infra}${issuePanel}${protection(systems)}${recovery}${activity()}</div>`;
}
function distribution(rows) {
  const totals = rows.map(s => sum([s], 'snapshotsReady') === null ? null : s.snapshotsReady + s.snapshotsStale + s.snapshotsFailed);
  const max = Math.max(1, ...totals.filter(n => n !== null));
  const body = rows.map((s, i) => `<div class="metric-row"><div class="bar-label"><span>${s.name} <small>· ${s.snapshotTechnology}</small></span><strong>${totals[i] === null ? '— <small>Unavailable</small>' : number(totals[i])}</strong></div><div class="bar-track" aria-hidden="true">${totals[i] === null ? '<span class="unavailable"></span>' : ['Ready', 'Stale', 'Failed'].map((state, j) => `<span style="width:${s[`snapshots${state}`] / max * 100}%;--segment:${colors[['blue', 'warn', 'bad'][j]]}"></span>`).join('')}</div><p class="note">${totals[i] === null ? s.unavailableReasons.snapshots : `${number(s.snapshotsReady)} ready · ${number(s.snapshotsStale)} stale · ${s.snapshotsFailed} failed`}</p></div>`).join('');
  const complete = totals.every(n => n !== null);
  return panel('Snapshot Distribution', 'Snapshot objects by system, technology and state', body, { foot: complete ? `${number(totals.reduce((a, b) => a + b, 0))} snapshots in selected systems.` : 'Total unavailable · incomplete inventory. Missing counts are excluded from charts, never treated as zero.' });
}
function storage() {
  const rows = systems.filter(s => vendor === 'all' || s.vendor === vendor);
  const synced = sum(rows, 'replicationSynced'), syncing = sum(rows, 'replicationSyncing'), problem = sum(rows, 'replicationProblem');
  const replication = panel('Replication Status', 'Normalized relationship health · synchronous + asynchronous', donut([
    { label: 'Synchronized', value: synced, tone: 'teal' }, { label: 'Synchronizing', value: syncing, tone: 'blue' }, { label: 'Problem', value: problem, tone: 'bad' },
  ], number(synced + syncing + problem), 'relationships'), { foot: rows.map(s => s.syncTechnology + ' · ' + s.asyncTechnology).filter((v, i, a) => a.indexOf(v) === i).join(' / ') + '. Synchronizing does not imply failure.' });
  const policies = panel('Protection Policies', 'Snapshot frequency, retention and assignment', `<div class="policy-list">${dashboardData.protectionPolicies.map(p => `<div class="policy"><div><strong>${p.name}</strong><p>${p.frequency} · Retain ${p.retention}</p></div><div class="policy-count">${number(vendor === 'all' ? p.assignments.ibm + p.assignments.hitachi : p.assignments[vendor])}<small>volumes</small></div></div>`).join('')}</div><p class="note">2 policies assigned. Each protected volume has one primary snapshot policy in this demo.</p>`);
  const health = panel('Storage Health', 'System availability and failed snapshot operations', table('Storage Health', ['System / site', 'Vendor', 'Availability', 'Volumes', 'Pools', 'Failed ops / 24h', 'Data source'], rows.map(s => [
    `<span class="mono">${s.name}</span><br><small>${s.site}</small>`, s.product, pill(s.available ? 'Available' : 'Unavailable', s.available ? 'good' : 'bad'), number(s.volumes), number(s.pools), number(s.failedOperations), pill(s.available ? 'Simulated · 10:00' : 'Simulated · last known 09:00'),
  ])), { full: true, raw: true, foot: 'An unavailable system retains explicitly labeled last-known demo inventory. It is not reported as empty.' });
  return kpis([
    kpi('Storage Statistics · systems', rows.length, `${rows.filter(s => s.available).length} available · ${rows.filter(s => !s.available).length} unavailable`, '', '▤'),
    kpi('Volumes / LDEVs', sum(rows, 'volumes'), 'Normalized volume inventory', '', '▱'),
    kpi('Storage pools', sum(rows, 'pools'), 'Across selected storage systems', '', '▦'),
    kpi('Snapshot objects', sum(rows, 'snapshotsReady') === null ? null : sum(rows, 'snapshotsReady') + sum(rows, 'snapshotsStale') + sum(rows, 'snapshotsFailed'), rows.some(s => s.snapshotsReady === null) ? pill('Unavailable · incomplete inventory', 'warn') : 'Ready + stale + failed snapshot objects', '', '◉'),
  ]) + `<div class="grid">${protection(rows, true)}${distribution(rows)}${replication}${policies}${health}${panel('Technology Coverage', 'Target support · not a statement of current integration availability', coverageTable(vendor), { full: true, raw: true })}</div>`;
}
function recovery() {
  const r = dashboardData.recovery;
  const groups = panel('Recovery Groups', 'Local / Remote by vendor and storage technology', table('Recovery Groups', ['Storage vendor', 'Technology', 'Local', 'Remote'], dashboardData.groups.map(g => [g.vendor, g.technology, g.local, g.remote])), { raw: true, foot: `${groupCount} groups · ${sum(dashboardData.groups, 'local')} local / ${sum(dashboardData.groups, 'remote')} remote.` });
  const apps = panel('Recovery Applications', 'Compute platform, environment and deployment state', table('Recovery Applications', ['Platform', 'Environment', 'Deployed', 'Not deployed'], dashboardData.applications.map(a => [a.platform, a.environment, a.deployed, a.notDeployed])), { raw: true, foot: `${deployed} applications deployed · ${r.configurations} configurations. One application may have multiple configurations.` });
  const execution = panel('Recovery Execution', 'Completed and active operations · last 24 hours', donut([{ label: 'Succeeded', value: r.succeeded, tone: 'teal' }, { label: 'Failed', value: r.failed, tone: 'bad' }, { label: 'Running', value: r.running, tone: 'blue' }], `${Math.round(r.succeeded / (r.succeeded + r.failed) * 100)}%`, 'completed success'), { foot: 'Success rate includes completed executions only. Running operations are excluded.' });
  const median = [...r.durations].sort((a, b) => a - b)[3];
  const performance = panel('Recovery Performance', 'Last 7 successful executions · duration in minutes', `<div class="headline-metric"><strong>${median}<small> min</small></strong><span class="muted">median recovery time</span></div><div class="performance" role="img" aria-label="Successful recovery durations: ${r.durations.join(', ')} minutes, oldest to latest">${r.durations.map(n => `<div class="performance-column"><span>${n}m</span><i style="--height:${n / 15 * 65}px"></i></div>`).join('')}</div><div class="chart-axis"><span>OLDEST</span><span>LATEST</span></div><p class="note">Last successful execution: <strong>${r.lastSuccess}</strong></p>`, { foot: 'Observed demo durations, not an RTO guarantee. Failed and running executions are excluded.' });
  const policies = panel('Recovery Policies', 'DR test frequency and assigned Recovery Groups', `<div class="policy-list">${dashboardData.recoveryPolicies.map(p => `<div class="policy"><div><strong>${p.name}</strong><p>${p.frequency}</p></div><div class="policy-count">${p.groups}<small>groups</small></div></div>`).join('')}</div>`, { foot: '22 of 24 groups assigned a DR test policy · 2 unassigned.' });
  const readiness = panel('Deployment Coverage', 'Applications with at least one deployed configuration', bar('VMware', 18, 23, 'blue', '/ 23 apps') + bar('IBM Power', 8, 11, 'teal', '/ 11 apps') + `<div class="submetrics"><div>Production<strong>20 / 25</strong></div><div>Test<strong>6 / 9</strong></div></div>`, { foot: 'A deployed configuration is not evidence of a successful recovery test.' });
  return kpis([kpi('Recovery Statistics · groups', groupCount, '16 Local · 8 Remote', '', '▦'), kpi('Recovery Applications', appCount, '23 VMware · 11 IBM Power', '', '▤'), kpi('Deployed configurations', r.configurations, 'Across 26 deployed applications', '', '◇'), kpi('Recovery executions / 24h', r.succeeded + r.failed + r.running, '18 succeeded · 2 failed · 1 running', '', '↻')]) + `<div class="grid">${groups}${apps}${execution}${performance}${policies}${readiness}${activity(true)}</div>`;
}
function coverageTable(filter = 'all') {
  const rows = [
    ['Snapshots', 'FlashCopy', 'Thin Image / ShadowImage'], ['Synchronous replication', 'Metro Mirror', 'TrueCopy / GAD'],
    ['Asynchronous replication', 'Global Mirror', 'Universal Replicator'], ['Inventory', 'Volumes, pools', 'LDEV, pools'], ['Monitoring', 'Mapping and relationship state', 'Pair and relationship state'],
  ];
  const columns = filter === 'all' ? [0, 1, 2] : filter === 'ibm' ? [0, 1] : [0, 2];
  return table('Target technology coverage', columns.map(i => ['Capability', 'IBM FlashSystem', 'Hitachi VSP'][i]), rows.map(row => columns.map(i => row[i])));
}
function render() {
  const route = location.hash.slice(1).split('?');
  currentView = ['overall', 'storage', 'recovery'].includes(route[0]) ? route[0] : 'overall';
  const selected = new URLSearchParams(route[1]).get('vendor');
  if (currentView === 'storage') vendor = ['ibm', 'hitachi'].includes(selected) ? selected : 'all';
  const views = { overall: ['Overall', 'Platform overview', 'Infrastructure, data protection and recovery. One operational picture.', '01'], storage: ['Storage Systems', 'Storage protection', 'Unified data protection across IBM FlashSystem and Hitachi VSP.', '02'], recovery: ['Recovery Operations', 'Recovery operations', 'Plan, execute and verify recovery across your application landscape.', '03'] };
  const [name, title, description, index] = views[currentView];
  document.getElementById('breadcrumb').textContent = name;
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-description').textContent = description;
  document.getElementById('view-number').textContent = index;
  document.title = `ABCO · ${name}`;
  document.getElementById('vendor-filter').hidden = currentView !== 'storage';
  document.getElementById('scope-label').textContent = currentView === 'storage' ? (vendor === 'all' ? 'All storage vendors' : vendor === 'ibm' ? 'IBM FlashSystem' : 'Hitachi VSP') : currentView === 'overall' ? 'All platform resources' : 'All recovery workloads';
  document.querySelectorAll('[data-view]').forEach(a => a.dataset.view === currentView ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  document.querySelectorAll('[data-vendor]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.vendor === vendor)));
  document.getElementById('dashboard').innerHTML = { overall, storage, recovery }[currentView]();
  document.getElementById('announcement').textContent = `${name} loaded. ${document.getElementById('scope-label').textContent}. Simulated data.`;
}
const dialog = document.getElementById('detail-dialog');
document.getElementById('model-button').addEventListener('click', () => {
  document.getElementById('dialog-content').innerHTML = `<p>This is a browser design template. All IBM, Hitachi, VMware and IBM Power values are simulated. No hardware or production API is connected.</p><p><strong>Normalized model:</strong> both storage vendors share identical metric keys. Vendor-specific technology is metadata, not a different metric schema.</p><pre>{\n  source: "simulated",\n  observedAt: "2026-10-16T10:00:00+02:00",\n  systems: [{\n    vendor: "ibm" | "hitachi",\n    volumes: number | null,\n    snapshotsReady: number | null,\n    replicationSynced: number | null,\n    unavailableReasons: { ... }\n  }]\n}</pre><p><strong>Unavailable ≠ zero.</strong> A null value renders as —. Incomplete totals remain unavailable. Actual zero counts render as 0. Disconnected systems show last-known data with its timestamp.</p><p>Snapshot and replication statistics describe protection state, not guaranteed recoverability. This model is a proposed template contract, not an existing API endpoint.</p>${coverageTable()}<p>All technologies above represent target support only.</p>`;
  dialog.showModal();
});
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
document.querySelectorAll('[data-vendor]').forEach(button => button.addEventListener('click', () => { location.hash = `storage?vendor=${button.dataset.vendor}`; }));
window.addEventListener('hashchange', render);
render();
