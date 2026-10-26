// Focused browser checks using Chrome's local DevTools protocol; no dependencies.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const directory = fileURLToPath(new URL('.', import.meta.url));
const profile = await mkdtemp(join(tmpdir(), 'abco-workspace-browser-'));
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: ['ignore','ignore','pipe'] });
let chromeDiagnostics='';
chrome.stderr.on('data',chunk=>{chromeDiagnostics+=chunk.toString();});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let i=0;i<100;i++) {
    try { port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]); break; }
    catch { await pause(100); }
  }
  assert.ok(port, 'Chrome must start with an isolated profile');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0;
  const pending=new Map();
  const errors=[];
  socket.onclose=event=>{if(pending.size)console.error('DevTools closed',event.code,event.reason,chromeDiagnostics);};
  socket.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id){const p=pending.get(message.id);pending.delete(message.id);if(message.error)p.reject(new Error(JSON.stringify(message.error)));else p.resolve(message.result);}
    if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if(message.method==='Log.entryAdded'&&['error','warning'].includes(message.params.entry.level)) errors.push(message.params.entry.text);
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++sequence;
    const timeout=setTimeout(()=>reject(new Error(`DevTools timed out: ${method}; socket state ${socket.readyState}`)),10000);
    pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});
    socket.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const result=await send('Runtime.evaluate',{expression,returnByValue:true});
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const click=async selector=>{
    const box=await evaluate(`(()=>{const target=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getBoundingClientRect().width>0);const r=target.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...box,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...box,button:'left',clickCount:1});
  };
  const key=async (key,code=key)=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key,code});
  };
  const navigate=async file=>{
    await send('Page.navigate',{url:pathToFileURL(join(directory,file)).href});
    for(let i=0;i<100;i++){
      if(await evaluate('document.readyState === "complete" && !!document.querySelector("h1")'))return;
      await pause(50);
    }
    throw new Error(`Page failed to load: ${file}`);
  };
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  for(const page of ['resources','recovery-runs'])for(const layout of ['flat','explorer','console']){
    const file=`${page}-${layout}.html`;
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});
    await navigate(file);
    assert.equal(await evaluate('document.querySelectorAll("[data-row]").length'),24,file);
    await click('[data-row]');
    assert.equal(await evaluate('document.querySelector("#detail").hidden'),false);
    await key('Escape');
    assert.equal(await evaluate('document.querySelector("#detail").hidden'),true);
    assert.equal(await evaluate('document.activeElement.matches("[data-row]")'),true);
    await click('#search');await send('Input.insertText',{text:'no-such-record'});
    assert.equal(await evaluate('document.querySelectorAll("[data-row]").length'),0);
    assert.match(await evaluate('document.querySelector("#rows").textContent'),/No matching/);
    await click('#reset');assert.equal(await evaluate('document.querySelectorAll("[data-row]").length'),24);
    await click('#density');assert.equal(await evaluate('document.querySelector("table").classList.contains("comfortable")'),true);
    await click('#density');
    await click(layout==='explorer'?'[data-status="'+(page==='resources'?'Disconnected':'Failed')+'"]':'#status');
    if(layout!=='explorer'){await key('End');await key('Enter');}
    assert.ok(await evaluate('document.querySelectorAll("[data-row]").length < 24'));
    await click('#reset');
    await click(`[data-scope="${page==='resources'?'fs-01':'Application'}"]`);
    assert.ok(await evaluate(page==='resources'?'[...document.querySelectorAll("[data-row]")].every(b=>b.textContent.startsWith("vol-"))':'document.querySelectorAll("[data-row]").length===16'));
    await click('[data-row]');
    for(const width of [320,768,1024,1440]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),`${file}: no page overflow at ${width}`);
      assert.ok(await evaluate('[...document.querySelectorAll("button,input,select")].filter(e=>e.getBoundingClientRect().width>0).every(e=>e.getAttribute("aria-label")||e.textContent.trim()||e.closest("label"))'),`${file}: named controls`);
    }
    const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(join(profile,`${page}-${layout}.png`),Buffer.from(image.data,'base64'));
    console.log(`PASS ${file}: search, empty state, reset, scope, status, density, selection, Escape, 4 widths`);
  }
  await navigate('index.html');
  assert.equal(await evaluate('document.querySelectorAll(".description a").length'),6);
  for(const width of [320,768,1024,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),`gallery overflow at ${width}`);
  }
  assert.deepEqual(errors,[],'No browser exceptions or warnings');
  const gallery=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(join(profile,'gallery.png'),Buffer.from(gallery.data,'base64'));
  console.log(`PASS gallery; zero browser errors. Screenshots: ${profile}`);
} finally {
  socket?.close();
  chrome.kill();
}
