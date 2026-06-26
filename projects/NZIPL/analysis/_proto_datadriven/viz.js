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
const SR = {
  "Upstream|Raw Material":"#b45309","Upstream|Processed Material":"#c17a2e",
  "Midstream|Processed Material":"#22c55e","Midstream|Process Equipment":"#65a30d",
  "Midstream|Product Component":"#16a34a","Downstream|Product Component":"#4ade80",
  "Downstream|Process Equipment":"#6b7280","Downstream|Final Product":"#f97316",
  "Final Product|Final Product":"#f97316"
};
const CAT = {Chemicals:"#2563eb",Electronics:"#7c3aed",Metals:"#ef4444",Machinery:"#10b981","Industrial Materials":"#f59e0b",Other:"#6b7280"};
const LANE = ["#b45309","#c17a2e","#22c55e","#65a30d","#16a34a","#f97316","#f97316"];
const STAGE_X = {Upstream:0,Midstream:1,Downstream:2,"Final Product":3};
const STAGES = ['Upstream','Midstream','Downstream','Final Product'];
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
function baseMap(svg,W,H,focalIso){
  svg.selectAll('*').remove();
  if(!FEATS){ empty(svg,W,H,'world map unavailable'); return null; }
  const proj=d3.geoNaturalEarth1().rotate([-10,0,0]);
  const focalFeat=focalIso?FEATS.find(f=>parseInt(f.id)===ISO3N[focalIso]):null;
  if(focalFeat){ proj.fitExtent([[W*0.16,H*0.16],[W*0.84,H*0.84]],focalFeat); }
  else { proj.fitSize([W,H],{type:'FeatureCollection',features:FEATS}); }
  svg.append('g').selectAll('path').data(FEATS).join('path').attr('d',d3.geoPath(proj))
    .attr('fill',d=>focalFeat&&d===focalFeat?T.focalLand:T.land)
    .attr('stroke',d=>focalFeat&&d===focalFeat?T.focalStroke:T.landStroke)
    .attr('stroke-width',d=>focalFeat&&d===focalFeat?.9:.5);
  return {svg,proj};
}
function map(sel,parts,focal){
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
function tree(sel,edges){
  const {W,H}=dims(sel); const svg=d3.select(sel); svg.selectAll('*').remove();
  if(!edges||!edges.length) return empty(svg,W,H,'no tech-tree edges');
  const m={t:26,r:10,b:10,l:10};
  const nodes=new Map(); const reg=(c,nm,st,ro)=>{ if(!nodes.has(c)) nodes.set(c,{code:c,name:nm,stage:st,role:ro,deg:0}); return nodes.get(c); };
  edges.forEach(e=>{ const a=reg(e.from_code,e.from_name,e.from_stage,e.from_role),b=reg(e.to_code,e.to_name,e.to_stage,e.to_role); a.deg++; b.deg++; });
  const colX=s=>m.l+(W-m.l-m.r)*((STAGE_X[s]??1)/3);
  const byStage=d3.groups([...nodes.values()],d=>d.stage);
  byStage.forEach(([st,ns])=>{ ns.sort((a,b)=>b.deg-a.deg); const step=(H-m.t-m.b)/(ns.length+1); ns.forEach((n,i)=>{ n.x=colX(st); n.y=m.t+step*(i+1); }); });
  STAGES.forEach((s,si)=>{ if(!byStage.find(g=>g[0]===s)) return; const anc=si===0?'start':si===STAGES.length-1?'end':'middle', lx=si===0?colX(s)-6:si===STAGES.length-1?colX(s)+6:colX(s);
    svg.append('text').attr('x',lx).attr('y',14).attr('text-anchor',anc).attr('font-size','9px').attr('fill',T.faint).attr('font-weight','700').text(s.toUpperCase()); });
  svg.append('g').selectAll('path').data(edges).join('path')
    .attr('d',e=>{ const a=nodes.get(e.from_code),b=nodes.get(e.to_code); if(!a||!b)return null; const xm=(a.x+b.x)/2; return `M${a.x},${a.y} C${xm},${a.y} ${xm},${b.y} ${b.x},${b.y}`; })
    .attr('fill','none').attr('stroke',T.grid).attr('stroke-width',1);
  svg.append('g').selectAll('circle').data([...nodes.values()]).join('circle')
    .attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',d=>Math.min(9,4+d.deg)).attr('fill',d=>SR[d.stage+'|'+d.role]||'#888').attr('stroke',T.nodeStroke)
    .on('mousemove',(e,d)=>tipMove(e,(d.name||d.code)+'<br>'+d.stage+' · '+d.role)).on('mouseout',tipOut);
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
    const dest=(d.partners||[]).filter(r=>r.dir==='dest').sort((a,b)=>b.v-a.v);
    const src=(d.partners||[]).filter(r=>r.dir==='src').sort((a,b)=>b.v-a.v);
    if(dest[0]) out.push(`Top export destination: <b>${dest[0].partner}</b> (${fmtV(dest[0].v)}).`);
    if(src[0]) out.push(`Top import source: <b>${src[0].partner}</b> (${fmtV(src[0].v)}).`);
  } else if(kind==='firms'){
    const f=d.firms||[]; if(f.length){ const n=d3.sum(f,r=>r.n); out.push(`<b>${n}</b> firm location${n>1?'s':''} across ${f.length} site${f.length>1?'s':''} (S&P).`);
      const byStage=top(sumBy(f.map(x=>({stage:x.stage,v:x.n})),'stage'),1)[0]; if(byStage) out.push(`Most firms at the <b>${byStage[0]}</b> stage.`);
    } else out.push('No S&P firm coverage for this country (focal-7 only).');
  } else if(kind==='sankey'){
    const fl=(td&&td.sankey)||[]; if(fl.length){ const tw=d3.sum(fl,f=>f.weight); out.push(`${fl.length} bilateral flows across the 7-lane value chain (${fmtV(tw)} total, ${td.year}).`);
      const bigf=fl.slice().sort((a,b)=>b.weight-a.weight)[0]; if(bigf) out.push(`Largest flow: <b>${bigf.from_country}→${bigf.to_country}</b> (${fmtV(bigf.weight)}).`); }
  } else if(kind==='tree'){
    const e=(td&&td.tree)||[]; if(e.length){ const codes=new Set(); e.forEach(x=>{codes.add(x.from_code);codes.add(x.to_code);});
      out.push(`Production process spans <b>${codes.size}</b> HS products and ${e.length} transformation links.`); }
  }
  return out;
}

global.VIZ = {SR,CAT,fmtV,setTheme,initGeo,radar,scatter,timeline,treemap,map,firms,sankey,tree,highlights};
})(window);
