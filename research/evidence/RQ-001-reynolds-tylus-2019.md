# Evidence Card

## Source

Citation: Reynolds-Tylus, T. (2019). Psychological Reactance and Persuasive Health Communication: A Review of the Literature. Frontiers in Communication, 4, 56.

Link: https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2019.00056/full

DOI: https://doi.org/10.3389/fcomm.2019.00056

## Source Type

- review
- communication psychology

## Research Context

The review summarizes psychological reactance theory and research on how people resist persuasive messages when they experience threats to freedom. It focuses on health communication, but the autonomy mechanism is relevant to software that restricts user choice.

## Main Finding

People can resist messages or interventions that feel like freedom threats. Reactance can involve anger, counterarguing, source derogation, and attempts to restore the restricted behavior. Message features and individual trait reactance matter.

## Empirical Detail

- Source type: literature review of psychological reactance in persuasive health communication.
- Core reactions reviewed: anger, counterarguing, source derogation, and efforts to restore threatened freedom.
- Product-relevant variables: message threat, freedom threat, individual trait reactance, and whether the user has meaningful options.

## Non-Obvious Mechanism

A restriction can fail by activating restoration behavior: the user does not only dislike the restriction; they may become motivated to recover the blocked option. For DaD, this means unclear enforcement can train bypass behavior.

## Limitations

The review focuses on communication, not browser extension enforcement. DaD is also different from persuasion because its strongest restrictions are precommitted by the user.

## Evidence Grade

moderate.

## Relevance To DaD

Locked schedules can trigger reactance if the UI feels like an external authority, if the rule is surprising, or if the user cannot understand why relaxation is blocked. This risk is especially high when DaD interrupts during a vulnerable state.

## Design Consequence

DaD should:

- avoid controlling or shaming language;
- state that the lock is enforcing an earlier user-chosen schedule;
- show when the lock ends;
- explain which changes are allowed now;
- offer safe alternatives such as adding protection, returning, isolating, or waiting until the lock ends;
- keep emergency semantics explicit.

## What Changes

This affects locked-state copy and escape design. The system can enforce a precommitted lock, but the enforcement surface must make the earlier user choice legible and must not surprise the user with opaque authority.

## Notes

This source should influence wording more than scoring.
