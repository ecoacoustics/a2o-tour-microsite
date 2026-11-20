---
# Each page in this section is a map marker, not a website page. The map and the home page
# location cards read these pages, in `weight` order. They are never rendered.
# The location's own page (content/<location>/_index.md) is a separate content page.
#
# Marker front matter:
#   title: label for the marker
#   weight: order of the marker, and of the location cards
#   latitude, longitude: required marker position
#   datasources: named content-page paths whose data is available to
#     the callout/card layout, e.g. location: /binya
#   callout.description: short description shown in the callout and card
#   callout.image, callout.link: optional overrides of the location datasource's image and URL
title: A2O Ecoacoustic Tour Map
weight: 1
map_options:
  min_zoom: 3
---