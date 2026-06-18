#!/usr/bin/env python3
"""v3: country specialization toggle, scatter quadrant guides,
shareable URL state, PNG/CSV export. Built FROM v2 (keeps all v2 edits)."""
import json, base64, gzip, re

SRC = "/Users/gilbertogarcia/Code/GripPoint/projects/nzipl/NZIPL-Solar-Dashboard-v2.html"
OUT = "/Users/gilbertogarcia/Code/GripPoint/projects/nzipl/NZIPL-Solar-Dashboard-v3.html"

html = open(SRC, encoding="utf-8").read()
size_before = len(html.encode("utf-8"))
lines = html.split("\n")
bidx = max(range(len(lines)), key=lambda i: len(lines[i]))
bundle = json.loads(lines[bidx])

def dec(u):
    raw = base64.b64decode(bundle[u]["data"])
    return gzip.decompress(raw) if raw[:2]==b"\x1f\x8b" else raw
def recompress(u, b):
    bundle[u]["data"] = base64.b64encode(gzip.compress(b, 9, mtime=0)).decode("ascii")
    bundle[u]["compressed"] = True

roles={}
for u in bundle:
    if bundle[u].get("mime")!="application/javascript": continue
    h = dec(u)[:200].decode("utf-8","replace")
    if "charts.js" in h: roles["charts"]=u
    elif "map.js" in h: roles["map"]=u
    elif "main.js" in h: roles["main"]=u
print("roles:", roles)

# ---------- charts.js ----------
ch = dec(roles["charts"]).decode("utf-8")

ch = ch.replace(
"  var focusCode = null;\n  function col(code, baseHex){",
"  var focusCode = null;\n  var countryMode = 'firms';\n  function col(code, baseHex){", 1)

old_country = """    Plotly.react('country', traces, baseLayout({
      barmode:'stack', showlegend:false,
      margin:{t:8,b:40,l:8,r:16}, height:560,
      xaxis:axis({title:{text:'Clustered firms'}}),
      yaxis:axis({automargin:true, ticksuffix:'  '}),
      bargap:0.34
    }), PLcfg);"""
new_country = """    var mix = countryMode==='mix';
    Plotly.react('country', traces, baseLayout({
      barmode:'stack', barnorm: mix?'percent':'', showlegend:false,
      margin:{t:8,b:40,l:8,r:16}, height:560,
      xaxis:axis(mix?{title:{text:"Share of each country's clustered firms"}, ticksuffix:'%', range:[0,100]}:{title:{text:'Clustered firms'}}),
      yaxis:axis({automargin:true, ticksuffix:'  '}),
      bargap:0.34
    }), PLcfg);"""
assert old_country in ch, "country block not found"
ch = ch.replace(old_country, new_country, 1)

old_scatter = """    Plotly.react('scatter',[trace], baseLayout({
      margin:{t:14,b:46,l:56,r:20}, height:430, hovermode:'closest',
      xaxis:axis({title:{text:'log₁₀ cumulative patents (2010+)'}}),
      yaxis:axis({title:{text:'Clustered firms'}, type:'log'})
    }), PLcfg);"""
new_scatter = """    var xs=s.x.slice().sort(function(a,b){return a-b;}), ys=s.y.slice().sort(function(a,b){return a-b;});
    function med(a){ var m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
    var mx=med(xs), my=med(ys), gl=cv('--line'), fa=cv('--faint');
    Plotly.react('scatter',[trace], baseLayout({
      margin:{t:14,b:46,l:56,r:20}, height:430, hovermode:'closest',
      xaxis:axis({title:{text:'log₁₀ cumulative patents (2010+)'}}),
      yaxis:axis({title:{text:'Clustered firms'}, type:'log'}),
      shapes:[
        {type:'line', x0:mx, x1:mx, yref:'paper', y0:0, y1:1, line:{color:gl, width:1, dash:'dot'}},
        {type:'line', xref:'paper', x0:0, x1:1, y0:my, y1:my, line:{color:gl, width:1, dash:'dot'}}
      ],
      annotations:[
        {xref:'paper', yref:'paper', x:0.985, y:0.97, xanchor:'right', yanchor:'top', text:'leaders · high patents + firms', showarrow:false, font:font(9.5, fa)},
        {xref:'paper', yref:'paper', x:0.015, y:0.03, xanchor:'left', yanchor:'bottom', text:'emerging', showarrow:false, font:font(9.5, fa)}
      ]
    }), PLcfg);"""
assert old_scatter in ch, "scatter block not found"
ch = ch.replace(old_scatter, new_scatter, 1)

ch = ch.replace(
"    focus:function(code){ focusCode=code||null; renderAll(); },\n    codeForLabel:codeForLabel",
"    focus:function(code){ focusCode=code||null; renderAll(); },\n    setCountryMode:function(m){ countryMode=(m==='mix'?'mix':'firms'); renderCountry(); },\n    get countryMode(){ return countryMode; },\n    codeForLabel:codeForLabel", 1)
recompress(roles["charts"], ch.encode("utf-8"))

