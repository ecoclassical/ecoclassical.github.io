/* viz.js — shared Option-A rendering core.
   Every draw fn takes a target SVG selector + data and sizes to that element,
   so the same code powers the interactive panel.html and the print report.html.
   No iframes, no async draw — everything is data-in → SVG-out synchronously.

   THEME: charts read all "ink" colors (axes, gridlines, labels, map land, node
   strokes) from the active theme `T`. The on-screen report uses the dark theme;
   the PDF export switches to light via VIZ.setTheme('light') + redraw so axes and
   labels stay visible on a white page. Data colors (SR / CAT / LANE) are fixed —
   they read well on both backgrounds. */
(function(global){
// Stage-led palette: one hue per value-chain STAGE, shaded by role within it — brown (Upstream,
// single role) → 3 grays (Midstream's 3 roles) → 2 greens (Downstream's 2 roles) → orange (Final
// Product, single role). Gray-before-green (not the reverse) reads as a smoother brown→gray→
// green→orange progression left to right, and keeps "industrial/equipment-heavy" Midstream
// visually distinct from "closer-to-finished" Downstream.
const SR = {
  "Upstream|Raw Material":"#78350f","Upstream|Processed Material":"#78350f",
  "Midstream|Processed Material":"#9ca3af","Midstream|Process Equipment":"#6b7280",
  "Midstream|Product Component":"#4b5563","Downstream|Product Component":"#4ade80",
  "Downstream|Process Equipment":"#15803d","Downstream|Final Product":"#f97316",
  "Final Product|Final Product":"#f97316"
};
const CAT = {Chemicals:"#2563eb",Electronics:"#7c3aed",Metals:"#ef4444",Machinery:"#10b981","Industrial Materials":"#f59e0b",Other:"#6b7280"};
const LANE = ["#78350f","#9ca3af","#6b7280","#4b5563","#4ade80","#15803d","#f97316"];
const ISO3N={AFG:4,ALB:8,DZA:12,AGO:24,ARG:32,ARM:51,AUS:36,AUT:40,AZE:31,BGD:50,BLR:112,BEL:56,BFA:854,BDI:108,KHM:116,CMR:120,CAN:124,TCD:148,CHL:152,CHN:156,COL:170,COD:180,COG:178,HRV:191,CUB:192,CYP:196,CZE:203,DNK:208,DOM:214,ECU:218,EGY:818,ETH:231,FJI:242,FIN:246,FRA:250,DEU:276,GHA:288,GRC:300,GTM:320,HND:340,HKG:344,HUN:348,IND:356,IDN:360,IRN:364,IRQ:368,IRL:372,ISR:376,ITA:380,JPN:392,JOR:400,KAZ:398,KEN:404,PRK:408,KOR:410,KWT:414,LAO:418,LVA:428,LBN:422,LBY:434,LTU:440,LUX:442,MDG:450,MWI:454,MYS:458,MLI:466,MLT:470,MRT:478,MEX:484,MDA:498,MNG:496,MAR:504,MOZ:508,MMR:104,NAM:516,NPL:524,NLD:528,NZL:554,NGA:566,NOR:578,OMN:512,PAK:586,PAN:591,PER:604,PHL:608,POL:616,PRT:620,QAT:634,ROU:642,RUS:643,SAU:682,SEN:686,SGP:702,SVK:703,ZAF:710,ESP:724,LKA:144,SWE:752,CHE:756,SYR:760,TWN:158,TJK:762,TZA:834,THA:764,TTO:780,TUN:788,TUR:792,TKM:795,UGA:800,UKR:804,ARE:784,GBR:826,USA:840,URY:858,UZB:860,VNM:704,YEM:887,ZMB:894,ZWE:716,BOL:68,BRA:76,BHR:48,DJI:262,SWZ:748,GEO:268,SLV:222,GNQ:226,EST:233,GUY:328,HTI:332,RWA:646,SLE:694,SDN:729,SUR:740,NER:562,CAF:140,ERI:232};

/* ── theme ──────────────────────────────────────────────────────────────────── */
const THEMES = {
  dark:  { axis:"rgba(255,255,255,.42)", grid:"rgba(255,255,255,.10)", label:"rgba(255,255,255,.70)",
           faint:"rgba(255,255,255,.45)", title:"rgba(255,255,255,.85)",
           land:"#10231a", landStroke:"rgba(255,255,255,.08)", nodeStroke:"#0a0f14",
           focalLand:"#1c3d2c", focalStroke:"rgba(60,181,74,.85)",
           tile:"#0a0f14", focal:"#ffffff", empty:"rgba(255,255,255,.40)", tmText:"rgba(0,0,0,.82)" },
  light: { axis:"#8a948c", grid:"#e2e8e2", label:"#3a463f",
           faint:"#6b766e", title:"#1d2a22",
           land:"#ecefec", landStroke:"#c8d0c9", nodeStroke:"#ffffff",
           focalLand:"#d6ead9", focalStroke:"#3cb54a",
           tile:"#ffffff", focal:"#0b1a12", empty:"#9aa69d", tmText:"rgba(0,0,0,.82)" }
};
let T = THEMES.dark;
function setTheme(name){ T = THEMES[name] || THEMES.dark; }

const srKey = d => d.stage+"|"+d.role;
const fmtV = v => v>=1e6?"$"+(v/1e6).toFixed(1)+"B":v>=1e3?"$"+(v/1e3).toFixed(1)+"M":"$"+(+v).toFixed(0)+"K";
const clip = (s,n)=>{ s=String(s||''); return s.length>n?s.slice(0,n-1)+'…':s; };
let FEATS=null, CENT={};
function initGeo(world){
  if(!world) return;
  FEATS = topojson.feature(world,world.objects.countries).features;
  FEATS.forEach(f=>{ const id=String(f.id).padStart(3,'0');
    const iso=Object.keys(ISO3N).find(k=>ISO3N[k]===parseInt(id));
    if(iso){ try{ CENT[iso]=d3.geoCentroid(f); }catch(e){} } });
}
function dims(sel){ const n=d3.select(sel).node(); const r=n.getBoundingClientRect(); return {n,W:r.width||n.clientWidth||600,H:r.height||n.clientHeight||300}; }
function styleAxis(g){ g.attr('color',T.axis).attr('font-size','9px'); g.selectAll('.domain').attr('stroke',T.axis); g.selectAll('.tick line').attr('stroke',T.grid); g.selectAll('text').attr('fill',T.faint); }

// optional tooltip (no-op if absent)
function tipMove(e,h){ const t=document.getElementById('tip'); if(!t)return; t.style.opacity=1; t.style.left=(e.clientX+12)+'px'; t.style.top=(e.clientY+12)+'px'; t.innerHTML=h; }
function tipOut(){ const t=document.getElementById('tip'); if(t)t.style.opacity=0; }

function radar(sel,rows){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  if(!rows||!rows.length) return empty(svg,W,H,'no capability data');
  const cx=W/2,cy=H/2+4,R=Math.min(W,H)/2-44, nn=rows.length, ang=i=>-Math.PI/2+i*2*Math.PI/nn;
  const maxShap=d3.max(rows,d=>Math.abs(d.shap))||1, maxRca=d3.max(rows,d=>d.rca)||1;
  [0.33,0.66,1].forEach(g=>svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',R*g).attr('fill','none').attr('stroke',T.grid));
  rows.forEach((d,i)=>{ svg.append('line').attr('x1',cx).attr('y1',cy).attr('x2',cx+R*Math.cos(ang(i))).attr('y2',cy+R*Math.sin(ang(i))).attr('stroke',T.grid);
    const lx=cx+(R+18)*Math.cos(ang(i)), ly=cy+(R+18)*Math.sin(ang(i));
    svg.append('text').attr('x',lx).attr('y',ly).attr('text-anchor',Math.abs(Math.cos(ang(i)))<0.3?'middle':(Math.cos(ang(i))>0?'start':'end')).attr('dominant-baseline','middle').attr('font-size','10px').attr('fill',T.label).text(d.category); });
  const poly=(acc,col,fill)=>{ const pts=rows.map((d,i)=>{const r=R*Math.min(1,Math.abs(acc(d)));return [cx+r*Math.cos(ang(i)),cy+r*Math.sin(ang(i))];});
    svg.append('polygon').attr('points',pts.map(p=>p.join(',')).join(' ')).attr('fill',fill).attr('stroke',col).attr('stroke-width',1.8); };
  poly(d=>d.rca/maxRca,'#3cb54a','rgba(60,181,74,.14)');
  poly(d=>Math.abs(d.shap)/maxShap,'#eab308','rgba(234,179,8,.18)');
  legend(svg,8,8,[['#eab308','SHAP weight (tech)'],['#3cb54a','Country RCA']]);
}
function scatter(sel,rows){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  if(!rows||!rows.length) return empty(svg,W,H,'no PC / SHAP data for this technology');
  const m={t:14,r:18,b:38,l:56};
  const x=d3.scaleLinear().domain(d3.extent(rows,d=>d.shap)).nice().range([m.l,W-m.r]);
  const y=d3.scaleLog().domain([d3.max([1,d3.min(rows,d=>d.v)]),d3.max(rows,d=>d.v)]).range([H-m.b,m.t]);
  const r=d3.scaleSqrt().domain([0,d3.max(rows,d=>d.v)]).range([2,18]);
  styleAxis(svg.append('g').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(4)));
  const yt=y.ticks().filter(t=>Math.abs(Math.log10(t)%1)<1e-9);   // decade ticks only — log scale otherwise floods
  styleAxis(svg.append('g').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).tickValues(yt.length?yt:y.ticks(3)).tickFormat(fmtV)));
  // axis titles
  svg.append('text').attr('x',(m.l+W-m.r)/2).attr('y',H-4).attr('text-anchor','middle').attr('font-size','9px').attr('fill',T.faint).text('SHAP model importance →');
  svg.append('text').attr('transform',`translate(13,${(m.t+H-m.b)/2}) rotate(-90)`).attr('text-anchor','middle').attr('font-size','9px').attr('fill',T.faint).text('Trade value →');
  svg.append('g').selectAll('circle').data(rows).join('circle')
    .attr('cx',d=>x(d.shap)).attr('cy',d=>y(Math.max(1,d.v))).attr('r',d=>r(d.v))
    .attr('fill',d=>(CAT[d.category]||CAT.Other)).attr('opacity',.62).attr('stroke',T.nodeStroke).attr('stroke-width',.7)
    .on('mousemove',(e,d)=>tipMove(e,(d.name||d.code)+'<br>SHAP '+(+d.shap).toFixed(2)+' · '+fmtV(d.v))).on('mouseout',tipOut);
  // label the few highest-value products so the cloud reads
  rows.slice().sort((a,b)=>b.v-a.v).slice(0,5).forEach(d=>{
    svg.append('text').attr('x',x(d.shap)).attr('y',y(Math.max(1,d.v))-r(d.v)-3).attr('text-anchor','middle')
      .attr('font-size','8.5px').attr('fill',T.label).text(clip(d.name||d.code,18)); });
}
function timeline(sel,rows){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  if(!rows||!rows.length) return empty(svg,W,H,'no trade data');
  const m={t:10,r:12,b:26,l:58};
  const years=[...new Set(rows.map(d=>d.year))].sort((a,b)=>a-b);
  const keys=[...new Set(rows.map(srKey))];
  const byY=new Map(years.map(y=>[y,{year:y}])); rows.forEach(d=>{const o=byY.get(d.year);o[srKey(d)]=(o[srKey(d)]||0)+d.v;});
  const series=d3.stack().keys(keys)(years.map(y=>byY.get(y)));
  const x=d3.scaleLinear().domain(d3.extent(years)).range([m.l,W-m.r]);
  const y=d3.scaleLinear().domain([0,d3.max(series,s=>d3.max(s,d=>d[1]))||1]).nice().range([H-m.b,m.t]);
  const area=d3.area().x(d=>x(d.data.year)).y0(d=>y(d[0])).y1(d=>y(d[1]));
  svg.append('g').selectAll('path').data(series).join('path').attr('d',area).attr('fill',s=>SR[s.key]||'#888').attr('opacity',.88);
  styleAxis(svg.append('g').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('d'))));
  styleAxis(svg.append('g').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(fmtV)));
  // compact stage legend (one swatch per value-chain stage present)
  const stagePresent=[...new Set(rows.map(r=>r.stage))];
  const stageCol={Upstream:'#c17a2e',Midstream:'#22c55e',Downstream:'#4ade80','Final Product':'#f97316'};
  legend(svg,m.l+4,6,stagePresent.filter(s=>stageCol[s]).map(s=>[stageCol[s],s]));
}
function treemap(sel,prod){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  if(!prod||!prod.length) return empty(svg,W,H,'no products');
  const root=d3.hierarchy({children:prod.slice(0,60)}).sum(d=>d.v).sort((a,b)=>b.value-a.value);
  d3.treemap().size([W,H]).padding(1.5)(root);
  const g=svg.append('g').selectAll('g').data(root.leaves()).join('g').attr('transform',d=>`translate(${d.x0},${d.y0})`);
  g.append('rect').attr('width',d=>d.x1-d.x0).attr('height',d=>d.y1-d.y0)
    .attr('fill',d=>SR[srKey(d.data)]||'#888').attr('opacity',.85).attr('stroke',T.tile).attr('stroke-width',1)
    .on('mousemove',(e,d)=>tipMove(e,(d.data.product_name||d.data.code)+'<br>'+fmtV(d.value))).on('mouseout',tipOut);
  // clip labels to their own tile so they never spill into neighbours
  g.filter(d=>(d.x1-d.x0)>40&&(d.y1-d.y0)>14).each(function(d){
    const gw=d.x1-d.x0, gh=d.y1-d.y0, sel=d3.select(this);
    const cid='tmc-'+Math.random().toString(36).slice(2,8);
    sel.append('clipPath').attr('id',cid).append('rect').attr('width',gw-2).attr('height',gh-1);
    const name=(d.data.product_name||d.data.code), words=name.split(' ');
    const t=sel.append('text').attr('clip-path',`url(#${cid})`).attr('x',4).attr('y',11)
      .attr('font-size','9px').attr('fill',T.tmText).attr('font-weight','600');
    const cpl=Math.max(3,Math.floor((gw-6)/5.4));            // chars per line at 9px
    let line='', lines=0; const maxLines=Math.max(1,Math.floor((gh-4)/10));
    words.forEach(w=>{ if((line+' '+w).trim().length>cpl){ if(lines<maxLines-1){ t.append('tspan').attr('x',4).attr('dy',lines?10:0).text(line); line=w; lines++; } else { line=clip(line+' '+w,cpl); } } else line=(line+' '+w).trim(); });
    t.append('tspan').attr('x',4).attr('dy',lines?10:0).text(clip(line,cpl));
  });
}
function baseMap(svg,W,H,focalIso,fit){
  svg.selectAll('*').remove();
  if(!FEATS){ empty(svg,W,H,'world map unavailable'); return null; }
  const proj=d3.geoNaturalEarth1().rotate([-10,0,0]);
  const focalFeat=focalIso?FEATS.find(f=>parseInt(f.id)===ISO3N[focalIso]):null;
  // fit==='world': always fit the WHOLE world to the panel (fixed, country-independent view — so
  // partner countries anywhere on Earth project to their true position). Default (no fit arg):
  // zoom in tight on the focal country — kept for the small standalone trade_map/activity_map
  // panels, which want country-level detail rather than world context.
  if(focalFeat && fit!=='world'){ proj.fitExtent([[W*0.16,H*0.16],[W*0.84,H*0.84]],focalFeat); }
  else { proj.fitExtent([[W*0.02,H*0.02],[W*0.98,H*0.98]],{type:'FeatureCollection',features:FEATS}); }
  svg.append('g').selectAll('path').data(FEATS).join('path').attr('d',d3.geoPath(proj))
    .attr('fill',d=>focalFeat&&d===focalFeat?T.focalLand:T.land)
    .attr('stroke',d=>focalFeat&&d===focalFeat?T.focalStroke:T.landStroke)
    .attr('stroke-width',d=>focalFeat&&d===focalFeat?.9:.5);
  return {svg,proj};
}
/* The engine replaced the flat `partners` array with a per-year top-8 series
   (partners_yearly). Callers that still read d.partners get `undefined`, and
   map() then throws on .filter — which embed.html swallows into "render error"
   and report.html turns into a dead panel. panel.html was repaired inline in
   July; embed.html and report.html were not, so the derivation lives here now
   and there is one copy of it (register B-2). Raw basis and latest year only:
   partners_yearly_c re-ranks partners under the multi-use correction, and a map
   that silently switched basis would be the B-21 defect again. */
