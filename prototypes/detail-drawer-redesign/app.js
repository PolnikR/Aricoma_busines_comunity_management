/* global DETAIL_OBJECTS */
// Prototype renderers. Concept 0 mirrors today's drawer for reference; A, B and C are the
// redesign candidates. All of them render the same model from data.js.

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5z"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  disk: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  network: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-2h12v2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  collapse: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  panelRight: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  maximize: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6"/><path d="m9 15 6-6"/>',
}
const icon = (name, cls = 'size-4') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="${cls} shrink-0" aria-hidden="true">${ICONS[name] ?? ''}</svg>`
const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Production Badge "light" colours (src/shared/components/badge/Badge.tsx).
const TONE = {
  success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
  info: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500',
  light: 'bg-surface-muted text-text-secondary',
}
// Section identity colours (src/shared/components/data-table/DetailDrawerSection.tsx).
const ACCENT = {
  overview: { text: 'text-accent', bg: 'bg-accent', chip: 'bg-accent/10 text-accent dark:bg-accent/15' },
  infrastructure: { text: 'text-brand-500 dark:text-brand-400', bg: 'bg-brand-500 dark:bg-brand-400', chip: 'bg-brand-500/10 text-brand-500 dark:bg-brand-400/15 dark:text-brand-400' },
  storage: { text: 'text-theme-purple-500', bg: 'bg-theme-purple-500', chip: 'bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/20' },
  configuration: { text: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-500 dark:bg-orange-400', chip: 'bg-orange-500/10 text-orange-500 dark:bg-orange-400/15 dark:text-orange-400' },
  technical: { text: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-500 dark:bg-gray-400', chip: 'bg-gray-500/10 text-gray-500 dark:bg-gray-400/15 dark:text-gray-400' },
}
const FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15'
const BTN = {
  primary: `h-9 rounded-lg px-4 text-sm font-semibold bg-accent text-white shadow-[0_10px_24px_-12px_rgba(13,145,215,0.9)] hover:bg-accent-hover ${FOCUS}`,
  danger: `h-9 rounded-lg px-3 text-sm font-medium border border-error-200 bg-surface text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10 ${FOCUS}`,
  outline: `h-9 rounded-lg px-3 text-sm font-medium border border-border-strong bg-surface text-text-secondary hover:border-accent hover:text-accent ${FOCUS}`,
  soft: `h-8 rounded-lg px-3 text-xs font-medium bg-surface-muted text-accent hover:bg-accent-soft ${FOCUS}`,
  mode: `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary ${FOCUS}`,
  icon: `flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary ${FOCUS}`,
}

// ---------- state -------------------------------------------------------------------------
const params = new URLSearchParams(location.search)
const state = {
  concept: params.get('concept') ?? 'a',
  object: params.get('object') ?? 'recoveryGroup',
  size: params.get('size') ?? '',
  long: params.get('long') === '1',
  dark: params.get('theme') === 'dark',
  expanded: params.get('expanded') === '1',
  open: true,
  notes: params.get('notes') === '1',
  sections: {}, // id -> open
  // D only: a new detail always opens expanded; compact is an explicit user choice.
  mode: params.get('mode') === 'compact' ? 'compact' : 'expanded',
  scroll: {}, // D: scrollTop per mode, restored when switching back
  focus: null, // selector focused after the next render
}
const SIZES = {
  current: [['420', 'Drawer 420 px (default)'], ['560', 'Drawer 560 px'], ['760', 'Drawer 760 px']],
  a: [['420', 'Drawer 420 px (default)'], ['560', 'Drawer 560 px'], ['760', 'Drawer 760 px']],
  b: [['672', 'Dialog 672 px (= provider edit modal)'], ['960', 'Dialog 960 px'], ['1200', 'Dialog 1200 px']],
  c: [['420', 'Compact 420 px (default)'], ['560', 'Compact 560 px']],
  d: [['auto', 'Expanded: auto (960 px, 760 px without sections)'], ['960', 'Expanded: 960 px'], ['1200', 'Expanded: 1200 px']],
}
const pick = (row) => (state.long && row.long ? row.long : row.value)
const obj = () => {
  const d = DETAIL_OBJECTS[state.object]
  return { ...d, title: state.long ? d.longTitle : d.title, techId: state.long ? d.longTechId : d.techId }
}
const isOpen = (section) => state.sections[section.id] ?? Boolean(section.open)

// ---------- shared bits ---------------------------------------------------------------------
const badge = (b, extra = '') => `<span class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${TONE[b.tone]} ${extra}"><span class="size-1.5 rounded-full bg-current"></span>${esc(b.label)}</span>`
const copyBtn = (text) => `<button type="button" data-copy="${esc(text)}" class="ml-1 inline-flex size-5 translate-y-0.5 items-center justify-center rounded text-text-subtle opacity-0 transition group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-surface-hover hover:text-text-primary ${FOCUS}" aria-label="Copy ${esc(text)}">${icon('copy', 'size-3')}</button>`
const tags = (list) => `<span class="flex flex-wrap gap-1">${list.map((t) => `<span class="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent">${esc(t)}</span>`).join('')}</span>`

// Value cell used by the new concepts: mono values recede (smaller, secondary colour).
function value(row) {
  if (row.tags) return tags(row.tags)
  const v = pick(row)
  if (row.badge) return badge({ label: v, tone: row.badge })
  let inner = esc(v)
  if (row.link) inner = `<a href="#" class="text-accent hover:underline ${FOCUS} rounded">${inner}${row.external ? icon('external', 'ml-1 inline size-3 -translate-y-px') : ''}</a>`
  if (row.mono) inner = `<span class="font-mono text-[12.5px] ${row.link ? '' : 'text-text-secondary'}">${inner}</span>`
  const secondary = row.secondary ? `<div class="mt-0.5 text-xs text-text-muted ${row.secondary.match(/^[a-z0-9-]+$/) ? 'font-mono' : ''}">${esc(row.secondary)}</div>` : ''
  return `<div class="min-w-0 wrap-anywhere ${row.mono ? 'leading-[18px]' : ''}">${inner}${row.copy ? copyBtn(v) : ''}${secondary}</div>`
}

