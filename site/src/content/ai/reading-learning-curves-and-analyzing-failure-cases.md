---
title: "Reading Learning Curves and Analyzing Failure Cases"
description: "Distinguish training progress from sample-size curves, reproduce a small NumPy experiment, and use residuals to investigate failures hidden by an average score."
date: 2026-11-22T03:35:46Z
topic: "Building Good Experimental Habits"
order: 19
lang: en
socialTitle: "Reading Learning Curves"
socialDescription: "Read the axes, check the evaluation protocol, and inspect the cases behind a model's average error."
tags: [artificial-intelligence, experimental-practice, learning-curves, error-analysis]
featured: true
draft: false
---

A build-duration predictor's training and validation errors settle at nearly the same value. The team trains longer, but complaints continue: builds without a warm cache finish much later than predicted. Two smooth curves have not explained which cases fail or what change would help.

This section follows [Experiment Records, Version Control, and Reproduction](/ai/experiment-records-version-control-and-reproduction/). It assumes training and validation splits, mean squared error (MSE), mean absolute error (MAE), and fitting a constant or a line. By the end, you should be able to:

- Identify what each curve varies and which observations it evaluates.
- Treat curve patterns as hypotheses requiring controlled checks.
- Reproduce a small experiment and inspect signed errors by case group.
- Choose a next experiment while preserving an untouched final evaluation.

## Read the axes and the measurement procedure

A **training-progress curve** plots a metric against training steps, epochs, or compute. An epoch means one pass through the training examples; it need not equal one parameter update. A **sample-size learning curve** plots performance after refitting on different amounts of training data. Changing epochs and changing data answer different questions. A validation curve can also vary a configuration setting; its axis must identify that setting.

At checkpoint `t`, evaluate the current model on a declared dataset `D`:

```math
E_t(D)=\frac{1}{m}\sum_{i=1}^{m}\left(\widehat y_i^{(t)}-y_i\right)^2,
\qquad G_t=E_t(D_{\mathrm{validation}})-E_t(D_{\mathrm{train}}).
```

The labels and predictions are length-`m` vectors of scalar durations in minutes, with `m > 0`. MSE and the gap `G_t` have units of minutes squared. Lower MSE is better. The gap compares two datasets; its size alone cannot establish acceptable performance. Accuracy uses the opposite direction, and a negative-loss library score needs its sign interpreted before plotting.

