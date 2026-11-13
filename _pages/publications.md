---
layout: dark
title: "Publications"
permalink: /publications/
author_profile: false
---

<div class="rv-bar">
<div class="rv-toggle" role="tablist" aria-label="Choose how to view the publications" data-view="list">
<span class="rv-thumb" aria-hidden="true"></span>
<button type="button" role="tab" id="rv-tab-list" aria-selected="true" data-view="list"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5h9M5 8h9M5 12.5h9"/><circle cx="2" cy="3.5" r=".9"/><circle cx="2" cy="8" r=".9"/><circle cx="2" cy="12.5" r=".9"/></svg>List</button>
<button type="button" role="tab" id="rv-tab-grid" aria-controls="rv-grid" aria-selected="false" data-view="grid"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="5.2" height="5.2" rx="1"/><rect x="9.3" y="1.5" width="5.2" height="5.2" rx="1"/><rect x="1.5" y="9.3" width="5.2" height="5.2" rx="1"/><rect x="9.3" y="9.3" width="5.2" height="5.2" rx="1"/></svg>Grid</button>
</div>
</div>

<div id="rv-grid" role="tabpanel" aria-labelledby="rv-tab-grid" hidden markdown="0">
{% include research_grid.html %}
</div>


{% assign groups = site.data.publications | group_by: "label" %}
{% for g in groups %}
{% assign visible = "" | split: "" %}
{% for p in g.items %}{% if p.show == "true" %}{% assign visible = visible | push: p %}{% endif %}{% endfor %}
{% if visible.size > 0 %}

## {{ g.name }}

{% for p in visible %}
<div style="margin-bottom:1.15rem;">
  <div style="line-height:1.45;">
    {% if p.url != "" and p.url != nil %}<a href="{{ p.url | strip }}" target="_blank" rel="noopener">{% endif %}<strong>{{ p.title }}</strong>{% if p.url != "" and p.url != nil %}</a>{% endif %} <span style="opacity:0.65;">({{ p.year }})</span>
  </div>
  <div style="font-size:0.9rem; line-height:1.5; margin-top:0.15rem; opacity:0.92;">
    {{ p.authors }}
    {% if p.venue != "" and p.venue != nil %}<em>{{ p.venue }}</em>{% endif %}{% if p.volume != "" and p.volume != nil %}, {{ p.volume }}{% endif %}{% if p.issue != "" and p.issue != nil %}({{ p.issue }}){% endif %}{% if p.pages != "" and p.pages != nil %}, {{ p.pages }}{% endif %}.
    {% assign st = p.status | strip %}
    {% if st != "" and st != "Published" %}
      {% if st == "Revise and resubmit" or st == "R&R" %}
        <span style="font-size:0.72rem;color:#f9a84f;border:1px solid #f9a84f;padding:1px 7px;border-radius:3px;margin-left:4px;">{{ st | downcase }}</span>
      {% elsif st == "In progress" %}
        <span style="font-size:0.72rem;color:#ffffff;background:#8b1a1a;border:1px solid #8b1a1a;padding:2px 8px;border-radius:4px;margin-left:4px;">{{ st | downcase }}</span>
      {% elsif st == "Submitted" or st == "With editor" or st == "Under review" %}
        <span style="font-size:0.72rem;color:#6fa8dc;border:1px solid #6fa8dc;padding:1px 7px;border-radius:3px;margin-left:4px;">{{ st | downcase }}</span>
      {% elsif st == "Accepted" or st == "In press" %}
        <span style="font-size:0.72rem;color:#7fbf7f;border:1px solid #7fbf7f;padding:1px 7px;border-radius:3px;margin-left:4px;">{{ st | downcase }}</span>
      {% elsif st == "Rejected" or st == "Desk rejected" or st == "Withdrawn" %}
        <span style="font-size:0.72rem;color:#c07878;border:1px solid #c07878;padding:1px 7px;border-radius:3px;margin-left:4px;">{{ st | downcase }}</span>
      {% else %}
        <span style="font-size:0.72rem;color:#7a8aa0;border:1px solid #7a8aa0;padding:1px 7px;border-radius:3px;margin-left:4px;">{{ st | downcase }}</span>
      {% endif %}
    {% endif %}
    {% if p.pdf != "" and p.pdf != nil %} · <a href="{{ p.pdf }}" style="font-size:0.82rem;">PDF</a>{% endif %}
    {% if p.url != "" and p.url != nil %} · <a href="{{ p.url | strip }}" target="_blank" rel="noopener" style="font-size:0.82rem;">Publisher</a>{% endif %}
  </div>
</div>
{% endfor %}
{% endif %}
{% endfor %}

<div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:2rem;">
  <iframe src="/files/publications_donut.html"
          style="width:100%; height:400px; border:none; overflow:hidden; border-radius:6px;">
  </iframe>
  <iframe src="/files/publications_timeline.html"
          style="width:100%; height:400px; border:none; overflow:hidden; border-radius:6px;">
  </iframe>
</div>

<script>
(function(){
  // The list stays as direct children of .page-content, so the layout's two-column flow is
  // untouched; the grid view hides those children with a class rather than a wrapper.
  var grid = document.getElementById('rv-grid'),
      page = grid.parentElement,
      bar = document.querySelector('.rv-toggle'),
      tabs = bar.querySelectorAll('button');
  function set(view, push){
    bar.setAttribute('data-view', view);
    tabs.forEach(function(t){ t.setAttribute('aria-selected', String(t.dataset.view === view)); });
    grid.hidden = view !== 'grid';
    page.classList.toggle('rv-grid-on', view === 'grid');
    try { localStorage.setItem('publications-view', view); } catch (e) {}
    if (push) history.replaceState(null, '', view === 'grid' ? '#grid' : location.pathname);
  }
  tabs.forEach(function(t){ t.addEventListener('click', function(){ set(t.dataset.view, true); }); });
  var saved = null;
  try { saved = localStorage.getItem('publications-view'); } catch (e) {}
  var h = location.hash.slice(1);
  // A link to a list anchor (e.g. #ecological-macroeconomics) always opens the list.
  set(h === 'grid' ? 'grid' : (h && h !== 'list') ? 'list' : (saved === 'grid' ? 'grid' : 'list'), false);
})();
</script>

<style>
.rv-bar { display: flex; justify-content: flex-end; margin: 0.4rem 0 1.4rem; }
.rv-toggle {
  position: relative; display: grid; grid-template-columns: 1fr 1fr; width: max-content; max-width: 100%;
  padding: 3px; border-radius: 999px;
  background: var(--surface); border: 1px solid rgba(255,255,255,0.1);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.35);
}
.rv-thumb {
  position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(56,217,169,0.22), rgba(56,217,169,0.12));
  border: 1px solid rgba(56,217,169,0.45);
  transition: transform 0.28s cubic-bezier(.4,.1,.2,1);
}
.rv-toggle[data-view="grid"] .rv-thumb { transform: translateX(100%); }
.rv-toggle button {
  all: unset; position: relative; z-index: 1; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
  padding: 0.42rem 1.05rem; border-radius: 999px;
  font-size: 0.8rem; font-weight: 600; letter-spacing: 0.02em;
  color: var(--muted); transition: color 0.2s;
}
.rv-toggle button[aria-selected="true"] { color: var(--text); }
.rv-toggle button:hover { color: var(--text); }
.rv-toggle button:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
.rv-toggle svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
.rv-toggle svg circle { fill: currentColor; stroke: none; }
#rv-grid[hidden] { display: none; }
.rv-grid-on > :not(.rv-bar):not(#rv-grid):not(script):not(style) { display: none; }
</style>
