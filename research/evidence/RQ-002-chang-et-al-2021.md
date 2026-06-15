# Evidence Card

## Source

Citation: Chang, J. C., Hahn, N., Kim, Y., Coupland, J., Breneisen, B., Kim, H. S., Hwong, J., & Kittur, A. (2021). When the Tab Comes Due: Challenges in the Cost Structure of Browser Tab Usage. Proceedings of CHI 2021.

Link: https://dl.acm.org/doi/10.1145/3411764.3445585

Project/news summary: https://hcii.cmu.edu/news/overcoming-tab-overload

DOI: https://doi.org/10.1145/3411764.3445585

## Source Type

- primary study
- HCI
- browser tab management

## Research Context

The study investigated why users keep tabs open, what costs tabs create, and why tab overload persists.

## Main Finding

Tabs are not just clutter. Users keep tabs open as reminders, as external memory, and because moving them out of sight can feel like losing them. The same mechanism creates overload and stress.

## Empirical Detail

- Method: surveys and interviews about tab usage.
- Reported reasons for keeping tabs: reminders, future tasks, avoiding re-finding costs, and fear of losing information.
- Reported cost: tab overload can strain attention and computing resources.
- CMU summary reports that about 25 percent of participants in one study aspect had a browser or computer crash due to too many tabs.
- Users felt invested in open tabs, making them hard to close even when overwhelming.

## Non-Obvious Mechanism

Tab overload is partly a failed memory system. The user may not want the tab; they want the unresolved intention that the tab represents.

## Limitations

The exact study details should be read in the ACM paper before building precise quantitative claims. The source does not test DaD's Return chain or quarantine actions.

## Evidence Grade

strong for tab-as-memory design; strong for DaD cleanup risk.

## Relevance To DaD

DaD's drift-tab cleanup actions should not treat tabs as disposable junk. Closing a drift tab may destroy a prospective-memory cue.

## Design Consequence

Default cleanup should preserve memory: Return, move, suspend, group, or mark. Close should be explicit, destructive, and scoped.

## What Changes

This strengthens the existing separation between Return/Move/Suspend and Close drift tabs. It argues against automatic tab closure except under explicit hard policy.

## Notes

This is central for designing Return chain and drift descendant cleanup.
