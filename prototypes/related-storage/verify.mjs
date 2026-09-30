import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => errors.push(error.message));
const dom = new JSDOM(readFileSync(new URL('./index.html', import.meta.url), 'utf8'), {
  runScripts: 'outside-only', virtualConsole,
});
const { window } = dom;
const document = window.document;
const q = selector => document.querySelector(selector);
const count = () => document.querySelectorAll('.selected-row').length;
const input = (selector, value, event = 'input') => {
  q(selector).value = value;
  q(selector).dispatchEvent(new window.Event(event));
};
window.eval(readFileSync(new URL('./preview.js', import.meta.url), 'utf8'));
assert.equal(count(), 7);
assert.equal(q('#next').disabled, true);
for (const layout of ['workspace', 'inspector', 'split']) {
  q(`button[data-layout="${layout}"]`).click();
  assert.equal(document.body.dataset.layout, layout);
  assert.equal(document.querySelectorAll('[aria-pressed="true"]').length, 1);
  assert.equal(count(), 7);
}
input('#search', 'APP_');
assert.equal(document.querySelectorAll('.available-row').length, 2);
q('[aria-label="Add APP_LOGS"]').click();
assert.equal(count(), 8);
assert.equal(document.activeElement.getAttribute('aria-label'), 'Auxiliary name for APP_LOGS');
q('[aria-label="Remove APP_LOGS"]').click();
assert.equal(count(), 7);
for (const name of ['APP_LOGS', 'APP_LOGS', '<script>bad</script>']) {
  q('#dropzone').ondrop({ preventDefault() {}, dataTransfer: { getData: () => name } });
  assert.equal(count(), 8);
}
input('#scenario', '0', 'change');
assert.equal(q('.provider-notice').hidden, true);
assert.equal(q('#next').disabled, true);
document.querySelectorAll('.selected-row input').forEach(field => {
  field.value = 'valid_aux';
  field.dispatchEvent(new window.Event('input'));
});
assert.equal(q('#next').disabled, false);
input('#scenario', '1', 'change');
assert.equal(q('#next').disabled, true);
assert.equal(q('#field-hint').hidden, true);
q('#clear').click();
assert.equal(count(), 0);
assert.equal(q('#next').disabled, true);
input('#search', 'no-match');
assert.match(q('#available-list').textContent, /No volumes/);
q('#reset').click();
assert.equal(count(), 7);
assert.equal(q('#scenario').value, '2');
assert.deepEqual(errors, []);
console.log('PASS: variants, search, add/remove, focus, drop handler, duplicate/unknown drops, validation, scenarios, empty state, reset. No DOM runtime errors.');