function partnersLatest(d){
  const py = (d && d.partners_yearly) || [];
  if(!py.length) return [];
  const yr = Math.max(...py.map(r => +r.year));
  return py.filter(r => +r.year === yr)
           .map(r => ({dir:r.dir, partner:r.partner, v:+r.v || 0}));
}
function map(sel,parts,focal){
  parts = parts || [];
  const {W,H}=dims(sel); const svg=d3.select(sel); const b=baseMap(svg,W,H); if(!b)return;
  if(CENT[focal]){ const p=b.proj(CENT[focal]); if(p) svg.append('circle').attr('cx',p[0]).attr('cy',p[1]).attr('r',5).attr('fill',T.focal).attr('stroke',T.nodeStroke); }
  const maxv=d3.max(parts,d=>d.v)||1, r=d3.scaleSqrt().domain([0,maxv]).range([0,20]);
  svg.append('g').selectAll('circle').data(parts.filter(d=>CENT[d.partner])).join('circle')
    .attr('cx',d=>{const p=b.proj(CENT[d.partner]);return p?p[0]:-99;}).attr('cy',d=>{const p=b.proj(CENT[d.partner]);return p?p[1]:-99;})
    .attr('r',d=>r(d.v)).attr('fill',d=>d.dir==='dest'?'#f97316':'#3cb54a').attr('fill-opacity',.4).attr('stroke',d=>d.dir==='dest'?'#f97316':'#3cb54a').attr('stroke-opacity',.9)
    .on('mousemove',(e,d)=>tipMove(e,d.partner+'<br>'+(d.dir==='dest'?'buyer':'supplier')+' · '+fmtV(d.v))).on('mouseout',tipOut);
  legend(svg,8,8,[['#f97316','export destination'],['#3cb54a','import source']]);
}
function firms(sel,fr,focal){
  const {W,H}=dims(sel); const svg=d3.select(sel); const b=baseMap(svg,W,H,focal); if(!b)return;
  if(!fr||!fr.length) return empty(svg,W,H,'no S&P firm data (focal-7 only)',true);
  const maxn=d3.max(fr,d=>d.n)||1, r=d3.scaleSqrt().domain([0,maxn]).range([2,14]);
  svg.append('g').selectAll('circle').data(fr).join('circle')
    .attr('cx',d=>{const p=b.proj([d.lon,d.lat]);return p?p[0]:-99;}).attr('cy',d=>{const p=b.proj([d.lon,d.lat]);return p?p[1]:-99;})
    .attr('r',d=>r(d.n)).attr('fill',d=>SR[d.stage+'|'+d.role]||'#888').attr('opacity',.75).attr('stroke',T.nodeStroke).attr('stroke-width',.5)
    .on('mousemove',(e,d)=>tipMove(e,d.stage+' · '+d.role+'<br>'+d.n+' firm'+(d.n>1?'s':''))).on('mouseout',tipOut);
}
function sankey(sel,flows){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  if(!flows||!flows.length) return empty(svg,W,H,'no sankey flows');
  const m={t:24,r:10,b:10,l:10};
  const LANE_LBL=['Upstream','Processing','Mid · Equip','Mid · Comp','Downstream','Down · Equip','Final'];
  const nodes=new Map(); const reg=(l,ln)=>{ if(!nodes.has(l)) nodes.set(l,{label:l,lane:ln,vin:0,vout:0}); return nodes.get(l); };
  flows.forEach(f=>{ const s=reg(f.from_label,f.from_lane7),t=reg(f.to_label,f.to_lane7); s.vout+=f.weight; t.vin+=f.weight; });
  const lanes=d3.groups([...nodes.values()],d=>d.lane).sort((a,b)=>a[0]-b[0]);
  const laneX=l=>m.l+(W-m.l-m.r)*(l/6);
  lanes.forEach(([lane,ns])=>{ ns.sort((a,b)=>(b.vin+b.vout)-(a.vin+a.vout)); const tot=d3.sum(ns,n=>Math.max(n.vin,n.vout))||1; let y=m.t;
    ns.forEach(n=>{ const h=Math.max(3,(H-m.t-m.b)*0.82*(Math.max(n.vin,n.vout)/tot)); n.x=laneX(lane); n.y0=y; n.y1=y+h; y+=h+4; });
    const anc=lane===0?'start':lane===6?'end':'middle', lx=lane===0?laneX(lane)-3:lane===6?laneX(lane)+3:laneX(lane);
    svg.append('text').attr('x',lx).attr('y',14).attr('text-anchor',anc).attr('font-size','8.5px').attr('font-weight','700').attr('fill',T.faint).text(LANE_LBL[lane]||('L'+lane)); });
  const off=new Map([...nodes.values()].map(n=>[n.label,{o0:0,o1:0}]));
  const maxw=d3.max(flows,f=>f.weight)||1, wsc=d3.scaleSqrt().domain([0,maxw]).range([0,22]);
  flows.sort((a,b)=>b.weight-a.weight).forEach(f=>{ const s=nodes.get(f.from_label),t=nodes.get(f.to_label); const w=wsc(f.weight);
    const so=off.get(f.from_label),to=off.get(f.to_label); const sy=s.y0+so.o1+w/2, ty=t.y0+to.o0+w/2; so.o1+=w; to.o0+=w;
    const x0=s.x+6,x1=t.x-6,xm=(x0+x1)/2;
    svg.append('path').attr('d',`M${x0},${sy} C${xm},${sy} ${xm},${ty} ${x1},${ty}`).attr('fill','none').attr('stroke',LANE[f.from_lane7]||'#888').attr('stroke-width',Math.max(1,w)).attr('stroke-opacity',.4); });
  svg.append('g').selectAll('rect').data([...nodes.values()]).join('rect')
    .attr('x',d=>d.x-3).attr('y',d=>d.y0).attr('width',6).attr('height',d=>d.y1-d.y0).attr('fill',d=>LANE[d.lane]||'#888').attr('rx',1)
    .on('mousemove',(e,d)=>tipMove(e,d.label+'<br>'+fmtV(Math.max(d.vin,d.vout)))).on('mouseout',tipOut);
}
/* Hierarchical linear dendrite of the production process — the SAME topological layering the
   atlas (build_country_atlas.R drawDendrite) and the navigator (drawNavProduct) use, so all
   three surfaces draw the value chain the same way.

   Two things this deliberately does NOT do, both of which it used to:
   - It does not bucket nodes into four fixed STAGE columns. Position on the x-axis is the
     node's longest distance to a sink (a final product with no further downstream edge),
     flipped so raw material sits left and final product right. A declared stage says which
     SR colour a node gets; it does not say where the node sits in the chain.
   - It does not key nodes on the bare HS code. Many distinct process-of-production steps
     share one HS6 — Solar's 848620 covers 15 separate module/cell-line steps — so keying by
     code alone collapses them and fabricates cycles. Measured on Solar: bare code gives 34
     nodes, from_cn/to_cn gives the true 55. Falls back to the bare code only for stale
     cached JSON predating the cn fields. */
