---
title: "Defining Goals, Inputs, Outputs, and Constraints"
description: "Turn a delivery problem into a testable AI task: define the decision, available inputs, prediction target, operating limits, and evidence needed before release."
date: 2026-10-31
topic: "From Real-World Problems to AI Tasks"
order: 8
lang: en
socialTitle: "Define the AI Task Before the Model"
socialDescription: "A worked delivery-alert example connects business goals, input timing, prediction errors, and limited human capacity."
tags: [artificial-intelligence, problem-framing, model-evaluation, ai-fundamentals]
featured: true
draft: false
---

A delivery company asks its engineering team to “use AI to reduce late deliveries.” One proposal predicts arrival times. Another flags parcels likely to miss a deadline. A third drafts customer messages. These systems produce different outputs and enable different actions. None specifies who can act, when information becomes available, or how improvement will be measured.

The first engineering deliverable is a task specification. It connects a desired outcome to an observable input, a defined output, a decision process, and operating limits. That specification makes an experiment possible before anyone chooses a model.

This section starts the **From Real-World Problems to AI Tasks** series. It assumes the distinction between training and inference introduced in [Training, Inference, and Deployment](/ai/training-inference-and-deployment/), plus basic fractions. By the end, you should be able to:

- Separate a business outcome, a prediction target, and an application action.
- Specify inputs as they exist at the moment a prediction is required.
- Define output meaning, error costs, and operational constraints precisely.
- Compare a candidate with a baseline without mistaking an offline score for demonstrated business impact.

## Identify the decision that can change the outcome

Begin with the person or process that will use the result. In our hypothetical service, a dispatcher reviews at-risk deliveries at 08:00 and can investigate route problems. The proposed system identifies deliveries that might miss their promised first-attempt deadline. It supplies a review list; dispatchers retain authority over route changes.

