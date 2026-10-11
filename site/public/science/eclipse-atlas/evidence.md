# Eclipse Atlas: Evidence and Provenance

Checked October 11, 2026. Research repository: astronomy-research. Archived commit: `4d2cd05a4aff012960ba1ebf9d6d5aa28c3d5c72`.

Paths below are relative to that research repository. The website copies existing figures and reports a dated research snapshot. It does not change research code, data, results, or existing reports. This is a research-progress article, not a peer-reviewed paper.

## Claim index

| Claim in the article | Direct evidence | Limits |
| --- | --- | --- |
| TIC 1202347: thirteen files, seven sectors, one unusable | `docs/data_inventory.md`; `docs/lightcurve_analysis.md` §1; `data/inventory/tic0001202347_tess_inventory.csv` | File count differs from usable-sector count. Sector 34 is excluded from final timing. |
| 57 eclipses in 2019–2025; period 4.15047376 ± 0.00000054 days | `results/2026-10-11_tic1202347_oc/summary.json` fields n and M0; `oc_residuals.csv`; `docs/oc_analysis_report.md` §§1–3 | Joint-fit period error is one standard deviation, not individual eclipse precision. |
| About 50-second empirical timing precision | `docs/eclipse_timing_validation.md` §4; `docs/scientific_findings.md`; timing and uncertainty-calibration tables | Applies to this benchmark; adopted individual errors are more conservative. |
| Period-change upper limit 0.13 seconds/year at 95%; no significant periodic signal | O−C report §§4–5; `model_parameters.csv`; summary tests.sin_max.p_boot = 0.9006 | Conditional on models, noise treatment, and sampling. Does not exclude all variability. |
| A 700-day, 400-second semi-amplitude signal can be missed | `injection_sinusoid.csv`; summary limits; O−C report §7 | Synthetic signals injected at observed epochs, not a detected companion. |
| Secondary offset −56 ± 18 seconds remains unexplained | Summary M0.delta_s_s and delta_s_err_s; O−C report §§3, 6 | Formal significance does not remove eclipse-shape systematics. |
| 1,300 simulations; 233 measurable null cases, zero false drifts, about 1.6% upper bound | `results/2026-10-11_apsidal_injection/summary.json` metrics.null_drift; `realizations.csv.gz`; `docs/detection_performance_report.md` §3 | Denominator is measurable cases. Zero observed false alarms does not establish zero population risk. |
| Independent-error estimator: about 79% false alarms in the same null sample | Same summary, naive_abs_z_gt3; `figures/injection/false_positive_rates.png` | Specific simulation and estimator, not a population estimate or proof about another author's method. |
| About 23% significant excess among 227 measurable excess simulations | Same summary, metrics.excess.n_measured = 227 and excess_rate = 0.23348 | Not the fraction of all 400 excess simulations; some were unmeasurable. |
| Confirmed planet TIC 172900988 fails this project's three-node threshold | Detection-performance report §1; Kostov 2021 | A sensitivity limitation, not evidence against the confirmed planet. |
| Original reproduction criteria were not all met; later corrections require new validation | `docs/published_reproduction_report.md` §§1, 5, 8; `results/validation/` | Agreement after inspecting benchmarks is not independent validation. |
| 27 candidates: 25 blind tests, two controls; four differential drifts and two rate disagreements | `results/2026-10-11_candidate_reanalysis/sample_summary.json`, `comparison_table.csv`, `candidate_results.csv`; `docs/candidate_reanalysis_report.md` | Drift, rate comparison, and excess classification are different questions. |
| Classical terms scale with relative radius to the fifth power; 1.2^5 = 2.48832 | `src/etvsearch/apsidal.py`, omegadot_classical; `tests/test_apsidal.py` | Other quantities fixed; an algebraic example, not a correction for every star. |
| Six validation systems, radius discrepancy RMS 2.3%, maximum about 6% | `results/2026-10-11_stellar_physics/validation_geometry.csv`; `floors.json`, rms_dr_over_r = 0.023441; `docs/stellar_physics_analysis.md` §2 | Twelve components in six systems. A seventh system, KX Cnc, failed. Not a new-target precision guarantee. |
| Published-rate classification: seven consistent, seven conditional excesses, four sensitive, nine insufficient | Same directory, `classification.csv` class_RT; `budget_variants.csv`; stellar report §5 | The excesses depend on published rates not independently supported by this project's own timing. |
| Four targets forecast at least about 50 minutes of interval separation over ten years | Same directory, `forecast_10yr.csv`; `docs/publication_readiness_report.md` §§1, 8 | Forecast, not observation. CSV generation was recorded in a conversation; a standalone script is still missing. |
| No supported new discovery; paper preparation deferred | Publication-readiness report §§4, 6–8; `docs/research_log.md`, Session 10 | Literature checks are not an exhaustive novelty review. Project results have not been peer reviewed. |

