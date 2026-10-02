export function matches(page,query){return `${page.title} ${page.section} ${page.description}`.toLowerCase().includes(query.trim().toLowerCase());}
export function coverageText(cell){return `${cell.accepted} / ${cell.expected} accepted${cell.failed ? ` · ${cell.failed} failed` : ''}`;}
async function start(){
 const [pages,coverage,manifest]=await Promise.all(['pages.json','coverage.json','manifest.json'].map(async path=>{const r=await fetch(path);if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return r.json();}));
 const byId=new Map(pages.map(p=>[p.id,p]));
 for(const a of document.querySelectorAll('[data-page]'))a.href=byId.get(a.dataset.page).href;
 document.querySelector('#edition').textContent=`Evidence edition · ${manifest.built_date} · source revision ${manifest.commit.slice(0,7)}`;
 const container=document.querySelector('#pages');
 for(const section of ['Model','Closures','Scenarios','Dynamics']){
  const group=document.createElement('section');group.className='page-section';group.id=section.toLowerCase();
  const title=document.createElement('h3');title.textContent=section;group.append(title);
  const grid=document.createElement('div');grid.className='page-grid';group.append(grid);
  for(const page of pages.filter(p=>p.section===section)){
   const a=document.createElement('a');a.className='page-card';a.href=page.href;a.dataset.pageId=page.id;
   const strong=document.createElement('strong');strong.textContent=page.title+' ↗';
   const text=document.createElement('p');text.textContent=page.description;a.append(strong,text);grid.append(a);
  }container.append(group);
 }
 const filter=document.querySelector('#filter');filter.addEventListener('input',()=>{
  let count=0;for(const card of container.querySelectorAll('.page-card')){card.hidden=!matches(byId.get(card.dataset.pageId),filter.value);if(!card.hidden)count++;}
  for(const group of container.children)group.hidden=[...group.querySelectorAll('.page-card')].every(c=>c.hidden);
  document.querySelector('#filter-status').textContent=filter.value ? `${count} matching pages` : '';
 });
 const body=document.querySelector('#coverage-body');for(const cell of coverage.cells){const tr=document.createElement('tr');for(const value of [cell.closure,cell.region,coverageText(cell)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}
 document.querySelector('#coverage-caption').textContent=`Checked ${coverage.measured_at}; ${coverage.cells.reduce((n,c)=>n+c.accepted,0)} accepted scenario caches.`;
 document.querySelector('#coverage-basis').textContent=coverage.basis;
}
if(typeof document!=='undefined')start().catch(error=>{document.querySelector('#edition').textContent=`Evidence could not load: ${error.message}. Serve this folder over HTTP and retry.`;console.error(error);});
