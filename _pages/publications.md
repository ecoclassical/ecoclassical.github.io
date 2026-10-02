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
<div style="margin-bottom:1.15rem;">
  <div style="line-height:1.45;">
    {% if p.url != "" and p.url != nil %}<a href="{{ p.url | strip }}" target="_blank" rel="noopener">{% endif %}<strong>{{ p.title }}</strong>{% if p.url != "" and p.url != nil %}</a>{% endif %} <span style="opacity:0.65;">({{ p.year }})</span>
  </div>
  <div style="font-size:0.9rem; line-height:1.5; margin-top:0.15rem; opacity:0.92;">
    {{ p.authors }}.
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