// wideOnly columns: always shown with `wide`, hidden with neither, and shown from the container
// breakpoint `cq` (e.g. '@min-[600px]/drawer') when given.
function table(t, { wide = false, cq = '', max, bleed = 'px-5' } = {}) {
  const cols = t.columns.filter((c) => wide || cq || !c.wideOnly)
  const vis = (c) => (c.wideOnly && !wide && cq ? `hidden ${cq}:table-cell` : '')
  const rows = max ? t.rows.slice(0, max) : t.rows
  const cell = (c, r) => {
    const v = r[c.key]
    if (c.badge) return badge({ label: v[0], tone: v[1] })
    return c.mono ? `<span class="font-mono text-[11.5px] text-text-secondary wrap-anywhere">${esc(v)}</span>` : `<span class="wrap-anywhere">${esc(v)}</span>`
  }
  return `<div class="custom-scrollbar overflow-x-auto">
    <table class="w-full text-left text-xs">
      <thead><tr class="border-b border-border">${cols.map((c, i) => `<th scope="col" class="${vis(c)} py-2 pr-3 ${i === 0 ? bleed.replace('px', 'pl') : ''} text-[11px] font-semibold uppercase tracking-wide text-text-subtle ${c.align === 'right' ? 'text-right' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr class="border-b border-border/70 last:border-b-0 hover:bg-surface-subtle">${cols.map((c, i) => `<td class="${vis(c)} py-2 pr-3 align-top ${i === 0 ? `${bleed.replace('px', 'pl')} font-medium text-text-primary` : 'text-text-secondary'} ${c.align === 'right' ? 'text-right tabular-nums' : ''}">${cell(c, r)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`
}

const code = (text) => text
  ? `<pre class="custom-scrollbar max-h-72 overflow-auto rounded-lg bg-surface-muted p-3 font-mono text-[11.5px] leading-5 whitespace-pre-wrap break-words text-text-secondary">${esc(text)}</pre>`
  : '<p class="text-xs text-text-subtle">No body was recorded for this request.</p>'

function footer(d, extraEnd = '') {
  if (!d.actions && !extraEnd) return ''
  const start = (d.actions?.start ?? []).map((a) => `<button type="button" class="${BTN[a.variant]}">${esc(a.label)}</button>`).join('')
  const end = (d.actions?.end ?? []).map((a) => `<button type="button" class="${BTN[a.variant]}">${esc(a.label)}</button>`).join('')
  return { start, end: extraEnd + end }
}

// ===========================================================================================
// 0 · CURRENT — reference replica of today's DetailDrawer (abbreviated)
// ===========================================================================================
function renderCurrent(d, width) {
  const metaItems = [d.entity, ...d.statuses.map((s) => badge(s)), ...d.meta.map(esc)]
  const rowsHtml = (rows) => `<dl>${rows.map((r) => `
      <div class="grid grid-cols-[minmax(7rem,35%)_minmax(0,1fr)] items-start gap-x-4 py-2">
        <dt class="text-sm text-text-muted">${esc(r.label)}</dt>
        <dd class="min-w-0 text-sm font-medium text-text-primary wrap-anywhere"><div>${r.tags ? tags(r.tags) : r.badge ? badge({ label: pick(r), tone: r.badge }) : r.link ? `<a class="text-accent" href="#">${esc(pick(r))}</a>` : esc(pick(r))}</div>${r.secondary ? `<div class="mt-0.5 text-xs font-normal text-text-muted">${esc(r.secondary)}</div>` : ''}</dd>
      </div>`).join('')}</dl>`
  const allRows = (groups) => rowsHtml(groups.flatMap((g) => g.rows))
  const sectionBody = (s) => {
    if (s.groups) return allRows(s.groups)
    if (s.op) return rowsHtml([
      { label: 'Orchestration', value: 'Yes', badge: 'success' },
      { label: 'Airflow run ID', value: state.long ? s.op.longRunId : s.op.runId, link: true },
      { label: 'Latest run status', value: s.op.status, badge: s.op.tone },
      { label: 'Last executed', value: s.op.when },
      { label: 'Duration', value: s.op.duration },
    ]) + `<button class="${BTN.soft} mt-3 h-9 w-full text-sm">${esc(s.op.action)} →</button>`
    if (s.table) return `<div class="-mx-5">${table(s.table)}</div>`
    if (s.code !== undefined) return code(s.code)
    return ''
  }
  const sections = d.sections ? d.sections.map((s) => {
    const open = isOpen(s)
    const a = ACCENT[s.accent]
    return `<section class="border-b border-border">
      <h3 class="sticky top-0 z-[1] bg-surface"><button type="button" data-toggle="${s.id}" aria-expanded="${open}" class="relative flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-semibold text-text-primary hover:bg-surface-subtle ${FOCUS} before:absolute before:inset-y-0 before:left-0 before:w-0.75 ${a.bg.split(' ').map((c) => `before:${c}`).join(' ')} ${open ? 'before:opacity-100' : 'before:opacity-35'}">
        ${icon('chevron', `size-4 text-text-subtle transition-transform ${open ? 'rotate-90' : ''}`)}
        <span class="flex size-6 items-center justify-center rounded-md ${a.chip}">${icon(s.icon, 'size-3.5')}</span>
        <span class="min-w-0 truncate">${esc(s.title)}</span>
        ${s.summary ? `<span class="ml-auto max-w-[50%] truncate text-xs font-normal text-text-muted">${esc(s.summary)}</span>` : ''}
      </button></h3>
      ${open ? `<div class="px-5 pb-4">${sectionBody(s)}</div>` : ''}
    </section>`
  }).join('') : `<div class="px-5 py-2">${allRows(d.groups)}</div>`
  const f = footer(d)
  return drawerShell(width, `
    <div class="border-b border-border px-5 pt-4 pb-3">
      <div class="flex items-center gap-2">
        <h2 class="min-w-0 flex-1 truncate text-base font-semibold leading-8">${esc(d.title)}</h2>
        <button class="${BTN.icon}" aria-label="Help">${icon('help')}</button>
        <button class="${BTN.icon}" data-close aria-label="Close detail">${icon('close')}</button>
      </div>
      <div class="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
        ${metaItems.map((m, i) => `${i ? '<span class="size-0.75 rounded-full bg-text-subtle"></span>' : ''}<span class="min-w-0 truncate">${m}</span>`).join('')}
      </div>
      ${d.techId ? `<div class="mt-0.5 truncate text-xs text-text-muted">${esc(d.techId)}</div>` : ''}
    </div>
    <div class="custom-scrollbar flex-1 overflow-y-auto">${sections}</div>
    ${f ? `<div class="flex items-center gap-3 border-t border-border px-5 py-3">${f.start}<div class="ml-auto flex gap-3">${f.end}</div></div>` : ''}`)
}

