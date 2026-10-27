// Focused interaction and layout checks in an isolated, headless Chrome profile.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const directory = fileURLToPath(new URL('.', import.meta.url));
const profile = await mkdtemp(join(tmpdir(), 'abco-technical-pages-'));
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let diagnostics = '';
chrome.stderr.on('data', chunk => { diagnostics += chunk.toString(); });
chrome.on('error', error => { diagnostics += error.message; });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { await pause(100); }
  }
  assert.ok(port, `Chrome must start: ${diagnostics}`);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id); pending.delete(message.id);
      if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params.entry.level)) errors.push(message.params.entry.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => reject(new Error(`DevTools timed out: ${method}`)), 10000);
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const click = async selector => {
    const box = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 });
  };
  const key = async (key, code = key) => {
    const windowsVirtualKeyCode = { Enter: 13, Escape: 27, Tab: 9, Home: 36, ArrowDown: 40 }[key] ?? 0;
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, ...(key === 'Enter' ? { text: '\r' } : {}) });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
  };
  const resize = width => send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  const navigate = async () => {
    await send('Page.navigate', { url: pathToFileURL(join(directory, 'index.html')).href });
    for (let i = 0; i < 100; i++) {
      if (await evaluate('document.readyState === "complete" && document.querySelectorAll("[data-record]").length === 24')) return;
      await pause(50);
    }
    throw new Error('Preview did not initialize');
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Accessibility.enable');
  await resize(1440); await navigate();
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.className'), 'skip', 'Skip link is first keyboard target');
  await key('Enter');
  assert.equal(await evaluate('document.activeElement.id'), 'main');
  await key('/', 'Slash');
  assert.equal(await evaluate('document.activeElement.id'), 'search');

  for (const page of ['resources', 'runs']) {
    await click(`[data-page="${page}"]`);
    const total = page === 'resources' ? 24 : 18;
    assert.equal(await evaluate('document.querySelectorAll("[data-record]").length'), total);
    await click('[data-platform="IBM Power"]');
    assert.equal(await evaluate('document.querySelectorAll("[data-record]").length'), 6);
    await click('#search'); await send('Input.insertText', { text: 'no-such-record' });
    assert.equal(await evaluate('document.querySelector("#empty").hidden'), false);
    assert.equal(await evaluate('document.querySelectorAll("[data-record]").length'), 0);
    assert.equal(await evaluate('document.querySelector("#detail-dialog").open'), false);
    await click('#reset');
    assert.equal(await evaluate('document.querySelectorAll("[data-record]").length'), total);
    await click('#status'); await key('Home'); await key('ArrowDown'); await key('Enter');
    assert.ok(await evaluate('document.querySelectorAll("[data-record]").length') < total, 'Status filter limits results');
    await click('#reset');
    const numeric = page === 'resources' ? 'capacity' : 'duration';
    await click(`[data-sort="${numeric}"]`);
    const values = await evaluate('[...document.querySelectorAll("#rows tr")].map(row => row.children[4].textContent).filter(value => value !== "—").map(value => Number(value.replaceAll(",", "")))');
    assert.deepEqual(values, [...values].sort((a, b) => a - b));
    assert.equal(await evaluate(`document.querySelector('[data-sort="${numeric}"]').parentElement.getAttribute('aria-sort')`), 'ascending');
    await click('[data-record]');
    const selectedName = await evaluate('document.querySelector("#detail-title").textContent');
    assert.equal(await evaluate('document.activeElement.id'), 'close-detail');
    assert.equal(await evaluate('document.querySelector("#detail-dialog").matches(":modal")'), true);
    await key('Tab'); await key('Tab');
    assert.equal(await evaluate('document.activeElement.id'), 'close-detail', 'Focus stays inside the modal');
    await key('Escape');
    assert.equal(await evaluate('document.querySelector("#detail-dialog").open'), false);
    assert.equal(await evaluate('document.activeElement.textContent'), selectedName, 'Escape restores record focus');
    assert.equal(await evaluate('document.activeElement.matches("[data-record]")'), true);
    await key('Enter');
    assert.equal(await evaluate('document.querySelector("#detail-dialog").open'), true, 'Keyboard reopens selected record');
    await click('#close-detail');
    assert.equal(await evaluate('document.querySelector("#detail-dialog").open'), false);
    assert.equal(await evaluate('document.activeElement.matches("[data-record]")'), true);
    await key('Enter');
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 4, y: 4, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 4, y: 4, button: 'left', clickCount: 1 });
    assert.equal(await evaluate('document.querySelector("#detail-dialog").open'), false, 'Backdrop closes the dialog');
    await click('#density');
    assert.equal(await evaluate('document.querySelector("#rows td").getBoundingClientRect().height'), 44);
    await click('#density');
    assert.equal(await evaluate('document.querySelector("#rows td").getBoundingClientRect().height'), 32);
    console.log(`PASS ${page}: platform, search, empty, reset, status, numeric sort, details, Escape, keyboard, density`);
  }

  for (const page of ['resources', 'runs']) for (const theme of ['light', 'dark']) {
    await resize(1440); await navigate(); await click(`[data-page="${page}"]`);
    if (theme === 'dark') await click('#theme');
    for (const width of [320, 768, 1024, 1440]) {
      await resize(width);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `${page}/${theme}: page overflow at ${width}`);
      assert.ok(await evaluate('Math.abs(document.querySelector(".table-area").getBoundingClientRect().width - document.querySelector(".data-workspace").getBoundingClientRect().width) < 1'), 'Table always occupies the full workspace width');
      assert.equal(await evaluate('document.querySelectorAll(".inspector, #detail-toggle").length'), 0);
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(join(profile, `${page}-${theme}-${width}.png`), Buffer.from(shot.data, 'base64'));
      await click('[data-record]');
      assert.ok(await evaluate('(() => { const box = document.querySelector("#detail-dialog").getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; })()'), `Dialog fits at ${width}`);
      const modalTree = await send('Accessibility.getFullAXTree');
      assert.ok(modalTree.nodes.some(node => !node.ignored && node.role?.value === 'dialog' && node.name?.value), 'Dialog has an accessible name');
      const modalShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(join(profile, `${page}-${theme}-${width}-dialog.png`), Buffer.from(modalShot.data, 'base64'));
      await key('Escape');
    }
    // Contrast checks for foreground/background token pairs actually used by this template.
    const ratios = await evaluate(`(() => {
      const s = getComputedStyle(document.documentElement);
      const luminance = token => { const hex = s.getPropertyValue(token).trim().slice(1); const full = hex.length === 3 ? [...hex].map(c => c+c).join('') : hex; const rgb = [0,2,4].map(i => parseInt(full.slice(i,i+2),16)/255).map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4); return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722; };
      return [['--text','--surface'],['--muted','--surface'],['--muted','--subtle'],['--accent','--accent-soft'],['--success','--success-bg'],['--warning','--warning-bg'],['--danger','--danger-bg']].map(([a,b]) => { const x=luminance(a), y=luminance(b); return { pair:a+'/'+b, ratio:(Math.max(x,y)+.05)/(Math.min(x,y)+.05) }; });
    })()`);
    ratios.forEach(({ pair, ratio }) => assert.ok(ratio >= 4.5, `${theme} ${pair}: ${ratio}`));
    const tree = await send('Accessibility.getFullAXTree');
    assert.equal(tree.nodes.filter(node => !node.ignored && node.role?.value === 'heading' && node.properties?.some(p => p.name === 'level' && p.value.value === 1)).length, 1);
    assert.ok(tree.nodes.filter(node => !node.ignored && ['button', 'textbox', 'searchbox', 'combobox'].includes(node.role?.value)).every(node => node.name?.value), 'Controls have accessible names');
    console.log(`PASS ${page}/${theme}: 320/768/1024/1440 px, contrast tokens, accessibility tree`);
  }
  assert.deepEqual(errors, [], 'No browser errors or warnings');
  console.log(`PASS zero browser errors. Screenshots: ${profile}`);
} finally {
  socket?.close(); chrome.kill();
}
