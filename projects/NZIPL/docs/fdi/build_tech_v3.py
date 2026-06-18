#!/usr/bin/env python3
"""
build_tech_v3.py — produce a v3-standard sector dashboard by swapping a
technology's data into the Solar v3 shell. Config-driven: to add a sector,
fill a CONFIG block and run. See SECTOR-DASHBOARD-V3-SPEC.md.

Usage: python3 build_tech_v3.py            # builds the CONFIG below (wind)
"""
import json, base64, gzip, re, os

NZIPL = "/Users/gilbertogarcia/Code/GripPoint/projects/nzipl"
SHELL = NZIPL + "/NZIPL-Solar-Dashboard-v3.html"   # the v3 reference shell (solar)

# ============================ SECTOR CONFIG ============================
# Numbers are recomputed from the sector's data (see SPEC §4). Fill copy editorially.
CONFIG = {
    "tech": "Wind",
    "original": NZIPL + "/wind_dashboard 6-3-26.html",
    "out": NZIPL + "/NZIPL-Wind-Dashboard-v3.html",
    # accent triad (Global Atlas color + derived; SPEC §4 table)
    "accent": "#0F766E", "accent2": "#0C5C56", "soft": "#E7F1F0", "ring": "rgba(15,118,110,.34)",
    # copy
    "title": "NZIPL · Global Wind Manufacturing Clusters",
    "brand_atlas": "Wind Cluster Atlas",
    "flag": "Spatial Analysis · Wind &amp; Net-Zero Manufacturing",
    "h1_word": "wind",
    "dek": ("Where the firms that build the wind supply chain actually cluster &mdash; from turbines and "
            "generators to blades, towers and control systems. Firms are geocoded to city level and grouped "
            "into geographic clusters, then characterized by their dominant NAICS technology and overlaid on "
            "national patent intensity. Use the controls to filter by technology, trace formation over time, "
            "and benchmark any cluster against the global best-in-class."),
    # KPIs (recomputed: firms=sum(bar), naics=len(D), clusters=len(_RD.clusters), countries=_ts[max].kpi.countries)
    "kpi_firms": "172,202", "kpi_naics": "49", "kpi_clusters": "2,696", "kpi_countries": "114",
    "kpi_naics_sub": "Materials to turbines",   # solar shell: "Mining through modules"
    # Overview (00) lede + 3 cards
    "ov_lede": ("Across <b>114 countries</b>, <b>172,202 firms</b> resolve into <b>2,696 geographic clusters</b> "
                "spanning <b>49 manufacturing technologies</b>. The footprint is concentrated &mdash; by technology, "
                "by geography, and within individual clusters."),
    "ov_cards": [
        ("Leading technology", "Measuring &amp; controlling devices",
         "<b>19,292</b> clustered firms &mdash; about <b>11%</b> of the global total &mdash; and the dominant technology in <b>734</b> clusters."),
        ("Geographic concentration", "China &amp; the United States",
         "China hosts <b>55,141</b> clustered firms and the U.S. <b>32,397</b> &mdash; together about <b>56%</b> of the top-20-country total."),
        ("Specialization", "Glashütte, Germany",
         "<b>24 of its 24 firms</b> work in measuring &amp; controlling devices &mdash; the most specialized cluster in the leading technology."),
    ],
}
# ======================================================================

def dec(bundle, u):
    raw = base64.b64decode(bundle[u]["data"])
    return gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw
def comp(bundle, u, b):
    bundle[u]["data"] = base64.b64encode(gzip.compress(b, 9, mtime=0)).decode("ascii")
    bundle[u]["compressed"] = True
def span(text, name):
    m = re.search(r"var\s+" + re.escape(name) + r"\s*=\s*", text)
    if not m: return None
    i = m.end(); op = text[i]; cl = {'{':'}','[':']'}[op]; d=0; ins=False; esc=False; j=i
    while j < len(text):
        c = text[j]
        if ins:
            if esc: esc=False
            elif c=='\\': esc=True
            elif c=='"': ins=False
        else:
            if c=='"': ins=True
            elif c==op: d+=1
            elif c==cl:
                d-=1
                if d==0: j+=1; break
        j += 1
    return json.loads(text[i:j])
def trim(a): return [round(v,4) if isinstance(v,(int,float)) else v for v in a]

def overview_block(cfg):
    cards = "".join(
        '\n      <div class="ov-card">\n'
        '        <div class="ov-tag">%s</div>\n'
        '        <div class="ov-h">%s</div>\n'
        '        <div class="ov-p">%s</div>\n'
        '      </div>' % (t, h, p) for (t, h, p) in cfg["ov_cards"])
    return (
'  <!-- ============ 00 KEY FINDINGS ============ -->\n'
'  <style>\n'
'    .ov-lede{max-width:780px;font-size:16px;line-height:1.7;color:var(--ink);margin:0 0 24px;}\n'
'    .ov-lede b{color:var(--ink);font-weight:700;}\n'
'    .ov-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}\n'
'    .ov-card{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:var(--r-md,12px);padding:22px;box-shadow:var(--shadow-sm);}\n'
'    .ov-tag{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:12px;}\n'
'    .ov-h{font-size:22px;font-weight:700;color:var(--ink);line-height:1.12;letter-spacing:-.01em;margin-bottom:10px;}\n'
'    .ov-p{font-size:13.5px;line-height:1.6;color:var(--muted);}\n'
'    .ov-p b{color:var(--ink);font-weight:700;}\n'
'    @media(max-width:880px){.ov-grid{grid-template-columns:1fr;}}\n'
'  </style>\n'
'  <section class="section reveal" id="sec-findings">\n'
'    <div class="sec-head">\n'
'      <span class="sec-num">00</span>\n'
'      <span class="sec-title">What the data shows</span>\n'
'      <span class="sec-sub">Three readings before the detail.</span>\n'
'    </div>\n'
'    <p class="ov-lede">' + cfg["ov_lede"] + '</p>\n'
'    <div class="ov-grid">' + cards + '\n    </div>\n'
'  </section>\n\n')

