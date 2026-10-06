// Prototype shell: controls, URL state and a DetailView frame matching production geometry
// (md 55rem / lg 60rem / xl 75rem dialog, 13rem section nav, 2rem gutter; phone below `sm`).

const WIDTHS = {
  md: { name: 'MD', dialog: 880 },
  lg: { name: 'LG', dialog: 960 },
  xl: { name: 'XL', dialog: 1200 },
  narrow: { name: 'Narrow', dialog: 343, narrow: true },
}
const VALUES = { normal: 'Normal', long: 'Long' }
const COMPARE = { off: 'Off', a: 'A family', g: 'A4 grouped vs flat', all: 'All' }

const params = new URLSearchParams(location.search)
const state = {
  t: TEMPLATES[params.get('t')] ? params.get('t') : 'A',
  d: DATASETS[params.get('d')] ? params.get('d') : 'provider',
  w: WIDTHS[params.get('w')] ? params.get('w') : 'lg',
  v: VALUES[params.get('v')] ? params.get('v') : 'normal',
  cmp: COMPARE[params.get('cmp')] ? params.get('cmp') : (params.get('all') === '1' ? 'all' : 'off'),
  fit: params.get('fit') === '1',
  dark: params.get('dark') === '1',
}

function fieldsOf(dataset) {
  return dataset.fields.map(f => state.v === 'long' && dataset.long[f.label] !== undefined
    ? { ...f, value: dataset.long[f.label], href: f.href ? dataset.long[f.label] : f.href }
    : f)
}

const STATUS = { success: TONE.success, warning: TONE.warning, info: TONE.info }

function frame(templateKey) {
  const dataset = DATASETS[state.d]
  const width = WIDTHS[state.w]
  const template = TEMPLATES[templateKey]
  const nav = dataset.sections.map((s, i) => `
    <span class="flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] leading-5 ${width.narrow ? '' : 'sm:px-3 sm:py-2'} ${i === 0 ? 'bg-accent-soft font-semibold text-accent' : 'font-medium text-text-secondary'} ${!width.narrow && i === dataset.sections.length - 1 ? 'mt-auto' : ''}">${s}</span>`).join('')
  return `
    <figure class="flex flex-col items-center gap-2">
      <figcaption class="text-xs text-text-muted"><strong class="text-text-primary">${template.name}</strong> · ${dataset.name} fields · dialog ${width.dialog}px · content <span data-content-width>–</span></figcaption>
      <div class="flex ${state.fit ? '' : 'h-[46rem]'} flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg" style="width:${width.dialog}px">
        <header class="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4 ${width.narrow ? '' : 'sm:px-6'}">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-text-muted">${dataset.entity}</p>
            <div class="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 class="line-clamp-2 min-w-0 text-lg font-semibold leading-7 text-text-primary wrap-anywhere">${esc(dataset.title)}</h2>
              <div class="flex flex-wrap items-center gap-1.5">${dataset.statuses.map(([tone, text]) => `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${STATUS[tone]}">${text}</span>`).join('')}</div>
            </div>
          </div>
          <span class="flex size-8 items-center justify-center rounded-lg text-text-muted" aria-hidden="true">✕</span>
        </header>
        <div class="flex min-h-0 flex-1 ${width.narrow ? 'flex-col' : 'flex-row'}">
          <nav aria-label="Sections" class="flex shrink-0 gap-1 ${width.narrow ? 'flex-wrap border-b border-border px-4 py-2' : 'w-52 flex-col border-r border-border px-3 py-4'}">${nav}</nav>
          <div class="detail-content custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto ${width.narrow ? 'px-5' : 'px-8'} py-6">
            <header class="mb-6">
              <h3 class="text-base font-semibold leading-6 text-text-primary">Overview</h3>
            </header>
            ${template.render(fieldsOf(dataset))}
          </div>
        </div>
        <footer class="flex shrink-0 items-center justify-end gap-3 border-t border-border px-5 py-3 ${width.narrow ? '' : 'sm:px-6'}">
          <span class="inline-flex h-9 items-center rounded-lg border border-border-strong px-3.5 text-sm font-medium text-text-secondary">Edit</span>
        </footer>
      </div>
    </figure>`
}

function segmented(id, options, key) {
  const el = document.getElementById(id)
  el.innerHTML = Object.entries(options).map(([value, text]) => `<button type="button" data-value="${value}" aria-pressed="${state[key] === value}">${text}</button>`).join('')
  el.onclick = (event) => {
    const button = event.target.closest('button')
    if (!button) return
    state[key] = button.dataset.value
    render()
  }
}

function render() {
  segmented('ctl-t', Object.fromEntries(Object.keys(TEMPLATES).map(k => [k, k])), 't')
  segmented('ctl-w', Object.fromEntries(Object.entries(WIDTHS).map(([k, w]) => [k, w.name])), 'w')
  segmented('ctl-v', VALUES, 'v')
  segmented('ctl-cmp', COMPARE, 'cmp')
  const select = document.getElementById('ctl-d')
  select.innerHTML = Object.entries(DATASETS).map(([k, d]) => `<option value="${k}"${k === state.d ? ' selected' : ''}>${d.name}</option>`).join('')
  document.getElementById('ctl-fit').checked = state.fit
  document.getElementById('ctl-dark').checked = state.dark
  document.documentElement.classList.toggle('dark', state.dark)
  document.getElementById('ctl-t').classList.toggle('opacity-40', state.cmp !== 'off')

  const stage = document.getElementById('stage')
  stage.innerHTML = (state.cmp === 'all' ? Object.keys(TEMPLATES) : state.cmp === 'a' ? Object.keys(TEMPLATES).filter(k => k.startsWith('A')) : state.cmp === 'g' ? ['A4G', 'A4'] : [state.t]).map(frame).join('')
  stage.querySelectorAll('.detail-content').forEach((content) => {
    const style = getComputedStyle(content)
    const inner = content.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    content.closest('figure').querySelector('[data-content-width]').textContent = `${Math.round(inner)}px`
  })

  const next = new URLSearchParams({ t: state.t, d: state.d, w: state.w, v: state.v })
  if (state.cmp !== 'off') next.set('cmp', state.cmp)
  if (state.fit) next.set('fit', '1')
  if (state.dark) next.set('dark', '1')
  history.replaceState(null, '', `?${next}`)
}

document.getElementById('ctl-d').onchange = (event) => { state.d = event.target.value; render() }
document.getElementById('ctl-fit').onchange = (event) => { state.fit = event.target.checked; render() }
document.getElementById('ctl-dark').onchange = (event) => { state.dark = event.target.checked; render() }

// Copy action with the same 1.5 s confirmation as DetailCopyButton.
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-copy]')
  if (!button) return
  navigator.clipboard?.writeText(button.dataset.copy).then(() => {
    button.innerHTML = ICON.check
    button.setAttribute('aria-label', 'Copied')
    setTimeout(() => { button.innerHTML = ICON.copy; button.setAttribute('aria-label', `Copy ${button.title.replace(/^Copy /, '')}`) }, 1500)
  }).catch(() => undefined)
})

render()
// The production stylesheet is injected by a module script; measure again once it applies.
addEventListener("load", () => { setTimeout(render, 300) })
