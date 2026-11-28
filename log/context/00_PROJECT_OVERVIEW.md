# Academic website overview

> **Compiled:** 2026-11-27 at `2dece7e8`.
> **Evidence tier:** A. This repository has dated logs, implementation notes and more than 1,000 commits.
> **Provenance:** Repository files and local Git history. Maintained with `/update-project-context`.

Oriol Vallès Codina’s academic website brings together the CV, research programme, publications, talks and teaching. The [Research page](../../_pages/research.md) introduces three research tracks. The [Publications page](../../_pages/publications.md) provides both a list and a grid of work arranged by track and method.

In October the [research-page rewrite](../rollup/month_2026-10.md) simplified navigation from the homepage. In November the project added a grid and preserved incoming links when it [moved that grid](../rollup/month_2026-11.md). Individual project repositories also supply completed artifacts to this repository, including the Leeds evidence pages.

## Terms

* **Jekyll** builds the public site from the source pages, layouts, navigation and data.
* **Research grid** is the alternative Publications view generated from a curated public description of the research tracks, methods and papers.
* **Leeds evidence site** is the set of outputs linked from `projects/leeds_model/`. The economic model and figure-generation code are maintained in the Leeds project.

## Maintaining this folder

Read the [current state](06_CURRENT_STATE.md) and [source map](04_CODEBASE_MAP.md) first. The site’s `_config.yml` excludes `log` from Jekyll, which is why the knowledge base lives in `log/context/`. The files remain visible to readers of the repository. Refresh this Tier A context with `/update-project-context`.
