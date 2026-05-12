---
name: frontend-reviewer
description: >-
  Orchestrates React UI review and automated fix resolution: loads react-reviewer
  for structured reports, requires an explicit user Yes/No before each
  review-resolver pass, re-runs react-reviewer after every resolution batch, and
  caps at three resolve cycles. Use for end-to-end React PR hardening,
  review-then-fix workflows, or when the user wants review and fixes chained with
  human gates and bounded iterations.
disable-model-invocation: true
---

# Frontend Reviewer (chained review and fix)

Chains **`react-reviewer`** (produces the report) with **`review-resolver`** (applies fixes from the report). **Before every** `review-resolver` run, obtain an explicit user **Yes / No**. After `review-resolver` finishes, **always** run `react-reviewer` again for verification. If issues remain and the user answers **Yes**, you may enter another fix cycle, but **`review-resolver` runs at most three times** (including the first). After the third run, never start a fourth `review-resolver` automatically, regardless of the latest verification report.

## When to use

- The user wants React/TSX changes reviewed first, then optionally auto-fixed, aligned with this repo’s `react-reviewer` / `review-resolver` contract.
- The user asks for “frontend review + fixes,” “review then change,” or multi-pass verification with human approval on each fix batch.

## Child skills to load first

**Read fully** (in order) before executing the matching phase:

1. [react-reviewer](../react-reviewer/SKILL.md) — Review rules and report shape (including `### Machine-readable issues` / `jsonl`).
2. [review-resolver](../review-resolver/SKILL.md) — Parse the report, minimal-diff fixes, and `pnpm typecheck` / `lint` / `test`.

## Definitions

- **Resolve cycle**: User answers **Yes** → run `review-resolver` end-to-end once → immediately run `react-reviewer` again for verification.
- **Resolution complete**: The latest `react-reviewer` **Machine-readable issues** block has **no** lines with `severity` of `block`, `major`, or `minor` (the `jsonl` fence may be empty or whitespace-only). If the team agrees to stop after clearing **only** `block` items, state that in the conversation and follow the user’s answer; this skill’s **default** is “all severities cleared.”

## Pipeline (strict)

### 0. Initialize

- `resolveRound := 0` (count of completed `review-resolver` runs; increment only after Section 3 finishes successfully—see below).
- `maxResolveRounds := 3` (at most **three** `review-resolver` invocations total, including the first fix after the initial review).

### 1. Review (`react-reviewer`)

- Produce the full report per `react-reviewer` (including `### Machine-readable issues` and the fenced `jsonl` block).
- **Notify the user**: short summary of risk and block/major/minor counts; include report highlights or a file path (if written to `report.md`, say so).

### 2. User gate (required before every resolve)

Before **each** `review-resolver` run:

1. **State clearly** that fixes and verification will follow the **current** `react-reviewer` report.
2. **Binary choice only**: ask the user to reply **Yes** or **No** (or an unambiguous equivalent). Do **not** assume consent.
3. If **No**: stop automated fixes; you may leave the report for the user; **do not** invoke `review-resolver`.
4. If **Yes**:
   - If `resolveRound >= maxResolveRounds`: **do not** run `review-resolver`; explain the cap and jump to Section 4 **Wrap-up**.
   - Otherwise: go to Section 3; after Section 3 completes successfully (including verification), increment `resolveRound` by 1.

### 3. Fix and verify (`review-resolver` → `react-reviewer`)

- Follow `review-resolver`: prefer `npx tsx skills/review-resolver/scripts/parse-report.ts <report.md> > tasks.json` (paths relative to the repo root); then apply planned edits, run checks, and emit the `### Review resolution` summary.
- **Immediately** run **`react-reviewer`** again on the current workspace / latest diff and produce a new full report.
- Evaluate the new report against **Resolution complete** (above):
  - **Complete**: tell the user all tracked issues are cleared; stop.
  - **Issues remain** and `resolveRound < maxResolveRounds`: return to **Section 2** and ask **Yes / No** on the new report.
  - **Issues remain** and `resolveRound >= maxResolveRounds`: **do not** run `review-resolver` again; hand off the latest verification report plus the last `Review resolution` summary, note the three-resolve cap, and leave remaining items for manual follow-up or a new task/thread.

### 4. Wrap-up

- Summarize: **how many resolve cycles ran**, **what changed** between reports across rounds, and **verification command** outcomes (pass/fail).
- If the flow stopped because of **No** or the round cap, explain why and what the user can do next (e.g., continue in a new session after confirming).

## Cycle diagram

```text
react-reviewer → [user Yes/No] → (Yes and under cap) review-resolver → react-reviewer
                      ↑______________________________________________|
                      └ loop while issues remain and resolveRound < 3;
                        after 3 resolves, only report—no further resolve
```

## Relationship to child skills

- **`react-reviewer`**: review and reporting only; this skill requires **notifying the user** and obtaining **Yes/No** before any fix pass.
- **`review-resolver`**: consumes the report and edits code; this skill allows at most **three** invocations, each preceded by Section 2.
- Do not skip the `jsonl` contract; do not run resolve without an explicit **Yes**.

## Additional resources

- Parser and walkthroughs: [review-resolver/SKILL.md](../review-resolver/SKILL.md), [review-resolver/examples.md](../review-resolver/examples.md).
