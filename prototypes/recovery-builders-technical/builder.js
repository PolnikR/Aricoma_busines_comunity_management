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
  const related = `<div class="notice info">Volumes linked to your selected VMs are included automatically. Add other volumes from the same storage provider when needed.</div>
    <div class="toolbar"><div><h3>Included volumes</h3><span class="hint">Storage provider: <code>flashsystem_prg_01</code></span></div>
      <button type="button" id="add-volumes" class="primary">+ Add volumes</button></div>
    <p id="storage-count" class="hint" role="status"></p>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Included storage volumes"><table>
      <thead><tr><th scope="col">Volume</th><th scope="col">Included via</th><th scope="col">Action</th></tr></thead>
      <tbody id="storage-rows"></tbody></table></div>
    <p id="storage-empty" hidden>No volumes included. Add volumes from the provider inventory.</p>
    <p class="hint">Removing a volume excludes it from this group; it does not delete it from storage. You can add it again.</p>
    <p class="hint">Sample discovery follows VM selection in Resources. No live API calls are made. Existing Metro Mirror additionally requires auxiliary mappings.</p>`;
  const tierMarkup = (name, index, group = '') => `<article class="tier" data-tier="${name.toLowerCase().replaceAll(' ', '_')}">
      <span class="ordinal">${index + 1}</span><div><h3>${name}</h3>
      <p class="tier-description">${name} recovery tier</p>
      <div class="tier-edit" hidden>
        <label for="tier-id-${index}">ID *</label><input id="tier-id-${index}" data-edit-id class="mono">
        <label for="tier-description-${index}">Tier description *</label><textarea id="tier-description-${index}" data-edit-description></textarea>
        <p class="notice" data-edit-error role="alert" hidden></p>
        <button type="button" data-confirm-tier class="primary">Confirm</button>
        <button type="button" data-cancel-tier>Cancel</button>
      </div>
      <label for="tier-${index}">Recovery group *</label><select id="tier-${index}" name="tier-${index}" required>
      <option value="" ${group ? '' : 'selected'} disabled>Select a recovery group</option>
      ${['database', 'services', 'web'].map(option => `<option value="rg_${option}_prod" ${option === group ? 'selected' : ''}>rg_${option}_prod</option>`).join('')}</select>
      <p class="hint">One recovery group per tier</p></div><div class="tier-actions">
      <button type="button" draggable="true" data-drag-tier aria-label="Drag ${name} to reorder; alternatively use the arrow buttons">⠿ Move</button>
      <button type="button" data-edit-tier>Edit</button>
      <button type="button" data-move="-1" aria-label="Move ${name} up">↑</button>
      <button type="button" data-move="1" aria-label="Move ${name} down">↓</button>
      <button type="button" data-remove-tier aria-label="Remove ${name} tier">Remove</button></div></article>`;
  const tiers = `<div class="toolbar"><span id="tier-count" class="tag" role="status"></span><button type="button" id="add-tier" class="primary">+ Add tier</button></div><div id="tiers">
    ${['Database', 'Services', 'Web'].map((name, index) => tierMarkup(name, index, name.toLowerCase())).join('')}</div>
      <p id="tiers-empty" class="notice info" hidden>No recovery tiers configured. Add a tier and assign a recovery group to continue.</p>
      <p class="hint">Drag the Move handle above or below another tier, or use ↑ / ↓. Edit changes the tier ID and description. Removing a tier only removes its assignment here, not the recovery group. VM selection is not simulated in this prototype.</p>`;
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
  const tierValues = () => [...document.querySelectorAll('[data-tier]')].map((tier, index) => ({ order: index + 1, tier: tier.dataset.tier, description: tier.querySelector('.tier-description').textContent, group: tier.querySelector('select').value }));
  function update() {
    q('#summary-name').textContent = value('name') || 'Unnamed configuration';
    q('#summary-id').textContent = value('identity') || 'Not set';
    q('#summary-count').textContent = isGroup ? `${checkedResources().length} virtual machines` : `${tierValues().length} tiers`;
    q('#summary-policy').textContent = value('policy');
    q('#summary-push').textContent = q('#push').checked ? 'Push requested' : 'Save configuration only';
    q('#change-status').textContent = locked ? 'Read-only configuration' : dirty ? 'Unsaved sample changes' : 'Sample configuration';
    if (isGroup) {
      storageSelection.refresh();
      q('#selection-count').textContent = `${checkedResources().length} selected`;
      q('#mirror').hidden = value('topology') !== 'Metro Mirror';
      q('#topology-destination').textContent = value('topology') === 'Metro Mirror' ? 'Partner: flashsystem_brq_01' : 'Local recovery';
    } else {
      q('#tier-count').textContent = `${tierValues().length} configured tiers`;
      q('#tiers-empty').hidden = tierValues().length > 0;
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
      ...(isGroup ? { topology: value('topology'), storageProvider: value('storage'), resources: checkedResources(), relatedVolumes: storageSelection.names() }
        : { environment: value('environment'), source: value('source'), target: value('target'), tiers: tierValues() }),
    }, null, 2);
    q('dialog').showModal();
  }
  q('.editor').onsubmit = event => event.preventDefault();
  q('.editor').oninput = event => { if (event.target.closest('.tier-edit')) return; if (event.target.id !== 'search') dirty = true; update(); };
  q('.editor').onchange = event => { if (event.target.closest('.tier-edit')) return; dirty = true; update(); };
  document.querySelectorAll('[data-step]').forEach(button => { button.onclick = () => showStep(Number(button.dataset.step)); });
  q('#back').onclick = () => showStep(Math.max(0, current - 1));
  q('#next').onclick = () => {
    if (!isGroup && current === 1 && q('.tier-edit:not([hidden])')) {
      q('#validation').hidden = false;
      q('#validation').textContent = 'Confirm or cancel the tier edits before continuing.';
      q('.tier-edit:not([hidden]) input').focus();
      return;
    }
    const invalid = [...q(`[data-panel="${current}"]`).querySelectorAll('input, textarea, select')].find(input => !input.checkValidity());
    if (invalid) {
      q('#validation').hidden = false;
      q('#validation').textContent = !isGroup && current === 1
        ? 'Assign a recovery group to every tier before continuing.'
        : 'Complete the required fields. Identifiers accept letters, numbers, underscores and hyphens.';
      invalid.focus();
      return;
    }
    if (isGroup && current === 4 && checkedResources().length === 0) {
      q('#validation').hidden = false;
      q('#validation').textContent = 'Select at least one virtual machine.';
      return;
    }
    if (!isGroup && current === 1 && tierValues().length === 0) {
      q('#validation').hidden = false;
      q('#validation').textContent = 'Add at least one recovery tier and assign a recovery group.';
      q('#add-tier').focus();
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
    let nextTierIndex = 3;
    q('#add-tier').onclick = () => {
      let index = nextTierIndex++;
      while (tierValues().some(tier => tier.tier === `tier_${index + 1}`)) index = nextTierIndex++;
      q('#tiers').insertAdjacentHTML('beforeend', tierMarkup(`Tier ${index + 1}`, index));
      dirty = true;
      update();
      q(`#tier-${index}`).focus();
    };
    q('#tiers').onclick = event => {
      const button = event.target.closest('[data-move], [data-remove-tier], [data-edit-tier], [data-confirm-tier], [data-cancel-tier]');
      if (!button) return;
      const tier = button.closest('[data-tier]');
      const editor = tier.querySelector('.tier-edit');
      if (button.hasAttribute('data-edit-tier')) {
        editor.hidden = false;
        editor.querySelector('[data-edit-id]').value = tier.dataset.tier;
        editor.querySelector('[data-edit-description]').value = tier.querySelector('.tier-description').textContent;
        editor.querySelector('[data-edit-error]').hidden = true;
        editor.querySelector('input').focus();
        return;
      }
      if (button.hasAttribute('data-cancel-tier')) {
        editor.hidden = true;
        tier.querySelector('[data-edit-tier]').focus();
        return;
      }
      if (button.hasAttribute('data-confirm-tier')) {
        const id = editor.querySelector('[data-edit-id]').value.trim();
        const description = editor.querySelector('[data-edit-description]').value.trim();
        const duplicate = [...document.querySelectorAll('[data-tier]')].some(other => other !== tier && other.dataset.tier === id);
        if (!/^[a-zA-Z0-9_-]+$/.test(id) || !description || duplicate) {
          const error = editor.querySelector('[data-edit-error]');
          error.textContent = duplicate ? 'Tier ID must be unique.' : 'Enter an ID (letters, numbers, _ or -) and a description.';
          error.hidden = false;
          editor.querySelector(!description && id ? 'textarea' : 'input').focus();
          return;
        }
        tier.dataset.tier = id;
        tier.querySelector('h3').textContent = id;
        tier.querySelector('.tier-description').textContent = description;
        tier.querySelector('[data-move="-1"]').setAttribute('aria-label', `Move ${id} up`);
        tier.querySelector('[data-move="1"]').setAttribute('aria-label', `Move ${id} down`);
        tier.querySelector('[data-remove-tier]').setAttribute('aria-label', `Remove ${id} tier`);
        tier.querySelector('[data-drag-tier]').setAttribute('aria-label', `Drag ${id} to reorder; alternatively use the arrow buttons`);
        editor.hidden = true;
        dirty = true;
        update();
        tier.querySelector('[data-edit-tier]').focus();
        return;
      }
      if (button.hasAttribute('data-remove-tier')) {
        const focusTarget = tier.nextElementSibling?.querySelector('select')
          ?? tier.previousElementSibling?.querySelector('select') ?? q('#add-tier');
        tier.remove();
        dirty = true;
        update();
        focusTarget.focus();
        return;
      }
      const previous = tier.previousElementSibling;
      const next = tier.nextElementSibling;
      if (button.dataset.move === '-1' && previous) tier.parentNode.insertBefore(tier, previous);
      if (button.dataset.move === '1' && next) tier.parentNode.insertBefore(next, tier);
      dirty = true;
      update();
      // Keep focus usable when the moved tier reaches an edge.
      if (button.disabled) tier.querySelector('button:not(:disabled)')?.focus();
    };
    let draggedTier = null;
    const clearDropMarkers = () => q('#tiers').querySelectorAll('.drop-before, .drop-after')
      .forEach(tier => tier.classList.remove('drop-before', 'drop-after'));
    q('#tiers').ondragstart = event => {
      const handle = event.target.closest('[data-drag-tier]');
      if (!handle) { event.preventDefault(); return; }
      draggedTier = handle.closest('[data-tier]');
      event.dataTransfer.setData('text/plain', draggedTier.querySelector('select').id);
      event.dataTransfer.effectAllowed = 'move';
    };
    q('#tiers').ondragover = event => {
      clearDropMarkers();
      const target = event.target.closest('[data-tier]');
      if (!draggedTier || !target || target === draggedTier) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const rect = target.getBoundingClientRect();
      target.classList.add(event.clientY < rect.top + rect.height / 2 ? 'drop-before' : 'drop-after');
    };
    q('#tiers').ondrop = event => {
      const target = event.target.closest('[data-tier]');
      if (draggedTier && target && target !== draggedTier) {
        event.preventDefault();
        const rect = target.getBoundingClientRect();
        target.parentNode.insertBefore(draggedTier, event.clientY < rect.top + rect.height / 2 ? target : target.nextElementSibling);
        dirty = true;
        update();
        draggedTier.querySelector('[data-drag-tier]').focus();
      }
      draggedTier = null;
      clearDropMarkers();
    };
    q('#tiers').ondragend = () => { draggedTier = null; clearDropMarkers(); };
    q('#tiers').ondragleave = event => { if (!q('#tiers').contains(event.relatedTarget)) clearDropMarkers(); };
  }
  function setupStorageSelection() {
    // Fixture relationships emulate VM discovery; inventory also contains unrelated volumes.
    const inventory = [
      { name: 'db_data_01', vms: ['db-primary-01'] },
      { name: 'db_logs_01', vms: ['db-primary-01', 'db-replica-01'] },
      { name: 'db_replica_01', vms: ['db-replica-01'] },
      { name: 'reporting_data_01', vms: ['db-reporting-01'] },
      { name: 'shared_archive_01', vms: [] },
      { name: 'audit_logs_01', vms: [] },
    ];
    const manual = new Set();
    const excluded = new Set();
    let context = '';
    let pending = new Set();
    const vmLinks = volume => volume.vms.filter(vm => checkedResources().includes(vm));
    const included = () => inventory.filter(volume => manual.has(volume.name) || (vmLinks(volume).length && !excluded.has(volume.name)));
    document.body.insertAdjacentHTML('beforeend', `<dialog id="volume-picker" aria-labelledby="picker-title" aria-describedby="picker-description">
      <h2 id="picker-title">Add volumes</h2><p id="picker-description">Select additional volumes from <code>flashsystem_prg_01</code>. Already included volumes cannot be added twice.</p>
      <label for="volume-search">Search provider inventory</label><input id="volume-search" type="search" placeholder="Volume name" autofocus>
      <div id="volume-options" class="volume-options"></div><p id="picker-empty" hidden>No matching volumes.</p>
      <div class="toolbar"><span id="pending-count" role="status"></span><div>
        <button type="button" id="cancel-volumes">Cancel</button> <button type="button" id="confirm-volumes" class="primary" disabled>Add selected</button>
      </div></div></dialog>`);
    const picker = q('#volume-picker');
    function refresh() {
      const key = JSON.stringify(checkedResources());
      if (context !== key) { excluded.clear(); context = key; }
      const selected = included();
      const discoveredCount = selected.filter(volume => vmLinks(volume).length && !excluded.has(volume.name)).length;
      q('#storage-count').textContent = `${selected.length} included · ${discoveredCount} from selected VMs · ${selected.length - discoveredCount} added manually`;
      q('#storage-empty').hidden = selected.length > 0;
      q('#storage-rows').innerHTML = selected.map(volume => {
        const links = !excluded.has(volume.name) ? vmLinks(volume) : [];
        return `<tr><td class="mono">${volume.name}</td><td><span class="tag">${links.length ? 'From VM' : 'Manual'}</span>
          ${links.length ? `<small class="volume-link">${links.join(', ')}</small>` : ''}</td>
          <td><button type="button" data-remove-volume="${volume.name}" aria-label="Remove ${volume.name}" ${locked ? 'disabled' : ''}>Remove</button></td></tr>`;
      }).join('');
    }
    function pendingCount() {
      q('#pending-count').textContent = `${pending.size} selected to add`;
      q('#confirm-volumes').disabled = pending.size === 0 || locked;
    }
    function renderOptions() {
      const names = new Set(included().map(volume => volume.name));
      const filtered = inventory.filter(volume => volume.name.includes(value('volume-search').trim().toLowerCase()));
      q('#picker-empty').hidden = filtered.length > 0;
      q('#volume-options').innerHTML = filtered.map(volume => `<label class="choice">
        <input type="checkbox" data-add-volume="${volume.name}" ${names.has(volume.name) || locked ? 'disabled' : ''} ${names.has(volume.name) || pending.has(volume.name) ? 'checked' : ''}>
        <span><strong class="mono">${volume.name}</strong><small>${names.has(volume.name) ? 'Already included' : vmLinks(volume).length ? 'Linked to selected VMs · available to add again' : 'Additional provider volume'}</small></span></label>`).join('');
      pendingCount();
    }
    q('#add-volumes').onclick = () => {
      if (locked) return;
      pending = new Set();
      q('#volume-search').value = '';
      renderOptions();
      picker.showModal();
    };
    q('#volume-search').oninput = renderOptions;
    q('#volume-options').onchange = event => {
      const name = event.target.dataset.addVolume;
      if (!name || locked) return;
      if (event.target.checked) pending.add(name); else pending.delete(name);
      pendingCount();
    };
    q('#cancel-volumes').onclick = () => picker.close();
    q('#confirm-volumes').onclick = () => {
      if (locked) return;
      pending.forEach(name => manual.add(name));
      dirty = true;
      update();
      picker.close();
    };
    q('#storage-rows').onclick = event => {
      const name = event.target.closest('[data-remove-volume]')?.dataset.removeVolume;
      if (!name || locked) return;
      manual.delete(name);
      excluded.add(name);
      dirty = true;
      update();
      q('#add-volumes').focus();
    };
    return { refresh, names: () => included().map(volume => volume.name) };
  }
  const storageSelection = isGroup ? setupStorageSelection() : null;
  update();
  showStep(isGroup && params.get('step') === 'related-storage' ? 5 : !isGroup && params.get('step') === 'tiers' ? 1 : 0, false);
})();
