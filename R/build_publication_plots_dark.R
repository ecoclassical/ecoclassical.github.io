# build_publication_plots_dark.R
# Dark-themed publication plots matching ecoclassical.github.io palette

library(tibble)
library(dplyr)
library(forcats)
library(plotly)
library(htmlwidgets)

# ── Data ──────────────────────────────────────────────────────────────────────

pubs <- tribble(
  ~year , ~type           , ~title,
   2025 , "Article"       , "Macroeconomic Models for Assessing the Transition towards a Circular Economy: A Review",
   2024 , "Article"       , "Time Scales of the Low-Carbon Transition: A Data-Driven Dynamic Multi-Sector Growth Model",
   2023 , "Article"       , "Business cycles, sectoral price stabilization, and climate change mitigation",
   2015 , "Article"       , "SeDuS: segmental duplication simulator",
   2014 , "Article"       , "Interplay of Interlocus Gene Conversion and Crossover",
   2011 , "Article"       , "Traveling echo waves in an array of excitable elements with time-delayed coupling",
   2024 , "Book"          , "Multiplicity of Time Scales in Complex Systems",
   2024 , "Book chapter"  , "Introduction (Multiplicity of Time Scales, Vol. I)",
   2023 , "Book chapter"  , "Using IO-SFC models to assess circular economy strategies",
   2023 , "Book chapter"  , "A human rights-based approach to assistive technology provision",
   2023 , "Encyclopedia"  , "Dictionary of Ecological Economics entries",
   2026 , "Working paper" , "Classical Economic Thermodynamics: The Fundamental Laws of Motion of Value and Social Reproduction",
   2024 , "Working paper" , "Environmentalism without class struggle is just gardening",
   2022 , "Working paper" , "The purely economic case for investing in health for all",
   2020 , "Working paper" , "Classical-evolutionary dynamics of price formation"
)

pubs <- pubs %>%
  mutate(type = fct_relevel(type,
    "Article", "Book", "Book chapter", "Encyclopedia", "Working paper"))

# ── Site palette (matches --blue, --green, --orange, --purple, --muted) ──────

pal <- c(
  "Article"       = "#4f9cf9",   # blue
  "Book"          = "#38d9a9",   # green
  "Book chapter"  = "#f9a84f",   # orange
  "Encyclopedia"  = "#c084fc",   # purple
  "Working paper" = "#f87171"    # coral
)

bg       <- "#080d18"
surface  <- "#0f1726"
text_col <- "#e2e8f0"
muted    <- "#7a8aa0"
grid_col <- "rgba(255,255,255,0.07)"
line_col <- "rgba(255,255,255,0.10)"

base_font <- list(color = text_col,
                  family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")

# ── Donut: by type ────────────────────────────────────────────────────────────

by_type <- pubs %>%
  group_by(type) %>%
  summarise(
    n      = n(),
    titles = paste0("• ", title, collapse = "<br>"),
    .groups = "drop"
  ) %>%
  mutate(hover_text = paste0("<b>", type, "</b> (", n, ")<br><br>", titles))

p_donut <- plot_ly(
  by_type,
  labels        = ~type,
  values        = ~n,
  type          = "pie",
  hole          = 0.6,
  hoverinfo     = "text",
  text          = ~hover_text,
  textinfo      = "label+value",
  textposition  = "inside",
  insidetextfont  = list(color = text_col),
  outsidetextfont = list(color = text_col),
  marker = list(
    colors = pal[levels(by_type$type)],
    line   = list(color = bg, width = 2)
  )
) %>%
  layout(
    showlegend    = FALSE,
    paper_bgcolor = bg,
    plot_bgcolor  = bg,
    font          = base_font,
    margin        = list(l = 0, r = 0, t = 10, b = 10)
  )

htmlwidgets::saveWidget(
  p_donut,
  file            = "files/publications_donut.html",
  selfcontained   = TRUE,
  background      = bg
)

# ── Stacked bar: by year & type ───────────────────────────────────────────────

by_year_type <- pubs %>%
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
  by_year_type,
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
    font          = base_font,
    xaxis = list(
      title      = "",
      dtick      = 1,
      color      = muted,
      tickfont   = list(color = muted),
      gridcolor  = grid_col,
      linecolor  = line_col,
      zerolinecolor = line_col
    ),
    yaxis = list(
      title      = "Publications",
      titlefont  = list(color = muted),
      color      = muted,
      tickfont   = list(color = muted),
      gridcolor  = grid_col,
      linecolor  = line_col,
      zerolinecolor = line_col
    ),
    legend = list(
      orientation = "h",
      x           = 0,
      y           = -0.25,
      bgcolor     = surface,
      bordercolor = grid_col,
      font        = list(color = text_col)
    ),
    margin = list(l = 40, r = 10, t = 10, b = 70)
  )

htmlwidgets::saveWidget(
  p_timeline,
  file          = "files/publications_timeline.html",
  selfcontained = TRUE,
  background    = bg
)

message("Dark-themed publication plots saved.")
