# Research Question Brief

## Question ID

`RQ-003`

## Working Title

Autonomy, reactance, and non-hostile enforcement.

## Exact Question

How can DaD enforce precommitted protection without creating psychological reactance, shame, or hostile UX?

## Why DaD Needs This

DaD is intentionally stronger than a normal productivity extension. It can block pages, enforce locked schedules, delay relaxation, hide UI, pause media, require a reason to continue, and quarantine drift chains. These features can protect the user during vulnerable states, but they can also feel coercive if they are surprising, opaque, moralizing, or impossible to recover from.

Research should clarify how DaD can stay strong while preserving autonomy, competence, trust, and user dignity.

## Affected Features

- Locked schedules.
- Protected plan editing.
- Intent drift prompts.
- Continue, Isolate, Return, and Show graph actions.
- Hard chain quarantine.
- Blocked page messaging.
- UI cleanup and reduce-noise actions.
- Pomodoro strict breaks.
- Emergency escape and queued relaxation.
- Public language and store claims.

## Scope

Included:

- Psychological reactance.
- Freedom-threatening language.
- Autonomy support.
- Self-determination theory.
- Digital self-control tool enforcement.
- User-owned commitment devices.
- Shame-free and competence-supporting UI.
- Safe choices during enforcement.

Excluded:

- Full prompt wording optimization, which belongs mostly to `RQ-009`.
- Full public communication guide, which belongs to `RQ-014`.
- Clinical treatment or diagnosis.
- Parental control, employer surveillance, or coercive third-party enforcement.

## Evidence Needed

- Reviews and meta-analyses of psychological reactance.
- Primary studies on freedom-threatening language and negative cognitions.
- Self-determination theory sources on autonomy, competence, and self-endorsed action.
- Digital self-control tool research on autonomy-supportive design.
- HCI research on lockouts, interventions, and user agency.

## Novelty Target

This pass should produce design-relevant reactance detail rather than "avoid shame." Useful findings include effect sizes or moderators for freedom-threatening language, whether choice framing changes compliance under restriction, when autonomy support preserves enforcement legitimacy, how users bypass or abandon digital self-control tools, and which escape-valve designs reduce hostility without making the commitment meaningless.

## Product Decisions This Could Change

- Whether DaD uses hard blocks or delayed relaxation in different states.
- How locked-edit refusal messages are written.
- Whether prompts must always include safe alternatives.
- How emergency escape is described.
- Whether Continue is allowed at all intervention levels.
- Whether Isolate should be delayed during hard lock.
- Whether DaD should show "why this happened" on every enforcement surface.

## Privacy Risks

Autonomy support does not require more sensitive data. DaD should not collect psychological profiles, emotional state labels, or private bypass reasons. Enforcement can be explained from local state:

- active schedule;
- active plan;
- blocked rule;
- intent score;
- last coherent page;
- intervention action;
- time until lock ends.

## Autonomy Risks

DaD becomes hostile if it:

- surprises the user with unexplained enforcement;
- frames current desire as moral failure;
- uses shame, fear, or contempt;
- hides recovery paths;
- blocks legitimate work without explanation;
- turns every override into proof of weakness;
- claims to know the user's true intention;
- makes emergency access impossible.

## Possible Outcomes

If evidence is strong:

- Make autonomy-supportive enforcement a design rule.
- Require rationale, scope, end condition, and safe choices on strong interventions.
- Treat shame language as a product bug.

If evidence is weak:

- Keep enforcement conservative and highly transparent.
- Prefer reversible or delayed actions where possible.

If evidence is negative:

- Reduce hard enforcement outside explicitly precommitted locks.
- Move uncertain interventions toward diagnostics, warnings, or reversible UI changes.
