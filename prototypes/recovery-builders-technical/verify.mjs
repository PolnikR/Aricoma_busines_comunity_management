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
    }
    if (!group) {
      q('[data-step="1"]').click();
      q('[data-tier="database"] [data-move="1"]').click();
      assert.equal(q('[data-tier]').dataset.tier, 'services');
      assert.equal(q('[data-tier="database"] .ordinal').textContent, '2');
      assert.match(q('.rail .flow').textContent, /services → database → web/);
      change('#tier-0', 'rg_web_prod', 'change');
      if (mode === 'locked') {
        assert.equal(q('#push').disabled, true);
        assert.equal(q('#push').checked, true);
      }
    }
    q('#review').click();
    assert.equal(q('dialog').open, true);
    const preview = JSON.parse(q('#review-data').textContent);
    assert.equal(preview.previewOnly, true);
    if (!group) {
      assert.equal(preview.tiers[1].tier, 'database');
      assert.equal(preview.tiers[1].group, 'rg_web_prod');
    }
    const ids = all('[id]').map(element => element.id);
    assert.equal(ids.length, new Set(ids).size, 'IDs must be unique');
    for (const label of all('label[for]')) assert.ok(window.document.getElementById(label.htmlFor));
    assert.deepEqual(errors, []);
    window.close();
    scenarios++;
  }
}
console.log(`PASS: ${scenarios} scenarios; navigation, locks, validation, filtering, selection, tier ordering, summary and review. Browser layout not tested.`);
