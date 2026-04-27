---
layout: dark
title: "Publications"
permalink: /publications/
author_profile: false
---

<div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:2rem; column-span:all;">
  <iframe src="/files/publications_donut.html"
          style="width:100%; height:340px; border:none; overflow:hidden; border-radius:6px;">
  </iframe>
  <iframe src="/files/publications_timeline.html"
          style="width:100%; height:340px; border:none; overflow:hidden; border-radius:6px;">
  </iframe>
</div>

{% assign types = "Article,Book,Book chapter,Encyclopedia,Working paper,Work in progress" | split: "," %}
{% assign all_pubs = site.data.publications | sort: "year" | reverse %}

{% for ptype in types %}
{% assign section_pubs = all_pubs | where: "type", ptype %}
{% if section_pubs.size > 0 %}

## {{ ptype }}s

{% for p in section_pubs %}
- {% if p.url != "" and p.url != nil %}<a href="{{ p.url | strip }}" target="_blank">{% endif %}**{{ p.title }}**{% if p.url != "" and p.url != nil %}</a>{% endif %} ({{ p.year }})
  {{ p.authors }}.
  {% if p.venue != "" and p.venue != nil %}*{{ p.venue }}*{% endif %}{% if p.volume != "" and p.volume != nil %}, {{ p.volume }}{% endif %}{% if p.issue != "" and p.issue != nil %}({{ p.issue }}){% endif %}{% if p.pages != "" and p.pages != nil %}, {{ p.pages }}{% endif %}.
  {% if p.status == "Submitted" %}<span style="font-size:0.75rem;color:#f9a84f;border:1px solid rgba(249,168,79,0.4);padding:1px 7px;border-radius:3px;margin-left:4px;">submitted</span>{% endif %}
  {% if p.status == "In progress" %}<span style="font-size:0.75rem;color:#7a8aa0;border:1px solid rgba(122,138,160,0.4);padding:1px 7px;border-radius:3px;margin-left:4px;">in progress</span>{% endif %}
  {% if p.pdf != "" and p.pdf != nil %} · <a href="{{ p.pdf }}" style="font-size:0.78rem;">PDF</a>{% endif %}

{% endfor %}
{% endif %}
{% endfor %}