function tree(sel,edges){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  if(!edges||!edges.length) return empty(svg,W,H,'no tech-tree edges');
  const m={t:16,r:12,b:18,l:12};
  const cnOf=(code,cn)=>cn||code;
  const nm=new Map();
  const reg=(cn,c,nn,ff,st,ro)=>{ if(!nm.has(cn)) nm.set(cn,{cn,code:c,name:nn,full:ff,stage:st,role:ro,deg:0}); return nm.get(cn); };
  edges.forEach(e=>{
    reg(cnOf(e.from_code,e.from_cn),e.from_code,e.from_name,e.from_full,e.from_stage,e.from_role).deg++;
    reg(cnOf(e.to_code,e.to_cn),e.to_code,e.to_name,e.to_full,e.to_stage,e.to_role).deg++;
  });
  const nodes=[...nm.values()];

  // step = longest distance to a sink; raw materials end with the biggest step, finals at 0
  const stepMap=new Map(nodes.map(n=>[n.cn,0]));
  let changed=true;
  for(let i=0;i<25&&changed;i++){ changed=false;
    edges.forEach(e=>{ const fcn=cnOf(e.from_code,e.from_cn), tcn=cnOf(e.to_code,e.to_cn);
      const ts=stepMap.get(tcn)||0, fs=stepMap.get(fcn)||0;
      if(fs<ts+1){ stepMap.set(fcn,ts+1); changed=true; } }); }
  const maxStep=Math.max(0,...stepMap.values());
  const displayLv=s=>maxStep-s;                        // flip: raw material left → final right
  const stepToX=s=>m.l+(W-m.l-m.r)*displayLv(s)/(maxStep||1);

  const buckets={};
  nodes.forEach(n=>{ const s=stepMap.get(n.cn)||0; (buckets[s]=buckets[s]||[]).push(n); });
  Object.values(buckets).forEach(ns=>ns.sort((a,b)=>(a.name||'').localeCompare(b.name||'')));
  const nodeY=new Map();
  Object.values(buckets).forEach(ns=>{ const avail=H-m.t-m.b, stp=avail/ns.length;
    ns.forEach((n,i)=>nodeY.set(n.cn,m.t+stp*(i+0.5))); });
  const px=n=>stepToX(stepMap.get(n.cn)||0), py=n=>nodeY.get(n.cn)||H/2;

  // step ruler along the bottom — the axis the layout is actually on
  for(let s=0;s<=maxStep;s++)
    svg.append('text').attr('x',stepToX(s)).attr('y',H-4).attr('text-anchor','middle')
      .attr('font-size','7px').attr('font-weight','600').attr('fill',T.grid).text(displayLv(s));
  svg.append('text').attr('x',m.l).attr('y',10).attr('text-anchor','start')
    .attr('font-size','8.5px').attr('font-weight','700').attr('fill',T.faint).text('RAW MATERIAL');
  svg.append('text').attr('x',W-m.r).attr('y',10).attr('text-anchor','end')
    .attr('font-size','8.5px').attr('font-weight','700').attr('fill',T.faint).text('FINAL PRODUCT');

  // straight links, atlas convention — a dendrite, not a bezier flow diagram
  svg.append('g').selectAll('line').data(edges).join('line')
    .attr('x1',e=>{const a=nm.get(cnOf(e.from_code,e.from_cn));return a?px(a):-99;})
    .attr('y1',e=>{const a=nm.get(cnOf(e.from_code,e.from_cn));return a?py(a):-99;})
    .attr('x2',e=>{const b=nm.get(cnOf(e.to_code,e.to_cn));return b?px(b):-99;})
    .attr('y2',e=>{const b=nm.get(cnOf(e.to_code,e.to_cn));return b?py(b):-99;})
    .attr('stroke',T.grid).attr('stroke-width',.7);

  const rSc=d3.scaleSqrt().domain([0,d3.max(nodes,n=>n.deg)||1]).range([3.5,10]);
  svg.append('g').selectAll('circle').data(nodes).join('circle')
    .attr('cx',px).attr('cy',py).attr('r',n=>Math.max(3,rSc(n.deg)))
    .attr('fill',n=>SR[n.stage+'|'+n.role]||'#888').attr('stroke',T.nodeStroke).attr('stroke-width',.6)
    .on('mousemove',(e,n)=>tipMove(e,'HS '+n.code+'<br><b>'+clip(n.full||n.name||n.code,64)+'</b><br>'
      +n.stage+' · '+n.role+' · step '+(stepMap.get(n.cn)||0))).on('mouseout',tipOut);
}
// Value-chain "solar system" — circular alternative to tree(): final product = Sun at
// the centre, concentric rings by step-distance to the final product (same step ⇒ same
// ring, radius ∝ product space), products = planets sized by connectivity, edges minimised
// via barycentric angle relaxation. Same tech-level input as tree() (dendrite edges).
function solarsystem(sel,edges){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  if(!edges||!edges.length) return empty(svg,W,H,'no value-chain (dendrite) data');
  const nm=new Map(); const reg=(c,nn,st,ro)=>{ if(!nm.has(c)) nm.set(c,{code:c,name:nn,stage:st,role:ro,deg:0}); return nm.get(c); };
  edges.forEach(e=>{ const a=reg(e.from_code,e.from_name,e.from_stage,e.from_role),b=reg(e.to_code,e.to_name,e.to_stage,e.to_role); a.deg++; b.deg++; });
  const nodes=[...nm.values()];
  // step = SHORTEST distance to a final product (sink = no outgoing edge); cycle-safe
  const hasOut=new Set(edges.map(e=>e.from_code));
  const step=new Map(nodes.map(n=>[n.code, hasOut.has(n.code)?Infinity:0]));
  for(let i=0;i<nodes.length;i++){ let ch=false; edges.forEach(e=>{ const d=step.get(e.to_code); if(d!==Infinity && step.get(e.from_code)>d+1){ step.set(e.from_code,d+1); ch=true; } }); if(!ch) break; }
  let fm=0; step.forEach(v=>{ if(v!==Infinity&&v>fm) fm=v; }); step.forEach((v,k)=>{ if(v===Infinity) step.set(k,fm+1); });
  const maxStep=d3.max([...step.values()])||1;
  const ringsBy=d3.groups(nodes,n=>step.get(n.code)).sort((a,b)=>a[0]-b[0]);
  // angle: barycentric relaxation → short edges, then de-overlap per ring
  const nbr=new Map(nodes.map(n=>[n.code,[]]));
  edges.forEach(e=>{ nbr.get(e.from_code).push(e.to_code); nbr.get(e.to_code).push(e.from_code); });
  const ang=new Map();
  ringsBy.forEach(([s,ns])=>{ ns.sort((a,b)=>b.deg-a.deg); ns.forEach((n,i)=>ang.set(n.code,(i/ns.length)*2*Math.PI)); });
  for(let it=0;it<60;it++){ const na=new Map();
    nodes.forEach(n=>{ const nb=nbr.get(n.code).filter(c=>ang.has(c)); if(!nb.length){ na.set(n.code,ang.get(n.code)); return; }
      let sx=0,sy=0; nb.forEach(c=>{ sx+=Math.cos(ang.get(c)); sy+=Math.sin(ang.get(c)); }); na.set(n.code,(sx||sy)?Math.atan2(sy,sx):ang.get(n.code)); });
    na.forEach((v,k)=>ang.set(k,v)); }
  ringsBy.forEach(([s,ns])=>{ ns.sort((a,b)=>ang.get(a.code)-ang.get(b.code)); const mg=(2*Math.PI)/Math.max(ns.length,1)*0.72;
    for(let i=1;i<ns.length;i++){ if(ang.get(ns[i].code)-ang.get(ns[i-1].code)<mg) ang.set(ns[i].code,ang.get(ns[i-1].code)+mg); } });
  // product-space ring radius
  const rAbs=[]; let acc=0; for(let s=0;s<=maxStep;s++){ const c=(ringsBy.find(g=>g[0]===s)||[0,[]])[1].length; acc+=1+0.16*c; rAbs[s]=acc; }
  const rMax=rAbs[maxStep]||1;
  const cx=W/2, cy=H/2+4, R0=Math.min(W,H)*0.08, maxR=Math.min(W,H)*0.44;
  const R=s=>R0+((rAbs[s]||0)/rMax)*(maxR-R0);
  const pos=c=>{ const a=ang.get(c)||0, r=R(step.get(c)||0); return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; };
  const rSc=d3.scaleSqrt().domain([0,d3.max(nodes,n=>n.deg)||1]).range([4,14]);
  for(let s=1;s<=maxStep;s++) svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',R(s)).attr('fill','none').attr('stroke',T.grid).attr('stroke-width',1);
  svg.append('g').selectAll('path').data(edges).join('path')
    .attr('d',e=>{ const a=pos(e.from_code),b=pos(e.to_code); return `M${a[0]},${a[1]}L${b[0]},${b[1]}`; })
    .attr('fill','none').attr('stroke',T.grid).attr('stroke-width',.7);
  svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',R0*0.6+9).attr('fill','#f97316').attr('opacity',.15);
  svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',R0*0.5+6).attr('fill','#f59e0b').attr('stroke','#fbbf24').attr('stroke-width',1.2)
    .on('mousemove',e=>tipMove(e,'Final product (centre)')).on('mouseout',tipOut);
  svg.append('g').selectAll('circle').data(nodes).join('circle')
    .attr('cx',n=>pos(n.code)[0]).attr('cy',n=>pos(n.code)[1]).attr('r',n=>Math.max(3,rSc(n.deg)))
    .attr('fill',n=>SR[n.stage+'|'+n.role]||'#888').attr('stroke',T.nodeStroke).attr('stroke-width',.6)
    .on('mousemove',(e,n)=>tipMove(e,(n.name||n.code)+'<br>'+n.stage+' · '+n.role+'<br>step '+step.get(n.code)+' from final')).on('mouseout',tipOut);
}
/* ── diagnostic modules (2026-08-06) ─────────────────────────────────────────────
   Seven charts ported from qmd/report/{report,visual_report}.qmd. They read the
   slices build_datadriven_proto.R emits alongside them: products_flow, deficits,
   hhi, bench — plus timeline and partners_yearly_sr, which already shipped.

   Compact-block decoding. products_flow and partners_yearly_sr ship as
   {cols, rows} with stage/role/dir/flow as 0-based integer indices resolved
   against lookup tables. The tables are FIXED CLOSED DOMAINS on the R side (see
   L_STAGE/L_ROLE/L_DIR/L_FLOW there), so the same vectors are safe to carry here
   as defaults; setLookups() lets _index.json override them if they ever move,
   which keeps one source of truth without making every page fetch the index
   before it can draw. */
