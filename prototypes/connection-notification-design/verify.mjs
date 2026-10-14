import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => errors.push(error.message));
const dom = new JSDOM(readFileSync(new URL('./index.html', import.meta.url), 'utf8'), {
  runScripts: 'outside-only', virtualConsole,
});
const { window } = dom;
const q = selector => window.document.querySelector(selector);
const cards = () => window.document.querySelectorAll('.notification');
window.eval(readFileSync(new URL('./preview.js', import.meta.url), 'utf8'));
assert.equal(cards().length, 1);
assert.equal(q('.notification-title').textContent, 'Connection test failed');
for (const variant of ['card', 'tinted', 'compact']) {
  q(`button[data-variant="${variant}"]`).click();
  assert.equal(window.document.body.dataset.variant, variant);
  assert.equal(window.document.querySelectorAll('[aria-pressed="true"]').length, 1);
}
function change(selector, value) {
  const control = q(selector);
  if (control.type === 'checkbox') control.checked = value;
  else control.value = value;
  control.dispatchEvent(new window.Event('change'));
}
change('#outcome', 'success');
assert.equal(q('.notification-title').textContent, 'Connection successful');
assert.equal(q('.status-icon').textContent, '✓');
change('#dark', true);
assert.ok(window.document.body.classList.contains('dark'));
change('#long', true);
assert.match(q('.provider').textContent, /Primary datacenter/);
change('#stack', true);
assert.equal(cards().length, 3);
q('#result').showModal = function () { this.setAttribute('open', ''); };
q('#result').close = function () { this.removeAttribute('open'); };
q('.view-result').click();
assert.ok(q('#result').hasAttribute('open'));
assert.match(q('#result-provider').textContent, /Primary datacenter/);
assert.match(q('#result-summary').textContent, /passed/);
q('#close-result').click();
assert.ok(!q('#result').hasAttribute('open'));
q('.dismiss').click();
assert.equal(cards().length, 2);
assert.equal(window.document.activeElement, q('#restore'));
q('#restore').click();
assert.equal(cards().length, 3);
change('#outcome', 'error');
q('.view-result').click();
assert.match(q('#result-summary').textContent, /failed/);
assert.equal(q('.notification').getAttribute('role'), 'status');
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
assert.match(css, /\.notification-stack\{position:fixed;right:/);
assert.match(css, /bottom:max\(24px,env\(safe-area-inset-bottom\)\)/);
assert.match(css, /@media\(max-width:767px\)/);
assert.deepEqual(errors, []);
console.log('PASS: three designs, success/error, dark mode, long names, stacking, dismissal and focus, restore, simulated result actions, bottom-right CSS and mobile rules. Native dialog and visual layout require browser verification.');