# ---------- map.js (year-mode country honors the toggle) ----------
mp = dec(roles["map"]).decode("utf-8")
old_cl = """  function countryLayout(){ return {paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',
    font:{family:"'Libre Franklin',sans-serif",size:12,color:cv('--muted')},
    barmode:'stack',showlegend:false,margin:{t:8,b:40,l:8,r:16},height:560,bargap:0.34,
    hoverlabel:{bgcolor:'#fff',bordercolor:cv('--line')},
    xaxis:{gridcolor:cv('--line-2'),zeroline:false,automargin:true,title:{text:'Clustered firms'}},
    yaxis:{automargin:true,gridcolor:cv('--line-2'),zeroline:false,ticksuffix:'  '}}; }"""
new_cl = """  function countryLayout(){ var mix=window.CHARTS&&window.CHARTS.countryMode==='mix'; return {paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',
    font:{family:"'Libre Franklin',sans-serif",size:12,color:cv('--muted')},
    barmode:'stack',barnorm:mix?'percent':'',showlegend:false,margin:{t:8,b:40,l:8,r:16},height:560,bargap:0.34,
    hoverlabel:{bgcolor:'#fff',bordercolor:cv('--line')},
    xaxis:{gridcolor:cv('--line-2'),zeroline:false,automargin:true,title:{text:mix?"Share of each country's clustered firms":'Clustered firms'},ticksuffix:mix?'%':''},
    yaxis:{automargin:true,gridcolor:cv('--line-2'),zeroline:false,ticksuffix:'  '}}; }"""
assert old_cl in mp, "map countryLayout not found"
mp = mp.replace(old_cl, new_cl, 1)
recompress(roles["map"], mp.encode("utf-8"))

