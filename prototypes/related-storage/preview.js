const volumes = ['IBU_source', 'RDM_DISK01', 'RDM_DISK02', 'TEST_MIRRORER', 'V5000_VOLUME01', 'V5000_VOLUME02', 'APP_DATABASE', 'APP_LOGS', 'BACKUP_CATALOG', 'ERP_DATA01', 'ERP_DATA02', 'SQL_ARCHIVE', 'VMWARE_DATASTORE01', 'VMWARE_DATASTORE02', 'WEB_CONTENT', 'WIN_SYSTEM'];
const descriptions = {
  split: ['A / Najmenší zásah do existujúceho rozhrania', 'Bočné kroky, 40 px riadky a pomocný text priamo pri poli.'],
  workspace: ['B / Najviac miesta na prácu', 'Kroky hore, 36 px riadky a široká pracovná plocha. Odporúčaný variant pre väčší počet volumes.'],
  inspector: ['C / Upozornenia vedľa pracovnej plochy', 'Kontext a chyby v pravom paneli. Výška zoznamov sa pri upozorneniach nemení.'],
};
const $ = selector => document.querySelector(selector);
let selected = new Map();
let scenario = 2;

function updateStatus() {
  const missing = [...selected.values()].filter(name => !name.trim()).length;
  $('#mapping-status').textContent = `${selected.size - missing} / ${selected.size} auxiliary names entered`;
  $('#selected-count').textContent = selected.size;
  $('#next').disabled = scenario > 0 || missing > 0 || selected.size === 0;
  $('#continue-hint').textContent = scenario > 0 ? 'Resolve provider connection to continue' : missing ? `${missing} auxiliary names missing` : selected.size ? 'All checks passed' : 'Select at least one volume';
  $('.mapping-notice').hidden = scenario < 2 || missing === 0;
}

function renderAvailable() {
  const query = $('#search').value.toLowerCase();
  const matches = volumes.filter(name => name.toLowerCase().includes(query));
  $('#available-count').textContent = matches.length;
  $('#available-list').replaceChildren();
  matches.forEach(name => {
    const row = document.createElement('div');
    row.className = `available-row${selected.has(name) ? ' is-selected' : ''}`;
    row.draggable = !selected.has(name);
    const grip = document.createElement('span');
    grip.className = 'grip';
    grip.textContent = '⠿';
    grip.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'volume-name';
    label.textContent = name;
    label.title = name;
    const button = document.createElement('button');
    button.textContent = selected.has(name) ? '✓' : '+';
    button.disabled = selected.has(name);
    button.setAttribute('aria-label', `${selected.has(name) ? 'Selected' : 'Add'} ${name}`);
    button.onclick = () => addVolume(name, true);
    row.ondragstart = event => {
      event.dataTransfer.setData('text/plain', name);
      event.dataTransfer.effectAllowed = 'copy';
    };
    row.append(grip, label, button);
    $('#available-list').append(row);
  });
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No volumes match your search.';
    $('#available-list').append(empty);
  }
}

function renderSelected() {
  $('#selected-list').replaceChildren();
  selected.forEach((auxiliary, name) => {
    const row = document.createElement('div');
    row.className = 'selected-row';
    const label = document.createElement('span');
    label.className = 'volume-name';
    label.textContent = name;
    label.title = name;
    const input = document.createElement('input');
    input.value = auxiliary;
    input.placeholder = 'Required target name';
    input.required = true;
    input.setAttribute('aria-label', `Auxiliary name for ${name}`);
    input.setAttribute('aria-invalid', String(!auxiliary.trim()));
    input.setAttribute('aria-describedby', 'field-hint');
    input.oninput = () => {
      selected.set(name, input.value);
      input.setAttribute('aria-invalid', String(!input.value.trim()));
      updateStatus();
    };
    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${name}`);
    remove.onclick = () => {
      selected.delete(name);
      render();
      $('#dropzone').focus();
    };
    row.append(label, input, remove);
    $('#selected-list').append(row);
  });
}

function render() { renderAvailable(); renderSelected(); updateStatus(); }
function addVolume(name, focus = false) {
  if (!volumes.includes(name) || selected.has(name)) return;
  selected.set(name, '');
  render();
  if (focus) $('#selected-list').lastElementChild.querySelector('input').focus();
}
function setScenario(value) {
  scenario = Number(value);
  $('.provider-notice').hidden = scenario === 0;
  $('#field-hint').hidden = scenario < 2;
  updateStatus();
}
function reset() {
  selected = new Map(volumes.slice(0, 7).map((name, i) => [name, i > 1 ? `${name}_aux` : '']));
  $('#search').value = '';
  $('#scenario').value = '2';
  setScenario(2);
  render();
}
document.querySelectorAll('.variants button').forEach(button => {
  button.onclick = () => {
    const layout = button.dataset.layout;
    document.body.dataset.layout = layout;
    document.querySelectorAll('.variants button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('#design-title').textContent = descriptions[layout][0];
    $('#design-description').textContent = descriptions[layout][1];
    $('.provider-notice').open = layout === 'inspector';
  };
});
$('#search').oninput = renderAvailable;
$('#scenario').onchange = event => setScenario(event.target.value);
$('#clear').onclick = () => { selected.clear(); render(); };
$('#reset').onclick = reset;
$('#next').onclick = () => $('#complete').showModal();
$('#dropzone').ondragover = event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; $('#dropzone').classList.add('drag-over'); };
$('#dropzone').ondragleave = event => { if (!$('#dropzone').contains(event.relatedTarget)) $('#dropzone').classList.remove('drag-over'); };
$('#dropzone').ondrop = event => {
  event.preventDefault();
  $('#dropzone').classList.remove('drag-over');
  addVolume(event.dataTransfer.getData('text/plain'));
};
reset();
