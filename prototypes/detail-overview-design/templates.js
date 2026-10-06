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

// Long prose (descriptions) is treated differently from long technical values in some templates.
const isProse = f => footprint(f) === 'full' && !f.mono && !f.href && !f.link

function core(f) {
  if (isEmpty(f)) return '<span class="text-text-subtle">Not set</span>'
  const v = esc(f.value)
  const linkClass = 'rounded text-accent hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15'
  if (f.badge) return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${TONE[f.badge]}">${v}</span>`
  if (f.href) return `<a href="${esc(f.href)}"${f.external ? ' target="_blank" rel="noopener noreferrer"' : ''} class="${linkClass}${f.mono ? ' font-mono text-[0.9em]' : ''}">${v}${f.external ? ICON.external : ''}</a>`
  if (f.link) return `<button type="button" class="${linkClass} text-left">${v}</button>`
  if (f.mono) return `<span class="font-mono text-[0.9em] text-text-secondary">${v}</span>`
  return v
}

function copyButton(f) {
  if (!f.copy || isEmpty(f)) return ''
  return `<button type="button" data-copy="${esc(f.value)}" aria-label="Copy ${esc(f.label)}" title="Copy ${esc(f.label)}" class="-my-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-text-subtle transition hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15">${ICON.copy}</button>`
}

// Value + secondary line + copy action; `cls` sets the value typography per template.
function value(f, cls = 'text-sm leading-5') {
  const strong = f.emphasis && !isEmpty(f) && !f.badge ? ' font-semibold' : ''
  const secondary = f.secondary && !isEmpty(f) ? `<div class="mt-0.5 text-xs font-normal leading-4 text-text-muted">${esc(f.secondary)}</div>` : ''
  return `<div class="flex min-w-0 items-start gap-1"><div class="min-w-0 wrap-anywhere text-text-primary ${cls}${strong}">${core(f)}${secondary}</div>${copyButton(f)}</div>`
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