// ===========================================================================================
// A · IMPROVED DRAWER — same interaction model, stronger hierarchy
// ===========================================================================================
// Rows: fixed 8.5rem label column; from a 600 px wide drawer the fields flow into two columns
// with the label above the value. Technical groups sit in a recessed well in mono.
function rowsA(group, scope = 'drawer') {
  const twoCol = scope === 'drawer' ? '@min-[600px]/drawer' : '@min-[620px]/main'
  const rows = group.rows.filter((r) => !r.inFacts).map((r) => `
    <div class="group/row grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-1.5 ${twoCol}:grid-cols-1 ${twoCol}:gap-y-0.5 ${r.wide ? `${twoCol}:col-span-2` : ''}">
      <dt class="text-xs leading-5 text-text-muted">${esc(r.label)}</dt>
      <dd class="min-w-0 text-sm leading-5 text-text-primary">${value(r)}</dd>
    </div>`).join('')
  const heading = group.title ? `<h4 class="mb-0.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-text-subtle">${esc(group.title)}</h4>` : ''
  if (group.technical) {
    return `<div class="mt-3 rounded-lg bg-surface-muted/70 px-3 py-2 dark:bg-surface-muted/50">${heading}<dl class="${twoCol}:grid ${twoCol}:grid-cols-2 ${twoCol}:gap-x-6">${rows}</dl></div>`
  }
  return `<div class="${group.title ? 'mt-3' : ''}">${heading}<dl class="${twoCol}:grid ${twoCol}:grid-cols-2 ${twoCol}:gap-x-6">${rows}</dl></div>`
}

function factsA(d, { scope = 'drawer', pad = 'px-5' } = {}) {
  if (!d.facts?.length) return ''
  const cq = scope === 'drawer' ? '@min-[520px]/drawer:grid-cols-4' : '@min-[600px]/dlg:grid-cols-4'
  return `<div class="grid grid-cols-2 ${d.facts.length === 3 ? '@min-[420px]/drawer:grid-cols-3 @min-[420px]/dlg:grid-cols-3' : cq} gap-px border-b border-border bg-border">
    ${d.facts.map((f) => `<div class="min-w-0 bg-surface ${pad} py-2.5">
      <div class="text-[11px] font-medium uppercase tracking-wide text-text-subtle">${esc(f.label)}</div>
      <div class="mt-0.5 truncate text-[15px] font-semibold leading-6 text-text-primary">${esc(f.value)}</div>
      ${f.hint ? `<div class="truncate text-xs text-text-muted">${esc(f.hint)}</div>` : ''}
    </div>`).join('')}
  </div>`
}

function operationA(op) {
  const runId = state.long ? op.longRunId : op.runId
  return `<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold ${TONE[op.tone]}">${icon('check', 'size-4')}${esc(op.status)}</span>
      <div class="min-w-0 text-sm leading-5">
        <div class="text-text-primary">${esc(op.when)} <span class="text-text-subtle">·</span> ${esc(op.duration)}</div>
        <div class="text-xs text-text-muted">${esc(op.label)} on ${esc(op.provider)}</div>
      </div>
    </div>
    <div class="group/row mt-3 flex items-baseline gap-3 text-xs">
      <span class="w-[8.5rem] shrink-0 text-text-muted">Airflow run ID</span>
      <a href="#" class="min-w-0 rounded font-mono text-[12px] text-accent wrap-anywhere hover:underline ${FOCUS}">${esc(runId)}${icon('external', 'ml-1 inline size-3 -translate-y-px')}</a>${copyBtn(runId)}
    </div>
    <div class="mt-3 flex justify-end"><button type="button" class="${BTN.soft} inline-flex items-center gap-1.5">${esc(op.action)}${icon('arrow', 'size-3.5')}</button></div>`
}

function sectionBodyA(s, scope) {
  if (s.groups) return s.groups.map((g) => rowsA(g, scope)).join('')
  if (s.op) return operationA(s.op)
  if (s.table) return `<div class="-mx-5">${table(s.table, { cq: '@min-[600px]/drawer' })}</div>`
  if (s.code !== undefined) return code(s.code)
  return ''
}

