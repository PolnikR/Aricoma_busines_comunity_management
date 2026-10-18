import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInContext } from 'node:vm';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('./overview-vivid.html', import.meta.url), 'utf8');
const fixture = readFileSync(new URL('./overview-vivid-data.js', import.meta.url), 'utf8');
const script = readFileSync(new URL('./overview-vivid.js', import.meta.url), 'utf8');
function load(hash = '', data = fixture) {
  const dom = new JSDOM(html, { url: `http://localhost/${hash}`, runScripts: 'outside-only' });
  runInContext(data, dom.getInternalVMContext());
  runInContext(script, dom.getInternalVMContext());
  return dom;
}
const panel = (doc, name) => doc.querySelector(`section[aria-label="${name}"]`);

test('Overall includes the requested domains and explicit demo provenance', () => {
  const dom = load();
  const doc = dom.window.document;
  for (const title of ['Infrastructure Overview', 'Operational Issues', 'Protection Overview', 'Recovery Overview', 'Recent Activity']) assert.ok(panel(doc, title));
  for (const vendor of ['VMware', 'IBM Power', 'IBM FlashSystem', 'Hitachi VSP']) assert.ok(panel(doc, 'Infrastructure Overview').textContent.includes(vendor));
  assert.match(doc.querySelector('.demo-notice').textContent, /All values are simulated/);
  assert.match(doc.querySelector('.kpis').textContent, /1,280/);
  assert.equal(doc.querySelectorAll('h1').length, 1);
  dom.window.close();
});

test('Storage vendor filters change all panels together and retain unknown vs zero', async () => {
  const dom = load('#storage');
  const doc = dom.window.document;
  for (const title of ['Snapshot Protection', 'Snapshot Distribution', 'Replication Status', 'Protection Policies', 'Storage Health', 'Technology Coverage']) assert.ok(panel(doc, title));
  assert.match(doc.querySelector('.kpis').textContent, /1,360/);
  assert.match(panel(doc, 'Snapshot Distribution').textContent, /Total unavailable/);
  doc.querySelector('[data-vendor="ibm"]').click();
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  assert.match(doc.querySelector('.kpis').textContent, /960/);
  assert.match(doc.querySelector('.kpis').textContent, /6,300/);
  assert.doesNotMatch(doc.querySelector('#dashboard').textContent, /Hitachi|Thin Image|ShadowImage|VSP-/);
  assert.equal(doc.querySelector('[data-vendor="ibm"]').getAttribute('aria-pressed'), 'true');
  assert.match(panel(doc, 'Protection Policies').textContent, /600/);
  doc.querySelector('[data-vendor="hitachi"]').click();
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  assert.match(doc.querySelector('.kpis').textContent, /400/);
  assert.match(doc.querySelector('.kpis').textContent, /—/);
  assert.doesNotMatch(doc.querySelector('#dashboard').textContent, /IBM|FlashCopy|FS-PRG/);
  assert.match(panel(doc, 'Snapshot Distribution').textContent, /0 failed/);
  assert.match(panel(doc, 'Snapshot Distribution').textContent, /Unavailable/);
  assert.match(panel(doc, 'Storage Health').textContent, /last known 09:00/);
  doc.querySelector('[data-vendor="all"]').click();
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  assert.match(doc.querySelector('.kpis').textContent, /1,360/);
  dom.window.close();
});

test('Recovery covers platform, environment, execution, policies and recent results', () => {
  const dom = load('#recovery');
  const doc = dom.window.document;
  for (const title of ['Recovery Groups', 'Recovery Applications', 'Recovery Execution', 'Recovery Performance', 'Recovery Policies', 'Recent Activity']) assert.ok(panel(doc, title));
  assert.match(panel(doc, 'Recovery Groups').textContent, /Hitachi VSP/);
  assert.match(panel(doc, 'Recovery Applications').textContent, /IBM Power/);
  assert.match(panel(doc, 'Recovery Applications').textContent, /Production/);
  assert.match(panel(doc, 'Recovery Execution').textContent, /90%/);
  assert.match(panel(doc, 'Recovery Performance').textContent, /12/);
  assert.doesNotMatch(panel(doc, 'Recent Activity').textContent, /Snapshot|Replication/);
  assert.equal(doc.querySelector('#vendor-filter').hidden, true);
  dom.window.close();
});

test('Direct links, invalid routes and view navigation stay consistent', async () => {
  const dom = load('#storage?vendor=hitachi');
  const doc = dom.window.document;
  assert.equal(doc.querySelector('[data-vendor="hitachi"]').getAttribute('aria-pressed'), 'true');
  assert.equal(doc.querySelector('[aria-current="page"]').dataset.view, 'storage');
  dom.window.location.hash = 'recovery';
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  assert.equal(doc.querySelector('h1').textContent, 'Recovery operations');
  assert.match(doc.querySelector('#announcement').textContent, /Recovery Operations loaded/);
  dom.window.location.hash = 'invalid';
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  assert.equal(doc.querySelector('h1').textContent, 'Platform overview');
  dom.window.close();
});

test('Incomplete sums cannot silently treat missing metrics as zero', () => {
  const dom = load();
  assert.equal(dom.window.eval('sum([{ n: 5 }, { n: null }], "n")'), null);
  assert.equal(dom.window.eval('sum([{ n: 5 }, { n: 0 }], "n")'), 5);
  assert.equal(dom.window.eval('number(null)'), '—');
  assert.equal(dom.window.eval('number(0)'), '0');
  dom.window.close();
});

test('Both vendors use the same shape and inventory buckets reconcile', () => {
  const dom = load();
  const records = JSON.parse(dom.window.eval('JSON.stringify(dashboardData.systems)'));
  for (const row of records) {
    assert.deepEqual(Object.keys(row).sort(), Object.keys(records[0]).sort());
    assert.equal(row.snapshotCurrent + row.snapshotStale + row.snapshotNone, row.volumes);
  }
  dom.window.close();
});

test('Light mode is the default and the theme toggle preserves the selected view and filter', async () => {
  const dom = load('#storage?vendor=hitachi');
  const doc = dom.window.document;
  const button = doc.getElementById('theme-toggle');
  assert.equal(doc.documentElement.dataset.theme, 'light');
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  button.click();
  assert.equal(doc.documentElement.dataset.theme, 'dark');
  assert.equal(doc.querySelector('meta[name="color-scheme"]').content, 'dark');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(dom.window.location.hash, '#storage?vendor=hitachi');
  assert.equal(dom.window.location.search, '?theme=dark');
  const reloaded = load(dom.window.location.search + dom.window.location.hash);
  assert.equal(reloaded.window.document.documentElement.dataset.theme, 'dark');
  reloaded.window.close();
  dom.window.location.hash = 'recovery';
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  assert.equal(doc.documentElement.dataset.theme, 'dark');
  button.click();
  assert.equal(doc.documentElement.dataset.theme, 'light');
  assert.equal(doc.querySelector('meta[name="color-scheme"]').content, 'light');
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(dom.window.location.hash, '#recovery');
  dom.window.close();
});