## Scripts, versions, and inputs

- **Benchmark timing and O−C:** `scripts/eclipse_timing.py --tic 1202347` and `scripts/oc_analysis.py --tic 1202347`. See the timing and O−C result directories' README files. Inputs: TESS SPOC PDCSAP sectors 8/61/62 at 120 seconds, QLP SAP sector 35 at 600 seconds, and sectors 88/89 at 200 seconds, downloaded from MAST. Dates and SHA-256 hashes are in `data/manifests/` and the inventory. Commands and final timing outputs are archived at `74fc111`.
- **Frozen-protocol simulations:** `scripts/injection_apsidal.py --workers 13`, protocol commit `28c3e11c39ad2e7c38718489fac9dbf3619534f5`, tag prereg-thornton-v1. Inputs are fully synthetic. Seeds and true parameters are recorded in the associated README, summary, and realization table.
- **Candidate reanalysis:** `scripts/reanalyze_candidates.py` and `scripts/candidate_sample_analysis.py`. Frozen protocol `28c3e11`, run code `3ac1ebf`, outputs archived at `813ffaa`. Inputs are listed in `data/inventory/thornton_*`, the MAST manifests, and `data/external/published/thornton2026_*`.
- **Geometry and stellar contributions:** `scripts/fit_eclipse_geometry.py`, `scripts/stellar_physics_analysis.py`, and `scripts/stellar_physics_figures.py`, from `3ab9862` through final archive `4d2cd05`. Inputs include TESS light curves, candidate timing results, published Baroch/Thornton tables, Gaia DR3, and Claret 2019 grids. The stellar-results README records details. Calculations include exposure integration, MCMC, systematic-error floors, and joint Monte Carlo sampling.
- **Figure 1:** `figures/tic1202347/oc/oc_diagram.png`, generated by the O−C script.
- **Figure 2:** `figures/injection/false_positive_rates.png`, generated from the simulation results.
- **Figure 3:** `figures/stellar_physics/validation_geometry.png`, generated by the stellar-physics figure script. Website PNGs are copies; plotted numbers were not recalculated.

## Resolving older status reports

Some README and project-status passages describe earlier stages. The article follows Sessions 9/10, the latest stellar report, actual result tables, and publication-readiness review. Physical light-curve modeling is complete. Gaia DR3 eclipse data were used with checked time conventions but did not provide a sufficiently precise independent test. ZTF data were not used.

Validation of an individual timing component does not mean the complete candidate-analysis procedure has met every scientific-readiness requirement.

## Checked references

These records were marked VERIFIED in the repository's reference-verification records and their original paper records were checked during editing. Metadata verification does not endorse a paper's interpretation.

- [Eastman et al. 2010](https://arxiv.org/abs/1005.4415): precision astronomical time standards.
- [Baroch et al. 2021](https://arxiv.org/abs/2103.03140): TESS apsidal motion and benchmark binaries, A&A 649, A64.
- [Claret 2019](https://arxiv.org/abs/1907.11538): MESA internal-structure and tidal-constant grids.
- [Kostov et al. 2021](https://arxiv.org/abs/2105.08614): the confirmed circumbinary planet in TIC 172900988, AJ.
- [Thornton et al. 2026](https://arxiv.org/abs/2512.07934): 27 candidate systems; arXiv v2 records acceptance by MNRAS.
- [Jiang 2026](https://arxiv.org/abs/2608.13269): stellar effects in CH Ind and SW CMa and radius requirements across the sample. Treated as a preprint in the latest repository review.

## Editorial assessment

The scientific interest lies in testing companion interpretations against measured timing, stellar physics, and quantified measurement failures. The strongest supported work consists of measurement components tested with known signals and external benchmarks, plus explicit uncertainty and failure accounting for the candidate sample.

The evidence does not support a new astronomical discovery. Existing work overlaps with part of the analysis. Before submitting a paper, the project needs independent timing validation, better performance on known positive controls, original individual timings or a longer observing baseline, and improved stellar-mass constraints. Candidate-specific independent tests are needed before assessing publication readiness and novelty.
