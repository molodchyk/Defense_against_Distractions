# DaD Research Question Registry

This registry breaks the larger research agenda into bounded questions. Each question should be answered through the pipeline in [`pipeline.md`](pipeline.md).

## Recommended First Sequence

1. `RQ-001`: commitment devices and locked schedules.
2. `RQ-002`: intent drift, attention residue, and return/isolate actions.
3. `RQ-003`: proportional interventions and reactance.
4. `RQ-004`: digital self-control tool effectiveness.
5. `RQ-005`: safe scoring signals for passive drift.

This order is practical because these questions affect already-implemented or release-relevant behavior.

## Questions

| ID | Status | Priority | Area | Research Question | Why DaD Needs It | Expected Output |
| --- | --- | --- | --- | --- | --- | --- |
| RQ-001 | answered | high | Commitment devices | When do locked schedules and stricter-only edits help self-control, and when do they backfire? | DaD blocks relaxation during locked schedules but allows stricter changes such as enabling Pomodoro. | Evidence-backed lock calibration model, including miscalibration failure, soft-vs-hard commitment, public strictness distortion, and local validation metrics. |
| RQ-002 | answered | high | Intent coherence | Does evidence around attention residue, task switching, and media multitasking support Return, Isolate, and graph-based drift recovery? | Intent coherence is a core differentiator and needs disciplined justification. | Recoverability model for drift chains, including resumption delay, prompt timing, tab-as-memory, legitimate orienteering, actionable graph design, and modifier-only media pressure. |
| RQ-003 | answered | high | Autonomy and reactance | How can DaD enforce precommitted protection without creating reactance, bypass pressure, abandonment, or hostile UX? | Strong defense needs legitimacy, not weak defaults. | Evidence-backed legitimacy contract for strong interventions, including friction dose, queued relaxation, emergency escape, bypass diagnostics, and bounded real choice. |
| RQ-004 | backlog | high | Digital self-control | Which digital self-control interventions work best: blocking, friction, timers, usage stats, prompts, rewards, or environmental modification? | DaD uses multiple intervention types and needs an evidence-informed ladder. | Intervention ladder and severity mapping. |
| RQ-005 | backlog | high | Scoring signals | Which local browser signals are plausible indicators of passive drift or vulnerable state, and which should be avoided? | DaD collects bounded local signals and needs scoring discipline. | Signal table: core, modifier, diagnostic-only, avoid. |
| RQ-006 | backlog | high | Problematic internet use | Which browsing contexts are associated with high-risk loops: feeds, recommendations, short video, adult content, comments, news, shopping, search loops, or social validation? | Structural keywords and intent scoring should not be guessed casually. | Risk-context map and cautious scoring guidance. |
| RQ-007 | backlog | medium | UI cleanup | Does hiding cues, feeds, recommendations, comments, or controls reduce compulsive loops or support self-control? | DaD can block UI elements and reduce noisy page surfaces. | Guidance for UI cleanup actions and false-positive risks. |
| RQ-008 | backlog | medium | Pomodoro and breaks | What evidence supports Pomodoro-like work/rest cycles, strict breaks, microbreaks, and counting idle time as rest? | DaD has plan-owned Pomodoro and strict breaks. | Mechanisms and measurements for fatigue, break timing, idle recovery, strict-break failure modes, and timer policy. |
| RQ-009 | backlog | medium | Implementation intentions | Can short reason prompts and if-then recovery choices restore intentionality without becoming performative friction? | Continue requires a reason in some drift prompts. | Prompt wording and bypass-risk guidance. |
| RQ-010 | backlog | medium | Local validation | What local-only metrics can validate whether DaD interventions help without collecting sensitive data? | DaD needs improvement data without violating trust. | Local validation plan and data-minimization rules. |
| RQ-011 | backlog | medium | Mental state framing | How should DaD discuss low-lucidity, vulnerable state, override reliability, and configuration safety without claiming lie detection or diagnosis? | Original wording mentions detecting when users lie or are destructive; this needs safer framing. | Replacement language and ethical boundaries. |
| RQ-012 | backlog | medium | Content and reinforcement | What does research actually support about dopamine, reward, variable reinforcement, autoplay, infinite scroll, and algorithmic feeds? | The product should avoid pop-neuroscience while still addressing high-lock-in design. | Mechanism-level reward/reinforcement map, measured platform-design effects, and scoring implications. |
| RQ-013 | backlog | low | Machine learning | Would ML add meaningful value over transparent local heuristics for keyword suggestions or risk scoring? | Original notes mention machine learning, but privacy and explainability are concerns. | ML/no-ML recommendation, privacy constraints. |
| RQ-014 | backlog | low | Public explanation | How can DaD explain itself publicly without flattening the science or overgeneralizing from one nervous system? | Wider release can attract users with different needs and sensitivities. | Communication model grounded in the research, with caveats only where needed. |
| RQ-015 | backlog | low | Personalization | Which DaD defaults are likely generalizable, and which should remain personal/configurable? | DaD is built first around one user's nervous system. | Defaults vs configuration guidance. |

## Question Intake Rules

New research questions should:

- be answerable in one research cycle;
- name the affected DaD feature;
- state what product decision depends on the answer;
- include privacy and autonomy risks;
- avoid clinical diagnosis framing unless the research question is explicitly about public claim limits.

## Answer Linking

When a question is answered, link the synthesis file here:

| ID | Answer |
| --- | --- |
| RQ-001 | [Commitment devices and lock calibration](answers/RQ-001-commitment-devices-and-locked-schedules.md) - answered under the revised quality bar |
| RQ-002 | [Intent drift and trajectory recoverability](answers/RQ-002-intent-drift-and-attention-residue.md) - answered under the revised quality bar |
| RQ-003 | [Autonomy, reactance, and legitimate constraint](answers/RQ-003-autonomy-and-reactance.md) - answered under the revised quality bar |
| RQ-004 | Not started |
| RQ-005 | Not started |
| RQ-006 | Not started |
| RQ-007 | Not started |
| RQ-008 | Not started |
| RQ-009 | Not started |
| RQ-010 | Not started |
| RQ-011 | Not started |
| RQ-012 | Not started |
| RQ-013 | Not started |
| RQ-014 | Not started |
| RQ-015 | Not started |
