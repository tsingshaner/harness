---
name: frontend-reviewer
description: >-
  Orchestrates React UI review and automated fix resolution: loads react-reviewer
  for structured reports; when machine-readable issues are already empty (resolution
  complete), ends immediately without asking the user. Otherwise requires an explicit
  user Yes/No only before the first review-resolver pass; after each resolution batch
  immediately re-runs react-reviewer for verification, and if issues remain and the
  round cap allows, chains further review-resolver passes without asking. Caps at three
  resolve cycles. Use for end-to-end React PR hardening, review-then-fix workflows, or
  when the user wants an initial fix consent then automatic verify-and-fix loops.
disable-model-invocation: true
---

# Frontend Reviewer (chained review and fix)

Chains **`react-reviewer`** (produces the report) with **`review-resolver`** (applies fixes from the report). If the latest report already satisfies **Resolution complete** (no `block` / `major` / `minor` issues), **do not** ask the user anything—give a brief all-clear and **stop**. Otherwise, **before the first** `review-resolver` run only, obtain an explicit user **Yes / No**. After each `review-resolver` finishes, **always** run `react-reviewer` again for verification **without** asking whether to re-review; if issues remain and `resolveRound < maxResolveRounds`, **immediately** start the next `review-resolver` pass on the latest report (no second Yes/No). **`review-resolver` runs at most three times** total. After the third run, never start a fourth `review-resolver` automatically, regardless of the latest verification report.

## When to use

- The user wants React/TSX changes reviewed first, then optionally auto-fixed, aligned with this repo’s `react-reviewer` / `review-resolver` contract.
- The user asks for “frontend review + fixes,” “review then change,” or multi-pass verification with one upfront approval on the first fix batch, then automatic verify-and-fix until clean or cap.

## Child skills to load first

**Read fully** (in order) before executing the matching phase:

1. [react-reviewer](../react-reviewer/SKILL.md) — Review rules and report shape (including `### Machine-readable issues` / `jsonl`).
2. [review-resolver](../review-resolver/SKILL.md) — Parse the report, minimal-diff fixes, and `pnpm typecheck` / `lint` / `test`.

## Definitions

- **Resolve cycle**: Run `review-resolver` end-to-end once → immediately run `react-reviewer` again for verification. The **first** cycle in a pipeline is preceded by user **Yes** (Section 2); later cycles do not re-ask.
- **Resolution complete**: The latest `react-reviewer` **Machine-readable issues** block has **no** lines with `severity` of `block`, `major`, or `minor` (the `jsonl` fence may be empty or whitespace-only). If the team agrees to stop after clearing **only** `block` items, state that in the conversation and follow the user’s answer; this skill’s **default** is “all severities cleared.”

## Pipeline (strict)

### 0. Initialize

- `resolveRound := 0` (count of **completed** `review-resolver` runs that finished with verification; increment once at the end of each successful Section 3—see Section 3).
- `maxResolveRounds := 3` (at most **three** `review-resolver` invocations total, including the first fix after the initial review).

### 1. Review (`react-reviewer`)

- Produce the full report per `react-reviewer` (including `### Machine-readable issues` and the fenced `jsonl` block).
- Evaluate against **Resolution complete** (Definitions):
  - **Already complete**: optionally one short line (all clear, counts zero); **do not** ask Yes/No; **do not** run `review-resolver`; jump to **Section 4** or end—pipeline finished.
  - **Issues remain**: **Notify the user**: short summary of risk and block/major/minor counts; include report highlights or a file path (if written to `report.md`, say so). Continue to Section 2.

### 2. User gate (required only before the **first** resolve, when issues remain)

Skip this section entirely when the current report is **Resolution complete**. **Do not** return here from Section 3—if verification still shows issues and rounds remain, chain another Section 3 directly.

Before the **first** `review-resolver` run in this pipeline only (`resolveRound == 0`, and there are still `block` / `major` / `minor` issues in the current report):

1. **State clearly** that fixes and verification will follow the **current** `react-reviewer` report.
2. **Binary choice only**: ask the user to reply **Yes** or **No** (or an unambiguous equivalent). Do **not** assume consent.
3. If **No**: stop automated fixes; you may leave the report for the user; **do not** invoke `review-resolver`.
4. If **Yes**:
   - If `resolveRound >= maxResolveRounds`: **do not** run `review-resolver`; explain the cap and jump to Section 4 **Wrap-up**.
   - Otherwise: go to Section 3.

### 3. Fix and verify (`review-resolver` → `react-reviewer`)

- Follow `review-resolver`: prefer `npx tsx skills/review-resolver/scripts/parse-report.ts <report.md> > tasks.json` (paths relative to the repo root); then apply planned edits, run checks, and emit the `### Review resolution` summary.
- **Immediately** run **`react-reviewer`** again on the current workspace / latest diff and produce a new full report.
- **Increment** `resolveRound` by 1 (this pass successfully finished `review-resolver` through verification). If the pass aborted before that, **do not** increment.
- Evaluate the new report against **Resolution complete** (above):
  - **Complete**: tell the user all tracked issues are cleared; **do not** ask Yes/No; stop.
  - **Issues remain** and `resolveRound < maxResolveRounds`: **do not** ask whether to re-review or fix again; immediately start another **Section 3** pass using this latest `react-reviewer` report (same steps: parse → fix → checks → `### Review resolution` → **`react-reviewer`**).
  - **Issues remain** and `resolveRound >= maxResolveRounds`: **do not** run `review-resolver` again; hand off the latest verification report plus the last `Review resolution` summary, note the three-resolve cap, and leave remaining items for manual follow-up or a new task/thread.

### 4. Wrap-up

- If the pipeline never entered `review-resolver` because the **initial** report was already **Resolution complete**: one optional sentence is enough (e.g., zero issues, zero resolve rounds); **do not** ask the user anything else.
- Otherwise summarize: **how many resolve cycles ran**, **what changed** between reports across rounds, and **verification command** outcomes (pass/fail).
- If the flow stopped because of **No** or the round cap, explain why and what the user can do next (e.g., continue in a new session after confirming).

## Cycle diagram

```text
react-reviewer ──(clean)──► end (no user prompt)
       │
       └──(issues)──► [user Yes/No, first resolve only] → (Yes and under cap) review-resolver → react-reviewer
                              ↑______________________________________________________________|
                              └ loop while issues remain and resolveRound < 3 (no re-ask);
                                verify clean → end (no Yes/No); after 3 resolves, only report
```

## Relationship to child skills

- **`react-reviewer`**: review and reporting only; when issues remain on the **initial** report, **notify** the user and obtain **Yes/No** before the **first** fix pass; after each resolve, **always** re-run `react-reviewer` for verification **without** asking the user to confirm another review. When the report is already clean, **do not** prompt—end.
- **`review-resolver`**: consumes the report and edits code; this skill allows at most **three** invocations; only the **first** is preceded by Section 2 when issues remain.
- Do not skip the `jsonl` contract; do not run the **first** `review-resolver` without an explicit **Yes** when fixes are on the table. Subsequent passes under the cap do not require another **Yes**.

## Additional resources

- Parser and walkthroughs: [review-resolver/SKILL.md](../review-resolver/SKILL.md), [review-resolver/examples.md](../review-resolver/examples.md).
