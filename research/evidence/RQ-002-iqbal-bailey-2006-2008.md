# Evidence Card

## Source

Citation: Iqbal, S. T., & Bailey, B. P. (2006). Leveraging Characteristics of Task Structure to Predict the Cost of Interruption. Proceedings of CHI 2006, 741-750. Iqbal, S. T., & Bailey, B. P. (2008). Effects of Intelligent Notification Management on Users and Their Tasks. Proceedings of CHI 2008, 93-102.

Links:

- https://www.interruptions.net/literature/Iqbal-CHI06-p741-iqbal.pdf
- https://www.interruptions.net/literature/Iqbal-CHI08.pdf

DOIs:

- https://doi.org/10.1145/1124772.1124882
- https://doi.org/10.1145/1357054.1357069

## Source Type

- primary studies
- HCI interruption research
- notification management

## Research Context

These studies model the cost of interruption using task-structure boundaries and evaluate notification scheduling that defers alerts to better breakpoints.

## Main Finding

Task structure can help predict interruption cost, and breakpoint-aware notification scheduling can reduce user burden compared with immediate delivery.

## Empirical Detail

- Cost of interruption was operationalized with resumption lag in the 2006 work.
- Users were interrupted at different subtask boundaries.
- Boundary characteristics, including level in the task model, helped predict workload/cost.
- The 2008 work used statistical models to defer notifications to breakpoints.
- Reported impact: breakpoint scheduling reduced frustration and reaction time relative to immediate delivery.
- The model could detect breakpoints better than it could differentiate breakpoint type.

## Non-Obvious Mechanism

Interruptibility is partly structural. A system can reduce harm not by becoming quieter overall, but by aligning intervention timing with task boundaries.

## Limitations

The tasks are modeled desktop activities, not arbitrary web browsing. Browser task boundaries are harder to infer.

## Evidence Grade

strong for breakpoint-sensitive interruption design; moderate for DaD prompt scheduling.

## Relevance To DaD

Intent prompts should not simply fire when the score crosses a threshold. DaD should prefer moments where the browser has already created a boundary: page load, new tab, navigation completion, idle pause, media start, or feed threshold.

## Design Consequence

Add local prompt timing categories to diagnostics and tests. Treat prompt timing as part of intervention quality.

## What Changes

This changes the intent system from score-only intervention to score-plus-timing intervention.

## Notes

Relevant to proportional UX and false-positive burden.