let LK = {
  stage: ["Downstream","Final Product","Midstream","Upstream"],
  role:  ["Final Product","Process Equipment","Processed Material","Product Component","Raw Material"],
  dir:   ["dest","src"],
  flow:  ["exp","imp"]
};
function setLookups(l){ if(l) LK = Object.assign({}, LK, l); }
/* {cols, rows} → array of objects, decoding any column that names a lookup. */
function dec(b){
  if(!b) return [];
  if(Array.isArray(b)) return b;                       // already array-of-objects
  if(!b.cols || !b.rows) return [];
  return b.rows.map(r=>{ const o={};
    b.cols.forEach((c,i)=>{ o[c] = LK[c] ? (LK[c][r[i]] ?? r[i]) : r[i]; });
    return o; });
}
const SR_ORDER = ["Upstream|Raw Material","Upstream|Processed Material",
  "Midstream|Processed Material","Midstream|Process Equipment","Midstream|Product Component",
  "Downstream|Product Component","Downstream|Process Equipment","Downstream|Final Product",
  "Final Product|Final Product"];
/* The builder joins stage and role with " | " (spaces) while the SR table is keyed without
   them. Looking SR up on the raw string silently returns undefined and every bar falls back
   to grey — which looks like a styling choice, not a bug. Normalise on the way in. */
