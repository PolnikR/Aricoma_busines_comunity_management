// Shared value rendering + five Overview templates. Templates receive only the field list.

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const ICON = {
  external: '<svg class="ml-1 inline size-3 -translate-y-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  copy: '<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
  check: '<svg class="size-3.5 text-success-600 dark:text-success-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
}

// Same tones as the light Badge.
const TONE = {
  success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
  info: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500',
  neutral: 'bg-surface-muted text-text-secondary',
}

const isEmpty = f => f.value === null || f.value === undefined || String(f.value).trim() === ''

// The shared layer decides the footprint from the content, never the consumer:
// normal (1 track), wide (2 tracks when available), full (whole row).
function footprint(f) {
  if (isEmpty(f) || f.badge) return 'normal'
  // A link carries an icon, so it needs a little more room than its text.
  const n = String(f.value).length + (f.href ? 6 : 0)
  if (n > 72) return 'full'
  if (n > 34) return 'wide'
  return 'normal'
}

// A4 uses the rule planned for production (tasks/detail-overview-a4-plan.md D4): only plain
// text is measured; links, badges and tags cannot be measured in React, so they take one
// track unless the consumer marks them `wide` (then the whole row). Thresholds are a prototype
// heuristic until Checkpoint 0 and can be overridden with ?nmax=&wmax=.
const thresholdParams = new URLSearchParams(location.search)
const THRESHOLDS = {
  normal: Number(thresholdParams.get('nmax')) || 34,
  wide: Number(thresholdParams.get('wmax')) || 72,
}
const isNode = f => Boolean(f.badge || f.href || f.link || f.tags)

function footprintA4(f) {
  if (isEmpty(f)) return 'normal'
  if (isNode(f)) return f.wide ? 'full' : 'normal'
  const n = String(f.value).length
  if (n > THRESHOLDS.wide) return 'full'
  if (n > THRESHOLDS.normal) return 'wide'
  return 'normal'
}

// A4 cell: A1 typography (11.5px medium label, 2 px step, mono at full contrast).
const A4_VALUE = { mono: 'font-mono text-[12.5px] text-text-primary', monoLink: 'font-mono text-[12.5px]', secondary: 'mt-0.5 text-[11.5px] leading-4' }
function a4Cell(f) {
  return `
        <div class="ov-a4__item" data-span="${footprintA4(f)}">
          ${label(f, 'text-[11.5px] font-medium leading-4 text-text-muted')}
          <dd class="mt-0.5">${value(f, 'text-sm leading-5', A4_VALUE)}</dd>
        </div>`
}
const a4Grid = fields => `<dl class="ov-a4">${fields.map(a4Cell).join('')}</dl>`

// Grouped variant: one titled A4 block per `group`, in field order (same h4 as
// DetailFieldGroup). Fields without a group form one untitled block, so datasets without
// groups render exactly like flat A4.
function a4Grouped(fields) {
  const blocks = []
  for (const f of fields) {
    const last = blocks.at(-1)
    if (last && last.group === f.group) last.fields.push(f)
    else blocks.push({ group: f.group, fields: [f] })
  }
  if (blocks.length === 1 && !blocks[0].group) return a4Grid(fields)
  return `<div class="ov-a4-groups">${blocks.map(b => `
      <section>
        ${b.group ? `<h4 class="mb-1 text-[13px] font-semibold leading-5 text-text-primary">${esc(b.group)}</h4>` : ''}
        ${a4Grid(b.fields)}
      </section>`).join('')}
    </div>`
}

// Long prose (descriptions) is treated differently from long technical values in some templates.
const isProse = f => footprint(f) === 'full' && !f.mono && !f.href && !f.link

