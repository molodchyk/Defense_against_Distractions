# Evidence Card

## Source

Citation: Morris, D., Morris, M. R., & Venolia, G. (2008). SearchBar: A Search-Centric Web History for Task Resumption and Information Re-finding. Proceedings of CHI 2008, 1207-1216.

Link: https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/searchbarchi2008.pdf

DOI: https://doi.org/10.1145/1357054.1357242

## Source Type

- primary study
- HCI
- web history and task resumption

## Research Context

The authors studied multi-query, multi-session web investigations and built SearchBar, a browser-integrated history tool organized around search topics, queries, browsing history, notes, and ratings.

## Main Finding

Web search tasks often span sessions and are poorly supported by ordinary browser/search interfaces, which treat actions as unrelated transient events rather than parts of larger investigations.

## Empirical Detail

- Survey: 204 respondents at Microsoft, 28 percent response rate.
- Respondents: 27 percent average and 74 percent expert web searchers; all but one used a search engine at least daily.
- Prior evidence summarized: revisitation rates around 58 percent in one browser-log study, 81 percent in another, and 44 percent in a later study.
- Browser history underuse: one cited long-term study found browser history initiated only 0.2 percent of actions despite high revisitation.
- SearchBar stored queries, browsing histories, notes, and ratings in an interrelated task structure.

## Non-Obvious Mechanism

The browser's event model and the user's task model differ. The browser sees isolated navigations; the user is conducting a task-level investigation.

## Limitations

SearchBar was a research prototype and focused on search-centric tasks. DaD's intent graph covers more than search.

## Evidence Grade

strong for task-level browsing history; strong for DaD chain modeling.

## Relevance To DaD

DaD should model browsing chains as task objects with origin, query/path, branch, and recovery cues rather than raw page events.

## Design Consequence

Intent diagnostics should preserve task-level context locally: origin, last coherent, first drift, branch, current page, and action outcomes.

## What Changes

This supports DaD's graph and local trajectory model, but also warns that raw chronological history is not enough.

## Notes

Highly relevant for graph layout and local diagnostics export.