const srNorm = s=>String(s||'').replace(/\s*\|\s*/,'|');
const srCol  = s=>SR[srNorm(s)]||'#888';
const srSort = (a,b)=>{ const i=SR_ORDER.indexOf(srNorm(a)), j=SR_ORDER.indexOf(srNorm(b));
  return (i<0?99:i)-(j<0?99:j); };
const srLbl = s=>srNorm(s).replace('|',' · ');
const fmtPct = v=>(v*100).toFixed(v<0.1?1:0)+'%';
/* USD with a sign, for diverging/delta axes where fmtV's unsigned form would lie. */
const fmtSigned = v=>(v<0?'−':'')+fmtV(Math.abs(v));

/* 1 · BENCHMARKING — the focal country's stage·role composition against three reference
   means, imports and exports side by side.

   SEGMENT ON THE Y-AXIS, GROUPS ADJACENT WITHIN IT. The first cut of this put one row per
   reference group with nine unlabelled bars stacked inside it, which made the actual
   comparison — "is the focal country above or below the world on THIS segment" — a
   vertical scan across four separate blocks, and left the nine segments identifiable only
   by colour. Transposed, the four bars being compared sit adjacent, and each segment is
   named once. Fill is the SR colour (segment identity); opacity steps down through the
   reference groups, which the legend names. */
function benchmark(sel,rows,meta){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  rows=dec(rows);
  if(!rows.length) return empty(svg,W,H,'no benchmark data');
  const GROUPS=['Focal','WB Region','UN Subregion','World'].filter(g=>rows.some(r=>r.group===g));
  const FLOWS=['Imports','Exports'].filter(f=>rows.some(r=>r.flow===f));
  const srs=[...new Set(rows.map(r=>srNorm(r.stage_role)))].sort(srSort);
  const label=g=>g==='Focal'?((meta&&meta.focal_label)||'Focal')
    :g==='WB Region'?((meta&&meta.wb_region)||'WB Region')
    :g==='UN Subregion'?((meta&&meta.un_subregion)||'UN Subregion')
    :'World'+(meta&&meta.n_world?' ('+meta.n_world+')':'');
  const OP=[.95,.68,.46,.28];                     // Focal → World, matching GROUPS order
  const m={t:40,r:10,b:26,l:Math.min(146,W*0.33)};
  const cw=(W-m.l-m.r)/FLOWS.length, plotW=cw-16;
  const maxv=d3.max(rows,r=>r.share)||1;
  const x=d3.scaleLinear().domain([0,maxv]).nice().range([0,plotW]);
  const y=d3.scaleBand().domain(srs).range([m.t,H-m.b]).padding(.22);
  const bh=y.bandwidth()/GROUPS.length;
  FLOWS.forEach((f,fi)=>svg.append('text').attr('x',m.l+cw*fi+plotW/2).attr('y',11)
    .attr('text-anchor','middle').attr('font-size','9.5px').attr('font-weight','700')
    .attr('fill',T.title).text(f));
  srs.forEach(sr=>{
    svg.append('text').attr('x',m.l-7).attr('y',y(sr)+y.bandwidth()/2).attr('text-anchor','end')
      // 5.4 px/char, not 4.7: at 8px the longer segment names ("Downstream · Product
      // Component") were running off the left edge of the panel with the first letter cut.
      .attr('dominant-baseline','middle').attr('font-size','8px').attr('fill',T.label)
      .text(clip(srLbl(sr),Math.floor((m.l-12)/5.4)));
    FLOWS.forEach((f,fi)=>GROUPS.forEach((g,gi)=>{
      const rec=rows.find(r=>r.group===g&&r.flow===f&&srNorm(r.stage_role)===sr);
      const v=rec?rec.share:0;
      svg.append('rect').attr('x',m.l+cw*fi).attr('y',y(sr)+bh*gi)
        .attr('width',Math.max(v>0?1:0,x(v))).attr('height',Math.max(1,bh-1))
        .attr('rx',1).attr('fill',srCol(sr)).attr('opacity',OP[gi]??.3)
        .on('mousemove',e=>tipMove(e,`<b>${srLbl(sr)}</b> · ${f}<br>${label(g)}: <b>${fmtPct(v)}</b> of total flow`))
        .on('mouseout',tipOut);
    }));
  });
  FLOWS.forEach((f,fi)=>styleAxis(svg.append('g')
    .attr('transform',`translate(${m.l+cw*fi},${H-m.b+2})`)
    .call(d3.axisBottom(x).ticks(3).tickFormat(fmtPct))));
  // Legend names the four groups by opacity step, in the same order the bars run top-to-bottom.
  legend(svg,m.l,26,GROUPS.map((g,gi)=>[
    d3.color(T.label).copy({opacity:OP[gi]??.3}).formatRgb(), label(g)]));
}

/* 2 · DEFICIT WIDENING — Δ mean annual deficit, last window minus first, by stage·role.
   Computed client-side from `timeline`, which already ships: no new slice. Diverging
   about zero, because a NARROWING deficit is the interesting opposite case and a
   one-sided bar chart would hide it. */
