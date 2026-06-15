# Evidence Card

## Source

Citation: Bryan, G., Karlan, D., & Nelson, S. (2010). Commitment Devices. Annual Review of Economics, 2, 671-698.

Link: https://www.annualreviews.org/doi/10.1146/annurev.economics.102308.124324

DOI: https://doi.org/10.1146/annurev.economics.102308.124324

## Source Type

- review
- behavioral economics

## Research Context

The paper reviews theoretical and empirical work on commitment devices: arrangements people adopt to formalize and support future goals by constraining later choices. It covers demand for commitment, effectiveness, and distinctions between hard and soft commitments.

## Main Finding

The review supports commitment devices as a legitimate self-control mechanism. People do demand self-binding, and commitment devices can change behavior in domains such as savings, health, and deadlines. The review also emphasizes that commitment design matters: hard and soft commitments have different tradeoffs, and demand for commitment depends on how users understand their own future self-control problems.

## Empirical Detail

- Scope: review of commitment-device theory and field evidence across domains such as savings, health behavior, and deadlines.
- Device types: hard commitments with penalties or choice-set restrictions, and softer commitments based on plans, deadlines, reminders, or social/accountability structure.
- Product-relevant distinction: commitment demand, commitment effectiveness, and welfare consequences are different questions.

## Non-Obvious Mechanism

The review makes commitment a design space rather than a binary feature. A commitment device can change behavior while still being a poor fit if the cost, timing, or escape structure is wrong.

## Limitations

The evidence is mostly outside browser-extension contexts. The paper does not directly answer how a digital tool should handle emergency overrides, locked schedules, or software configuration edits.

## Evidence Grade

strong for the general commitment-device concept; moderate for direct application to DaD locked schedules.

## Relevance To DaD

DaD's locked schedules are a commitment device. The user configures protection before the vulnerable state, then DaD restricts later relaxation. The hard/soft distinction maps well to DaD:

- hard commitment: active locked schedule blocks relaxation;
- soft commitment: warnings, reminders, and reason prompts;
- hybrid commitment: stricter edits remain allowed while relaxation is delayed or blocked.

## Design Consequence

DaD should keep locked schedules as a first-class protection mechanism. The rule "make stricter allowed, make more relaxed blocked" is conceptually aligned with self-commitment because it preserves the earlier protective intention while allowing the user to add protection.

DaD should not treat all commitment as equally good. The tool needs clear setup, visible lock boundaries, and delayed review after the locked period.

## What Changes

This establishes the hard/soft/hybrid commitment vocabulary for DaD. It supports the existing stricter-only editing rule while requiring later calibration, because commitment design quality matters as much as commitment existence.

## Notes

This is the anchor source for treating locked schedules as self-binding rather than arbitrary paternalism.
