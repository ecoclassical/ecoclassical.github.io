# Where to make each change

> **Compiled:** 2026-11-27 at `2dece7e8`.
> **Evidence tier:** A. This repository has dated logs, implementation notes and more than 1,000 commits.
> **Provenance:** Repository files and local Git history. Maintained with `/update-project-context`.

| Change | Source or owner |
|---|---|
| Homepage, CV, research, publications, talks and teaching | Edit the corresponding source in `_pages/`. Change the header links in `_data/navigation.yml`. |
| Page structure or theme | `_layouts/`, `_includes/` and `_sass/` hold the templates and styles. `assets/` and `images/` contain the public assets. |
| Publications list | `build_publications_csv.py` reads `agenda/deliverables.csv` and `agenda/tracks.csv` from the companion personal repository. Its generated file is `_data/publications.csv`. The page filters on `show`. |
| Publications grid | The personal repository’s `tools/research_grid_public.py` reads `agenda/research_grid_public.json` and writes `_includes/research_grid.html` and `files/research_grid.html`. |
| Static project outputs and documents | `projects/` and `files/` hold public copies. Changes to model-generated evidence belong in the producing project first. |
| Local setup and build | `Gemfile`, `Gemfile.lock`, `_config.yml`, `_config_docker.yml`, `Dockerfile` and `docker-compose.yaml` describe the build. `_site/` is local generated output. |
| Historical material | `_archive/` preserves older versions. Dated records, rollups and the knowledge base live in `log/`. |

## Checks that prevent repeat failures

A change to a Research heading can break a link from the bio even when every project link on Research works. Test incoming fragments too. October 20’s [log](../session_20261020.md) records the broken bio target and its repair.

Read the source for each publication view before editing it. Since commit `8a457721`, the list and grid are both on Publications. The existing redirect from `/research/#grid` preserves older links. A bookmark-only URL in `files/` is publicly accessible. Only place public material there.