// `o` lets a template restyle the technical parts (mono, badge, copy) without changing the model.
function core(f, o = {}) {
  if (isEmpty(f)) return '<span class="text-text-subtle">Not set</span>'
  const v = esc(f.value)
  const mono = o.mono ?? 'font-mono text-[0.9em] text-text-secondary'
  const linkClass = 'rounded text-accent hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15'
  // Same pills as VirtualMachineDetailPanel's tags.
  if (f.tags) return `<span class="flex flex-wrap gap-1.5">${f.value.map(tag => `<span class="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">${esc(tag)}</span>`).join('')}</span>`
  if (f.badge) return `<span class="inline-flex items-center ${o.badge ?? 'rounded-full px-2.5 py-0.5 text-theme-xs font-medium'} ${TONE[f.badge]}">${v}</span>`
  if (f.href) return `<a href="${esc(f.href)}"${f.external ? ' target="_blank" rel="noopener noreferrer"' : ''} class="${linkClass}${f.mono ? ` ${o.monoLink ?? 'font-mono text-[0.9em]'}` : ''}">${v}${f.external ? ICON.external : ''}</a>`
  if (f.link) return `<button type="button" class="${linkClass} text-left">${v}</button>`
  if (f.mono) return `<span class="${mono}">${v}</span>`
  return v
}

function copyButton(f, o = {}) {
  if (!f.copy || isEmpty(f)) return ''
  return `<button type="button" data-copy="${esc(f.value)}" aria-label="Copy ${esc(f.label)}" title="Copy ${esc(f.label)}" class="-my-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-text-subtle transition hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15 ${o.copy ?? ''}">${ICON.copy}</button>`
}

// Value + secondary line + copy action; `cls` sets the value typography per template.
function value(f, cls = 'text-sm leading-5', o = {}) {
  const strong = f.emphasis && !isEmpty(f) && !f.badge ? ' font-semibold' : ''
  const secondary = f.secondary && !isEmpty(f) ? `<div class="${o.secondary ?? 'mt-0.5 text-xs leading-4'} font-normal text-text-muted">${esc(f.secondary)}</div>` : ''
  return `<div class="flex min-w-0 items-start gap-1"><div class="min-w-0 wrap-anywhere text-text-primary ${cls}${strong}">${core(f, o)}${secondary}</div>${copyButton(f, o)}</div>`
}

const label = (f, cls = 'text-xs leading-4 text-text-muted') => `<dt class="${cls}">${esc(f.label)}</dt>`

