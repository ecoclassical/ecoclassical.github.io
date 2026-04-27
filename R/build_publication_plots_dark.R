# build_publication_plots_dark.R
# Dark-themed publication plots — reads from _data/publications.csv (source of truth)
# Run from the ecoclassical.github.io root directory

library(dplyr)
library(forcats)
library(plotly)
library(htmlwidgets)

# ── Source of truth ───────────────────────────────────────────────────────────

pubs <- read.csv("_data/publications.csv", stringsAsFactors = FALSE) %>%
  filter(status != "In progress") %>%
  mutate(type = fct_relevel(as.factor(type),
    "Article", "Book", "Book chapter", "Encyclopedia", "Working paper"))

# ── Site palette ──────────────────────────────────────────────────────────────

pal <- c(
  "Article"       = "#4f9cf9",
  "Book"          = "#38d9a9",
  "Book chapter"  = "#f9a84f",
  "Encyclopedia"  = "#c084fc",
  "Working paper" = "#f87171"
)

bg      <- "#080d18"
surface <- "#0f1726"
txt     <- "#e2e8f0"
muted   <- "#7a8aa0"
grid_c  <- "rgba(255,255,255,0.07)"
line_c  <- "rgba(255,255,255,0.10)"
fnt     <- list(color = txt,
                family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")

# ── Donut: by type ────────────────────────────────────────────────────────────

by_type <- pubs %>%
  group_by(type) %>%
  summarise(
    n          = n(),
    titles     = paste0("• ", title, collapse = "<br>"),
    .groups    = "drop"
  ) %>%
  mutate(hover_text = paste0("<b>", type, "</b> (", n, ")<br><br>", titles))

p_donut <- plot_ly(
  by_type,
  labels          = ~type,
  values          = ~n,
  type            = "pie",
  hole            = 0.6,
  hoverinfo       = "text",
  text            = ~hover_text,
  textinfo        = "label+value",
  textposition    = "inside",
  insidetextfont  = list(color = txt),
  outsidetextfont = list(color = txt),
  marker = list(
    colors = pal[as.character(by_type$type)],
    line   = list(color = bg, width = 2)
  )
) %>%
  layout(
    showlegend    = FALSE,
    paper_bgcolor = bg,
    plot_bgcolor  = bg,
    font          = fnt,
    margin        = list(l = 0, r = 0, t = 10, b = 10)
  )

saveWidget(p_donut,
           file          = "files/publications_donut.html",
           selfcontained = FALSE,
           background    = bg)

# ── Stacked bar: by year & type ───────────────────────────────────────────────

by_yt <- pubs %>%
  group_by(year, type) %>%
  summarise(
    n          = n(),
    titles     = paste0("• ", title, collapse = "<br>"),
    .groups    = "drop"
  ) %>%
  mutate(hover_text = paste0(
    "<b>", type, "</b> — ", year,
    "<br>Count: ", n, "<br><br>", titles))

p_timeline <- plot_ly(
  by_yt,
  x         = ~year,
  y         = ~n,
  color     = ~type,
  colors    = pal,
  text      = ~hover_text,
  hoverinfo = "text",
  type      = "bar"
) %>%
  layout(
    barmode       = "stack",
    paper_bgcolor = bg,
    plot_bgcolor  = bg,
    font          = fnt,
    xaxis = list(
      title         = "",
      dtick         = 1,
      color         = muted,
      tickfont      = list(color = muted),
      gridcolor     = grid_c,
      linecolor     = line_c,
      zerolinecolor = line_c
    ),
    yaxis = list(
      title         = "Publications",
      titlefont     = list(color = muted),
      color         = muted,
      tickfont      = list(color = muted),
      gridcolor     = grid_c,
      linecolor     = line_c,
      zerolinecolor = line_c
    ),
    legend = list(
      orientation = "h",
      x           = 0,
      y           = -0.25,
      bgcolor     = surface,
      bordercolor = grid_c,
      font        = list(color = txt)
    ),
    margin = list(l = 40, r = 10, t = 10, b = 70)
  )

saveWidget(p_timeline,
           file          = "files/publications_timeline.html",
           selfcontained = FALSE,
           background    = bg)

message("Publication plots saved from _data/publications.csv")
