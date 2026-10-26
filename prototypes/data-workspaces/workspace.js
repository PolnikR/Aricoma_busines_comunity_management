// Local design study. All records are synthetic; no API calls or persistence.
const resource = document.body.dataset.page === 'resources';
const layout = document.body.dataset.layout;
const title = resource ? 'Resources' : 'Recovery runs';
const layoutNames = { flat: '01 / Flat workspace', explorer: '02 / Explorer + inspector', console: '03 / Operations console' };
const names = ['prd-sql-01','prd-sql-02','prd-api-01','prd-api-02','prd-web-01','prd-web-02','prd-ad-01','prd-ad-02','prd-sap-01','prd-sap-02','prd-mon-01','prd-backup-01','dev-api-01','dev-sql-01','tst-web-01','tst-api-01','prd-dns-01','prd-proxy-01','prd-files-01','dev-build-01','prd-mail-01','tst-sql-01','prd-log-01','dev-runner-01'];
const appNames = ['SAP Production','Customer portal','Core databases','Identity services','Payment gateway','ERP recovery','Reporting services','Mail services','Analytics platform','Document management','Monitoring stack','E-commerce','HR applications','Integration services','Dev environment','Backup services','DNS services','File services','CRM Production','Network services','Data warehouse','Test environment','API services','Build infrastructure'];
const providers = [
  { id:'vm-01',label:'VMware',scope:'Prague · vCenter 01',kind:'Virtual machines',cluster:'PRG-PROD-01' },
  { id:'vm-02',label:'VMware',scope:'Brno · vCenter 02',kind:'Virtual machines',cluster:'BRN-PROD-01' },
  { id:'fs-01',label:'FlashSystem',scope:'Prague · FS7300',kind:'Volumes',cluster:'FS7300-PRG' },
  { id:'pwr-01',label:'IBM Power',scope:'Brno · Power10',kind:'Logical partitions',cluster:'POWER10-BRN' },
];
const resourceRows = providers.flatMap((p,pi)=>names.map((name,i)=>({
  id:`${p.id}-${String(i+1).padStart(4,'0')}`, name:pi===2?`vol-${name}`:pi===3?`lpar-${name}`:pi===1?name.replace('prd-','dr-'):name,
  status:pi===2?(i===15?'Offline':'Online'):i===15?'Disconnected':i%7===5?'Powered off':'Powered on', provider:p.id, cluster:i>11?p.cluster.replace('PROD','DEV'):p.cluster,
  cpu:[4,8,16,4,8,4][i%6],memory:[16,32,64,16,32,8][i%6],storage:[120,480,960,240,120,80][i%6],
  host:`${pi===3?'power':'esx'}-${pi+1}${String(i%4+1).padStart(2,'0')}.aricoma.local`,tag:i>11?'Development':'Production',
})));
const runRows = appNames.map((name,i)=>({id:`run-${String(1840+i).padStart(5,'0')}`,name,status:i===3||i===16?'Failed':i===6?'Running':i===14||i===21?'No runs yet':'Success',type:i%3===0?'Recovery Group':'Application',started:`2026-10-22 ${String(18-Math.floor(i/4)).padStart(2,'0')}:${String(45-i%4*11).padStart(2,'0')}:08`,duration:i===14||i===21?'—':i===6?'In progress':`${i%4+1}m ${String(i*7%60).padStart(2,'0')}s`,site:i%4===0?'Brno → Prague':'Prague → Brno',mode:i%4===0?'Failover':'Test recovery'}));
let scope = resource?'vm-01':'All';
let status = 'All';
let selectedId = layout==='flat'?null:(resource?resourceRows[0].id:runRows[0].id);
let comfortable = false;
const e = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge = value => `<span class="status ${['Powered on','Online','Success'].includes(value)?'good':['Disconnected','Offline','Failed'].includes(value)?'bad':value==='Running'?'warning':'quiet'}">${e(value)}</span>`;
const scopeItems = resource?providers.map(p=>[p.id,p.label,p.id]):[['All','All entities','24'],['Application','Applications','16'],['Recovery Group','Recovery groups','8']];
const scopeButtons = scopeItems.map(([id,label,meta])=>`<button type="button" data-scope="${id}" aria-pressed="${id===scope}">${label}<code>${meta}</code></button>`).join('');
const statusItems = resource?['All','Powered on','Powered off','Disconnected','Online','Offline']:['All','Success','Failed','Running','No runs yet'];
const metricItems = resource?[['24','Resources'],['20','Powered on'],['192','vCPU'],['688 GB','Memory']]:[['24','Entities'],['19','Successful'],['2','Failed'],['1','Running']];
document.title = `${title} · ${layoutNames[layout]} · ABCO`;
document.body.innerHTML = `<a class="skip" href="#main">Skip to data</a><div class="shell">
  <header class="global"><a href="index.html" class="brand" aria-label="ABCO design gallery"><span class="brandmark" aria-hidden="true">A</span>ABCO</a><span class="crumb">${resource?'Discovery & inventory':'Recovery plans'} <span aria-hidden="true">/</span> ${title}</span><a href="index.html" class="back">← Všetky návrhy</a><div class="account"><span class="avatar">TT</span><span class="username">Test Test</span></div></header>
  <main id="main" class="workspace"><header class="pagehead"><div><div class="titleline"><h1>${title}</h1><span class="total">${resource?'96':'24'}</span></div><p>${resource?'Discovered infrastructure across connected providers.':'Execution history and status of orchestrated entities.'}</p></div><div class="actions"><span class="version">${layoutNames[layout]}</span><button type="button" id="refresh">↻ Refresh preview</button></div></header>
  <nav class="scopebar" aria-label="${resource?'Resource providers':'Entity types'}">${scopeButtons}</nav>
  <section class="summary" aria-label="${resource?'Provider summary':'Recovery summary'}">${metricItems.map(([value,label])=>`<div class="metric"><strong data-metric="${label}">${value}</strong><span>${label}</span></div>`).join('')}<span class="sync"><span class="dot"></span><span id="sync">Preview dataset · 22 Oct 2026, 18:45</span></span></section>
  <div class="mainarea"><aside class="filterrail" aria-label="Scope and filters"><div class="railgroup"><h2 class="railtitle">${resource?'Infrastructure':'Orchestration'}</h2>${scopeItems.map(([id,label,meta])=>`<button type="button" data-scope="${id}" aria-pressed="${id===scope}"><span>${label}</span><small>${meta}</small></button>${resource?`<p class="sub quiet mono">${providers.find(p=>p.id===id).scope.split(' · ')[0]}</p>`:''}`).join('')}</div><div class="railgroup statusgroup"><h2 class="railtitle">${resource?'Power state':'Latest result'}</h2>${statusItems.map(s=>`<button type="button" data-status="${s}" aria-pressed="${s==='All'}">${s==='All'?'Any status':s}</button>`).join('')}</div><p class="railhelp">${resource?'Provider scope applies to the inventory and its summary.':'Latest run per entity. Select a row to inspect its execution.'}</p></aside>
  <section class="dataarea" aria-label="${title} data"><div class="toolbar"><label class="search"><span class="sr-only">Search name or ID</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input id="search" type="search" placeholder="Search name or ID…"></label><label><span class="sr-only">Filter status</span><select id="status">${statusItems.map(s=>`<option>${s}</option>`).join('')}</select></label><button type="button" id="reset">Reset filters</button><button type="button" id="density" class="density" aria-pressed="false">Comfortable rows</button></div>
  <div class="tablewrap" tabindex="0" role="region" aria-label="Scrollable ${title.toLowerCase()} table"><table><caption class="sr-only">${title}: synthetic preview data. Select a name to show details.</caption><thead id="columns"></thead><tbody id="rows"></tbody></table></div><footer class="pagination"><span id="count" role="status"></span><span>All matching rows · ${layout==='console'?'32':'39'} px compact density</span></footer></section>
  <aside id="detail" class="detail" aria-label="Selected record details" ${selectedId?'':'hidden'}></aside></div></main>
  <footer class="footnote"><span>${layout==='flat'?'One continuous data surface':layout==='explorer'?'Persistent context · selection stays in view':'Compact data grid · docked record details'}</span><span>DESIGN PREVIEW · synthetic data · ${layoutNames[layout]}</span></footer></div>`;
