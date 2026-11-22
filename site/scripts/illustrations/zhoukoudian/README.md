# Zhoukoudian illustrations

Five original bilingual SVG illustrations accompany
`zhoukoudian-peking-man-and-homo-erectus.md`. They are source assets, served
without browser JavaScript and independent of the site build. The article
reserves 1200 by 760 layout space and provides keyboard accessible horizontal
panning for narrow screens.

Run `python generate.py` in an environment with matplotlib. Text is outlined
using the repository's Noto Sans SC font for Chinese and DejaVu Sans for English.
PNG previews are written only to `/tmp/eng-digest-zhoukoudian/`.

## Figure scope and provenance

- `setting` uses approximate modern coordinates: Zhoukoudian (115.925 E,
  39.690 N), central Beijing (116.400 E, 39.900 N). This is a coordinate locator,
  not a topographic map or ancient settlement plan. Its other panel distinguishes
  Locality 1, Upper Cave, and the remaining localities without mapping their
  relative positions. UNESCO's site description provides the site complex scope:
  https://whc.unesco.org/en/list/449
- `research-history` is an original timeline of research and discoveries.
  Dates and roles follow the IVPP accounts linked in the article and Uppsala's
  collection history:
  https://www.uu.se/en/museum-of-evolution/our-collections/palaeontological-collections/lagrelius-collection
  https://www.ivpp.cas.cn/kxcb/kpdt/202401/t20240123_6963585.html
  https://www.ivpp.cas.cn/zt/zt/qzjs80zn/sqjnwj/201811/P020181103622232467174.pdf
  No people, specimens, or historical excavation scenes are reconstructed.
- `cave-processes` uses hypothetical roof and sediment shapes to explain
  accumulation processes. It is not a tracing of any published section and
  encodes no actual layer thickness, archaeological position, chronology, or
  sequence of events. Contextual research:
  Goldberg et al. (2001), https://doi.org/10.1006/jhev.2001.0498
  Boaz et al. (2004), https://doi.org/10.1016/j.jhevol.2004.01.007
- `fire-evidence` keeps different samples and layers separate. Publication dates
  are not dates of burning. The 1998 investigation of Layer 10 found burned bones
  without direct evidence for burning in place; the 2017 paper argues for new
  evidence at Layer 4; the 2022 study sampled Layers 4 and 5 and adds heating
  evidence to the Layer 4 interpretation. No universal temperature threshold,
  synthetic measurement, or single oldest age is supplied. Sources:
  https://doi.org/10.1126/science.281.5374.251
  https://doi.org/10.1086/692501
  https://doi.org/10.3389/feart.2021.811319
- `materials-and-methods` compares information retained by casts, archives,
  originals, and enamel protein samples. It does not draw actual anatomy,
  sequences, or pedigrees. The molecular study is partial protein work,
  not six complete ancient genomes:
  https://doi.org/10.1038/s41586-026-10478-8

The article separately retains the scope of the 2009 chronology. Its
0.77 ±0.08 Ma estimate concerns lower Layers 7 to 10, with the reported
uncertainty being the standard error of a weighted mean. That estimate is not
assigned to the Layer 4 fire evidence in any figure.
