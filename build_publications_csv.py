#!/usr/bin/env python3
"""Regenerate _data/publications.csv from the single source of truth,
~/Documents/R/personal/agenda/deliverables.csv.

The research-line order and display names live in
~/Documents/R/personal/agenda/research_lines.csv — edit that file, re-run this
script, and the publications page picks it up.

Column contract (written to _data/publications.csv):
    research_line  machine key   (e.g. "growth_distribution")
    label          display name  (e.g. "Growth and Distribution")
    year, type, status, authors, title, venue, volume, issue, pages, url, pdf, notes
    show           "true"/"false" — whether the publication appears on the site

The publications page groups by research_line (in research_lines.csv sequence) and
only renders rows where show == "true".
"""
from __future__ import annotations

import csv
from pathlib import Path

DELIVERABLES = Path.home() / "Documents" / "R" / "personal" / "agenda" / "deliverables.csv"
RESEARCH_LINES = Path.home() / "Documents" / "R" / "personal" / "agenda" / "research_lines.csv"
OUT = Path(__file__).resolve().parent / "_data" / "publications.csv"


def load_line_order():
    """Read (order, key, label) from research_lines.csv; return (order, pos)."""
    with open(RESEARCH_LINES, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    order = [(r["key"], r["label"]) for r in rows]
    pos = {key: i for i, (key, _) in enumerate(order)}
    return order, pos


# Explicit within-line order for Growth & Distribution (author's sequence).
# Everything else sorts by year descending.
GND_ORDER = {
    "Environmentalism without class struggle is just gardening: An Ecological Interpretation of the Ricardian Model": 0,
    "The Sraffian Economy as an Autocatalytic Set": 1,
    'Review of "Marx\'s Theory of Value at the Frontiers" by Güney Işikara and Patrick Mokre': 2,
    "A conflict theory of pricing": 3,
    "Classical-Evolutionary Dynamics of Price Formation": 4,
}

FORM_TO_TYPE = {
    "article": "Article",
    "book": "Book",
    "book chapter": "Book chapter",
    "thesis": "Thesis",
    "encyclopedia entry": "Encyclopedia",
    "working paper": "Working paper",
    "draft": "Working paper",
}


def site_status(row: dict) -> str:
    status = row.get("status", "").strip()
    stage = row.get("stage", "").strip()
    if status == "published":
        return "Published"
    if stage == "revising":
        return "Revise and resubmit"
    return "In progress"


def main() -> None:
    LINE_ORDER, LINE_POS = load_line_order()
    LABELS = dict(LINE_ORDER)

    with open(DELIVERABLES, newline="", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if r.get("type", "").strip() == "publication"]

    out_rows = []
    for r in rows:
        key = r.get("research_line", "").strip()
        title = r.get("title", "").strip()
        year = r.get("year", "").strip()
        line_pos = LINE_POS.get(key, len(LINE_ORDER))
        if key == "growth_distribution" and title in GND_ORDER:
            within = GND_ORDER[title]
        else:
            within = -int(year) if year.isdigit() else 0
        out_rows.append({
            "research_line": key,
            "label": LABELS.get(key, key),
            "_sort": (line_pos, within),
            "year": year,
            "type": FORM_TO_TYPE.get(r.get("form", "").strip(), "Working paper"),
            "status": site_status(r),
            "authors": r.get("authors", "").strip(),
            "title": title,
            "venue": r.get("venue", "").strip(),
            "volume": r.get("volume", "").strip(),
            "issue": r.get("issue", "").strip(),
            "pages": r.get("pages", "").strip(),
            "url": r.get("url", "").strip(),
            "pdf": r.get("pdf", "").strip(),
            "notes": "",
            "show": r.get("show", "").strip(),
        })

    out_rows.sort(key=lambda x: x["_sort"])
    fields = ["research_line", "label", "year", "type", "status", "authors", "title",
              "venue", "volume", "issue", "pages", "url", "pdf", "notes", "show"]
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        w.writeheader()
        for r in out_rows:
            w.writerow({k: r[k] for k in fields})

    shown = sum(1 for r in out_rows if r["show"] == "true")
    print(f"wrote {OUT} ({len(out_rows)} rows, {shown} show=true)")


if __name__ == "__main__":
    main()