# ---------- enhance.js appended to main.js ----------
ENHANCE = r"""
;/* ===== enhance.js (v3): URL state, copy-link, export, country toggle ===== */
(function(){
  function ready(){ return window.CHARTS&&window.MAP&&window.DASH&&document.getElementById('country')&&document.getElementById('country').data; }
  function el(t,c,h){ var e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e; }
  function download(href,name){ var a=document.createElement('a'); a.href=href; a.download=name; document.body.appendChild(a); a.click(); a.remove(); }
  function csvDownload(rows,name){ var csv=rows.map(function(r){ return r.map(function(c){ c=(c==null?'':String(c)); return /[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c; }).join(','); }).join('\n'); download('data:text/csv;charset=utf-8,'+encodeURIComponent(csv),name); }
  function flash(b,txt){ var s=b.querySelector('span'); if(!s)return; var o=s.textContent; s.textContent=txt; setTimeout(function(){ s.textContent=o; },1400); }

  function styles(){
    var s=el('style'); s.textContent=
    ".x-ctrls{display:inline-flex;align-items:center;gap:8px;margin-left:auto}"+
    ".x-seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}"+
    ".x-seg button{font:600 11px/1 'Libre Franklin',system-ui,sans-serif;letter-spacing:.01em;padding:7px 12px;border:0;background:var(--card);color:var(--muted);cursor:pointer;transition:background .12s}"+
    ".x-seg button.on{background:var(--accent);color:#fff}"+
    ".x-exp{display:inline-flex;gap:6px}"+
    ".x-exp button{font:600 10px/1 'Libre Franklin',system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;padding:6px 9px;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--muted);cursor:pointer;transition:border-color .12s,color .12s}"+
    ".x-exp button:hover{border-color:var(--accent);color:var(--accent)}"+
    ".x-copy{display:inline-flex;align-items:center;gap:6px;font:600 12px/1 'Libre Franklin',system-ui,sans-serif;padding:9px 12px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink);cursor:pointer;white-space:nowrap}"+
    ".x-copy:hover{border-color:var(--accent);color:var(--accent)}";
    document.head.appendChild(s);
  }

  function panelHead(id){ var p=document.getElementById(id); if(!p)return null; var panel=p.closest('.panel'); if(!panel)return null; return panel.querySelector('.panel-head'); }

  var NAMES={map:'cluster-map',ranked:'cluster-rankings',country:'countries',scatter:'patents-vs-firms',cl:'clusters-by-technology',bar:'firms-by-technology'};
  var CSVB={
    bar:function(){ var d=bar_data.data[0]; var r=[['NAICS technology','Clustered firms']]; d.y.forEach(function(l,i){ r.push([l,d.x[i]]); }); return r; },
    cl:function(){ var d=cl_data.data[0]; var r=[['NAICS technology','Clusters dominated']]; d.y.forEach(function(l,i){ r.push([l,d.x[i]]); }); return r; },
    country:function(){ var r=[['Country','NAICS technology','Clustered firms']]; country_data.data.forEach(function(t){ t.y.forEach(function(c,i){ if(t.x[i]) r.push([c,t.name,t.x[i]]); }); }); return r; },
    scatter:function(){ var s=scatter_data.data[0]; var r=[['Country','log10 cumulative patents','Clustered firms','Composite strength']]; s.text.forEach(function(c,i){ r.push([c,s.x[i],s.y[i],(s.customdata[i]||[])[1]]); }); return r; }
  };
  function addControls(){
    Object.keys(NAMES).forEach(function(id){
      var head=panelHead(id); if(!head||head.querySelector('.x-ctrls'))return;
      var grp=el('div','x-ctrls');
      if(id==='country'){
        var seg=el('div','x-seg'), b1=el('button',null,'Firms'), b2=el('button',null,'Share %'); b1.classList.add('on');
        function set(m){ window.CHARTS.setCountryMode(m); b1.classList.toggle('on',m==='firms'); b2.classList.toggle('on',m==='mix'); }
        b1.onclick=function(){ set('firms'); }; b2.onclick=function(){ set('mix'); };
        seg.appendChild(b1); seg.appendChild(b2); grp.appendChild(seg);
      }
      var exp=el('div','x-exp');
      var png=el('button',null,'PNG'); png.title='Download chart as PNG';
      png.onclick=function(){ var gd=document.getElementById(id); if(gd&&window.Plotly) window.Plotly.toImage(gd,{format:'png',width:1600,height:1000,scale:2}).then(function(u){ download(u,'nzipl-solar-'+NAMES[id]+'.png'); }).catch(function(){}); };
      exp.appendChild(png);
      if(CSVB[id]){ var c=el('button',null,'CSV'); c.title='Download data as CSV'; c.onclick=function(){ try{ csvDownload(CSVB[id](),'nzipl-solar-'+NAMES[id]+'.csv'); }catch(e){} }; exp.appendChild(c); }
      grp.appendChild(exp);
      head.style.display='flex'; head.style.alignItems='center'; head.style.flexWrap='wrap'; head.style.gap='10px';
      head.appendChild(grp);
    });
  }

  /* ---- shareable URL state ---- */
  var enhFocus=null;
  function curYear(){ var sl=document.getElementById('yr-slider'); return sl?parseInt(sl.value,10):2025; }
  function writeHash(){
    var p=[]; if(enhFocus)p.push('tech='+enhFocus); var y=curYear(); if(y<2025)p.push('year='+y);
    var h=p.length?('#'+p.join('&')):''; if((location.hash||'')!==h){ try{ history.replaceState(null,'',location.pathname+location.search+h); }catch(e){} }
  }
  function watchFocus(){
    var body=document.getElementById('ref-body'); if(!body)return;
    new MutationObserver(function(){ var r=body.querySelector('tr.rowfocus'); enhFocus=r?r.getAttribute('data-code'):null; writeHash(); })
      .observe(body,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  function watchYear(){ var sl=document.getElementById('yr-slider'); if(sl) sl.addEventListener('change',writeHash); }
  function readHash(){
    var h=(location.hash||'').replace(/^#/,''); if(!h)return; var q={};
    h.split('&').forEach(function(kv){ var p=kv.split('='); q[p[0]]=decodeURIComponent(p[1]||''); });
    if(q.year){ var sl=document.getElementById('yr-slider'); if(sl){ sl.value=q.year; sl.dispatchEvent(new Event('input')); } }
    if(q.tech){ try{ window.DASH.applyFocus(q.tech); }catch(e){} }
  }
  function addCopyLink(){
    var gear=document.getElementById('open-display'); if(!gear||!gear.parentNode)return;
    if(gear.parentNode.querySelector('.x-copy'))return;
    var b=el('button','x-copy','<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>Copy link</span>');
    b.title='Copy a link to this exact view (technology + year)';
    b.onclick=function(){ writeHash(); var u=location.href; if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(u).then(function(){ flash(b,'Copied'); },function(){ window.prompt('Copy link:',u); }); } else { window.prompt('Copy link:',u); } };
    gear.parentNode.insertBefore(b,gear);
  }

  function init(){ styles(); addControls(); addCopyLink(); watchFocus(); watchYear(); readHash(); }
  (function wait(){ if(ready()){ try{ init(); }catch(e){ if(window.console)console.warn('enhance init',e); } } else setTimeout(wait,80); })();
})();
"""
mn = dec(roles["main"]).decode("utf-8")
recompress(roles["main"], (mn + "\n" + ENHANCE).encode("utf-8"))

# ---------- write bundle back ----------
lines[bidx] = json.dumps(bundle, separators=(",",":"))
html = "\n".join(lines)
open(OUT,"w",encoding="utf-8").write(html)
size_after = len(html.encode("utf-8"))
print(f"\nWROTE {OUT}")
print(f"v2: {size_before/1e6:.2f} MB  ->  v3: {size_after/1e6:.2f} MB  ({(size_after-size_before)/1e3:+.0f} KB)")
print("added: country Firms/Share toggle, scatter quadrant guides, shareable URL (tech+year), Copy link, PNG+CSV export")
