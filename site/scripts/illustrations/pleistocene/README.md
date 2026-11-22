# Pleistocene article illustrations

These are source assets for the bilingual history essay, not site build output.
The committed SVG files are served directly; CI does not install matplotlib or
run this script.

To reproduce them, install matplotlib in an isolated Python environment and run
`python site/scripts/illustrations/pleistocene/generate.py` from the repository.
Chinese lettering is converted to paths using the existing bundled Noto Sans SC
font, avoiding a dependency on a visitor's fonts. All ten outputs have a fixed
viewBox, explicit dimensions, and an opaque background suitable for both themes.

## Sea level data

`sea-level.csv` retains all 151 original rows from ages 0 through 150 calendar ka
BP in the short stack, with the original values and lower and upper bootstrap
95% interval. There is no resampling, smoothing, or vertical normalization.
BP here uses 1950 CE. The supplied endpoint is not a tide-gauge observation.

Source: Rachel M. Spratt and Lorraine E. Lisiecki, *A Late Pleistocene sea level
stack*, Climate of the Past 12, 1079–1092 (2016),
https://doi.org/10.5194/cp-12-1079-2016 (CC BY 3.0).

Archive accessed November 22, 2026:
https://www.ncei.noaa.gov/pub/data/paleo/contributions_by_author/spratt2016/spratt2016.txt

SHA-256 of downloaded archive:
`4e0cdedb99a80ba57cf7df0c2f76c1b6700725e278a2deee952cbec7b87c9a0c`.
The archive's old in-press DOI differs from the final DOI above; the final paper
is the publication cited in the article.

## Geographic reference data

`geography.json` contains selected land outer rings intersecting the displayed
75–145° E, 10–55° N region and the Yellow River and Yangtze river line groups.
Inputs are modern Natural Earth physical data, in the public domain:
https://www.naturalearthdata.com/about/terms-of-use/

* Land, 1:110 million:
  https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
  SHA-256 `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`.
* Rivers, 1:50 million:
  https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_rivers_lake_centerlines.geojson
  SHA-256 `f286e0ce978fde999ca2d7a78c764be08542e19b63cded52b05c12d5173ccc51`.

Both inputs were accessed November 22, 2026. No modern administrative borders
are drawn. Ellipses locate broad regions schematically; they are not measured
terrain, vegetation, glacier, or political boundaries. The map is not a
Pleistocene shoreline reconstruction. Other diagrams are original conceptual
illustrations. The shelf profile has no surveyed horizontal or vertical scale.