def main(cfg):
    html = open(SHELL, encoding="utf-8").read()
    lines = html.split("\n")
    bidx = max(range(len(lines)), key=lambda i: len(lines[i]))
    bundle = json.loads(lines[bidx])

    # roles in the shell
    roles = {}
    for u in bundle:
        if bundle[u].get("mime") != "application/javascript": continue
        h = dec(bundle, u)[:200].decode("utf-8", "replace")
        if "var map_data" in h and "extracted" not in h: roles["mapdata"] = u
        elif "extracted data" in h or "var _RD" in h: roles["data"] = u

    # extract + trim the sector's data
    T = open(cfg["original"], encoding="utf-8", errors="replace").read()
    RD=span(T,"_RD"); ts=span(T,"_ts"); bar=span(T,"bar_data"); cld=span(T,"cl_data")
    country=span(T,"country_data"); scat=span(T,"scatter_data"); md=span(T,"map_data"); D=span(T,"D")
    for tr in md.get("data",[]):
        for k in ("lat","lon"):
            if isinstance(tr.get(k),list): tr[k]=trim(tr[k])
    for yr,obj in ts.items():
        for e in obj.get("map",[]):
            for k in ("la","lo"):
                if isinstance(e.get(k),list): e[k]=trim(e[k])
    J = lambda o: json.dumps(o, separators=(",",":"), ensure_ascii=True)

    data_js = ("/* NZIPL %s Cluster Dashboard — extracted data */\n" % cfg["tech"]
        + "var _RD=" + J(RD) + ";\n"
        + "var bar_data=" + J(bar) + ";\n"
        + "var cl_data=" + J(cld) + ";\n"
        + "var country_data=" + J(country) + ";\n"
        + "var scatter_data=" + J(scat) + ";\n"
        + "var _ts=" + J(ts) + ";\n"
        + "var BENCH=" + J(D) + ";\n"
        + 'var REF_TABLE_HTML="";\n')
    comp(bundle, roles["data"], data_js.encode("utf-8"))
    comp(bundle, roles["mapdata"], ("var map_data=" + J(md) + ";\n").encode("utf-8"))
    lines[bidx] = json.dumps(bundle, separators=(",",":"))
    html = "\n".join(lines)

    # ---- template edits ----
    m = re.search(r'(<script type="__bundler/template">)(.*?)(</script>)', html, re.S)
    t = json.loads(m.group(2).strip())
    def rep(old, new, why):
        assert old in t, "MISSING in template: " + why
        return t.replace(old, new, 1)
    t = rep('[data-theme="cice"]{ --accent:#D39200; --accent-2:#A66E00; --accent-soft:#FBF1DA; --ring:rgba(211,146,0,.34); --warn:#B7791F; }',
            '[data-theme="cice"]{ --accent:%s; --accent-2:%s; --accent-soft:%s; --ring:%s; --warn:#B7791F; }'
            % (cfg["accent"], cfg["accent2"], cfg["soft"], cfg["ring"]), "accent block")
    t = rep("NZIPL · Global Solar Manufacturing Clusters", cfg["title"], "title")
    t = rep("Solar Cluster Atlas", cfg["brand_atlas"], "brand atlas line")
    t = rep("Spatial Analysis · Solar &amp; Net-Zero Manufacturing", cfg["flag"], "flag")
    t = rep("Global <em>solar</em> manufacturing clusters", "Global <em>%s</em> manufacturing clusters" % cfg["h1_word"], "h1")
    t = re.sub(r'(<p class="mh-dek">).*?(</p>)', lambda mm: mm.group(1)+cfg["dek"]+mm.group(2), t, count=1, flags=re.S)
    t = rep('id="kv-firms">80,364<', 'id="kv-firms">%s<' % cfg["kpi_firms"], "kpi firms")
    t = rep('<div class="kpi-v tnum">26</div>', '<div class="kpi-v tnum">%s</div>' % cfg["kpi_naics"], "kpi naics")
    t = rep('id="kv-clusters">1,245<', 'id="kv-clusters">%s<' % cfg["kpi_clusters"], "kpi clusters")
    t = rep('id="kv-countries">109<', 'id="kv-countries">%s<' % cfg["kpi_countries"], "kpi countries")
    t = rep("Mining through modules", cfg["kpi_naics_sub"], "kpi naics sub")
    t = rep("<b>26</b>&nbsp;NAICS technologies", "<b>%s</b>&nbsp;NAICS technologies" % cfg["kpi_naics"], "chip")
    t = re.sub(r'  <!-- ============ 00 KEY FINDINGS ============ -->.*?(  <!-- ============ 01 MAP ============ -->)',
               lambda mm: overview_block(cfg) + mm.group(1), t, count=1, flags=re.S)
    assert cfg["ov_cards"][0][1] in t, "overview not injected"
    enc = json.dumps(t, ensure_ascii=False).replace("</", "<\\/")
    html = html[:m.start()] + m.group(1) + "\n" + enc + "\n  " + m.group(3) + html[m.end():]
    # outer <title> (outside template)
    html = html.replace("Global Solar Manufacturing Clusters", "Global %s Manufacturing Clusters" % cfg["tech"])

    open(cfg["out"], "w", encoding="utf-8").write(html)
    print("WROTE", cfg["out"], "(%.2f MB)" % (len(html.encode())/1e6))

if __name__ == "__main__":
    main(CONFIG)
