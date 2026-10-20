/* Standalone design prototype. Fixture data only; no API calls or persistence. */
(() => {
  const isGroup = document.body.dataset.entity === 'group';
  const params = new URLSearchParams(location.search);
  const mode = ['create', 'edit', 'locked'].includes(params.get('mode')) ? params.get('mode') : 'create';
  const editing = mode !== 'create';
  const locked = mode === 'locked' && isGroup;
  const entity = isGroup ? 'recovery group' : 'recovery application';
  const steps = isGroup
    ? ['Details', 'Storage topology', 'Resource type', 'Provider', 'Resources', 'Related storage', 'Policy set', 'Orchestration']
    : ['Details', 'Recovery tiers', 'Policy set', 'Orchestration'];
  const descriptions = isGroup
    ? ['Identify this reusable resource group.', 'Define the storage relationship used by this group.', 'Choose the workload to recover.', 'Connect the group to its source inventory.', 'Select the virtual machines included in this group.', 'Inspect volumes associated with the selected virtual machines.', 'Assign the recovery policies for this group.', 'Review deployment settings before saving.']
    : ['Identify the application and its recovery endpoints.', 'Arrange recovery groups in their configured recovery order.', 'Assign the recovery policies for this application.', 'Review deployment settings before saving.'];
  let current = 0;
  let dirty = false;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const field = (id, label, value, hint = '', readonly = false, wide = false) => `
    <div class="field ${wide ? 'wide' : ''}"><label for="${id}">${label}</label>
      <input id="${id}" name="${id}" value="${escape(value)}" ${readonly ? 'readonly' : ''} required
        ${hint ? `aria-describedby="${id}-hint"` : ''} ${id === 'identity' ? 'class="mono" pattern="[a-zA-Z0-9_-]+"' : ''}>
      ${hint ? `<span class="hint" id="${id}-hint">${hint}</span>` : ''}</div>`;
  const select = (id, label, options, disabled = false) => `
    <div class="field"><label for="${id}">${label}</label><select id="${id}" name="${id}" ${disabled ? 'disabled' : ''}>
    ${options.map(option => `<option>${option}</option>`).join('')}</select></div>`;
  const description = `<div class="field wide"><label for="description">Description *</label>
    <textarea id="description" name="description" required>${isGroup ? 'Database virtual machines and their associated storage.' : 'Recovery sequence for the production customer portal.'}</textarea></div>`;
  const details = `<div class="fields">
    ${field('identity', isGroup ? 'Group ID *' : 'Application file name *', isGroup ? 'rg_database_prod' : 'customer_portal',
      editing ? 'Locked · identity is preserved when editing.' : 'Stable identifier. Use letters, numbers, underscores or hyphens.', editing)}
    ${field('name', isGroup ? 'Group name *' : 'Application name *', isGroup ? 'Production databases' : 'Customer portal')}
    ${description}
    ${isGroup ? '' : `${select('environment', 'Environment', ['prod', 'test', 'dev'])}
      ${field('platform', 'Platform', 'VMWARE', 'Derived from the source provider.', true)}
      ${select('source', 'Source provider *', ['vcenter_prg_01'], editing)}
      ${select('target', 'Target provider *', ['vcenter_brq_01'], editing)}
      <p class="hint wide">${editing ? 'Locked · source, target and platform cannot be changed for a saved application.' : 'Provider changes must revalidate the assigned recovery groups.'}</p>`}
    </div>`;
  const topology = `<div class="fields">${select('topology', 'Storage topology *', ['Local', 'Metro Mirror'])}
    ${select('storage', 'Storage provider *', ['flashsystem_prg_01'])}</div>
    <div id="mirror" hidden><div class="notice info">Partner provider: <code>flashsystem_brq_01</code> · resolved from the storage relationship.</div>
    ${select('mirror-mode', 'Metro Mirror mode', ['Existing', 'Managed'], editing)}
    <p class="hint">Edit preserves the stored mirror mode. Managed provisioning requires a clean rollback before further edits.</p></div>
    <div class="flow"><p><code>flashsystem_prg_01</code><small>Source storage provider</small></p><p id="topology-destination">Local recovery<small>Storage relationship</small></p></div>`;
  const type = `<div class="notice info">This interactive sample demonstrates the VMware / VM path. IBM Power and FlashSystem use the same compact selection layout in the proposed implementation.</div>
    <label class="choice"><input type="radio" name="workload" value="VMWARE" checked ${editing ? 'disabled' : ''}>
      <span><strong>VMware virtual machines</strong><small>Backup system workload · resource type: VM</small></span></label>
    ${editing ? '<p class="hint">Locked · the saved resource type is preserved.</p>' : ''}`;
  const provider = `${select('source', 'VM provider *', ['vcenter_prg_01'])}
    <div class="notice info">Fixture provider · VMware · source role. Production eligibility uses the existing provider and credential validation.</div>
    <dl><dt class="hint">Provider ID</dt><dd class="mono">vcenter_prg_01</dd><dt class="hint">Inventory scope</dt><dd class="mono">db-*</dd></dl>`;
  const resources = `<div class="toolbar"><label for="search">VM inventory</label><input id="search" type="search" placeholder="Filter by VM name" aria-label="Filter VM inventory"><span id="selection-count" class="tag"></span></div>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Virtual machine inventory"><table><thead><tr><th scope="col">Include</th><th scope="col">Virtual machine</th><th scope="col">vCPU</th><th scope="col">Memory</th></tr></thead>
    <tbody>${['db-primary-01', 'db-replica-01', 'db-reporting-01'].map((name, index) => `<tr data-vm="${name}"><td><input type="checkbox" name="resource" value="${name}" aria-label="Include ${name}" ${index < 2 ? 'checked' : ''}></td><td class="mono">${name}</td><td>8</td><td>32 GiB</td></tr>`).join('')}</tbody></table></div>
    <p id="no-results" role="status" hidden>No matching virtual machines. Try a different name.</p>
    <p class="hint">Illustrative inventory. Metadata availability depends on the provider response.</p>`;
  const related = `<div class="notice info">Illustrative storage mapping for the sample database VMs. Discovery runs in the production application.</div>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Related storage"><table><thead><tr><th scope="col">Volume</th><th scope="col">Provider</th></tr></thead><tbody>
    <tr><td class="mono">db_data_01</td><td class="mono">flashsystem_prg_01</td></tr>
    <tr><td class="mono">db_logs_01</td><td class="mono">flashsystem_prg_01</td></tr></tbody></table></div>
    <p class="hint">For volume-only groups this step is omitted. Existing Metro Mirror also requires auxiliary volume mappings.</p>`;
  const tiers = `<div class="toolbar"><span class="tag">3 configured tiers</span><span class="hint">Use ↑ / ↓ to change order</span></div><div id="tiers">
    ${['Database', 'Services', 'Web'].map((name, index) => `<article class="tier" data-tier="${name.toLowerCase()}">
      <span class="ordinal">${index + 1}</span><div><h3>${name}</h3>
      <label for="tier-${index}">Recovery group</label><select id="tier-${index}" name="tier-${index}">
      ${['database', 'services', 'web'].map(group => `<option value="rg_${group}_prod" ${group === name.toLowerCase() ? 'selected' : ''}>rg_${group}_prod</option>`).join('')}</select>
      <p class="hint">One recovery group per tier</p></div><div><button type="button" data-move="-1" aria-label="Move ${name} up">↑</button>
      <button type="button" data-move="1" aria-label="Move ${name} down">↓</button></div></article>`).join('')}</div>
      <p class="hint">The numbers represent configured order, not runtime progress. VM selection, tier creation and removal remain part of the existing builder; this sample demonstrates assignment and ordering.</p>`;
  const policy = `${select('policy', 'Policy set *', ['production_recovery', 'test_recovery'])}
    <div class="notice info">Policy set IDs are references. Resolve policy names and details from the existing policy-set query.</div>
    <p class="hint">No RPO/RTO or readiness rating is inferred from the selected policy.</p>`;
  const orchestration = `${select('orchestrator', 'Orchestration provider *', ['airflow_recovery_01'])}
    <label class="choice"><input id="push" name="push" type="checkbox" ${mode === 'locked' ? 'checked disabled' : ''}>
    <span><strong>Push to orchestrator</strong><small>Save the configuration and submit it to the selected Airflow provider.</small></span></label>
    ${mode === 'locked' && !isGroup ? '<div class="notice">Push stays enabled for this deployed application. Saving must preserve its deployed configuration.</div>' : ''}
    <p class="hint">Deployment is not evidence that a recovery run succeeded.</p>
    <div class="notice info">Prototype only. The final button opens a local review; it does not save or deploy anything.</div>`;
  const contents = isGroup ? [details, topology, type, provider, resources, related, policy, orchestration] : [details, tiers, policy, orchestration];
  document.body.innerHTML = `<a class="skip" href="#main">Skip to configuration</a>
    <div class="preview"><strong>DESIGN PROTOTYPE</strong><span>Sample data · no backend</span><a href="groups.html">Recovery Groups</a><a href="apps.html">Recovery Apps</a>
      <label for="mode">Scenario <select id="mode"><option value="create">Create · sample draft</option><option value="edit">Edit · saved draft</option><option value="locked">${isGroup ? 'Edit · deployed / read-only' : 'Edit · deployed / push locked'}</option></select></label></div>
    <header class="brand"><strong>Aricoma <span>/ Business Continuity Management</span></strong><span>Recovery configuration</span></header>
    <main id="main"><div class="breadcrumbs">Recovery plans / ${isGroup ? 'Recovery groups' : 'Recovery apps'} / ${editing ? 'Edit' : 'Create'}</div>
    <div class="page-head"><div><h1>${editing ? 'Edit' : 'Create'} ${entity}</h1><p class="muted">${isGroup ? 'Define the resources, storage relationships and deployment settings.' : 'Configure recovery endpoints and the ordered application tiers.'}</p></div><span class="tag">${locked ? 'Read-only' : editing ? 'Saved draft' : 'New configuration'}</span></div>
    ${locked ? '<div class="notice">Read-only · this group is deployed. Complete its rollback before editing. Managed groups with remaining provisioned identifiers also stay locked.</div>' : ''}
    <div class="workspace"><nav class="steps" aria-label="Configuration steps"><div class="eyebrow">Configuration</div><ol>${steps.map((name, index) => `<li><button type="button" data-step="${index}"><span class="step-number">${String(index + 1).padStart(2, '0')}</span>${name}</button></li>`).join('')}</ol><small>Preview navigation is unrestricted. Production keeps the existing validation gates.</small></nav>
    <form class="editor" novalidate><div class="form-body">${contents.map((content, index) => `<section data-panel="${index}" ${index ? 'hidden' : ''}>
    <div class="section-intro"><div class="eyebrow">Configuration / ${String(index + 1).padStart(2, '0')}</div><h2 tabindex="-1">${steps[index]}</h2><p class="muted">${descriptions[index]}</p></div><fieldset ${locked ? 'disabled' : ''}>${content}</fieldset></section>`).join('')}
    <p id="validation" class="notice" role="alert" hidden></p></div><footer class="footer"><span id="change-status">Sample configuration</span>
    <button type="button" id="back">Back</button><button type="button" id="next" class="primary">Continue →</button></footer></form>
    <aside class="rail" aria-label="Configuration summary"><div class="eyebrow">Configuration context</div><h2 id="summary-name"></h2><span class="tag">${isGroup ? 'Resource group' : 'Application'}</span>
    <dl><div><dt>IDENTIFIER</dt><dd id="summary-id"></dd></div><div><dt>${isGroup ? 'WORKLOAD' : 'PLATFORM'}</dt><dd>VMware / VM</dd></div>
    <div><dt>${isGroup ? 'SELECTED RESOURCES' : 'CONFIGURED TIERS'}</dt><dd id="summary-count"></dd></div><div><dt>POLICY SET</dt><dd id="summary-policy"></dd></div><div><dt>ORCHESTRATION</dt><dd id="summary-push"></dd></div></dl>
    <div class="flow"><p>${isGroup ? 'Source provider' : 'Source'}<small class="mono">vcenter_prg_01</small></p><p>${isGroup ? 'Resource selection' : 'Ordered recovery tiers'}<small>${isGroup ? 'VMs + associated storage' : 'Database → Services → Web'}</small></p><p>${isGroup ? 'Orchestration' : 'Target'}<small class="mono">${isGroup ? 'airflow_recovery_01' : 'vcenter_brq_01'}</small></p></div>
    <button type="button" id="review">Review configuration</button><p class="hint">Local preview values, not an API payload.</p></aside></div>
    <div class="under"><span id="step-position"></span><span>Technical builder concept · v1 · English UI / Slovak design notes</span></div></main>
    <dialog aria-labelledby="review-title"><h2 id="review-title">Configuration review</h2><p>Design preview only. Nothing is saved or submitted.</p><pre id="review-data"></pre><form method="dialog"><button class="primary">Close review</button></form></dialog>`;
  const q = selector => document.querySelector(selector);
  q('#mode').value = mode;
  q('#mode').onchange = event => {
    if (dirty && !window.confirm('Discard changes to this sample configuration?')) { event.target.value = mode; return; }
    location.search = `?mode=${event.target.value}`;
  };
  const value = id => document.getElementById(id)?.value ?? '';
  const checkedResources = () => [...document.querySelectorAll('[name="resource"]:checked')].map(input => input.value);
  const tierValues = () => [...document.querySelectorAll('[data-tier]')].map((tier, index) => ({ order: index + 1, tier: tier.dataset.tier, group: tier.querySelector('select').value }));
  function update() {
    q('#summary-name').textContent = value('name') || 'Unnamed configuration';
    q('#summary-id').textContent = value('identity') || 'Not set';
    q('#summary-count').textContent = isGroup ? `${checkedResources().length} virtual machines` : `${tierValues().length} tiers`;
    q('#summary-policy').textContent = value('policy');
    q('#summary-push').textContent = q('#push').checked ? 'Push requested' : 'Save configuration only';
    q('#change-status').textContent = locked ? 'Read-only configuration' : dirty ? 'Unsaved sample changes' : 'Sample configuration';
    if (isGroup) {
      q('#selection-count').textContent = `${checkedResources().length} selected`;
      q('#mirror').hidden = value('topology') !== 'Metro Mirror';
      q('#topology-destination').textContent = value('topology') === 'Metro Mirror' ? 'Partner: flashsystem_brq_01' : 'Local recovery';
    } else {
      document.querySelectorAll('[data-tier]').forEach((tier, index, all) => {
        tier.querySelector('.ordinal').textContent = String(index + 1);
        tier.querySelector('[data-move="-1"]').disabled = index === 0;
        tier.querySelector('[data-move="1"]').disabled = index === all.length - 1;
      });
      q('.rail .flow p:nth-child(2) small').textContent = tierValues().map(tier => tier.tier).join(' → ');
    }
  }
  function showStep(index, focus = true) {
    current = index;
    document.querySelectorAll('[data-panel]').forEach((panel, i) => { panel.hidden = i !== current; });
    document.querySelectorAll('[data-step]').forEach((button, i) => {
      if (i === current) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    q('#back').disabled = current === 0;
    q('#next').textContent = current === steps.length - 1 ? locked ? 'Read-only' : 'Review configuration' : 'Continue →';
    q('#next').disabled = current === steps.length - 1 && locked;
    q('#step-position').textContent = `Step ${current + 1} of ${steps.length} · ${steps[current]}`;
    q('#validation').hidden = true;
    if (focus) q(`[data-panel="${current}"] h2`).focus();
  }
  function review() {
    q('#review-data').textContent = JSON.stringify({
      previewOnly: true, entity, scenario: mode, identity: value('identity'), name: value('name'),
      description: value('description'), policySet: value('policy'), pushToOrchestrator: q('#push').checked,
      orchestrationProvider: value('orchestrator'),
      ...(isGroup ? { topology: value('topology'), storageProvider: value('storage'), resources: checkedResources() }
        : { environment: value('environment'), source: value('source'), target: value('target'), tiers: tierValues() }),
    }, null, 2);
    q('dialog').showModal();
  }
  q('.editor').onsubmit = event => event.preventDefault();
  q('.editor').oninput = event => { if (event.target.id !== 'search') dirty = true; update(); };
  q('.editor').onchange = () => { dirty = true; update(); };
  document.querySelectorAll('[data-step]').forEach(button => { button.onclick = () => showStep(Number(button.dataset.step)); });
  q('#back').onclick = () => showStep(Math.max(0, current - 1));
  q('#next').onclick = () => {
    const invalid = [...q(`[data-panel="${current}"]`).querySelectorAll('input, textarea, select')].find(input => !input.checkValidity());
    if (invalid) {
      q('#validation').hidden = false;
      q('#validation').textContent = 'Complete the required fields. Identifiers accept letters, numbers, underscores and hyphens.';
      invalid.focus();
      return;
    }
    if (isGroup && current === 4 && checkedResources().length === 0) {
      q('#validation').hidden = false;
      q('#validation').textContent = 'Select at least one virtual machine.';
      return;
    }
    if (current < steps.length - 1) showStep(current + 1); else review();
  };
  q('#review').onclick = review;
  if (isGroup) {
    q('#search').oninput = event => {
      const rows = [...document.querySelectorAll('[data-vm]')];
      rows.forEach(row => { row.hidden = !row.dataset.vm.includes(event.target.value.toLowerCase()); });
      q('#no-results').hidden = rows.some(row => !row.hidden);
    };
  } else {
    q('#tiers').onclick = event => {
      const button = event.target.closest('[data-move]');
      if (!button) return;
      const tier = button.closest('[data-tier]');
      const previous = tier.previousElementSibling;
      const next = tier.nextElementSibling;
      if (button.dataset.move === '-1' && previous) tier.parentNode.insertBefore(tier, previous);
      if (button.dataset.move === '1' && next) tier.parentNode.insertBefore(next, tier);
      dirty = true;
      update();
      // Keep focus usable when the moved tier reaches an edge.
      if (button.disabled) tier.querySelector('button:not(:disabled)')?.focus();
    };
  }
  update();
  showStep(0, false);
})();