const rowsNode = document.querySelector('#rows');
const detail = document.querySelector('#detail');
const search = document.querySelector('#search');
const allRows = resource?resourceRows:runRows;
function matchingRows(){
  const term=search.value.trim().toLowerCase();
  return allRows.filter(r=>(resource?r.provider===scope:scope==='All'||r.type===scope)&&(status==='All'||r.status===status)&&`${r.name} ${r.id}`.toLowerCase().includes(term));
}
function renderDetail(){
  const row=allRows.find(r=>r.id===selectedId);
  detail.hidden=!row;
  if(!row){detail.innerHTML='';return;}
  const p=resource?providers.find(p=>p.id===row.provider):null;
  const fields=resource?[['Provider',`${p.label} / ${p.id}`],['Cluster',row.cluster],p.id==='fs-01'?['Copies','2']:['CPU',`${row.cpu} vCPU`],p.id==='fs-01'?['Used',`${Math.round(row.storage*.62)} GB`]:['Memory',`${row.memory} GB`],['Storage',`${row.storage} GB`],['Environment',row.tag]]:[['Run ID',row.id],['Type',row.type],['Started',row.started],['Duration',row.duration],['Direction',row.site],['Mode',row.mode]];
  detail.innerHTML=`<div class="detailhead"><h2>${resource?'Resource inspector':'Execution inspector'}</h2><button type="button" id="close-detail" aria-label="Close record details">×</button></div><div class="detailbody"><div><h3 class="detailname">${e(row.name)}</h3><p class="mono quiet">${e(row.id)}</p>${badge(row.status)}${layout==='console'?`<p class="detailhint">${resource?e(row.host):'Latest orchestration run'}</p>`:''}</div><dl>${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${e(value)}</dd></div>`).join('')}</dl><section class="detailsection"><h3>${resource?'Infrastructure context':'Execution events'}</h3>${resource?`<p>${e(row.host)}<br>${e(p.scope)}</p><div class="capacity" role="img" aria-label="Illustrative storage usage: 62 percent"><span></span></div><p class="quiet">Storage allocation · 62% used</p>`:row.status==='No runs yet'?'<p>No execution events available.</p>':`<div class="trace"><span>18:41:00 <b>✓</b> Plan validated</span><span>18:41:02 <b>✓</b> Resources resolved</span><span>18:41:08 ${row.status==='Failed'?'× Provider request failed':row.status==='Running'?'↻ Recovery in progress':'✓ Recovery completed'}</span></div><p class="detailhint">Illustrative event sequence.</p>`}</section></div>${layout!=='console'?'<p class="detailhint">Select another name to inspect its details without leaving the inventory.</p>':''}`;
  document.querySelector('#close-detail').addEventListener('click',()=>{
    const previous=selectedId;selectedId=null;render();
    [...document.querySelectorAll('[data-row]')].find(b=>b.dataset.row===previous)?.focus();
  });
}
function render(){
  const rows=matchingRows();
  if(!rows.some(r=>r.id===selectedId))selectedId=null;
  const volume=resource&&scope==='fs-01';
  if(resource){
    const validStatuses=volume?['All','Online','Offline']:['All','Powered on','Powered off','Disconnected'];
    document.querySelector('.statusgroup .railtitle').textContent=volume?'I/O state':'Power state';
    document.querySelectorAll('#status option').forEach(option=>{option.hidden=!validStatuses.includes(option.value);});
    document.querySelectorAll('[data-status]').forEach(button=>{button.hidden=!validStatuses.includes(button.dataset.status);});
  }
  const columns=resource?['Name',volume?'I/O state':'Power state','Cluster',volume?'Copies':'vCPU',volume?'Used GB':'Memory GB','Storage GB','Host','Environment']:['Entity','Type','Latest run','Started','Duration','Direction','Mode'];
  document.querySelector('#columns').innerHTML=`<tr>${columns.map((c,i)=>`<th scope="col" ${resource&&i>=3&&i<=5?'class="number"':''}>${c}</th>`).join('')}</tr>`;
  rowsNode.innerHTML=rows.length?rows.map(r=>`<tr class="${r.id===selectedId?'selected':''}"><td><button type="button" class="rowname" data-row="${e(r.id)}" aria-pressed="${r.id===selectedId}" aria-controls="detail">${e(r.name)}</button><div class="id">${e(r.id)}</div></td>${resource?`<td>${badge(r.status)}</td><td class="mono">${e(r.cluster)}</td><td class="number mono">${volume?'2':r.cpu}</td><td class="number mono">${volume?Math.round(r.storage*.62):r.memory}</td><td class="number mono">${r.storage}</td><td class="mono quiet">${e(r.host)}</td><td><span class="tag">${r.tag}</span></td>`:`<td><span class="tag">${r.type}</span></td><td>${badge(r.status)}</td><td class="mono quiet">${r.status==='No runs yet'?'—':r.started}</td><td class="mono">${r.duration}</td><td>${r.site}</td><td class="quiet">${r.mode}</td>`}</tr>`).join(''):`<tr><td class="empty" colspan="${columns.length}"><strong>No matching ${resource?'resources':'entities'}</strong><br>Try another search or reset the filters.</td></tr>`;
  document.querySelector('#count').textContent=`${rows.length} matching ${resource?'resources':'entities'} · ${resource?providers.find(p=>p.id===scope).scope:scope==='All'?'All orchestrated entities':scope}`;
  document.querySelector('table').classList.toggle('comfortable',comfortable);
  document.querySelectorAll('[data-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scope===scope)));
  document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===status)));
  renderDetail();
  if(resource){
    const scoped=resourceRows.filter(r=>r.provider===scope);
    const totals=volume?[scoped.length,scoped.filter(r=>r.status==='Online').length,scoped.length*2,`${scoped.reduce((n,r)=>n+r.storage,0)} GB`]:[scoped.length,scoped.filter(r=>r.status==='Powered on').length,scoped.reduce((n,r)=>n+r.cpu,0),`${scoped.reduce((n,r)=>n+r.memory,0)} GB`];
    const labels=volume?['Volumes','Online','Copies','Capacity']:['Resources','Powered on','vCPU','Memory'];
    document.querySelectorAll('.metric span').forEach((label,i)=>label.textContent=labels[i]);
    document.querySelectorAll('[data-metric]').forEach((m,i)=>m.textContent=totals[i]);
  }
}
rowsNode.addEventListener('click',event=>{const button=event.target.closest('[data-row]');if(button){selectedId=button.dataset.row;render();[...document.querySelectorAll('[data-row]')].find(b=>b.dataset.row===selectedId)?.focus();}});
document.querySelectorAll('[data-scope]').forEach(b=>b.addEventListener('click',()=>{scope=b.dataset.scope;selectedId=null;status='All';document.querySelector('#status').value=status;render();}));
document.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>{status=b.dataset.status;document.querySelector('#status').value=status;render();}));
search.addEventListener('input',render);
document.querySelector('#status').addEventListener('change',event=>{status=event.target.value;render();});
document.querySelector('#reset').addEventListener('click',()=>{search.value='';status='All';document.querySelector('#status').value=status;render();});
document.querySelector('#density').addEventListener('click',event=>{comfortable=!comfortable;event.currentTarget.setAttribute('aria-pressed',String(comfortable));render();});
document.querySelector('#refresh').addEventListener('click',()=>{document.querySelector('#sync').textContent='Preview refreshed · synthetic dataset unchanged';document.querySelector('#count').textContent=`Preview refreshed · ${matchingRows().length} matching records`;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&selectedId)document.querySelector('#close-detail')?.click();});
render();