function deficitWidening(sel,timeline,periods){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  const tl=dec(timeline);
  if(!tl.length) return empty(svg,W,H,'no trade data');
  const P=(periods&&periods.length>=2)?periods:['1995–2005','2015–2024'];
  const first=P[0], last=P[P.length-1];
  const parse=p=>p.split(/[–-]/).map(Number);
  const [f0,f1]=parse(first), [l0,l1]=parse(last);
  const win=(y,a,b)=>y>=a&&y<=b;
  const agg={};
  tl.forEach(r=>{ const k=r.stage+'|'+r.role; (agg[k]=agg[k]||{f:{e:0,i:0},l:{e:0,i:0}});
    const s=win(r.year,f0,f1)?agg[k].f:win(r.year,l0,l1)?agg[k].l:null; if(!s) return;
    if(r.flow==='exp') s.e+=r.v; else s.i+=r.v; });
  const rows=Object.entries(agg).map(([k,a])=>({sr:k,
      d:(Math.max(a.l.i-a.l.e,0)/(l1-l0+1))-(Math.max(a.f.i-a.f.e,0)/(f1-f0+1))}))
    .filter(r=>isFinite(r.d)&&r.d!==0).sort((a,b)=>b.d-a.d);
  if(!rows.length) return empty(svg,W,H,'no deficit change to show');
  const m={t:22,r:14,b:26,l:Math.min(126,W*0.34)};
  const ext=d3.extent(rows,r=>r.d); const lo=Math.min(0,ext[0]), hi=Math.max(0,ext[1]);
  const x=d3.scaleLinear().domain([lo,hi]).nice().range([m.l,W-m.r]);
  const y=d3.scaleBand().domain(rows.map(r=>r.sr)).range([m.t,H-m.b]).padding(.28);
  svg.append('text').attr('x',m.l).attr('y',11).attr('font-size','9px').attr('font-weight','700')
    .attr('fill',T.title).text(`Δ mean annual deficit · ${last} minus ${first}`);
  svg.append('g').selectAll('rect').data(rows).join('rect')
    .attr('x',r=>x(Math.min(0,r.d))).attr('y',r=>y(r.sr))
    .attr('width',r=>Math.max(1,Math.abs(x(r.d)-x(0)))).attr('height',y.bandwidth())
    .attr('rx',3).attr('fill',r=>srCol(r.sr)).attr('opacity',.92)
    .on('mousemove',(e,r)=>tipMove(e,`<b>${srLbl(r.sr)}</b><br>${r.d>0?'widened':'narrowed'} by ${fmtV(Math.abs(r.d))}/yr`))
    .on('mouseout',tipOut);
  rows.forEach(r=>svg.append('text').attr('x',m.l-6).attr('y',y(r.sr)+y.bandwidth()/2)
    .attr('text-anchor','end').attr('dominant-baseline','middle').attr('font-size','8.5px')
    .attr('fill',T.label).text(clip(srLbl(r.sr),Math.floor(m.l/5.2))));
  svg.append('line').attr('x1',x(0)).attr('x2',x(0)).attr('y1',m.t).attr('y2',H-m.b)
    .attr('stroke',T.axis).attr('stroke-width',1);
  styleAxis(svg.append('g').attr('transform',`translate(0,${H-m.b})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(fmtSigned)));
}

/* 3 · TOP PERSISTENT DEFICITS — one bar per HS6 code, NOT per process step.
   report.qmd draws this at codename level, so Solar's 848620 contributes 15 bars of
   identical height: trade data is HS6, so that is ONE number printed fifteen times and
   read as fifteen findings. Here the code appears once and its process steps are named
   in the tooltip. `persistent` (a deficit in every subperiod) is carried as opacity +
   a ring rather than by filtering, so the non-persistent context stays visible. */
function persistentDeficits(sel,rows,periods){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  rows=dec(rows);
  if(!rows.length) return empty(svg,W,H,'no deficit data');
  const last=(periods&&periods.length)?periods[periods.length-1]:'the recent window';
  const top=rows.slice().sort((a,b)=>b.mean_deficit_recent-a.mean_deficit_recent).slice(0,15);
  const m={t:38,r:16,b:26,l:Math.min(190,W*0.44)};
  const x=d3.scaleLinear().domain([0,d3.max(top,r=>r.mean_deficit_recent)||1]).nice().range([m.l,W-m.r]);
  const y=d3.scaleBand().domain(top.map(r=>r.code)).range([m.t,H-m.b]).padding(.24);
  svg.append('text').attr('x',m.l).attr('y',11).attr('font-size','9px').attr('font-weight','700')
    .attr('fill',T.title).text(`Mean annual deficit · ${last}`);
  svg.append('g').selectAll('rect').data(top).join('rect')
    .attr('x',m.l).attr('y',r=>y(r.code)).attr('height',y.bandwidth())
    .attr('width',r=>Math.max(1,x(r.mean_deficit_recent)-m.l)).attr('rx',3)
    .attr('fill',r=>srCol(r.stage+'|'+r.role))
    .attr('opacity',r=>r.persistent?.95:.42)
    .attr('stroke',r=>r.persistent?T.nodeStroke:'none').attr('stroke-width',1)
    .on('mousemove',(e,r)=>tipMove(e,
      `HS ${r.code}<br><b>${clip(r.desc_full||r.product_name,72)}</b><br>`+
      `${r.stage} · ${r.role}<br>${fmtV(r.mean_deficit_recent)}/yr · deficit in `+
      `${r.n_periods} of ${(periods&&periods.length)||3} subperiods`+
      (r.n_steps>0?`<br><span style="opacity:.75">${r.n_steps} process step${r.n_steps>1?'s':''} on this code: `+
        clip(r.steps,150)+'</span>':'')))
    .on('mouseout',tipOut);
  top.forEach(r=>svg.append('text').attr('x',m.l-6).attr('y',y(r.code)+y.bandwidth()/2)
    .attr('text-anchor','end').attr('dominant-baseline','middle').attr('font-size','8px')
    .attr('fill',r.persistent?T.label:T.faint)
    .text(clip(r.code+' '+(r.product_name||''),Math.floor(m.l/4.9))));
  styleAxis(svg.append('g').attr('transform',`translate(0,${H-m.b})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(fmtV)));
  legend(svg,m.l,26,[[T.label,'full opacity = deficit in every subperiod']]);
}

/* 4 · HHI CONCENTRATION OVER TIME — four series that are really a 2x2:
   {Imports, Deficits} x {partner, product}. Encoding that as four unrelated hues hides
   the structure, so hue carries the DIMENSION (who vs what) and dash carries the
   MEASURE (imports vs deficit exposure). Two hues also means only two colours had to
   clear the CVD checks — #6366f1/#16a34a pass all six in both light and dark
   (ΔE 28.7 deutan, 33.9 normal). */
