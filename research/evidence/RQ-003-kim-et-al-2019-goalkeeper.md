# Evidence Card

## Source

Citation: Kim, J., Jung, H., Ko, M., & Lee, U. (2019). GoalKeeper: Exploring Interaction Lockout Mechanisms for Regulating Smartphone Use. Proceedings of the ACM on Interactive, Mobile, Wearable and Ubiquitous Technologies, 3(1), Article 16.

Link: https://pure.kaist.ac.kr/en/publications/goalkeeper-exploring-interaction-lockout-mechanisms-for-regulatin/

DOI: https://doi.org/10.1145/3314403

## Source Type

- primary study
- four-week field experiment
- digital self-control / restrictive technology

## Research Context

GoalKeeper locked users into self-defined daily smartphone-use limits with restrictive intervention mechanisms. The study compared varying intensities of restriction against less restrictive mechanisms such as warnings.

## Main Finding

Restrictive mechanisms were more effective than warnings, but also caused more frustration and pressure because users' real contexts and needs varied.

## Empirical Detail

- Sample: 36 participants.
- Duration: four weeks.
- Target: self-defined daily smartphone-use limits.
- Restrictive mechanisms outperformed warning-style interventions.
- Reported downside: frustration and pressure, mainly from diversity of contexts and needs.
- Keywords included commitment device, interaction lockout, self-imposed restriction, and smartphone non-use.

## Non-Obvious Mechanism

The same property that makes a lock useful also makes it brittle: it can override a legitimate context change. The failure is often context collision, not the mere presence of restriction.

## Limitations

Smartphone use is not browser use. The public abstract does not provide detailed per-condition effect sizes. DaD needs local validation before generalizing intensity thresholds.

## Evidence Grade

moderate to strong for DaD's lock-policy design.

## Relevance To DaD

This is the best direct evidence against a naive "soft is always humane" rule. It supports strong locks, but only with a context and review layer.

## Design Consequence

Locked schedules should:

- block or queue weaker changes;
- allow stricter changes;
- show lock source and end;
- distinguish emergency escape from ordinary relaxation;
- trigger later review after repeated context-collision signals.

## What Changes

DaD should not back away from hard protection. It should make hard protection legible, scoped, and reviewable.

## Notes

This source directly supports the user's locked-schedule principle: stricter changes can be allowed during a lock because they align with the self-imposed restriction.
