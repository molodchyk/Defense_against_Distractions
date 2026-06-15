# DaD Research Workspace

This directory contains the research pipeline for Defense against Distractions. It exists so research can happen as a repeatable process instead of as one large undifferentiated literature review.

The goal is to answer product-relevant scientific questions one at a time, then turn those answers into implementation guidance for DaD.

## What Belongs Here

- Research context for external research agents.
- A registry of research questions.
- Question briefs for individual investigations.
- Evidence cards for papers, reviews, and source material.
- Synthesis notes that connect evidence to DaD design.
- Implementation handoff notes that Codex can later use.

## Directory Map

- [`context-for-chatgpt-research.md`](context-for-chatgpt-research.md): full handoff prompt for ChatGPT Research.
- [`quality-bar.md`](quality-bar.md): novelty, depth, and evidence standards for useful research.
- [`pipeline.md`](pipeline.md): step-by-step process for running research.
- [`questions.md`](questions.md): research question registry and recommended sequence.
- [`briefs/`](briefs/README.md): scoped briefs for individual research questions.
- [`evidence/`](evidence/README.md): evidence cards for individual sources.
- [`answers/`](answers/README.md): completed or in-progress research answers.
- [`templates/`](templates/): reusable templates for briefs, evidence cards, and syntheses.

## Working Rule

Each research cycle should answer one bounded question.

Do not try to prove the whole philosophy of DaD in one pass. Start with a specific question, gather evidence, grade it, synthesize it, then translate it into product constraints or design guidance.

Research must pass the novelty standard in [`quality-bar.md`](quality-bar.md). The point is not to collect obvious statements. The point is to find mechanisms, numbers, failure modes, and design-changing information that neither the developer nor the product owner would have confidently inferred from common sense.

## Research Cycle

1. Select a question from [`questions.md`](questions.md).
2. Create a question brief in [`briefs/`](briefs/README.md) from [`templates/question-brief.md`](templates/question-brief.md).
3. Gather sources and write evidence cards in [`evidence/`](evidence/README.md) using [`templates/evidence-card.md`](templates/evidence-card.md).
4. Write a synthesis in [`answers/`](answers/README.md) using [`templates/synthesis.md`](templates/synthesis.md).
5. Update [`questions.md`](questions.md) with the answer status.
6. If the answer affects implementation, create or update the relevant product/spec doc.

## Evidence Standard

Every answer should classify evidence as:

- `strong`: meta-analysis, systematic review, replicated primary findings, or well-established theory with direct relevance.
- `moderate`: credible primary studies or converging evidence, but limited direct browser-extension relevance.
- `weak`: plausible mechanism, adjacent domain, small studies, or early HCI work.
- `speculative`: useful hypothesis, but insufficient evidence; do not use for strong product claims.

## Product Constraints

Research should preserve these constraints unless a future decision explicitly changes them:

- DaD is local-first by default.
- DaD does not diagnose users.
- DaD does not claim to detect lies or read minds.
- DaD does not treat dopamine as a catch-all explanation.
- DaD should not store raw typed input, raw page text, full URLs, page titles, raw selectors, field labels, media URLs, or personal text samples by default.
- Strong defenses should be grounded in precommitment, transparent rules, and user trust.
- The product can be opinionated without pretending its defaults are universal.

## Output Shape

A good research answer ends with:

- non-obvious findings from the literature;
- mechanisms that explain behavior;
- empirical details such as effect sizes, sample sizes, base rates, or measured differences where available;
- counterintuitive or assumption-breaking findings;
- scoring, intervention, UI, and data implications;
- local validation metrics;
- what implementation should do next;
- what still needs deeper research.