const HHI_HUE = {partner:'#6366f1', product:'#16a34a'};
function hhi(sel,rows){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  rows=dec(rows);
  if(!rows.length) return empty(svg,W,H,'no concentration data');
  const parse=s=>({dim:/partner/i.test(s)?'partner':'product',
                   measure:/deficit/i.test(s)?'Deficits':'Imports'});
  const series=d3.groups(rows,r=>r.series);
  const m={t:40,r:10,b:26,l:44};
  const x=d3.scaleLinear().domain(d3.extent(rows,r=>r.year)).range([m.l,W-m.r]);
  const y=d3.scaleLinear().domain([0,Math.min(1,(d3.max(rows,r=>r.hhi)||1)*1.1)]).nice().range([H-m.b,m.t]);
  const line=d3.line().x(d=>x(d.year)).y(d=>y(d.hhi)).defined(d=>isFinite(d.hhi));
  svg.append('text').attr('x',m.l).attr('y',11).attr('font-size','9px').attr('font-weight','700')
    .attr('fill',T.title).text('Higher = more concentrated dependence');
  series.forEach(([name,vals])=>{ const p=parse(name);
    svg.append('path').datum(vals.slice().sort((a,b)=>a.year-b.year)).attr('d',line)
      .attr('fill','none').attr('stroke',HHI_HUE[p.dim]).attr('stroke-width',2)
      .attr('stroke-dasharray',p.measure==='Deficits'?'4,3':null)
      .attr('opacity',.92); });
  styleAxis(svg.append('g').attr('transform',`translate(0,${H-m.b})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('d'))));
  styleAxis(svg.append('g').attr('transform',`translate(${m.l},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.2f'))));
  // hover crosshair: one tooltip naming all four series at the year under the cursor
  const hit=svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',Math.max(0,W-m.l-m.r))
    .attr('height',Math.max(0,H-m.t-m.b)).attr('fill','transparent');
  const cross=svg.append('line').attr('y1',m.t).attr('y2',H-m.b).attr('stroke',T.axis)
    .attr('stroke-width',1).attr('opacity',0).attr('pointer-events','none');
  hit.on('mousemove',ev=>{
    const yr=Math.round(x.invert(d3.pointer(ev,svg.node())[0]));
    cross.attr('x1',x(yr)).attr('x2',x(yr)).attr('opacity',.6);
    const at=rows.filter(r=>r.year===yr).sort((a,b)=>b.hhi-a.hhi);
    if(!at.length) return;
    tipMove(ev,`<b>${yr}</b><br>`+at.map(r=>{const p=parse(r.series);
      return `<span style="color:${HHI_HUE[p.dim]}">■</span> ${r.series}: <b>${(+r.hhi).toFixed(3)}</b>`;
    }).join('<br>'));
  }).on('mouseout',()=>{ cross.attr('opacity',0); tipOut(); });
  legend(svg,m.l+2,26,[[HHI_HUE.partner,'partner (who)'],[HHI_HUE.product,'product (what)'],
                       [T.faint,'dashed = deficit exposure']]);
}

/* 5 · TOP PARTNERS BY STAGE·ROLE — stacked bars, top-15 partners by mean annual value,
   segmented by value-chain position. dir='src' = exporters TO the focal country,
   dir='dest' = importers FROM it. One function, two modules: the two charts differ only
   in which side of the flow they read. Reads partners_yearly_sr, which already shipped. */
function topPartnersSR(sel,block,dir){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  const all=dec(block).filter(r=>r.dir===dir);
  if(!all.length) return empty(svg,W,H,dir==='src'?'no import partners':'no export partners');
  const nYears=new Set(all.map(r=>r.year)).size||1;
  /* Nested Map, not a concatenated "partner<sep>stage|role" string key. A composite
     string key needs a separator guaranteed absent from every component, and the
     obvious candidates are not: a space appears inside "Process Equipment" and "|"
     is already the stage/role joiner, so splitting one back out is guesswork.
     Nesting sidesteps the question entirely. */
  const agg=new Map();      // partner -> Map(stage|role -> v)
  const byP=new Map();      // partner -> total v
  all.forEach(r=>{ const sr=srNorm(r.stage+'|'+r.role);
    let inner=agg.get(r.partner); if(!inner){ inner=new Map(); agg.set(r.partner,inner); }
    inner.set(sr,(inner.get(sr)||0)+r.v);
    byP.set(r.partner,(byP.get(r.partner)||0)+r.v); });
  const top=[...byP.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15).map(d=>d[0]);
  const srs=[...new Set(all.map(r=>srNorm(r.stage+'|'+r.role)))].sort(srSort);
  const m={t:22,r:14,b:24,l:44};
  const x=d3.scaleLinear().domain([0,(d3.max(top,p=>byP.get(p))||1)/nYears]).nice().range([m.l,W-m.r]);
  const y=d3.scaleBand().domain(top).range([m.t,H-m.b]).padding(.24);
  svg.append('text').attr('x',m.l).attr('y',11).attr('font-size','9px').attr('font-weight','700')
    .attr('fill',T.title).text(dir==='src'?'Top exporters to this country · mean annual'
                                          :'Top importers from this country · mean annual');
  top.forEach(p=>{ let acc=0;
    srs.forEach(sr=>{ const v=((agg.get(p)||new Map()).get(sr)||0)/nYears; if(v<=0) return;
      const x0=x(acc), x1=x(acc+v); acc+=v;
      svg.append('rect').attr('x',x0).attr('y',y(p))
        .attr('width',Math.max(.5,x1-x0-2))                    // 2px surface gap between segments
        .attr('height',y.bandwidth()).attr('rx',2)
        .attr('fill',srCol(sr)).attr('opacity',.92)
        .on('mousemove',e=>tipMove(e,`<b>${p}</b> · ${srLbl(sr)}<br>${fmtV(v)}/yr`))
        .on('mouseout',tipOut); });
    svg.append('text').attr('x',m.l-6).attr('y',y(p)+y.bandwidth()/2).attr('text-anchor','end')
      .attr('dominant-baseline','middle').attr('font-size','8.5px').attr('fill',T.label).text(p); });
  styleAxis(svg.append('g').attr('transform',`translate(0,${H-m.b})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(fmtV)));
}

/* 6 · BEST AND WORST BY NET BALANCE — the largest surpluses above the line, the largest
   deficits below it, one diverging chart rather than two lists. Reads products_flow. */
function netBalance(sel,block,products){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  const pf=dec(block);
  if(!pf.length) return empty(svg,W,H,'no product flow data');
  const meta=new Map((products||[]).map(p=>[p.code,p]));
  const bal=new Map();
  pf.forEach(r=>{ const b=bal.get(r.code)||{e:0,i:0}; if(r.flow==='exp') b.e+=r.v; else b.i+=r.v; bal.set(r.code,b); });
  const rows=[...bal.entries()].map(([code,b])=>({code,v:b.e-b.i,
      p:meta.get(code)||{}})).filter(r=>isFinite(r.v)&&r.v!==0);
  if(!rows.length) return empty(svg,W,H,'no net balance to show');
  const N=7;
  const srt=rows.slice().sort((a,b)=>b.v-a.v);
  const pick=[...srt.slice(0,N),...srt.slice(-N)];
  const seen=new Set(); const top=pick.filter(r=>seen.has(r.code)?false:(seen.add(r.code),true))
    .sort((a,b)=>b.v-a.v);
  const m={t:24,r:14,b:24,l:Math.min(178,W*0.42)};
  const ext=d3.extent(top,r=>r.v);
  const x=d3.scaleLinear().domain([Math.min(0,ext[0]),Math.max(0,ext[1])]).nice().range([m.l,W-m.r]);
  const y=d3.scaleBand().domain(top.map(r=>r.code)).range([m.t,H-m.b]).padding(.22);
  svg.append('text').attr('x',m.l).attr('y',11).attr('font-size','9px').attr('font-weight','700')
    .attr('fill',T.title).text('Net balance by product · exports minus imports, all years');
  svg.append('g').selectAll('rect').data(top).join('rect')
    .attr('x',r=>x(Math.min(0,r.v))).attr('y',r=>y(r.code))
    .attr('width',r=>Math.max(1,Math.abs(x(r.v)-x(0)))).attr('height',y.bandwidth()).attr('rx',3)
    .attr('fill',r=>srCol((r.p.stage||'')+'|'+(r.p.role||''))).attr('opacity',.92)
    .on('mousemove',(e,r)=>tipMove(e,`HS ${r.code}<br><b>${clip(r.p.desc_full||r.p.product_name||r.code,72)}</b>`+
      `<br>${r.v>0?'surplus':'deficit'} ${fmtV(Math.abs(r.v))}`))
    .on('mouseout',tipOut);
  top.forEach(r=>svg.append('text').attr('x',m.l-6).attr('y',y(r.code)+y.bandwidth()/2)
    .attr('text-anchor','end').attr('dominant-baseline','middle').attr('font-size','8px')
    .attr('fill',T.label).text(clip(r.code+' '+(r.p.product_name||''),Math.floor(m.l/4.9))));
  svg.append('line').attr('x1',x(0)).attr('x2',x(0)).attr('y1',m.t).attr('y2',H-m.b)
    .attr('stroke',T.axis).attr('stroke-width',1);
  styleAxis(svg.append('g').attr('transform',`translate(0,${H-m.b})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(fmtSigned)));
}

function empty(svg,W,H,msg,muted){ svg.append('text').attr('x',W/2).attr('y',H/2).attr('text-anchor','middle').attr('fill',T.empty).attr('font-size','12px').text(msg); }
// small inline swatch legend (top-left of a chart)
function legend(svg,x,y,items){ const g=svg.append('g').attr('transform',`translate(${x},${y})`); let dx=0;
  items.forEach(([col,lab])=>{ const it=g.append('g').attr('transform',`translate(${dx},0)`);
    it.append('rect').attr('width',9).attr('height',9).attr('rx',2).attr('y',-8).attr('fill',col);
    const tx=it.append('text').attr('x',13).attr('y',0).attr('font-size','9px').attr('fill',T.label).text(lab);
    dx += 13 + (tx.node()?tx.node().getComputedTextLength():lab.length*5.4) + 14; }); }

/* ── auto-generated highlight bullets (data-driven) ──────────────────────────── */
function highlights(kind,d,td){
  const out=[];
  const expTL=(d.timeline||[]).filter(r=>r.flow==='exp');
  const sumBy=(arr,k)=>{const m={};arr.forEach(r=>m[r[k]]=(m[r[k]]||0)+r.v);return m;};
  const top=(m,n=1)=>Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n);
  const totExp=d3.sum(expTL,r=>r.v), years=[...new Set(expTL.map(r=>r.year))].sort((a,b)=>a-b);
  if(kind==='radar'){
    const r=(d.radar||[]).filter(x=>x.rca>0);
    if(r.length){ const t=r.slice().sort((a,b)=>b.rca-a.rca)[0]; out.push(`Strongest revealed capability: <b>${t.category}</b> (RCA ${(+t.rca).toFixed(2)}).`); }
    const s=(d.radar||[]).slice().sort((a,b)=>Math.abs(b.shap)-Math.abs(a.shap))[0];
    if(s) out.push(`Most model-important category for this tech: <b>${s.category}</b>.`);
    if(!r.length) out.push('No predicted-competitiveness data available for this technology yet.');
  } else if(kind==='scatter'){
    const sc=d.scatter||[];
    if(sc.length){ out.push(`${sc.length} products scored on SHAP importance × trade value.`);
      const big=sc.slice().sort((a,b)=>b.v-a.v)[0]; out.push(`Largest-value product: <b>${(big.name||big.code)}</b> (${fmtV(big.v)}).`);
      const gap=sc.slice().sort((a,b)=>b.shap-a.shap)[0]; if(gap) out.push(`Highest model-priority product: <b>${(gap.name||gap.code)}</b> (SHAP ${(+gap.shap).toFixed(2)}).`);
    } else out.push('No PC / SHAP product data for this technology yet.');
  } else if(kind==='timeline'){
    if(years.length){ const first=d3.sum(expTL.filter(r=>r.year===years[0]),r=>r.v), last=d3.sum(expTL.filter(r=>r.year===years.at(-1)),r=>r.v);
      out.push(`Exports ${fmtV(first)} (${years[0]}) → <b>${fmtV(last)}</b> (${years.at(-1)}).`);
      const byStage=top(sumBy(expTL,'stage'),1)[0]; if(byStage) out.push(`Largest value-chain stage by exports: <b>${byStage[0]}</b>.`);
    }
  } else if(kind==='treemap'){
    const p=d.products||[]; const byStage=top(sumBy(p,'stage'),1)[0];
    if(p.length){ out.push(`${p.length} traded products; top product <b>${(p[0].product_name||p[0].code)}</b> (${fmtV(p[0].v)}).`);
      if(byStage) out.push(`Composition concentrated in <b>${byStage[0]}</b>.`); }
  } else if(kind==='map'||kind==='partners'){
    const pl=partnersLatest(d);
    const dest=pl.filter(r=>r.dir==='dest').sort((a,b)=>b.v-a.v);
    const src=pl.filter(r=>r.dir==='src').sort((a,b)=>b.v-a.v);
    if(dest[0]) out.push(`Top export destination: <b>${dest[0].partner}</b> (${fmtV(dest[0].v)}).`);
    if(src[0]) out.push(`Top import source: <b>${src[0].partner}</b> (${fmtV(src[0].v)}).`);
  } else if(kind==='firms'){
    const f=d.firms||[]; if(f.length){ const n=d3.sum(f,r=>r.n); out.push(`<b>${n}</b> firm location${n>1?'s':''} across ${f.length} site${f.length>1?'s':''} (S&P).`);
      const byStage=top(sumBy(f.map(x=>({stage:x.stage,v:x.n})),'stage'),1)[0]; if(byStage) out.push(`Most firms at the <b>${byStage[0]}</b> stage.`);
    } else out.push('No S&P firm coverage for this country (focal-7 only).');
  } else if(kind==='sankey'){
    const fl=(td&&td.sankey)||[]; if(fl.length){ const tw=d3.sum(fl,f=>f.weight); out.push(`${fl.length} bilateral flows across the 7-lane value chain (${fmtV(tw)} total, ${td.year}).`);
      const bigf=fl.slice().sort((a,b)=>b.weight-a.weight)[0]; if(bigf) out.push(`Largest flow: <b>${bigf.from_country}→${bigf.to_country}</b> (${fmtV(bigf.weight)}).`); }
  } else if(kind==='tree'||kind==='solar_system'){
    const e=(td&&td.tree)||[]; if(e.length){ const codes=new Set(); e.forEach(x=>{codes.add(x.from_code);codes.add(x.to_code);});
      const steps=new Set(); e.forEach(x=>{steps.add(x.from_cn||x.from_code);steps.add(x.to_cn||x.to_code);});
      out.push(`Production process spans <b>${codes.size}</b> HS products across ${steps.size} process steps, and ${e.length} transformation links.`); }
  } else if(kind==='benchmark'){
    const b=dec(d.bench)||[];
    if(b.length){ const f=b.filter(r=>r.group==='Focal'&&r.flow==='Imports').sort((x,y)=>y.share-x.share)[0];
      const w=b.filter(r=>r.group==='World'&&r.flow==='Imports');
      if(f){ const wm=w.find(r=>r.stage_role===f.stage_role);
        out.push(`Largest import segment: <b>${srLbl(f.stage_role)}</b> at ${fmtPct(f.share)}`+
          (wm?` — world average ${fmtPct(wm.share)}.`:'.')); }
      const gaps=b.filter(r=>r.group==='Focal'&&r.flow==='Exports').map(r=>{
        const wm=w.length?b.find(q=>q.group==='World'&&q.flow==='Exports'&&q.stage_role===r.stage_role):null;
        return wm?{sr:r.stage_role,d:r.share-wm.share}:null; }).filter(Boolean)
        .sort((x,y)=>x.d-y.d)[0];
      if(gaps) out.push(`Furthest below the world export average: <b>${srLbl(gaps.sr)}</b> (${fmtPct(gaps.d)}).`);
    } else out.push('No benchmark data for this case yet.');
  } else if(kind==='deficit_widening'){
    const tl=dec(d.timeline)||[];
    if(tl.length) out.push('Positive bars are segments where import dependence grew faster than export capacity.');
    else out.push('No trade data for this case yet.');
  } else if(kind==='persistent_deficits'){
    const r=dec(d.deficits)||[]; const p=r.filter(x=>x.persistent);
    if(r.length){ out.push(`<b>${p.length}</b> of ${r.length} products run a deficit in every subperiod.`);
      const t=r.slice().sort((a,b)=>b.mean_deficit_recent-a.mean_deficit_recent)[0];
      if(t) out.push(`Largest: <b>${t.product_name||t.code}</b> (${fmtV(t.mean_deficit_recent)}/yr).`);
      const multi=r.filter(x=>x.n_steps>1).length;
      if(multi) out.push(`${multi} of these HS codes carry more than one process step — one code, one number.`);
    } else out.push('No persistent deficits for this case.');
  } else if(kind==='hhi'){
    const h=dec(d.hhi)||[];
    if(h.length){ const yrs=[...new Set(h.map(r=>r.year))].sort((a,b)=>a-b); const ly=yrs.at(-1);
      const at=h.filter(r=>r.year===ly).sort((a,b)=>b.hhi-a.hhi)[0];
      if(at) out.push(`Most concentrated in ${ly}: <b>${at.series}</b> (HHI ${(+at.hhi).toFixed(3)}).`);
      const pp=h.filter(r=>/product/i.test(r.series)&&r.year===ly);
      const pt=h.filter(r=>/partner/i.test(r.series)&&r.year===ly);
      if(pp.length&&pt.length){ const a=d3.mean(pp,r=>r.hhi), b=d3.mean(pt,r=>r.hhi);
        out.push(a>b?'Dependence is concentrated more in <b>which products</b> than in which partners.'
                   :'Dependence is concentrated more in <b>which partners</b> than in which products.'); }
    } else out.push('No concentration series for this case yet.');
  } else if(kind==='top_exporters'||kind==='top_importers'){
    const dir=kind==='top_exporters'?'src':'dest';
    const rows=dec(d.partners_yearly_sr).filter(r=>r.dir===dir);
    if(rows.length){ const by={}; rows.forEach(r=>by[r.partner]=(by[r.partner]||0)+r.v);
      const t=top(by,3);
      if(t[0]) out.push(`Top ${kind==='top_exporters'?'source':'destination'}: <b>${t[0][0]}</b>.`);
      const tot=Object.values(by).reduce((a,b)=>a+b,0);
      if(tot&&t.length) out.push(`Top three account for <b>${fmtPct(t.reduce((a,b)=>a+b[1],0)/tot)}</b> of the flow shown.`);
    } else out.push('No partner data for this case yet.');
  } else if(kind==='net_balance'){
    const pf=dec(d.products_flow);
    if(pf.length){ const bal={}; pf.forEach(r=>{ bal[r.code]=(bal[r.code]||0)+(r.flow==='exp'?r.v:-r.v); });
      const e=Object.entries(bal).sort((a,b)=>b[1]-a[1]);
      const nm=c=>{ const p=(d.products||[]).find(x=>x.code===c); return p?(p.product_name||c):c; };
      if(e[0]&&e[0][1]>0) out.push(`Largest surplus: <b>${nm(e[0][0])}</b> (${fmtV(e[0][1])}).`);
      const w=e.at(-1); if(w&&w[1]<0) out.push(`Largest deficit: <b>${nm(w[0])}</b> (${fmtV(-w[1])}).`);
    } else out.push('No product flow data for this case yet.');
  }
  return out;
}

global.VIZ = {SR,CAT,fmtV,setTheme,initGeo,radar,scatter,timeline,treemap,map,firms,sankey,tree,solarsystem,highlights,
  partnersLatest,
  // diagnostic modules (2026-08-06) + the compact-block decoder they share
  benchmark,deficitWidening,persistentDeficits,hhi,topPartnersSR,netBalance,setLookups,dec,
  // additive exports for the integrated explorer (integrated_explorer.html) — reuse the engine's
  // focal projection + geo tables without duplicating them. Getters because CENT
  // and FEATS are populated by initGeo() after load.
  ISO3N, baseMap, dims, centroids:()=>CENT, feats:()=>FEATS};
})(window);
