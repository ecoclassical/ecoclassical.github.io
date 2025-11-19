# scripts/build_publication_plots.R
# Drop-in replacement (no vertical dashed lines, hue palette for both plots)

library(tibble)
library(dplyr)
library(forcats)
library(plotly)
library(htmlwidgets)
library(scales)

# ---------  data  ---------

pubs <- tribble(
  ~year , ~type           , ~title                                                                                      ,
   2025 , "Article"       , "Macroeconomic Models for Assessing the Transition towards a Circular Economy: A Review"    ,
   2024 , "Article"       , "Time Scales of the Low-Carbon Transition: A Data-Driven Dynamic Multi-Sector Growth Model" ,
   2023 , "Article"       , "Business cycles, sectoral price stabilization, and climate change mitigation"              ,
   2015 , "Article"       , "SeDuS: segmental duplication simulator"                                                    ,
   2014 , "Article"       , "Interplay of Interlocus Gene Conversion and Crossover"                                     ,
   2011 , "Article"       , "Traveling echo waves in an array of excitable elements with time-delayed coupling"         ,
   2024 , "Book"          , "Multiplicity of Time Scales in Complex Systems"                                            ,
   2024 , "Book chapter"  , "Introduction (Multiplicity of Time Scales, Vol. I)"                                        ,
   2023 , "Book chapter"  , "Using IO–SFC models to assess circular economy strategies"                               ,
   2023 , "Book chapter"  , "A human rights-based approach to assistive technology provision"                           ,
   2023 , "Encyclopedia"  , "Dictionary of Ecological Economics entries"                                                ,
   2024 , "Working paper" , "Environmentalism without class struggle is just gardening"                                 ,
   2022 , "Working paper" , "The purely economic case for investing in health for all"                                  ,
   2020 , "Working paper" , "Classical–evolutionary dynamics of price formation"
)

pubs <- pubs %>%
  mutate(
    type = fct_relevel(
      type,
      "Article",
      "Book",
      "Book chapter",
      "Encyclopedia",
      "Working paper"
    )
  )

type_levels <- levels(pubs$type)

# ---------  rainbow/hue palette ---------
# ggplot2 default hue palette
pal_fun <- hue_pal(h = c(0, 360) + 15, c = 100, l = 65)
type_colors <- setNames(pal_fun(length(type_levels)), type_levels)

# ---------  donut: by type ---------

by_type <- pubs %>%
  group_by(type) %>%
  summarise(
    n = n(),
    titles = paste0("• ", title, collapse = "<br>"),
    .groups = "drop"
  ) %>%
  mutate(
    hover_text = paste0(
      "<b>",
      type,
      "</b> (",
      n,
      ")",
      "<br><br>",
      titles
    )
  )

p_donut <- plot_ly(
  by_type,
  labels = ~type,
  values = ~n,
  type = "pie",
  hole = 0.6,
  hoverinfo = "text",
  text = ~hover_text,
  textinfo = "label+value",
  textposition = "inside",
  marker = list(colors = type_colors[by_type$type])
) %>%
  layout(
    showlegend = TRUE,
    margin = list(l = 0, r = 0, t = 0, b = 0)
  )

htmlwidgets::saveWidget(
  p_donut,
  file = "files/publications_donut.html",
  selfcontained = TRUE
)

# ---------  stacked bar: by year & type ---------

by_year_type <- pubs %>%
  group_by(year, type) %>%
  summarise(
    n = n(),
    titles = paste0("• ", title, collapse = "<br>"),
    .groups = "drop"
  ) %>%
  mutate(
    hover_text = paste0(
      "<b>",
      type,
      "</b> — ",
      year,
      "<br>Count: ",
      n,
      "<br><br>",
      titles
    )
  )

p_timeline <- plot_ly(
  by_year_type,
  x = ~year,
  y = ~n,
  color = ~type,
  colors = type_colors,
  text = ~hover_text,
  hoverinfo = "text",
  type = "bar"
) %>%
  layout(
    barmode = "stack",
    xaxis = list(title = "", dtick = 1),
    yaxis = list(title = "Publications"),
    legend = list(orientation = "h", x = 0, y = -0.25),
    margin = list(l = 40, r = 10, t = 10, b = 70)
    # no shapes = no vertical dashed lines
  )

htmlwidgets::saveWidget(
  p_timeline,
  file = "files/publications_timeline.html",
  selfcontained = TRUE
)

message("Saved plotly widgets with hue palette (no dashed lines)")
