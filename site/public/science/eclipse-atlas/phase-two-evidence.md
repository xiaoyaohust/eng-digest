# Eclipse Atlas, Phase Two: Evidence and Provenance

Article date: October 14, 2026, America/Los_Angeles. Source packet date: October 15 UTC.

The article summarizes existing work. It does not modify the research repository, rerun
scientific experiments, acquire observational products, confirm a companion, or establish a
publishable new method. The current analysis line is closed. The earlier website article
remains an October 11 snapshot with a link to this follow-up.

## Source versions

- Research snapshot: `research-closeout-v1`, commit
  `87f8c7d993c9b3864f5c247024e352aaa4ee993d`.
- Review-packet source commit: `96d2bb6c9fcb5145d3610fee8ab65494b79fe5f6`.
- Packet version records: `SOURCE_VERSION.json`, `artifact_provenance.json`, and
  `FILE_MANIFEST.json` in the supplied `output/research_review/` directory.
- Subsequent provenance-record commit checked during editing: `8bf3435`.

Paths below identify evidence inside the research archive. They are not public download links.
The source PDFs were read along with their matching Markdown and the small evidence tables.
The public website does not redistribute those private reports, the backup, raw telescope
files, or third-party paper PDFs.

## The four supplied reports

| File | Relevant material | Pages | SHA-256 of the supplied PDF |
| --- | --- | --- | --- |
| `researcher_review_brief_zh.pdf` | Summary, three figures, source groups E1-E4, absence of external endorsement | 3 | `248628aa64c1cb7985fa4ea8c090e680f6ac18f748fc3846454472f3821c7d7c` |
| `research_review_limitations_zh.pdf` | Supported scope, unsupported properties, uncertainty-field and R10 corrections | 2 | `e09fd6f766a117599e73d946556a775a766c302bcc44e1690253d8acc2210acb` |
| `research_handover_report_zh.pdf` | Sections 3-4: results and errata; section 5: preservation; section 6: literature limits | 5 | `bdee60d56023f20cafa4b1bb81daf3e85e6752f872404dab4f83a32e26155975` |
| `literature_comparison_handover.pdf` | Prior methods, reading depth, possible narrow increments, incomplete novelty assessment | 3 | `e59525eeba884ef73003b22a946f39498ee4be37df8344470490dc2e09e31971` |

## Claim index