function sectionA(s, scope = 'drawer', body = sectionBodyA) {
  const open = isOpen(s)
  const a = ACCENT[s.accent]
  return `<section class="border-b border-border">
    <h3 class="sticky top-0 z-[1] bg-surface">
      <button type="button" data-toggle="${s.id}" aria-expanded="${open}" class="group flex h-10 w-full items-center gap-2.5 px-5 text-left hover:bg-surface-subtle ${FOCUS} focus-visible:ring-inset">
        <span class="relative flex items-center ${a.text}">${icon(s.icon, 'size-4')}</span>
        <span class="min-w-0 truncate text-[13px] font-semibold text-text-primary">${esc(s.title)}</span>
        ${s.count !== undefined ? `<span class="rounded-full bg-surface-muted px-1.5 text-[11px] font-medium tabular-nums text-text-muted">${s.count}</span>` : ''}
        ${s.summary && s.count === undefined ? `<span class="ml-auto min-w-0 truncate text-xs text-text-muted">${esc(s.summary)}</span>` : '<span class="ml-auto"></span>'}
        ${icon('chevron', `size-4 text-text-subtle transition-transform motion-reduce:transition-none ${open ? 'rotate-90' : ''}`)}
      </button>
      ${open ? `<span class="pointer-events-none absolute inset-y-2 left-0 w-0.5 rounded-r ${a.bg}"></span>` : ''}
    </h3>
    ${open ? `<div class="px-5 pt-0.5 pb-4">${body(s, scope)}</div>` : ''}
  </section>`
}

function headerA(d, extraActions = '') {
  return `<header class="border-b border-border px-5 pt-3 pb-3">
    <div class="flex items-center gap-2">
      <div class="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium text-text-muted">${icon(d.icon, 'size-3.5')}<span class="truncate">${esc(d.entity)}</span></div>
      ${extraActions}
      <button class="${BTN.icon}" aria-label="Help">${icon('help')}</button>
      <button class="${BTN.icon}" data-close aria-label="Close detail">${icon('close')}</button>
    </div>
    <h2 class="mt-0.5 line-clamp-2 text-base font-semibold leading-6 text-text-primary wrap-anywhere" title="${esc(d.title)}">${esc(d.title)}</h2>
    <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
      ${d.statuses.map((s) => badge(s)).join('')}
      ${d.meta.map((m) => `<span class="ml-1 min-w-0 truncate text-xs text-text-muted">${esc(m)}</span>`).join('')}
    </div>
    ${d.techId ? `<div class="group/row mt-1.5 flex min-w-0 items-center text-text-subtle"><span class="min-w-0 truncate font-mono text-[11.5px]" title="${esc(d.techId)}">${esc(d.techId)}</span>${copyBtn(d.techId)}</div>` : ''}
  </header>`
}

function renderA(d, width) {
  const body = d.sections ? d.sections.map((s) => sectionA(s)).join('') : `<div class="px-5 pt-1 pb-4">${d.groups.map((g) => rowsA(g)).join('')}</div>`
  const f = footer(d)
  return drawerShell(width, `
    ${headerA(d)}
    <div class="custom-scrollbar flex-1 overflow-y-auto">
      ${factsA(d)}
      ${body}
    </div>
    ${f ? `<footer class="flex items-center gap-3 border-t border-border bg-surface px-5 py-3">${f.start}<div class="ml-auto flex gap-2">${f.end}</div></footer>` : ''}`)
}

