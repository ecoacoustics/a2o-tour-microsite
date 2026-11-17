---
# Each page in this section is a map marker, not a website page. The map and the home page
# location cards read these pages, in `weight` order. They are never rendered.
# The location's own page (content/<location>/_index.md) is a separate content page.
#
# Marker front matter:
#   title: label for the marker
#   weight: order of the marker, and of the location cards
#   latitude, longitude: required marker position
#   site_information_page: content path of the location's page, e.g. /binya. The callout takes its
#     link, image and species from that page unless the marker overrides them
#   callout.description: short description shown in the callout and card
#   callout.image, callout.link: optional overrides of the location page's image and URL
#   species: optional override of the location page's species
title: A2O Ecoacoustic Tour Map
build:
  render: never
  list: local
cascade:
  - build:
      render: never
      list: local
map_options:
  min_zoom: 3
---