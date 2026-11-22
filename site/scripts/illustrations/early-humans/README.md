# Yuanmou and Lantian illustrations

Five original illustrations in English and Simplified Chinese accompany
`yuanmou-lantian-and-early-human-presence.md`. They are editorial SVG source
assets, independent of JavaScript and the site build. The article reserves their
1200 by 760 layout space and provides focusable horizontal panning on mobile.

Run `python generate.py` with matplotlib available. Chinese text is outlined
from the repository's Noto Sans SC font. English uses DejaVu Sans. PNG previews
are written only to `/tmp/eng-digest-early-humans/` and are not committed.

## Geography

`site-map` reads the existing Natural Earth public domain land and river subset
at `../pleistocene/geography.json`. Its provenance and data sources are recorded
in that directory's README. The figure uses approximate present coordinates:
Yuanmou (101.91 E, 25.68 N), Lantian/Gongwangling (109.49 E, 34.20 N), Xihoudu
(110.29 E, 34.68 N), Nihewan (114.65 E, 40.22 N), and Yunxian/Xuetangliangzi
(110.59 E, 32.83 N). Shangchen is grouped with nearby Lantian at this map scale.
Dots and callout lines locate sites, without inferring movement or ancient
political boundaries. Modern land and rivers are not paleoenvironmental
reconstructions.

## Evidence and dates

- `yuanmou-context` separates tooth morphology, the approximately 1.7 Ma site
  chronology, and the upper gravel burial age of approximately 1.54 Ma with
  ±0.11 Ma including external error. The uncertain exact original tooth horizon
  remains explicit. Source: Luo et al., Quaternary Geochronology 55 (2020),
  https://doi.org/10.1016/j.quageo.2019.101022
- `lantian-gap` explains the distinction between the approximately 1.63 Ma fossil
  horizon interpretation and approximately 1.82 ±0.12 Ma underlying gravels.
  The bands and hiatus are conceptual, without measured thicknesses, exact
  boundaries, or a complete polarity sequence. Sources: Zhu et al. (2015),
  https://doi.org/10.1016/j.jhevol.2014.10.001 and Tu et al. (2017),
  https://doi.org/10.1016/j.quageo.2017.04.004
- `age-records` separates fossil and tool records. It is a comparison of reported
  interpretations, not a universal ranking or ancestry diagram. Further sources:
  Shangchen, https://doi.org/10.1038/s41586-018-0299-4 (2018);
  Majuangou, https://doi.org/10.1038/nature02829 (2004);
  Xihoudu, https://doi.org/10.1016/j.anthro.2020.102790 (2020);
  Yunxian, https://doi.org/10.1126/sciadv.ady2270 (2026).
  The Yunxian uncertainty is one standard deviation of internal error; the
  Xihoudu manufacture question is retained. Uncertainty labels are not uniform
  across the original studies and should not be read as uniform precision.
- `regional-evidence` is an original conceptual comparison of evidence types.
  It supplies no specimen reconstruction, taxonomic assignment, ancient genome,
  migration route, or direct descent claim.

All labels and positions correspond across languages. The figures depict no
actual fossil, excavation scene, ancient face, or synthetic measurement trace.