// ===========================================================================================
// B · CENTERED DETAIL DIALOG — read-only detail at modal size, multi-column
// ===========================================================================================
function renderB(d, width, { headerActions = '', techId = false, stickyNav = false } = {}) {
  const sections = d.sections ?? [{ id: 'details', title: 'Details', accent: 'overview', icon: 'grid', open: true, groups: d.groups }]
  // Technical groups move to the side column; the main column keeps business content.
  const technical = sections.flatMap((s) => (s.groups ?? []).filter((g) => g.technical).map((g) => ({ ...g, from: s.title })))
  const mainSections = sections.map((s) => ({ ...s, groups: s.groups?.filter((g) => !g.technical) }))
  const nav = sections.length > 1 ? `<nav class="flex gap-1 overflow-x-auto border-b border-border px-6 ${stickyNav ? 'sticky top-0 z-[2] bg-surface [scrollbar-width:none]' : ''}" aria-label="Sections">
    ${sections.map((s) => `<a href="#b-${s.id}" data-jump="${s.id}" class="flex h-10 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-2 text-[13px] font-medium text-text-muted hover:text-text-primary ${FOCUS}"><span class="${ACCENT[s.accent].text}">${icon(s.icon, 'size-3.5')}</span>${esc(s.title)}${s.count !== undefined ? `<span class="rounded-full bg-surface-muted px-1.5 text-[11px] tabular-nums">${s.count}</span>` : ''}</a>`).join('')}
  </nav>` : ''
  const sectionB = (s) => {
    const collapsed = state.sections[s.id] === false
    const a = ACCENT[s.accent]
    const content = s.groups ? s.groups.map((g) => rowsA(g, 'main')).join('') : s.op ? operationA(s.op) : s.table ? `<div class="-mx-6">${table(s.table, { wide: true, bleed: 'px-6' })}</div>` : s.code !== undefined ? code(s.code) : ''
    if (s.groups && !s.groups.length) return ''
    return `<section id="b-${s.id}" class="${stickyNav ? 'scroll-mt-11' : 'scroll-mt-2'} border-b border-border last:border-b-0">
      <h3><button type="button" data-toggle="${s.id}" data-default-open="1" aria-expanded="${!collapsed}" class="flex h-11 w-full items-center gap-2.5 px-6 text-left hover:bg-surface-subtle ${FOCUS} focus-visible:ring-inset">
        <span class="${a.text}">${icon(s.icon, 'size-4')}</span>
        <span class="text-sm font-semibold text-text-primary">${esc(s.title)}</span>
        ${s.summary ? `<span class="ml-auto truncate text-xs text-text-muted">${esc(s.summary)}</span>` : '<span class="ml-auto"></span>'}
        ${icon('chevron', `size-4 text-text-subtle transition-transform ${collapsed ? '' : 'rotate-90'}`)}
      </button></h3>
      ${collapsed ? '' : `<div class="px-6 pb-5">${content}</div>`}
    </section>`
  }
  const side = technical.length || d.meta.length ? `<aside class="border-t border-border bg-surface-subtle px-5 py-4 @min-[860px]/dlg:border-t-0 @min-[860px]/dlg:border-l">
      <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-subtle">Identifiers & metadata</h3>
      <dl class="space-y-2.5">
        ${technical.flatMap((g) => g.rows).map((r) => `<div class="group/row min-w-0"><dt class="text-xs text-text-muted">${esc(r.label)}</dt><dd class="text-sm text-text-primary">${value(r)}</dd></div>`).join('')}
      </dl>
    </aside>` : ''
  const f = footer(d)
  return `<div class="fixed inset-x-0 bottom-0 top-(--bar) z-40 bg-black/30" data-close aria-hidden="true"></div>
  <div role="dialog" aria-modal="true" aria-label="${esc(d.entity)} detail" class="fixed left-1/2 top-[calc(50%+var(--bar)/2)] z-50 flex max-h-[calc(94vh-var(--bar))] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-surface shadow-lg @container/dlg" style="max-width:${width}px">
    <header class="flex items-start gap-4 border-b border-border px-6 py-4">
      <span class="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent @min-[560px]/dlg:flex">${icon(d.icon, 'size-5')}</span>
      <div class="min-w-0 flex-1">
        <div class="text-xs font-medium text-text-muted">${esc(d.entity)}</div>
        <h2 class="line-clamp-2 text-lg font-semibold leading-7 wrap-anywhere">${esc(d.title)}</h2>
        <div class="mt-1.5 flex flex-wrap items-center gap-1.5">${d.statuses.map((s) => badge(s)).join('')}${d.meta.map((m) => `<span class="ml-1 text-xs text-text-muted">${esc(m)}</span>`).join('')}</div>
        ${techId && d.techId ? `<div class="group/row mt-1.5 flex min-w-0 items-center text-text-subtle"><span class="min-w-0 truncate font-mono text-[11.5px]" title="${esc(d.techId)}">${esc(d.techId)}</span>${copyBtn(d.techId)}</div>` : ''}
      </div>
      <div class="flex items-center gap-1">
        ${headerActions}
        <button class="${BTN.icon}" aria-label="Help">${icon('help')}</button>
        <button class="${BTN.icon}" data-close aria-label="Close detail">${icon('close')}</button>
      </div>
    </header>
    <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto" data-scroll>
      ${factsA(d, { scope: 'dlg', pad: 'px-6' })}
      ${nav}
      <div class="grid @min-[860px]/dlg:grid-cols-[minmax(0,1fr)_17rem]">
        <div class="min-w-0 @container/main">${mainSections.map(sectionB).join('')}</div>
        ${side}
      </div>
    </div>
    <footer class="flex items-center gap-3 border-t border-border px-6 py-3.5">
      ${f ? f.start : ''}
      <div class="ml-auto flex gap-2"><button type="button" data-close class="${BTN.outline}">Close</button>${f ? f.end : ''}</div>
    </footer>
  </div>`
}

// ===========================================================================================
// C · HYBRID — compact drawer for quick inspection, expands into a large detail workspace
// ===========================================================================================
function renderC(d, width) {
  return state.expanded ? renderCExpanded(d) : renderCCompact(d, width)
}

function renderCCompact(d, width, { expandAction, backdrop } = {}) {
  const sections = d.sections ?? [{ id: 'details', title: 'Details', accent: 'overview', icon: 'grid', open: true, groups: d.groups }]
  const op = sections.find((s) => s.op)?.op
  const LIMIT = 4
  const compactBody = (s) => {
    if (s.groups) {
      const rows = s.groups.filter((g) => !g.technical).flatMap((g) => g.rows).filter((r) => !r.inFacts)
      const hidden = rows.length - LIMIT + s.groups.filter((g) => g.technical).reduce((n, g) => n + g.rows.length, 0)
      return rowsA({ rows: rows.slice(0, LIMIT) }) + (hidden > 0 ? `<button type="button" data-expand="${s.id}" class="mt-1.5 inline-flex items-center gap-1 rounded text-xs font-medium text-accent hover:underline ${FOCUS}">${hidden} more fields in full view${icon('expand', 'size-3')}</button>` : '')
    }
    if (s.op) return operationA(s.op)
    if (s.table) return `<div class="-mx-5">${table(s.table, { max: 3 })}</div>${s.table.rows.length > 3 || s.table.columns.some((c) => c.wideOnly) ? `<button type="button" data-expand="${s.id}" class="mt-2 inline-flex items-center gap-1 rounded text-xs font-medium text-accent hover:underline ${FOCUS}">Open all ${s.table.rows.length} in full view${icon('expand', 'size-3')}</button>` : ''}`
    if (s.code !== undefined) return code(s.code)
    return ''
  }
  const expandBtn = expandAction ?? `<button type="button" data-expand="" class="${BTN.icon}" aria-label="Open full view" title="Open full view">${icon('expand')}</button>`
  const strip = op ? `<button type="button" data-toggle="${sections.find((s) => s.op).id}" class="flex w-full items-center gap-2.5 border-b border-border px-5 py-2.5 text-left hover:bg-surface-subtle ${FOCUS} focus-visible:ring-inset">
      ${badge({ label: op.status, tone: op.tone })}
      <span class="min-w-0 flex-1 truncate text-xs text-text-secondary">${esc(op.label)} · ${esc(op.when)} · ${esc(op.duration)}</span>
      ${icon('chevron', 'size-4 text-text-subtle')}
    </button>` : ''
  const f = footer(d)
  return drawerShell(width, `
    ${headerA(d, expandBtn)}
    <div class="custom-scrollbar flex-1 overflow-y-auto" data-scroll>
      ${factsA(d)}
      ${strip}
      ${sections.map((s) => sectionA(s, 'drawer', compactBody)).join('')}
    </div>
    ${f ? `<footer class="flex items-center gap-3 border-t border-border px-5 py-3">${f.start}<div class="ml-auto flex gap-2">${f.end}</div></footer>` : ''}`, backdrop)
}

