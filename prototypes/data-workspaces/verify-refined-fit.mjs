import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const run=promisify(execFile),dir=await mkdtemp(join(tmpdir(),'recovery-fit-'));
const source=await readFile('prototypes/data-workspaces/recovery-runs-refined.html','utf8');
const probe=`<script>if(location.hash==='#many')dataset(true);setTimeout(()=>{fitRows();const v=document.querySelector('.viewport'),f=document.querySelector('.pagination').getBoundingClientRect();const result={width:innerWidth,height:innerHeight,rows:pageSize,pageScrollX:document.documentElement.scrollWidth>innerWidth,pageScrollY:document.documentElement.scrollHeight>innerHeight,tableScrollX:v.scrollWidth>v.clientWidth,tableScrollY:v.scrollHeight>v.clientHeight,footerVisible:f.bottom<=innerHeight,summary:document.getElementById('summary').textContent};if(location.hash==='#many'){document.getElementById('next').click();result.nextPage=page;document.getElementById('prev').click();}const p=document.createElement('script');p.type='application/json';p.id='qa';p.textContent=JSON.stringify(result);document.body.append(p)},150)</script>`;
const file=join(dir,'preview.html');await writeFile(file,source.replace('</body>',probe+'</body>'));
for(const [width,height] of [[1366,768],[1280,720],[1093,614],[1024,576]])for(const many of [false,true]){
 const {stdout}=await run('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run',`--user-data-dir=${join(dir,`profile-${width}-${many}`)}`,`--window-size=${width},${height}`,'--virtual-time-budget=1200','--dump-dom',`--screenshot=${join(dir,`${width}-${many}.png`)}`,pathToFileURL(file).href+(many?'#many':'')],{windowsHide:true,maxBuffer:2e6,timeout:30000});
 const match=stdout.match(/<script type="application\/json" id="qa">(.*?)<\/script>/);assert.ok(match,'metrics');const result=JSON.parse(match[1]);console.log(JSON.stringify({window:`${width}x${height}`,many,...result}));assert.equal(result.pageScrollX,false);assert.equal(result.pageScrollY,false);assert.equal(result.tableScrollX,false);assert.equal(result.tableScrollY,false);assert.equal(result.footerVisible,true);if(many)assert.equal(result.nextPage,2);
}
console.log('PASS 8 scenarios; screenshots '+dir);
