# Evidence Card

## Source

Citation: Kovacs, G., Wu, Z., & Bernstein, M. S. (2021). Not Now, Ask Later: Users Weaken Their Behavior Change Regimen Over Time, But Expect To Re-Strengthen It Imminently. CHI 2021.

Link: https://arxiv.org/abs/2101.11743

DOI: https://doi.org/10.1145/3411764.3445695

## Source Type

- large-scale log analysis
- browser-extension behavior change system

## Research Context

The study analyzed behavior from HabitLab, a platform that helps users reduce time online, to understand how users adhere to or weaken behavior-change interventions.

## Main Finding

Users typically began with high-challenge interventions but gradually shifted to easier interventions. Many still expected to return to harder interventions soon, repeatedly asking to be asked again on the next visit rather than saving the easier preference.

## Empirical Detail

- Dataset: logs from more than 8,000 HabitLab users.
- Pattern: users weakened challenge level over time.
- Counter-pattern: users often declined to persist the easy setting and asked the system to ask again next visit.
- Domain: web browsing behavior change.

## Non-Obvious Mechanism

Temporary weakening is not necessarily a stable preference. A user can want leniency now while wanting the system not to permanently rewrite the plan.

## Limitations

This analyzes challenge settings in HabitLab, not locked schedules in DaD. It does not establish whether queued relaxation should be automatic or confirm-on-unlock.

## Evidence Grade

strong for the "future self will re-strengthen" pattern; moderate for DaD policy design.

## Relevance To DaD

This maps directly to locked schedules. During a locked window, weakening the plan should usually not become an immediate permanent setting change.

## Design Consequence

When a user tries to relax protection during a lock, DaD should offer:

- queue after lock;
- temporary exception if emergency policy allows;
- make stricter now;
- inspect active lock.

## What Changes

Relaxation attempts during locks become first-class state, not just denied clicks.

## Notes

This evidence supports the product idea that the earlier self and the current self can both be sincere.