function renderCExpanded(d) {
  const sections = d.sections ?? [{ id: 'details', title: 'Details', accent: 'overview', icon: 'grid', open: true, groups: d.groups }]
  const technical = sections.flatMap((s) => (s.groups ?? []).filter((g) => g.technical))
  const block = (s) => {
    const groups = s.groups?.filter((g) => !g.technical)
    if (groups && !groups.length) return ''
    const a = ACCENT[s.accent]
    const content = groups ? groups.map((g) => rowsA(g, 'main')).join('') : s.op ? operationA(s.op) : s.table ? `<div class="-mx-6">${table(s.table, { wide: true, bleed: 'px-6' })}</div>` : s.code !== undefined ? code(s.code) : ''
    return `<section id="c-${s.id}" class="scroll-mt-3 border-b border-border px-6 py-4 last:border-b-0">
      <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold"><span class="${a.text}">${icon(s.icon, 'size-4')}</span>${esc(s.title)}${s.summary ? `<span class="ml-auto text-xs font-normal text-text-muted">${esc(s.summary)}</span>` : ''}</h3>
      ${content}
    </section>`
  }
  const f = footer(d)
  return `<div class="fixed inset-x-0 bottom-0 top-(--bar) z-40 bg-black/45" data-close aria-hidden="true"></div>
  <aside role="dialog" aria-modal="true" aria-label="${esc(d.entity)} detail" class="fixed bottom-0 top-(--bar) right-0 z-50 flex w-[min(1240px,calc(100vw-3rem))] flex-col border-l border-border bg-surface shadow-[-14px_0_40px_-20px_rgba(20,35,70,0.4)]">
    <header class="flex items-start gap-4 border-b border-border px-6 py-3.5">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 text-xs font-medium text-text-muted">${icon(d.icon, 'size-3.5')}${esc(d.entity)}</div>
        <h2 class="truncate text-lg font-semibold leading-7" title="${esc(d.title)}">${esc(d.title)}</h2>
        <div class="mt-1 flex flex-wrap items-center gap-1.5">${d.statuses.map((s) => badge(s)).join('')}${d.meta.map((m) => `<span class="ml-1 text-xs text-text-muted">${esc(m)}</span>`).join('')}
          ${d.techId ? `<span class="group/row ml-2 inline-flex min-w-0 items-center font-mono text-[11.5px] text-text-subtle"><span class="truncate">${esc(d.techId)}</span>${copyBtn(d.techId)}</span>` : ''}</div>
      </div>
      <div class="flex items-center gap-1">
        <button type="button" data-collapse class="${BTN.icon}" aria-label="Back to compact view" title="Back to compact view">${icon('collapse')}</button>
        <button class="${BTN.icon}" aria-label="Help">${icon('help')}</button>
        <button class="${BTN.icon}" data-close aria-label="Close detail">${icon('close')}</button>
      </div>
    </header>
    <div class="flex min-h-0 flex-1">
      <nav class="hidden w-52 shrink-0 border-r border-border bg-surface-subtle p-3 lg:block" aria-label="Sections">
        ${sections.map((s) => `<a href="#c-${s.id}" data-jump-c="${s.id}" class="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary ${FOCUS}"><span class="${ACCENT[s.accent].text}">${icon(s.icon, 'size-4')}</span><span class="min-w-0 flex-1 truncate">${esc(s.title)}</span>${s.count !== undefined ? `<span class="text-[11px] tabular-nums text-text-muted">${s.count}</span>` : ''}</a>`).join('')}
      </nav>
      <div class="custom-scrollbar min-w-0 flex-1 overflow-y-auto" data-scroll>
        <div class="@container/dlg">${factsA(d, { scope: 'dlg', pad: 'px-6' })}</div>
        <div class="grid xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div class="min-w-0 @container/main">${sections.map(block).join('')}</div>
          ${technical.length ? `<aside class="border-t border-border bg-surface-subtle px-5 py-4 xl:border-t-0 xl:border-l">
            <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-subtle">Identifiers & metadata</h3>
            <dl class="space-y-2.5">${technical.flatMap((g) => g.rows).map((r) => `<div class="group/row min-w-0"><dt class="text-xs text-text-muted">${esc(r.label)}</dt><dd class="text-sm">${value(r)}</dd></div>`).join('')}</dl>
          </aside>` : ''}
        </div>
      </div>
    </div>
    ${f ? `<footer class="flex items-center gap-3 border-t border-border px-6 py-3">${f.start}<div class="ml-auto flex gap-2">${f.end}</div></footer>` : ''}
  </aside>`
}

// ===========================================================================================
// D · EXPANDED DEFAULT ↔ COMPACT — one detail view with two modes (conceptually a DetailView
// with mode "expanded" | "compact"). Expanded is B's dialog; compact is C's compact drawer.
// ===========================================================================================
function renderD(d, size) {
  if (state.mode === 'compact') {
    const expand = `<button type="button" data-mode-toggle="expanded" class="${BTN.mode}" title="Expand to the full detail view">${icon('maximize', 'size-3.5')}Expand</button>`
    // Lighter backdrop: compact mode is for keeping the list in view.
    return renderCCompact(d, 420, { expandAction: expand, backdrop: 'bg-black/15' })
  }
  const width = size === 'auto' ? (d.sections ? 960 : 760) : Number(size)
  const compact = `<button type="button" data-mode-toggle="compact" class="${BTN.mode}" title="Show as a compact side panel">${icon('panelRight', 'size-3.5')}<span class="hidden @min-[560px]/dlg:inline">Compact view</span></button>`
  return renderB(d, width, { headerActions: compact, techId: true, stickyNav: true })
}