The business goal is to reduce missed deadlines while limiting unnecessary investigations. The prediction target is whether a delivery will miss its deadline. The action is investigating an alert and possibly changing the plan. Google’s [problem-framing guidance](https://developers.google.com/machine-learning/problem-framing/problem) recommends stating a product goal independently of ML and establishing a non-ML baseline. Here, a rule based on route backlog supplies that comparison.

Predicting arrival time would be a regression task, whose output is a numerical value. Predicting whether the deadline is missed is binary classification, with two possible labels. Drafting an explanation is generation, producing text that needs factual checks. Choose the output that supports the intended decision. A precise arrival-time model can still supply an unhelpful review list if it ignores investigation capacity or ranks the wrong cases.

Even perfect identification cannot guarantee that a dispatcher can prevent a late attempt. Road closures, an unavailable recipient, or insufficient time may prevent an effective response. Record the proposed connection between prediction and action, along with assumptions about available interventions. The specification should expose a weak link before an expensive training run.

## Write down the unit, time, and scope

A **unit of prediction** is the entity receiving one output. Our unit is one eligible delivery at 08:00. Repeated predictions would require rules for timing, duplicate alerts, and evaluation. We use one prediction per delivery.

A **label** is the reference outcome used to train or evaluate a prediction. Define `y = 1` when no first delivery attempt occurs by the promised deadline, and `y = 0` when an attempt occurs on time. This measures first-attempt timeliness. Eligible deliveries have a known 18:00 deadline and are not canceled at 08:00. Report later cancellations separately and exclude them from the binary-label comparison. Unresolved or unreliable outcome records remain unscored until reviewed; report their count so exclusions remain visible.

<div class="table-scroll" role="region" aria-label="Specification for the hypothetical delivery alert task" tabindex="0">

| Specification field | Agreed definition |
| --- | --- |
| User and action | Dispatcher reviews alerts and decides whether to investigate |
| Population | Scheduled deliveries in supported routes with a valid promised deadline |
| Decision point | One prediction at 08:00, using information available then |
| Inputs | Route backlog, parcel attributes, and recorded progress available by 08:00 |
| Model output | Estimated probability of missing the first-attempt deadline |
| Outcome label | No first attempt by 18:00 is 1; an on-time attempt is 0 |
| Operating limits | At most two alerts in the illustrative decision batch; hypothetical p95 response target of 200 ms |
| Failure handling | Missing required data stays in the existing dispatch workflow; no automatic route changes |

</div>

All quantities are illustrative requirements, without claims about a real company. A production specification would also identify data owners, permitted uses, retention, monitoring, and the person responsible for accepting changes. The [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) calls for documenting intended purposes, use context, knowledge limits, and human oversight. It provides guidance; our table does not establish compliance with any external requirement.

## Treat input availability as part of the task

The **input** is the information the system can access when it must answer. A training table assembled afterward may contain later events or corrected records. Final route duration and an afternoon dispatcher note cannot be used for an 08:00 prediction. A morning scan that reaches the system at 08:05 was also unavailable at the decision point, despite its earlier event timestamp.

For each feature, specify meaning, units, source, missing-value behavior, and availability cutoff. A feature is an input quantity used by the model, such as the number of pending stops assigned to a route. Reconstruct its historical value using only records received before the cutoff and the versions then available. A later database overwrite can otherwise insert information from the future.

**Data leakage** occurs when model development uses information unavailable when the prediction must be made, producing misleading evaluation results. The [scikit-learn common-pitfalls guide](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage) also explains why learned preprocessing must be fitted using training data. In this service, split data appropriately before fitting transformations, and prevent related records from exposing held-out outcomes.

A random split of individual deliveries may mix the same route-day or repeated delivery across training and evaluation. Choose a split that matches the intended use, such as evaluating on later operating dates while keeping related records together where needed. A deployment on unseen routes needs additional evidence for those routes. Write the target setting first so the split answers a defined question.

## Define what the output means and what consumes it

Let `x_i` be delivery `i`’s input snapshot and let the model produce a scalar score `p_i` between zero and one, intended to estimate the probability of `y_i = 1`. The snapshot can contain numeric and categorical fields; this section does not assume a particular vector encoding. A score of 0.8 is a probability claim that needs calibration evidence before such an interpretation is trusted.

The application converts scores into actions through a decision policy. For example, it might issue an alert when a score reaches a threshold, subject to a capacity limit. Specify whether capacity is per batch, per dispatcher, or per hour, how ties are resolved, and whether an existing alert may recur. A sorted list alone does not settle those rules.

An output record should carry a delivery identifier, prediction timestamp, score, model version, and input-snapshot reference. The consumer can then detect stale outputs, associate them with the correct delivery, and reconstruct a decision. An unavailable prediction needs an explicit status. Treating it as a zero score silently turns missing information into reassurance.

Google’s [ML framing guide](https://developers.google.com/machine-learning/problem-framing/ml-framing) distinguishes model outputs from product success metrics and discusses proxy labels. Our missed-deadline label is observable, but only indirectly measures the opportunity to prevent a delay. A later intervention experiment must examine the effect of acting on alerts.

## Compare errors under a real capacity limit

Consider six synthetic deliveries from a historical period with no model-generated alerts. The scores and backlog-rule decisions below are invented and fixed before comparing policies. Labels are revealed after the deadline. This is arithmetic on supplied outputs; no model has been trained or benchmarked.

<div class="table-scroll" role="region" aria-label="Synthetic deliveries with reference outcomes and proposed alerts" tabindex="0">

| Delivery | Supplied score | Missed deadline label | Backlog rule alerts? | Score at least 0.65? | Score at least 0.80? |
| --- | ---: | ---: | --- | --- | --- |
| D1 | 0.90 | 1 | Yes | Yes | Yes |
| D2 | 0.80 | 0 | No | Yes | Yes |
| D3 | 0.70 | 1 | No | Yes | No |
| D4 | 0.60 | 0 | No | No | No |
| D5 | 0.40 | 1 | No | No | No |
| D6 | 0.10 | 0 | No | No | No |

</div>

An alert on an on-time delivery is a **false positive** (`FP`); a missed-deadline delivery without an alert is a **false negative** (`FN`). Suppose an unnecessary investigation costs one hypothetical unit and missing an at-risk delivery costs five. For alert decision `a_i`, an additive comparison is:

```math
J=5\,\mathrm{FN}+\mathrm{FP},\qquad
\mathrm{FN}=\sum_{i=1}^{n}\mathbf{1}[y_i=1,\ a_i=0],\qquad
\mathrm{FP}=\sum_{i=1}^{n}\mathbf{1}[y_i=0,\ a_i=1].
```

The indicator is one when its conditions hold. Labels and decisions are scalars in `{0, 1}`; `n` is the positive number of scored deliveries. `J` totals illustrative error costs across the batch. It omits the cost of useful investigations and assumes constant costs across cases. These assumptions must change if, for example, investigating D1 costs substantially more than investigating D3.

With an alert capacity `K`, feasible decisions must also satisfy:

```math
\sum_{i=1}^{n}a_i\leq K.
```

This is a hard constraint, separate from the cost objective. We set `K = 2`. Alerting at 0.65 misses D5 and unnecessarily flags D2, so `J = 5 × 1 + 1 = 6`. It issues three alerts and violates capacity. Alerting at 0.80 issues two alerts but misses D3 and D5: `J = 5 × 2 + 1 = 11`. The existing backlog rule misses those same two deliveries without the false alarm, costing 10.

<div class="table-scroll" role="region" aria-label="Error cost and feasibility of four illustrative dispatch policies" tabindex="0">

| Policy | Correct classifications | Alerts | FP | FN | Error cost | Within capacity? |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Always predict on time | 3/6 | 0 | 0 | 3 | 15 | Yes |
| Existing backlog rule | 4/6 | 1 | 0 | 2 | 10 | Yes |
| Alert at 0.65 | 4/6 | 3 | 1 | 1 | 6 | No |
| Alert at 0.80 | 3/6 | 2 | 1 | 2 | 11 | Yes |

</div>

The backlog rule and 0.65 policy have equal accuracy but different errors and capacity needs. The feasible model policy is worse than the baseline under the stated costs. These synthetic results cannot establish a population-level ranking or justify release.

This Python 3.9+ program verifies the comparison using the standard library. It trains nothing and calls no service. The function accepts labels, decisions, costs, and capacity as inputs.

```python
import math


def evaluate_policy(labels, decisions, capacity, miss_cost=5, false_alarm_cost=1):
    if not labels or len(labels) != len(decisions):
        raise ValueError("Expected matching nonempty labels and decisions")
    if any(type(value) is not int or value not in (0, 1)
           for value in [*labels, *decisions]):
        raise ValueError("Labels and decisions must be binary integers")
    if type(capacity) is not int or capacity < 0:
        raise ValueError("Capacity must be a nonnegative integer")
    for value in [miss_cost, false_alarm_cost]:
        if (type(value) not in (int, float) or not math.isfinite(value)
                or value < 0):
            raise ValueError("Costs must be finite nonnegative numbers")

    fp = sum(y == 0 and a == 1 for y, a in zip(labels, decisions))
    fn = sum(y == 1 and a == 0 for y, a in zip(labels, decisions))
    alerts = sum(decisions)
    return {
        "correct": len(labels) - fp - fn,
        "alerts": alerts, "fp": fp, "fn": fn,
        "cost": miss_cost * fn + false_alarm_cost * fp,
        "feasible": alerts <= capacity,
    }


def main():
    labels = [1, 0, 1, 0, 1, 0]
    scores = [0.90, 0.80, 0.70, 0.60, 0.40, 0.10]
    policies = {
        "always on time": [0] * len(labels),
        "backlog rule": [1, 0, 0, 0, 0, 0],
        "threshold 0.65": [int(p >= 0.65) for p in scores],
        "threshold 0.80": [int(p >= 0.80) for p in scores],
    }
    for name, decisions in policies.items():
        result = evaluate_policy(labels, decisions, capacity=2)
        print(f"{name}: correct={result['correct']}/{len(labels)}, "
              f"alerts={result['alerts']}, FP={result['fp']}, FN={result['fn']}, "
              f"cost={result['cost']}, feasible={result['feasible']}")


if __name__ == "__main__":
    main()
```

The verified output is:

```text
always on time: correct=3/6, alerts=0, FP=0, FN=3, cost=15, feasible=True
backlog rule: correct=4/6, alerts=1, FP=0, FN=2, cost=10, feasible=True
threshold 0.65: correct=4/6, alerts=3, FP=1, FN=1, cost=6, feasible=False
threshold 0.80: correct=3/6, alerts=2, FP=1, FN=2, cost=11, feasible=True
```

## Specify evidence and behavior before release

Select thresholds and capacity handling using development data, then evaluate the fixed policy on independent examples. Taking only the two highest scores in this batch produces the same decisions as 0.80, but that equality does not hold for every future batch. Test the actual policy the application will execute.

```mermaid
flowchart LR
    Input["08:00<br/>snapshot"] --> Score["Deadline<br/>prediction"]
    Score --> Policy["Capacity +<br/>decision policy"]
    Policy --> Review["Dispatcher<br/>review"]
```

*Figure 1. Each stage has a separate responsibility. Input validation and unavailable-data handling precede prediction. A score becomes a review request through the application policy; a dispatcher decides whether to change operations.*

Set release criteria for error cost relative to the baseline, alert capacity, latency, and behavior on unsupported inputs. Measure latency across the complete prediction path under stated load. Check performance by relevant routes and operating conditions so a favorable average cannot conceal a failing group.

Offline scoring identifies historical risk; establishing fewer missed deadlines requires evidence about interventions. Dispatch changes can alter later labels, so post-release outcomes are affected by the system itself. A controlled rollout with appropriate safeguards can assess operational impact. Preserve the baseline, log decisions and versions, monitor alert backlogs, and define a rollback condition. In high-stakes settings, domain specialists must validate acceptable errors and oversight before automatic actions are considered.

## References consulted

- [Google: Understand the problem](https://developers.google.com/machine-learning/problem-framing/problem) — product goals, actionable predictions, and non-ML baselines.
- [Google: Framing an ML problem](https://developers.google.com/machine-learning/problem-framing/ml-framing) — outputs, success metrics, and proxy labels.
- [scikit-learn: Common pitfalls and recommended practices](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage) — prediction-time information and preprocessing leakage.
- [NIST: AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) — intended use, limits, risk context, and oversight.

## Takeaways

- Define the prediction unit, decision time, and intended action before selecting a model.
- Record when each input becomes available and exactly how the outcome label is assigned.
- Give outputs an explicit meaning, validity period, and unavailable-data behavior.
- Compare errors under stated costs and operating constraints; accuracy alone cannot settle the decision.
- Separate evidence of predictive performance from evidence that interventions improve the business outcome.

## Exercises

1. Keep the supplied decisions and costs, but increase capacity to three alerts. Which evaluated policy has the lowest error cost? Then keep that capacity and make a false alarm cost six units. Recalculate the ranking. Explain why neither comparison establishes deployment readiness.
2. A training table includes final route duration, backlog reconstructed from records received by 08:00, an event timestamped 07:55 but received at 08:05, and a dispatcher note entered at 16:00. Identify which can support the 08:00 prediction and specify how to handle the other fields.
3. A team reports 90% accuracy and claims it reduced missed deliveries. Write four missing specification or evaluation details needed to assess the claim, including one detail about actions and one about capacity.

## Answer guidance

1. With capacity three, the 0.65 policy becomes feasible and has the lowest supplied cost, six units. At false-alarm cost six, the costs are 15, 10, 11, and 16 for always-on-time, backlog, 0.65, and 0.80 respectively; the backlog rule wins this comparison. The sample is synthetic and tiny, assumptions may differ in operation, and neither calculation measures the effect of dispatch interventions.
2. The backlog is usable if its historical reconstruction and all required source records were available by 08:00. Final duration and the afternoon note are future information; exclude them from prediction inputs. The delayed event was unavailable at the cutoff and must also be excluded from that snapshot. Apply an explicit missing-data policy without substituting later values.
3. Possible details include the eligible population and label definition; baseline error costs and evaluation period; alert volume relative to dispatcher capacity; and evidence that acting on alerts changed outcomes. Also inspect input availability, delayed labels, output validity, and full-path latency under the intended workload.
