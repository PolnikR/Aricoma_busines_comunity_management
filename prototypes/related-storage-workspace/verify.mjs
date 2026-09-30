import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => errors.push(error.message));
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously', virtualConsole,
  beforeParse(window) {
    // jsdom has no native modal/top-layer behavior; test handlers, not browser layout.
    window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  },
});
const { document, Event } = dom.window;
const q = selector => document.querySelector(selector);
const change = (selector, value, event = 'input') => {
  q(selector).value = value;
  q(selector).dispatchEvent(new Event(event));
};
assert.equal(document.querySelectorAll('.volume-row').length, 1);
assert.equal(q('#issues').textContent, 'ⓘ 2 items to review');
assert.equal(q('#next').disabled, true);
assert.equal(q('#review').parentElement, document.body);
q('#issues').click();
assert.equal(q('#review').open, true);
q('#fix-group').click();
assert.equal(q('#review').open, false);
assert.equal(document.activeElement, q('#group-id'));
change('#group-id', '12');
change('#rows input', 'target_01');
assert.equal(q('#next').disabled, false);
q('#clear').click();
assert.equal(q('#next').disabled, true);
q('#drop').ondrop({ preventDefault() {}, dataTransfer: { getData: () => 'RDM_DISK01' } });
q('#drop').ondrop({ preventDefault() {}, dataTransfer: { getData: () => 'RDM_DISK01' } });
assert.equal(document.querySelectorAll('.volume-row').length, 1);
change('#search', 'IBU_source');
assert.equal(document.querySelectorAll('.available-row').length, 1);
q('[aria-label="Add IBU_source"]').click();
assert.equal(document.querySelectorAll('.volume-row').length, 2);
q('[aria-label="Remove IBU_source"]').click();
assert.equal(document.querySelectorAll('.volume-row').length, 1);
for (const count of [20, 100]) {
  change('#scenario', String(count), 'change');
  assert.equal(document.querySelectorAll('.volume-row').length, count);
}
change('#scenario', 'ready', 'change');
assert.equal(q('#next').disabled, false);
change('#search', 'no-match');
assert.match(q('#available-list').textContent, /No matching volumes/);
assert.deepEqual(errors, []);
console.log('PASS: scenarios, dialog/focus, validation, search, add/remove, clear and duplicate drops; no DOM errors. Browser layout not tested.');