// ---------- drawer shell with a working resize handle ---------------------------------------
function drawerShell(width, inner, backdrop = 'bg-black/45') {
  return `<div class="fixed inset-x-0 bottom-0 top-(--bar) z-40 ${backdrop}" data-close aria-hidden="true"></div>
  <aside role="dialog" aria-modal="true" aria-label="Detail" data-drawer class="fixed bottom-0 top-(--bar) right-0 z-50 flex max-w-[92vw] flex-col border-l border-border bg-surface shadow-[-14px_0_40px_-20px_rgba(20,35,70,0.4)] @container/drawer" style="width:${width}px">
    <div data-resize role="separator" aria-orientation="vertical" aria-label="Resize panel" tabindex="0" class="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize hover:bg-accent/30 focus:bg-accent/40 focus:outline-none"></div>
    ${inner}
  </aside>`
}

// ---------- background page ------------------------------------------------------------------
function page(d) {
  const rows = [d.title, ...d.siblings]
  return `<div class="flex h-[calc(100dvh-var(--bar))] gap-4 overflow-hidden p-4">
    <div class="hidden w-64 shrink-0 rounded-2xl border border-border bg-surface p-4 md:block">
      <div class="mb-6 flex items-center gap-2 font-semibold"><span class="flex size-8 items-center justify-center rounded-lg bg-text-primary text-white dark:bg-accent">A</span>Aricoma</div>
      ${['Platform administration', 'Providers & connectors', 'Discovery & inventory', 'Recovery plans', 'Recovery actions'].map((m) => `<div class="rounded-lg px-3 py-2 text-sm text-text-secondary">${m}</div>`).join('')}
    </div>
    <main class="min-w-0 flex-1 rounded-2xl border border-border bg-surface p-6">
      <h1 class="text-xl font-semibold">${esc(d.menu)}</h1>
      <p class="mt-1 text-sm text-text-muted">Prototype background — click a row to reopen the detail.</p>
      <table class="mt-6 w-full text-sm"><thead><tr class="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-subtle"><th class="py-2">Name</th><th>Type</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr data-reopen class="cursor-pointer border-b border-border hover:bg-surface-hover ${i === 0 ? 'bg-surface-hover' : ''}"><td class="py-3 font-medium">${esc(r)}</td><td class="text-text-muted">${esc(d.entity)}</td></tr>`).join('')}</tbody></table>
    </main>
  </div>`
}

// ---------- notes per concept ------------------------------------------------------------------
const NOTES = {
  current: ['Reference: abbreviated replica of today’s DetailDrawer (header meta row, accented sections, 35 % label column). Use it to compare against A/B/C.'],
  a: [
    'Same right-side drawer, focus trap, resizing and section model — lowest migration cost.',
    'Header tiers: entity eyebrow → title (2 lines max) → status badges + secondary meta → technical ID (mono, copy).',
    'Primary facts strip (2×2, 4 across from 520 px) answers “what is important” before any section.',
    'Sections: 40 px headers, chevron on the right, accent only as icon colour + 2 px marker while open.',
    'Rows: small muted labels, fixed 8.5 rem column; from 600 px the fields flow into 2 columns with labels above values.',
    'Technical IDs grouped in a recessed mono “Technical” well with copy buttons — they recede but stay available.',
    'Operational data as a status block (status → time · duration → run ID) and a clear action button.',
  ],
  b: [
    'Centred read-only dialog, sized like the provider edit modal (672 px) or wider (960/1200 px).',
    'More width = facts across, sections in 2-column field grids, inventory with all columns.',
    'Section bar jumps between sections; sections are open by default and still collapsible.',
    'Technical identifiers move to a right “Identifiers & metadata” column from 860 px (below content when narrower).',
    'Trade-off: covers the table — no side-by-side scanning of the list while reading the detail; different pattern from today’s drawers.',
  ],
  c: [
    'Compact drawer = quick inspection: facts, a one-line operational strip, the first 4 fields per section, 3 table rows.',
    '“Open full view” (⤢ in header, or the links inside sections) expands to a ~1240 px workspace: section rail, all fields, full tables, identifiers column.',
    'Keeps today’s drawer for simple objects; complex objects (VM, Power, inventory) get room when the user asks for it.',
    'Trade-off: two layouts to maintain; the compact view intentionally hides fields behind “more fields”.',
  ],
  d: [
    'One detail, two modes. A row click always opens the EXPANDED centred dialog (B foundation): facts, section bar, full tables, identifiers column, pinned footer.',
    '“Compact view” in the header switches the same detail into C’s compact right drawer (420 px, resizable, lighter backdrop so the list stays visible).',
    '“Expand”, or the “more fields / Open all … in full view” links, switch back (and jump to that section). Object, section state and per-mode scroll are kept.',
    'Escape and the backdrop close the detail; reopening a row starts expanded again.',
    'Size “auto”: 960 px for objects with sections, 760 px for simple objects (Platform provider) so a short record is not lost in a huge dialog.',
  ],
}

// ---------- render & wiring ----------------------------------------------------------------
const RENDER = { current: renderCurrent, a: renderA, b: renderB, c: renderC, d: (d) => renderD(d, state.size) }

function syncUrl() {
  const p = new URLSearchParams({ concept: state.concept, object: state.object, size: state.size })
  if (state.long) p.set('long', '1')
  if (state.dark) p.set('theme', 'dark')
  if (state.expanded && state.concept === 'c') p.set('expanded', '1')
  if (state.notes) p.set('notes', '1')
  if (state.concept === 'd' && state.mode === 'compact') p.set('mode', 'compact')
  history.replaceState(null, '', `?${p}`)
}

function render() {
  const previous = document.querySelector('#stage [data-scroll]')
  if (previous && state.renderedKey) state.scroll[state.renderedKey] = previous.scrollTop
  const sizes = SIZES[state.concept]
  if (!sizes.some(([v]) => v === state.size)) state.size = sizes[0][0]
  document.documentElement.classList.toggle('dark', state.dark)
  const sizeSelect = document.getElementById('size')
  sizeSelect.innerHTML = sizes.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')
  sizeSelect.value = state.size
  sizeSelect.disabled = (state.concept === 'c' && state.expanded) || (state.concept === 'd' && state.mode === 'compact')
  const modeSelect = document.getElementById('mode')
  modeSelect.parentElement.hidden = state.concept !== 'd'
  modeSelect.value = state.mode
  document.getElementById('concept').value = state.concept
  document.getElementById('object').value = state.object
  document.getElementById('long').checked = state.long
  document.getElementById('dark').checked = state.dark
  document.getElementById('notes-toggle').checked = state.notes
  const notes = document.getElementById('notes')
  notes.hidden = !state.notes
  notes.innerHTML = `<ul class="mx-auto flex max-w-6xl list-disc flex-col gap-0.5 pl-5">${NOTES[state.concept].map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
  const d = obj()
  document.getElementById('stage').innerHTML = page(d) + (state.open ? RENDER[state.concept](d, Number(state.size)) : '')
  const previousKey = state.renderedKey
  state.renderedKey = `${state.concept}:${state.object}:${state.concept === 'd' ? state.mode : ''}`
  const scroller = document.querySelector('#stage [data-scroll]')
  // Re-rendering the same view (e.g. a section toggle) keeps its scroll; a mode switch restores
  // the position that mode had.
  if (scroller && (state.restoreScroll || previousKey === state.renderedKey)) scroller.scrollTop = state.scroll[state.renderedKey] ?? 0
  state.restoreScroll = false
  if (state.focus) { document.querySelector(state.focus)?.focus(); state.focus = null }
  syncUrl()
}