Use the same prediction procedure and metric definition at each checkpoint. A training objective that includes an extra penalty is not directly comparable to validation MSE alone. Record whether training metrics come from evolving minibatches or from evaluating a fixed checkpoint on the complete training set. Preprocessing must be consistent and learned only from permitted training data; [scikit-learn's pitfalls guide](https://scikit-learn.org/stable/common_pitfalls.html) explains this boundary.

## Use patterns to select an investigation

<div class="table-scroll" role="region" aria-label="Learning curve observations and controlled investigations" tabindex="0">

| Observation with comparable error measurements | Possible explanation | Useful check |
| --- | --- | --- |
| Training error falls while validation error rises | Fitting training-specific detail | Compare earlier checkpoints and verify the split |
| Both errors plateau above the useful baseline or target | Missing information, limited model, noise, or incomplete optimization | Check fitting on a small fixture, features, and label quality |
| Large training/validation gap | Sensitivity to the training sample or a population mismatch | Inspect groups and repeat appropriate splits |
| Validation fluctuates strongly | Few validation cases, unstable fitting, or changed measurements | Preserve cases and inspect variation across declared repeats |
| Validation error is below training error | Different case difficulty or evaluation conditions | Check data composition and metric definitions |

</div>

**Overfitting** means adaptation to training-specific detail that harms performance on the intended unseen population. **Underfitting** means the fitted predictor misses useful structure. A curve can suggest either explanation, but cannot uniquely identify its cause. [Google's loss-curve guide](https://developers.google.com/machine-learning/crash-course/overfitting/interpreting-loss-curves) uses training and validation behavior to guide diagnosis.

Selecting an earlier checkpoint by a declared validation rule can limit overfitting. Record the selected checkpoint and selection effort. Repeatedly redesigning the model around the same validation results also adapts to those cases; a separate final test remains necessary.

## Construct a fixture with a known missing input

Use a deliberately synthetic build service with duration:

```math
y_i=5+2x_i+4c_i,
\qquad z_i=\frac{x_i-4.5}{3.5},
\qquad \widehat y_i=b+az_i.
```

Size `x_i` is a scalar in arbitrary workload units. The indicator `c_i` is one for a cold cache and zero for a warm cache. Durations and both model coefficients are in minutes; `z_i` is dimensionless. The fixed conversion constants are declared before evaluation. There is no added label noise. The predictor receives size but deliberately omits cache status.

Training contains eight repetitions of sizes one through eight. Seven repetitions are warm and one is cold. Validation has the same group counts but eight evenly spaced sizes from 1.5 to 7.5. The 64 rows in each split are synthetic records, not independent evidence from real repositories. This diagnostic fixture has no final test set.

The fitted size-only line approaches `5.5 + 2x`. The extra 0.5 is the average cache cost, `4 × 8/64`. Thus warm cases have residual 0.5 and cold cases have residual −3.5. The training mean is the constant baseline; its validation MSE is 17.1786. The line's limiting MSE is `(56 × 0.5² + 8 × 3.5²)/64 = 1.75`. Equal errors can coexist with a systematic omitted input.

## Record progress without fitting validation labels

For this small example, each epoch makes one update using every training row. The design matrix `A` has shape `(n, 2)`, with rows `[1, z_i]`; coefficients `θ = [b, a]` have shape `(2,)`. The residual `r = Aθ − y` has shape `(n,)`.

A small change `δ` in coefficient `j` changes MSE as follows:

```math
\begin{aligned}
E(\theta+\delta e_j)-E(\theta)
&=\frac{2\delta}{n}\sum_i A_{ij}r_i
+\frac{\delta^2}{n}\sum_i A_{ij}^2,\\
g_j&=\frac{2}{n}\sum_i A_{ij}r_i,\qquad
\theta_{t+1}=\theta_t-\eta g.
\end{aligned}
```

Here `e_j` is the length-two vector selecting coefficient `j`, and `δ` is a coefficient change in minutes. Expanding each squared residual produces the linear and quadratic terms. The coefficient of `δ` gives the gradient component `g_j`: the local direction of increasing error. A sufficiently small step in the opposite direction reduces this quadratic objective. The dimensionless step `η = 0.2` works for this fixture; it is not a general learning-rate recommendation.

The program needs Python 3.9+ and NumPy, with no external files, downloads, or credentials at execution. Save it as `learning_curves.py`. Predictions are length-64 vectors. Sample-size experiments refit from scratch using [NumPy least squares](https://numpy.org/doc/stable/reference/generated/numpy.linalg.lstsq.html); they do not reuse the iterative model. Each repeat draws one permutation and uses nested training subsets. Validation stays fixed.

```python
import numpy as np


def make_data(validation=False):
    sizes = np.linspace(1.5, 7.5, 8) if validation else np.arange(1.0, 9.0)
    size = np.tile(sizes, 8)
    cold = np.repeat(np.array([0] * 7 + [1]), len(sizes))
    # Fixed unit conversion, declared in advance rather than fitted to a split.
    z = (size - 4.5) / 3.5
    design = np.column_stack((np.ones(size.size), z))
    minutes = 5.0 + 2.0 * size + 4.0 * cold
    return design, minutes, cold


def run_experiment(epochs=80, step=0.2, repeats=20, seed=7):
    train, y_train, _ = make_data()
    valid, y_valid, cold = make_data(validation=True)
    coefficients = np.zeros(train.shape[1])
    progress = np.empty((epochs + 1, 2))
    # One epoch uses every training row once in a single full-batch update.
    for epoch in range(epochs + 1):
        residual = train @ coefficients - y_train
        progress[epoch] = [np.mean(residual ** 2),
                           np.mean((valid @ coefficients - y_valid) ** 2)]
        if epoch < epochs:
            coefficients -= step * (2.0 / len(y_train)) * (train.T @ residual)

    sizes = np.array([8, 16, 32, len(y_train)])
    scores = np.empty((repeats, len(sizes), 2))
    rng = np.random.Generator(np.random.PCG64(seed))
    # Each repeat has nested subsets; every size is refitted from scratch.
    for repeat in range(repeats):
        order = rng.permutation(len(y_train))
        for j, count in enumerate(sizes):
            ids = order[:count]
            fitted, _, rank, _ = np.linalg.lstsq(train[ids], y_train[ids], rcond=None)
            if rank != train.shape[1]:
                raise ValueError("Training subset must support both coefficients")
            scores[repeat, j] = [np.mean((train[ids] @ fitted - y_train[ids]) ** 2),
                                  np.mean((valid @ fitted - y_valid) ** 2)]

    residuals = valid @ coefficients - y_valid
    baseline_mse = np.mean((y_valid - y_train.mean()) ** 2)
    return {"progress": progress, "sizes": sizes, "scores": scores,
            "coefficients": coefficients, "residuals": residuals,
            "cold": cold, "baseline_mse": baseline_mse}


def main():
    result = run_experiment()
    print("epoch train_MSE validation_MSE")
    for epoch in [0, 10, 80]:
        train_error, valid_error = result["progress"][epoch]
        print(f"{epoch:5d} {train_error:.4f} {valid_error:.4f}")
    print("rows median_train_MSE median_validation_MSE")
    medians = np.median(result["scores"], axis=0)
    for size, (train_error, valid_error) in zip(result["sizes"], medians):
        print(f"{size:4d} {train_error:.4f} {valid_error:.4f}")
    print(f"constant baseline validation MSE: {result['baseline_mse']:.4f}")
    for name, mask in [("warm", result["cold"] == 0),
                       ("cold", result["cold"] == 1)]:
        values = result["residuals"][mask]
        print(f"{name}: n={len(values)} MAE={np.mean(np.abs(values)):.4f} "
              f"mean_residual={np.mean(values):.4f}")
    print(f"overall validation MAE: {np.mean(np.abs(result['residuals'])):.4f}")


if __name__ == "__main__":
    main()
```

This output was verified with Python 3.11.4 and NumPy 2.0.2. Values are rounded for display:

```text
epoch train_MSE validation_MSE
    0 233.0000 227.4286
   10 2.2461 2.1165
   80 1.7500 1.7500
rows median_train_MSE median_validation_MSE
   8 0.4348 2.0000
  16 1.2466 1.8621
  32 1.6856 1.7680
  64 1.7500 1.7500
constant baseline validation MSE: 17.1786
warm: n=56 MAE=0.5000 mean_residual=0.5000
cold: n=8 MAE=3.5000 mean_residual=-3.5000
overall validation MAE: 0.8750
```

<figure>
  <div class="figure-scroll" role="region" aria-label="Training progress plot" tabindex="0" style="overflow-x: auto;">
    <img src="/images/ai/learning-curves/progress-en.svg" alt="Computed training and validation MSE falling toward 1.75 over eighty epochs, on a logarithmic vertical axis." width="1200" height="720" style="min-width: 640px;" loading="lazy" decoding="async" />
  </div>
  <figcaption>Figure 1. Computed results from the synthetic fixture. The logarithmic vertical axis shows multiplicative differences. Continued fitting approaches a floor caused here by the missing cache input.</figcaption>
</figure>

## Vary training size under a fixed comparison

<figure>
  <div class="figure-scroll" role="region" aria-label="Training sample size plot" tabindex="0" style="overflow-x: auto;">
    <img src="/images/ai/learning-curves/sample-size-en.svg" alt="Median training and validation MSE across training sizes eight, sixteen, thirty-two, and sixty-four, with interquartile bands over twenty subsample orders." width="1200" height="720" style="min-width: 640px;" loading="lazy" decoding="async" />
  </div>
  <figcaption>Figure 2. The same synthetic pool, refitted at each size. Lines show medians; bands show the middle half of twenty repeated subsampling outcomes. The fixed validation rows are shared.</figcaption>
</figure>

Small training subsets can fit their observed group mixture unusually well while estimating the omitted cache effect poorly. As more rows enter, median validation error decreases and training error increases toward 1.75. That increase in training error does not mean optimization failed: the evaluated training population changed.

The bands describe subsample sensitivity within this finite pool. They are not confidence intervals for future production error. At 64 rows, every repeat uses the same complete pool, so the band collapses without establishing certainty about new data. [Scikit-learn's learning-curve guide](https://scikit-learn.org/stable/modules/learning_curve.html) explains the training-size comparison; this example keeps one validation set instead of cross-validating.

More representative data may help a sensitive model. It cannot supply a missing per-case distinction to this restricted predictor when both groups share each size. A plateau alone still does not prove that additional data is useless in another problem.

## Inspect errors by identity, direction, and group

A **residual** is prediction minus label. Negative values indicate underprediction. Align predictions with record IDs before sorting errors; positional mistakes can manufacture an apparent failure pattern. Review a systematic sample of ordinary cases alongside large errors, not only a few memorable examples.

<figure>
  <div class="figure-scroll" role="region" aria-label="Validation error slices plot" tabindex="0" style="overflow-x: auto;">
    <img src="/images/ai/learning-curves/error-slices-en.svg" alt="Validation MAE is 0.5 minutes for fifty-six warm cases and 3.5 minutes for eight cold cases; mean residuals have opposite signs." width="1200" height="720" style="min-width: 640px;" loading="lazy" decoding="async" />
  </div>
  <figcaption>Figure 3. After eighty epochs on the synthetic fixture, cold cases are systematically underestimated. Group sizes and signed residuals explain behavior concealed by the overall average.</figcaption>
</figure>

At validation size 1.5, the model predicts about 8.5 minutes for both groups. The warm label is 8 minutes and the cold label is 12. The missing input produces different errors for two otherwise identical sizes.

The overall MAE is:

```math
\operatorname{MAE}
=\frac{56(0.5)+8(3.5)}{64}
=0.875\ \text{minutes}.
```

Each group's absolute errors are weighted by its case count. Giving both groups equal weight would answer a different question. The eight cold cases contribute as much absolute error as all fifty-six warm cases. Changing the future group mixture would change the aggregate even if each group's error stayed constant.

For each reviewed failure, record available inputs, prediction time, label definition, signed error, group membership, and a testable explanation. Useful categories include incorrect labels, unavailable information, inconsistent preprocessing, unfamiliar populations, and a model unable to represent the needed distinction. Several causes can coexist; a slice is evidence for investigation, not a causal proof.

## Turn the diagnosis into a controlled change

The cache pattern suggests testing a cache-status input available at prediction time. Compare the refitted candidate with the size-only model on the same cases and metrics, including both groups. If cache status becomes known only after execution, using it would leak information. Seek an available signal or revise the prediction contract instead.

In real build data, split by time or repository when that matches deployment. Keep related records together where required. Preserve group counts and uncertainty, and check whether the diagnosed pattern recurs on additional validation evidence. Freeze the selected procedure before final testing; examining final-test failures to choose another fix spends that test's independence.

A curve supports a decision when its measurement procedure and case-level explanation agree. Stable averages, a small gap, or a reproducible run cannot substitute for those checks.

## Takeaways

- Training progress and training-size curves vary different quantities and need different interpretations.
- Compare matched metrics and datasets before assigning a cause to a gap or plateau.
- Inspect signed residuals and group counts to find systematic errors hidden by aggregate performance.
- Test one explanation with permitted inputs, retain the run record, and protect final evaluation.

## Exercises

1. A future sample contains ninety warm builds and ten cold builds. Assume the same group residuals as the fitted fixture. Calculate overall MAE and mean signed residual. Explain why a smaller aggregate MAE would not show a better predictor.
2. Training MSE keeps falling while validation MSE rises after epoch twelve in several declared repeats. Propose a checkpoint-selection rule and two checks before attributing the pattern to overfitting. Explain how the final test should be used.
3. A proposed cache-status feature is populated only when the build finishes. Design a valid next experiment to investigate the cold-build failures without using that field at prediction time.

## Answer guidance

1. MAE is `(90 × 0.5 + 10 × 3.5)/100 = 0.8` minutes. Mean residual is `(90 × 0.5 − 10 × 3.5)/100 = 0.1` minutes. Only the group mixture changed; cold builds still have the same underprediction.
2. Predeclare a validation criterion, such as the lowest checkpoint validation MSE with a fixed tie rule. Check that metrics and evaluation conditions match, and that the split represents the intended population without related-record leakage. Freeze the selected training and selection procedure, then evaluate on untouched final data. A rise at twelve in these repeats does not guarantee twelve is optimal for every later run.
3. Inspect submission-time cache metadata or other permitted signals and verify their availability. If one exists, refit a candidate with that input and compare overall and group errors on shared validation cases. If none exists, evaluate a different prediction target or an explicitly uncertain estimate. The completion-time field may label an analysis group, but cannot become an input for earlier prediction.

## References consulted

- [Google on interpreting loss curves](https://developers.google.com/machine-learning/crash-course/overfitting/interpreting-loss-curves) explains how progress curves guide fitting and generalization checks.
- [Scikit-learn on learning and validation curves](https://scikit-learn.org/stable/modules/learning_curve.html) distinguishes sample-size comparisons from configuration comparisons.
- [NumPy least squares](https://numpy.org/doc/stable/reference/generated/numpy.linalg.lstsq.html) documents the fitted coefficient shapes, residuals, and rank information used in the example.
- [Scikit-learn on common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html) explains consistent preprocessing, leakage, and experimental randomness.