const TEMPLATES = {
  A: {
    name: 'A · Responsive auto-grid',
    render: fields => `
      <dl class="ov-a">${fields.map(f => `
        <div class="ov-a__item" data-span="${footprint(f)}">
          ${label(f)}
          <dd class="mt-1">${value(f)}</dd>
        </div>`).join('')}
      </dl>`,
  },

  // A1 · Tight technical: same auto-grid, a tighter rhythm. Narrower tracks, half the row gap,
  // a 2 px label→value step and a smaller medium-weight label, so the value carries the cell.
  A1: {
    name: 'A1 · Tight technical',
    render: fields => `
      <dl class="ov-a1">${fields.map(f => `
        <div data-span="${footprint(f)}">
          ${label(f, 'text-[11.5px] font-medium leading-4 tracking-[0.01em] text-text-muted')}
          <dd class="mt-0.5">${value(f, 'text-sm leading-5', { mono: 'font-mono text-[12.5px] text-text-primary', monoLink: 'font-mono text-[12.5px]', secondary: 'text-[11.5px] leading-4' })}</dd>
        </div>`).join('')}
      </dl>`,
  },

  // A2 · Row rhythm: the auto-grid without column gaps, so each field's bottom hairline joins
  // its neighbours into one continuous row rule. No vertical rules, no boxes.
  A2: {
    name: 'A2 · Subtle row rhythm',
    render: fields => `
      <div class="ov-a2"><dl>${fields.map(f => `
        <div class="ov-a2__item" data-span="${footprint(f)}">
          ${label(f, 'text-xs leading-4 text-text-muted')}
          <dd class="mt-0.5">${value(f, 'text-sm leading-5', { mono: 'font-mono text-[12.5px] text-text-primary', monoLink: 'font-mono text-[12.5px]' })}</dd>
        </div>`).join('')}
      </dl></div>`,
  },

  // A3 · Enterprise inspector: the auto-grid on one quiet shared surface. Micro labels (the
  // DataTable header type), technical values as inline code, square status pills and copy
  // actions that recede until the field is hovered or focused.
  A3: {
    name: 'A3 · Enterprise inspector',
    render: fields => `
      <div class="ov-a3"><dl>${fields.map(f => `
        <div class="ov-a3__item" data-span="${footprint(f)}">
          ${label(f, 'text-[11px] font-semibold uppercase leading-4 tracking-[0.05em] text-text-muted')}
          <dd class="mt-1">${value(f, 'text-sm leading-5', {
            mono: 'rounded bg-surface px-1 py-px font-mono text-[12px] text-text-primary ring-1 ring-border/70 [box-decoration-break:clone]',
            monoLink: 'font-mono text-[12.5px]',
            badge: 'gap-1.5 rounded-md px-1.5 py-px text-[11.5px] font-semibold',
            copy: 'ov-a3__copy',
          })}</dd>
        </div>`).join('')}
      </dl></div>`,
  },

  // A4 · A1 tight grid + A2 row rule, the direction chosen for production. One grid, no
  // group headings (this is also the "flat" variant of the grouped/flat comparison).
  A4: {
    name: 'A4 · Tight + row rule (flat)',
    render: a4Grid,
  },

  // A4-grouped: the same A4 grid split into titled blocks (Compute / Guest / Placement …).
  A4G: {
    name: 'A4G · Tight + row rule (grouped)',
    render: a4Grouped,
  },

  B: {
    name: 'B · Definition matrix',
    render: fields => `
      <div class="ov-b"><dl>${fields.map(f => `
        <div class="ov-b__cell" data-span="${footprint(f)}">
          ${label(f, 'text-[11px] font-semibold uppercase leading-4 tracking-wide text-text-subtle')}
          <dd class="mt-1.5">${value(f)}</dd>
        </div>`).join('')}
      </dl></div>`,
  },

  C: {
    name: 'C · Information surface',
    render: fields => `
      <div class="ov-c"><dl>${fields.map(f => `
        <div class="ov-c__row" data-span="${footprint(f)}">
          ${label(f, 'text-[13px] leading-5 text-text-muted')}
          <dd class="min-w-0">${value(f)}</dd>
        </div>`).join('')}
      </dl></div>`,
  },

  D: {
    name: 'D · Editorial lead + facts',
    render: (fields) => {
      // Lead: emphasised facts (max 2, else the first field). Prose: long free text. Facts: the rest.
      let lead = fields.filter(f => f.emphasis).slice(0, 2)
      if (lead.length === 0) lead = fields.slice(0, 1)
      const prose = fields.filter(f => !lead.includes(f) && isProse(f))
      const facts = fields.filter(f => !lead.includes(f) && !prose.includes(f))
      const leadHtml = `
        <div class="ov-d__lead">
          ${lead.map(f => `<dl>${label(f)}<dd class="mt-1">${value(f, 'text-xl leading-7 font-semibold tracking-tight')}</dd></dl>`).join('')}
          ${prose.map(f => `<dl>${label(f)}<dd class="mt-1">${value(f, 'max-w-[68ch] text-sm leading-6 text-text-secondary!')}</dd></dl>`).join('')}
        </div>`
      const factsHtml = facts.length ? `
        <div class="ov-d__facts"><dl>${facts.map(f => `
          <div data-span="${footprint(f)}">
            ${label(f)}
            <dd class="mt-1">${value(f)}</dd>
          </div>`).join('')}
        </dl></div>` : ''
      return `<div class="ov-d" data-split="${facts.length ? 'yes' : 'no'}">${leadHtml}${factsHtml}</div>`
    },
  },

  E: {
    name: 'E · Compact property sheet',
    render: (fields) => {
      const row = f => `
        <div class="ov-e__row">
          <dt class="truncate text-xs leading-5 text-text-muted" title="${esc(f.label)}">${esc(f.label)}</dt>
          <dd class="min-w-0">${value(f, 'text-[13px] leading-5')}</dd>
        </div>`
      // Columns flow top-to-bottom; values too long for a narrow column (wide, full) get full-width rows below.
      const inColumns = fields.filter(f => footprint(f) === 'normal')
      const full = fields.filter(f => footprint(f) !== 'normal')
      return `
        <div class="ov-e">
          ${inColumns.length ? `<dl class="ov-e__cols">${inColumns.map(row).join('')}</dl>` : ''}
          ${full.length ? `<dl class="ov-e__full">${full.map(row).join('')}</dl>` : ''}
        </div>`
    },
  },
}