| Claim | Evidence, code, and version | Scope |
| --- | --- | --- |
| Synthetic 95%/68% coverage rounds to 95.1%/75.4% | `results/2026-10-13_round4/phaseA_analysis/phaseA_eval.json`, `synthetic.s1_accepted`: cov95 = 0.9514563106796117; cov68 = 0.7536208817443896; n = 6283; clusters = 157. `round4_phaseA_analysis.py`, `round4_phaseA_verdict.py`; preregistration `15066d0`, results `2bee326` | Estimator-matched noiseless reference; specified synthetic noise and accepted evaluation units |
| Real-light-curve injection coverage rounds to 96.6%/77.4% | Same JSON, `real_injections.s1_accepted`: cov95 = 0.9661921708185054; cov68 = 0.7740213523131673; n = 562; clusters = 8. Report E1 records four accepted systems | Repeated injections into four systems, not 562 independent stars; development evidence |
| Calibration conditions | `docs/timing_error_calibration_round4.md`; round-4 README; `round4_time_real.py`, `round4_build_residual_library.py`, `round4_phaseA_sim.py`, `round4_shift_test.py` | MAST/TESS SPOC, 120-second exposures, SAP flux, no prewhitening, selection and injection-room requirements. Product versions, sectors, retrieval UTC times, and hashes are in `data/manifests/tess_*.json` and `data/manifests/residual_library_round4.json`. These archive manifests were not regenerated for the article |
| Pipeline-minus-matched-node 95% interval is -0.002 to 0.062 | `docs/node_pipeline_transfer_round6.md`, section 3, K = 4-5 row; `round6_poststrat.py`; round-6 results archived at `0eed62c` | A nonzero residual difference is not established; useful transfer accuracy is not established either |
| Synthetic example: 149/400 false alarms (37.25%, approximately 37%) | `results/2026-10-15_round6/correlated/cells.csv`, cell 446: S12, K = 12, ell_d = 1000, A_s = 20, tau_iid_s = 10, tail = gauss, n = 400, fa = 149, fpr = 0.3725. `round6_correlated.py`, archived `0eed62c`; seed0 = 46460000 | Fixed four-season layout, stated node error 5 seconds; synthetic zero drift. Not a measurement of any real target |
| Figure 2 nominal rate and error bars | Same saved CSV and `docs/correlated_systematics_round6.md`; packet `artifact_provenance.json` selects 36 existing cells | Nominal alpha = 0.05, stored 95% binomial intervals, independent Gaussian jitter 10 seconds. Seven layouts exist in the full study; the review figure shows three |
| Shape fitting increases timing uncertainty by 11-14 times in the idealized calculation | `docs/shape_information_budget.md`, section 2; `results/2026-10-15_round7_shape_budget/fisher.csv`; `src/etvsearch/shape_budget.py`; preregistration `afecac4`, results `5bee12d` | White noise, full coverage, perfect template, specified joint shape fit; not a universal inflation factor |
| Shape feasibility returns STOP; one condition met the two-family requirement, three required | Same report, section 5, and `analysis/decision.json`; `round7_shape_budget.py`, `round7_shape_analysis.py` | Five precision-selected development reference conditions, phenomenological families, bounded amplitudes, SPOC SAP residual library; no physical starspot or real-shape validation |
| Figure 3 uses a 20-second pseudo-shift and a nominal 1% threshold | `analysis/rates.csv`, `figures/round7/pdet_by_condition.png`; 200 Monte Carlo draws per cell; results `5bee12d` | Shared noise for null calibration and distortion evaluation; no independent false-flag calibration. n/r means the shift was not reached within the family bound |
| Joint predictions were reconstructed; the earlier calculation lost correlations and omitted geometry floors | `docs/archival_trial_round9.md`, section 1; `round9_joint_draws.py`; results `77574da` | Reconstruction repaired the prediction calculation, not upstream geometry adequacy |
| Gate requires power at least 0.8 in both directions with Bayes factor at least 20 | Same report, sections 3 and 8; `round9_gate1.py`; precision grid 60-10800 seconds and cited systematic contribution 180 seconds | Maximum tolerable measurement error must be at least 600 seconds under every stress variant; single historical-epoch absolute primary-secondary interval and stated models |
| At 60 seconds: TIC 253270207 power = 0.7745/0; TIC 146204045 = 0.871/0.0515 | `results/2026-10-15_closeout/round9_r10_erratum.json`, `table_from_power_csv`; original `gate1/power.csv`; `closeout_round9_r10.py`, correction `3d25157` | R10, SuperWASP-era prediction setup; conditional simulated power, not actual observations. R10 is not measured tenfold underestimation in those targets |
| Zero summary flag is not zero power or unlimited-precision impossibility | Same report, section 8, and limitations report point 8 | No tested precision passed every two-direction requirement. Gate FAIL remains; no archive coverage query, observational download, or sparse-data estimator followed |
| M5 posterior SD does not exist at K = 3 | Limitations report point 4; handover report section 4; closeout errata index | The historical finite scale was a numerical truncation artifact. Read `sd_exists`, `scale_definition`, and `halfwidth68`; do not treat the old scale as an SD |
| Restored archive checked 2488 files by hash | Handover report section 5; `results/2026-10-15_handover/backup_verification.json`; `archive_research_snapshot.py` | Same physical disk, no off-disk copy at handover. Environment reconstruction still depends on available packages |
| Ten of eleven checked outputs were byte-identical; other difference was cost metadata | `results/2026-10-15_closeout/regen_check.json`; handover report section 5 | Three selected re-entry checks, not a full scientific rerun. No full workflow was rerun during final handover or website editing |
| No established new discovery, complete validation, or publication readiness | All four review PDFs; `research_limitations_report.md`, `research_closeout_index.md` | Historical classifications remain conditional; they do not confirm or exclude candidates |

