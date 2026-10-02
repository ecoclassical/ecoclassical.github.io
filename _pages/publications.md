---
layout: dark
title: "Publications"
permalink: /publications/
author_profile: false
---

{% assign groups = site.data.publications | group_by: "label" %}
{% for g in groups %}
{% assign visible = "" | split: "" %}
{% for p in g.items %}{% if p.show == "true" %}{% assign visible = visible | push: p %}{% endif %}{% endfor %}
{% if visible.size > 0 %}

## {{ g.name }}

{% for p in visible %}
- {% if p.url != "" and p.url != nil %}<a href="{{ p.url | strip }}" target="_blank" rel="noopener">{% endif %}**{{ p.title }}**{% if p.url != "" and p.url != nil %}</a>{% endif %} ({{ p.year }})
  {{ p.authors }}.
  {% if p.venue != "" and p.venue != nil %}*{{ p.venue }}*{% endif %}{% if p.volume != "" and p.volume != nil %}, {{ p.volume }}{% endif %}{% if p.issue != "" and p.issue != nil %}({{ p.issue }}){% endif %}{% if p.pages != "" and p.pages != nil %}, {{ p.pages }}{% endif %}.
  {% assign st = p.status | strip %}
  {% if st != "" and st != "Published" %}
    {% assign c = "#7a8aa0" %}
    {% if st == "Revise and resubmit" or st == "R&R" %}{% assign c = "#f9a84f" %}
    {% elsif st == "Submitted" or st == "With editor" or st == "Under review" %}{% assign c = "#6fa8dc" %}
    {% elsif st == "Accepted" or st == "In press" %}{% assign c = "#7fbf7f" %}
    {% elsif st == "Rejected" or st == "Desk rejected" or st == "Withdrawn" %}{% assign c = "#c07878" %}
    {% endif %}
    <span style="font-size:0.75rem;color:{{ c }};border:1px solid {{ c }};padding:1px 7px;border-radius:3px;margin-left:4px;opacity:0.9;">{{ st | downcase }}</span>
  {% endif %}
  {% if p.pdf != "" and p.pdf != nil %} · <a href="{{ p.pdf }}" style="font-size:0.78rem;">PDF</a>{% endif %}
  {% if p.url != "" and p.url != nil %} · <a href="{{ p.url | strip }}" target="_blank" rel="noopener" style="font-size:0.78rem;">Publisher</a>{% endif %}

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
