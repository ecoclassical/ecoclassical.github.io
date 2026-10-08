export function matches(page,query){return `${page.title} ${page.section} ${page.description}`.toLowerCase().includes(query.trim().toLowerCase());}
export function coverageText(cell){return `${cell.accepted} / ${cell.expected} accepted${cell.failed ? ` · ${cell.failed} failed` : ''}`;}
async function start(){
 const [pages,coverage,manifest,sections,tabConfig]=await Promise.all(['pages.json','coverage.json','manifest.json','sections.json','section-tabs.json'].map(async path=>{const r=await fetch(new URL(path,import.meta.url));if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return r.json();}));
 const base=new URL('.',import.meta.url),url=path=>new URL(path,base).href,byId=new Map(pages.map(p=>[p.id,p])),current=document.body.dataset.page;
 const href=tab=>url(byId.get(tab.page).href)+(tab.native?'#tab='+encodeURIComponent(tab.native):'');
 for(const nav of document.querySelectorAll('[data-section-navigation]'))for(const section of sections){const a=document.createElement('a');a.href=href(tabConfig[section][0]);a.textContent=section;a.dataset.section=section;if(current&&byId.get(current).section===section)a.setAttribute('aria-current','page');nav.append(a);}
 if(current){
  if(current==='documentation')document.querySelector('.report-toolbar').hidden=true;
  const page=byId.get(current),frame=document.querySelector('#report'),tabs=tabConfig[page.section],bar=document.querySelector('#section-tabs');let selected;
  for(const tab of tabs){const a=document.createElement('a');a.textContent=tab.label;a.href=href(tab);a.dataset.page=tab.page;if(tab.native)a.dataset.native=tab.native;bar.append(a);}
  if(tabs.length===1)bar.hidden=true;
  const select=()=>{const native=new URLSearchParams(location.hash.slice(1)).get('tab');selected=tabs.find(t=>t.page===current&&t.native===native)||tabs.find(t=>t.page===current)||{page:current};for(const a of bar.children){const active=a.dataset.page===selected.page&&(a.dataset.native||'')===(selected.native||'');if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}};
  const applyNative=()=>{const doc=frame.contentDocument;if(!doc?.body||!selected.native)return;const tabs=doc.querySelector('#tabs')||doc.querySelector('#visual-tabs');if(tabs){const button=[...tabs.querySelectorAll('button')].find(b=>b.textContent===selected.native||b.dataset.visualTab===selected.native);button?.click();tabs.hidden=true;}if(current==='equations'||current==='closure-equations'){for(const e of doc.querySelectorAll('.wrap>h1,.wrap>.sub'))e.hidden=true;}};
  document.querySelector('#report-title').textContent=page.section;
  document.querySelector('#standalone').href=url(page.artifact);
  const load=()=>{select();const target=url(page.artifact)+(selected.native?'':location.hash);if(frame.contentWindow?.location.href!==target)frame.src=target;else applyNative();};
  load();window.addEventListener('popstate',load);window.addEventListener('hashchange',load);
  for(const a of bar.children)a.addEventListener('click',e=>{if(a.dataset.page===current){e.preventDefault();history.pushState(null,'',a.href);load();}});
  window.addEventListener('message',e=>{if(!selected.native&&e.source===frame.contentWindow&&e.origin===location.origin&&typeof e.data?.reportHash==='string')history.replaceState(null,'',location.pathname+e.data.reportHash);});
  const attach=()=>{
   const win=frame.contentWindow,doc=frame.contentDocument;
   applyNative();
   if(doc.documentElement.dataset.leedsShellAttached)return;doc.documentElement.dataset.leedsShellAttached='true';
   for(const table of doc.querySelectorAll('table')){if(table.closest('.scroll,.table-responsive,.leeds-table-scroll'))continue;const wrap=doc.createElement('div');wrap.className='leeds-table-scroll';table.before(wrap);wrap.append(table);}
   const responsive=doc.createElement('style');responsive.textContent='html,body{max-width:100%} .wrap{box-sizing:border-box;max-width:100%;min-width:0}.leeds-table-scroll{max-width:100%;overflow:auto;contain:layout paint}.scroll{width:100%;max-width:100%;box-sizing:border-box;overflow:auto;position:relative;contain:layout paint} @media(max-width:680px){pre,code,.foot{overflow-wrap:anywhere;white-space:pre-wrap}.legend>*{min-width:0;max-width:100%}main{min-width:0} .cell-output-display{max-width:100%;overflow-x:auto;contain:layout paint}.math.display{display:block;max-width:100%;overflow-x:auto;contain:layout paint}.math.inline{display:inline-block;max-width:100%;overflow-x:auto;vertical-align:middle}}';doc.head.append(responsive);
   const sync=()=>{if(!selected.native)history.replaceState(null,'',location.pathname+win.location.hash);};win.addEventListener('hashchange',sync);
   const old=win.history.replaceState.bind(win.history);win.history.replaceState=(...args)=>{old(...args);sync();};
   doc.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(e.defaultPrevented||!a||a.download||a.target==='_blank')return;const dest=new URL(a.href);const p=pages.find(p=>new URL(p.artifact,base).pathname===dest.pathname);if(p&&dest.origin===location.origin&&dest.pathname!==win.location.pathname){e.preventDefault();location.href=url(p.href)+dest.hash;}});
  };
  frame.addEventListener('load',attach);if(frame.contentDocument?.readyState==='complete'&&frame.contentDocument?.URL.includes('/evidence/'))attach();
  return;
 }
 document.querySelector('#edition').textContent=`Evidence edition · ${manifest.built_date} · source revision ${manifest.commit.slice(0,7)}${manifest.working_tree_dirty?' · local changes':''}`;
 const container=document.querySelector('#pages');
 const descriptions={Background:'Research context and model overview.', 'Model Equations':'Compare model arms and equations.',Closures:'Settlement rules and baseline responses.',Scenarios:'Interventions and their model responses.',Analysis:'Clustering, PCA and transmission regimes.',Discussion:'Interpretation, limitations and questions.',Figures:'The paper\'s figures on the revised model.',Tables:'Scenario, closure, setup and regime summaries.',Documentation:'Supporting reports and plans by topic.'};
 for(const section of sections){const group=document.createElement('section');group.className='page-section';group.id=section.toLowerCase().replaceAll(' ','-');const a=document.createElement('a');a.className='page-card';a.href=href(tabConfig[section][0]);a.textContent=section;const description=document.createElement('p');description.className='section-description';description.textContent=descriptions[section];group.append(a,description);container.append(group);}
}
if(typeof document!=='undefined')start().catch(error=>{(document.querySelector('#edition')||document.querySelector('#report-title')).textContent=`Evidence could not load: ${error.message}. Serve this folder over HTTP and retry.`;console.error(error);});
