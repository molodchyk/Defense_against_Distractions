# Evidence Card

## Source

Citation: Iqbal, S. T., & Horvitz, E. (2007). Disruption and Recovery of Computing Tasks: Field Study, Analysis, and Directions. Proceedings of CHI 2007, 677-686.

Link: https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/CHI_2007_Iqbal_Horvitz-1.pdf

DOI: https://doi.org/10.1145/1240624.1240730

## Source Type

- primary study
- field study
- HCI interruption research

## Research Context

The authors logged computing activity from knowledge workers over two weeks to understand alert-driven task suspension, chains of diversion, and resumption of interrupted work.

## Main Finding

Alert-driven interruptions often created long recovery chains. Participants spent nearly 10 minutes on switches caused by alerts and another 10 to 15 minutes before returning to focused activity on the disrupted task. Twenty-seven percent of suspensions took more than two hours to resume.

## Empirical Detail

- Sample: 27 users.
- Duration: two-week field deployment.
- Context: normal work settings with email/IM-style computer alerts.
- Average diversion: nearly 10 minutes on alert-caused switches.
- Average focused-resumption delay: another 10 to 15 minutes depending on interruption type.
- Tail risk: 27 percent of task suspensions exceeded two hours until resumption.
- Additional finding: users often visited several applications beyond the alerting application.
- Design-relevant finding: greater visibility of suspended windows was associated with faster task resumption.

## Non-Obvious Mechanism

The problem is not just "the interruption took time." The interruption can start a chain of diversion that delays return long after the initial event. Visual cues from suspended work can help pull the user back.

## Limitations

Workplace desktop activity is not browser-only browsing. The study focused on alerts, not recommender feeds or intent scoring.

## Evidence Grade

strong for chain-of-diversion and recovery delay; strong for DaD trajectory-recovery design.

## Relevance To DaD

DaD's intent coherence system should treat drift as a trajectory recovery problem. A page can be dangerous because it deepens a chain that makes the original task harder to resume.

## Design Consequence

Return chain should remain a core action. DaD should surface recovery cues visibly and avoid destroying tab/window cues by default.

## What Changes

This shifts intent scoring from "current page looks unrelated" toward "the original task is becoming hard to recover."

## Notes

This is the strongest empirical source for DaD's chain-level recovery model.