// D: switch mode without closing; keep the object and section state, restore that mode's scroll.
function setMode(mode, sectionId) {
  state.open = true
  state.mode = mode
  state.restoreScroll = !sectionId
  state.focus = `[data-mode-toggle="${mode === 'compact' ? 'expanded' : 'compact'}"]`
  if (sectionId) state.sections[sectionId] = true
  render()
  if (sectionId) document.getElementById(`b-${sectionId}`)?.scrollIntoView({ block: 'start' })
}

document.addEventListener('click', (event) => {
  const t = event.target.closest('button, a, [data-close], [data-reopen]')
  if (!t) return
  if (t.dataset.toggle !== undefined) {
    const id = t.dataset.toggle
    const d = DETAIL_OBJECTS[state.object]
    const s = (d.sections ?? []).find((x) => x.id === id)
    const current = state.sections[id] ?? (t.dataset.defaultOpen ? true : Boolean(s?.open))
    state.sections[id] = !current
    return render()
  }
  if (t.dataset.modeToggle) return setMode(t.dataset.modeToggle)
  if (t.dataset.expand !== undefined && state.concept === 'd') { event.preventDefault(); return setMode('expanded', t.dataset.expand) }
  if (t.dataset.expand !== undefined) { event.preventDefault(); state.expanded = true; render(); if (t.dataset.expand) document.getElementById(`c-${t.dataset.expand}`)?.scrollIntoView({ block: 'start' }); return }
  if (t.dataset.collapse !== undefined) { state.expanded = false; return render() }
  if (t.dataset.jump) { event.preventDefault(); state.sections[t.dataset.jump] = true; render(); document.getElementById(`b-${t.dataset.jump}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return }
  if (t.dataset.jumpC) { event.preventDefault(); document.getElementById(`c-${t.dataset.jumpC}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return }
  if (t.dataset.copy !== undefined) { try { void navigator.clipboard?.writeText(t.dataset.copy) } catch { /* prototype */ } t.innerHTML = icon('check', 'size-3'); return }
  if (t.dataset.close !== undefined) { state.open = false; state.expanded = false; return render() }
  // Opening a detail (again) always starts expanded with default sections.
  if (t.dataset.reopen !== undefined) { state.open = true; state.mode = 'expanded'; state.sections = {}; state.scroll = {}; return render() }
  if (t.tagName === 'A' && t.getAttribute('href') === '#') event.preventDefault()
})
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.open) { state.open = false; state.expanded = false; render() } })

// Drag-resize for the drawer concepts (from the left edge, like useResizablePanel).
document.addEventListener('pointerdown', (event) => {
  const handle = event.target.closest('[data-resize]')
  if (!handle) return
  const drawer = handle.closest('[data-drawer]')
  handle.setPointerCapture(event.pointerId)
  const move = (e) => { drawer.style.width = `${Math.min(Math.max(window.innerWidth - e.clientX, 360), window.innerWidth * 0.92)}px` }
  const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up) }
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', up)
})

for (const [id, key] of [['concept', 'concept'], ['object', 'object'], ['size', 'size']]) {
  document.getElementById(id).addEventListener('change', (e) => { state[key] = e.target.value; state.open = true; if (key !== 'size') { state.sections = {}; state.expanded = false; state.mode = 'expanded'; state.scroll = {} } render() })
}
document.getElementById('mode').addEventListener('change', (e) => { setMode(e.target.value) })
document.getElementById('long').addEventListener('change', (e) => { state.long = e.target.checked; render() })
document.getElementById('dark').addEventListener('change', (e) => { state.dark = e.target.checked; render() })
document.getElementById('notes-toggle').addEventListener('change', (e) => { state.notes = e.target.checked; render() })

render()

// Keep the prototype controls bar out of the drawer's way.
new ResizeObserver(([entry]) => { document.documentElement.style.setProperty('--bar', `${entry.target.offsetHeight}px`) }).observe(document.querySelector('body > div.sticky'))