## Figure provenance

The website PNGs are unchanged copies, not reconstructed measurements. Their full-size images
are linked from the article for reading labels on a small display.

| Website file | Original project output and generator | Original result / packet source | SHA-256 |
| --- | --- | --- | --- |
| `phase-two/timing-coverage.png` | `figures/round4/phaseA_coverage_bias.png`; `round4_figures.py` | `2bee326` | `259283258df9cfa2791780cb38e4635abbc4f21304efe2774d1e4cb08cc7f18b` |
| `phase-two/correlated-errors.png` | `figures/handover/correlated_systematics_risk.png`; `build_research_review.py --figures-only`, reading existing `cells.csv` | Scientific results `0eed62c`; review source `96d2bb6c9fcb5145d3610fee8ab65494b79fe5f6` | `b450d48ffcb4105ab8f0d875dcb55da4b3b08aae9604a352b237cc6f2a8ac6e6` |
| `phase-two/shape-detectability.png` | `figures/round7/pdet_by_condition.png`; `round7_shape_analysis.py` | `5bee12d` | `e2398830cf09a0b51a22a608b28213b9009817200d24576606ccb26e88273303` |

The saved correlation-table SHA-256 is
`7029133532257f6fbc09ccfe60e88b5ac33ac36c213c57277e727df799da01df`.
The review plotting script SHA-256 is
`00d7124318cef5f416ae90b1b62a4b0196f4a5d62867f9aed854eb409b702f02`.
The packet records zero new simulations for the replot.

## Literature and reading depth

The four papers linked in the article were already recorded as verified references in the
research project; their primary arXiv records were checked again during editing. Registry
verification identifies a publication. It does not validate this project's method.

- [Carter & Winn 2009, v1](https://arxiv.org/abs/0909.0747v1): review packet excerpt checks
  sections 4.1 and 4.4; simulations and timing uncertainty under correlated noise.
- [Mikulasek 2015, v1](https://arxiv.org/abs/1508.04827v1): packet excerpt checks sections 5,
  6.3, 6.4.3, and 7; phenomenological models, combined phase information, and practical scatter.
- [Liang, Winn & Albrecht 2022, v1](https://arxiv.org/abs/2201.11699v1): packet excerpt checks
  sections 3-5; DI Her, starspots, gravity darkening, and additional historical observations.
- [Jiang 2026, v1](https://arxiv.org/abs/2608.13269v1): packet retains its prior review of main
  sections 1-6 and listed supporting-information sections; target-specific stellar budgets and
  sector nodes. Described as a preprint in this article.

The packet's new excerpt reading is not a complete rereading of each paper. The bounded
literature comparison is not a systematic novelty review. ADS and some full-text access
remained incomplete, and absent search results do not establish absent prior work.

## Interpretation safeguards

- Coverage refers to an estimator-defined reference under specified inputs.
- Evaluation after development exposure is not a fresh confirmation sample.
- A difference interval containing zero establishes neither a residual difference nor a useful
  equivalence between the node and full-pipeline procedures.
- Correlation risk experiments are synthetic; no target-specific process was measured.
- Shape information from the same photons is not an independent observation.
- No detected shape change does not exclude spurious timing.
- R10 conditional prediction power is not observed significance or a measured error multiplier.
- Reconstructed joint sampling does not fix inadequate geometry fits.
- Successful restoration or software tests do not establish physical validity.
- External expert endorsement and scientific novelty remain unestablished.
