import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';

const script = readFileSync(new URL('./builder.js', import.meta.url), 'utf8');
let scenarios = 0;
for (const page of ['groups', 'apps']) {
  for (const mode of ['create', 'edit', 'locked']) {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error.message));
    const html = readFileSync(new URL(`./${page}.html`, import.meta.url), 'utf8');
    const dom = new JSDOM(html, {
      url: `http://localhost/${page}.html?mode=${mode}`, runScripts: 'outside-only', virtualConsole,
    });
    const { window } = dom;
    window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    window.eval(script);
    const q = selector => window.document.querySelector(selector);
    const all = selector => [...window.document.querySelectorAll(selector)];
    const change = (selector, value, type = 'input') => {
      q(selector).value = value;
      q(selector).dispatchEvent(new window.Event(type, { bubbles: true }));
    };
    const group = page === 'groups';
    assert.equal(all('[data-step]').length, group ? 8 : 4);
    assert.equal(all('[data-panel]:not([hidden])').length, 1);
    assert.equal(q('#identity').readOnly, mode !== 'create');
    if (!group && mode !== 'create') assert.equal(q('#source').disabled, true);
    for (const button of all('[data-step]')) {
      button.click();
      assert.equal(button.getAttribute('aria-current'), 'step');
      assert.equal(all('[data-panel]:not([hidden])').length, 1);
      assert.equal(window.document.activeElement.tagName, 'H2');
    }
    if (mode === 'locked' && group) {
      assert.equal(q('#next').disabled, true);
      assert.ok(all('.editor input, .editor select, .editor textarea').every(input => input.matches(':disabled')));
      q('#add-volumes').click();
      assert.equal(q('#volume-picker').open, false);
    } else {
      q('[data-step="0"]').click();
      change('#name', '');
      q('#next').click();
      assert.equal(q('#validation').hidden, false);
      change('#name', '<technical-name>');
      assert.equal(q('#summary-name').textContent, '<technical-name>');
      assert.equal(q('#summary-name').children.length, 0);
      q('#next').click();
      assert.equal(q('[data-step="1"]').getAttribute('aria-current'), 'step');
    }
    if (group && mode !== 'locked') {
      q('[data-step="5"]').click();
      assert.equal(all('#storage-rows tr').length, 3, 'VM discovery includes shared volumes only once');
      q('#add-volumes').click();
      assert.equal(q('#volume-picker').open, true);
      assert.equal(q('[data-add-volume="db_data_01"]').disabled, true);
      change('#volume-search', 'archive');
      q('[data-add-volume="shared_archive_01"]').click();
      change('#volume-search', 'audit');
      q('[data-add-volume="audit_logs_01"]').click();
      assert.match(q('#pending-count').textContent, /^2 /);
      q('#cancel-volumes').click();
      assert.equal(all('#storage-rows tr').length, 3, 'Cancel leaves selection unchanged');
      q('#add-volumes').click();
      assert.equal(q('#confirm-volumes').disabled, true, 'Cancelled choices are discarded');
      q('[data-add-volume="shared_archive_01"]').click();
      q('#confirm-volumes').click();
      assert.equal(q('#volume-picker').open, false);
      assert.equal(all('#storage-rows tr').length, 4);
      assert.match(q('#storage-count').textContent, /1 added manually/);
      q('#add-volumes').click();
      assert.equal(q('[data-add-volume="shared_archive_01"]').disabled, true);
      change('#volume-search', 'not-found');
      assert.equal(q('#picker-empty').hidden, false);
      q('#cancel-volumes').click();
      q('[data-remove-volume="db_data_01"]').click();
      change('#name', 'Unrelated metadata edit');
      assert.equal(q('[data-remove-volume="db_data_01"]'), null, 'Excluded discovery does not immediately reappear');
      q('#add-volumes').click();
      q('[data-add-volume="db_data_01"]').click();
      q('#confirm-volumes').click();
      assert.ok(q('[data-remove-volume="db_data_01"]'), 'Excluded volume can be manually restored');
      q('[data-step="4"]').click();
      change('#search', 'not-found');
      assert.equal(q('#no-results').hidden, false);
      change('#search', 'primary');
      assert.equal(all('[data-vm]:not([hidden])').length, 1);
      for (const input of all('[name="resource"]:checked')) input.click();
      q('#next').click();
      assert.equal(q('#validation').hidden, false);
      q('[name="resource"]').click();
      assert.match(q('#summary-count').textContent, /^1 /);
      change('#topology', 'Metro Mirror', 'change');
      assert.equal(q('#mirror').hidden, false);
      assert.ok(q('[data-remove-volume="shared_archive_01"]'), 'Manual additions survive VM selection changes');
    }
    if (!group) {
      q('[data-step="1"]').click();
      q('[data-tier="database"] [data-move="1"]').click();
      assert.equal(q('[data-tier]').dataset.tier, 'services');
      assert.equal(q('[data-tier="database"] .ordinal').textContent, '2');
      assert.match(q('.rail .flow').textContent, /services → database → web/);
      change('#tier-0', 'rg_web_prod', 'change');
      q('#add-tier').click();
      assert.equal(all('[data-tier]').length, 4);
      assert.equal(window.document.activeElement, q('#tier-3'));
      assert.match(q('#summary-count').textContent, /^4 /);
      q('#next').click();
      assert.equal(q('#validation').hidden, false, 'New tier requires a group');
      change('#tier-3', 'rg_services_prod', 'change');
      q('[data-tier="tier_4"] [data-move="-1"]').click();
      assert.equal(q('[data-tier="tier_4"] .ordinal').textContent, '3');
      q('[data-tier="tier_4"] [data-remove-tier]').click();
      assert.equal(all('[data-tier]').length, 3);
      assert.equal(q('#tier-0').value, 'rg_web_prod', 'Other assignments survive removal');
      if (mode === 'locked') {
        assert.equal(q('#push').disabled, true);
        assert.equal(q('#push').checked, true);
      }
    }
    q('#review').click();
    assert.equal(q('dialog').open, true);
    const preview = JSON.parse(q('#review-data').textContent);
    assert.equal(preview.previewOnly, true);
    if (group && mode !== 'locked') assert.ok(preview.relatedVolumes.includes('shared_archive_01'));
    if (!group) {
      assert.equal(preview.tiers[1].tier, 'database');
      assert.equal(preview.tiers[1].group, 'rg_web_prod');
      q('dialog').close();
      const edited = q('[data-tier="services"]');
      edited.querySelector('[data-edit-tier]').click();
      change('#tier-id-1', 'cancelled_id');
      edited.querySelector('[data-cancel-tier]').click();
      assert.equal(edited.dataset.tier, 'services', 'Cancel preserves committed tier metadata');
      edited.querySelector('[data-edit-tier]').click();
      change('#tier-id-1', 'database');
      edited.querySelector('[data-confirm-tier]').click();
      assert.match(edited.querySelector('[data-edit-error]').textContent, /unique/);
      change('#tier-id-1', 'core_services');
      change('#tier-description-1', ' ');
      edited.querySelector('[data-confirm-tier]').click();
      assert.equal(edited.querySelector('[data-edit-error]').hidden, false);
      change('#tier-description-1', 'Recover <services> after database.');
      q('#next').click();
      assert.match(q('#validation').textContent, /Confirm or cancel/);
      edited.querySelector('[data-confirm-tier]').click();
      assert.equal(edited.dataset.tier, 'core_services');
      assert.equal(edited.querySelector('.tier-description').textContent, 'Recover <services> after database.');
      assert.equal(edited.querySelector('.tier-description').children.length, 0);
      const drag = (source, target, after) => {
        const dataTransfer = { setData() {}, effectAllowed: '', dropEffect: '' };
        target.getBoundingClientRect = () => ({ top: 0, height: 100 });
        q('#tiers').ondragstart({ target: source.querySelector('[data-drag-tier]'), dataTransfer });
        q('#tiers').ondragover({ target, clientY: after ? 80 : 20, dataTransfer, preventDefault() {} });
        assert.ok(target.classList.contains(after ? 'drop-after' : 'drop-before'));
        q('#tiers').ondrop({ target, clientY: after ? 80 : 20, preventDefault() {} });
        assert.equal(all('.drop-before, .drop-after').length, 0);
      };
      drag(edited, q('[data-tier="web"]'), true);
      assert.equal(all('[data-tier]').at(-1), edited, 'Drop below places tier after target');
      assert.equal(edited.querySelector('select').value, 'rg_services_prod');
      drag(edited, q('[data-tier="database"]'), false);
      assert.equal(q('[data-tier]'), edited, 'Drop above places tier before target');
      assert.deepEqual(all('.ordinal').map(node => node.textContent), ['1', '2', '3']);
      q('#review').click();
      const editedPreview = JSON.parse(q('#review-data').textContent);
      assert.equal(editedPreview.tiers[0].tier, 'core_services');
      assert.equal(editedPreview.tiers[0].description, 'Recover <services> after database.');
      q('dialog').close();
      for (const button of all('[data-remove-tier]')) button.click();
      assert.equal(q('#tiers-empty').hidden, false);
      assert.equal(window.document.activeElement, q('#add-tier'));
      q('#next').click();
      assert.match(q('#validation').textContent, /at least one recovery tier/);
      q('#add-tier').click();
      assert.ok(q('#tier-4'), 'New controls keep unique IDs after deletion');
      assert.equal(q('[data-tier] .ordinal').textContent, '1', 'Order is contiguous after deletion');
      change('#tier-4', 'rg_database_prod', 'change');
      q('#review').click();
      const addedPreview = JSON.parse(q('#review-data').textContent);
      assert.equal(addedPreview.tiers.length, 1);
      assert.equal(addedPreview.tiers[0].group, 'rg_database_prod');
      assert.equal(addedPreview.tiers[0].order, 1);
    }
    const ids = all('[id]').map(element => element.id);
    assert.equal(ids.length, new Set(ids).size, 'IDs must be unique');
    for (const label of all('label[for]')) assert.ok(window.document.getElementById(label.htmlFor));
    assert.deepEqual(errors, []);
    window.close();
    scenarios++;
  }
}
console.log(`PASS: ${scenarios} scenarios; navigation, locks, validation, storage selection, tier add/remove/edit/cancel/unique IDs, simulated drag/drop above/below, empty state and review. Browser layout and native drag/drop not tested.`);
