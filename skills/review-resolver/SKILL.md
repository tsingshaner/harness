---
name: review-resolver
description: >-
  Resolve issues from a `react-reviewer` report by applying targeted fixes per
  criterion (compound components, minimal props, hook extraction, ≤500-line
  files, CSS Modules / Tailwind, a11y and semantic HTML), then verify with
  typecheck, lint, and tests. Use after a React review when the user wants the
  findings actually fixed in code with a minimal, traceable diff.
---

# Review Resolver

Consume a `react-reviewer` report (or a structurally equivalent one) and turn it into a **safe, minimal, verifiable** code change. This skill **executes the fixes**; `react-reviewer` **finds** them.

## When to use

- A `react-reviewer` report exists and the user wants the findings applied as code, not just discussed.
- A PR has block/major/minor items mapped to the 6 review criteria and you need to clear them without rewriting unrelated code.
- Mixed reviews: items outside the 6 React criteria should be deferred to `typescript-fullstack-reviewer` / `backend-reviewer` / `code-best-practices` rather than guessed here.

## Inputs

- The latest `react-reviewer` report in Markdown. The report **must** end with a `### Machine-readable issues` section containing a ` ```jsonl ` block — that is the contract this skill consumes.
- Read-write access to the affected files.
- Repo conventions: styling system (CSS Modules vs Tailwind), lint config, test runner.

### Preferred: structured parse

Run the bundled parser to turn the report into a sorted task list and skip ad-hoc LLM parsing:

```bash
npx tsx skills/review-resolver/scripts/parse-report.ts <report.md> > tasks.json
```

The parser:

- Reads the ` ```jsonl ` block first (strict schema from `react-reviewer`).
- Falls back to the bulleted `Must fix` / `Should fix` lines if the JSONL block is missing.
- Sorts by `block → major → minor`, then by file/line.
- Dedupes identical `file:line:criterion` entries, keeping the highest severity.

### Fallback: manual parse

If the report is non-standard or the parser fails, normalize each issue into:

```text
severity | file:line | title | criterion (1–6) | rationale
```

If a finding has no `file:line` or its criterion is ambiguous, ask the user **once** for the missing info instead of guessing.

## Workflow

### 1. Parse and group

Prefer the parser:

```bash
npx tsx skills/review-resolver/scripts/parse-report.ts <report.md> > tasks.json
```

`tasks.json` is already sorted **block → major → minor** then by `file:line`. Group consecutive items by file path to minimize churn. Each task carries its criterion (1–6).

Drop items that are already correct in the current code (the report may lag). Note these in the final summary under **Skipped**.

### 2. Plan minimal-diff changes

Before editing, decide for each task:

- **Scope**: file-local change, multi-file refactor, or new file (split).
- **API impact**: does it touch public exports or component props? If yes, grep for callers and list them.
- **Test impact**: which tests cover it? If none, plan to add one for the fixed behavior.

Prefer the **smallest** change that satisfies the criterion. Do not bundle unrelated refactors.

### 3. Apply fixes per criterion (playbooks)

Use the playbook that matches the criterion tag on each task.

#### Criterion 1 — Compound components

Convert a single mega-component into `Root` + named subparts; expose subparts as named exports so callers control layout.

```tsx
// before
<Card title="…" footer={…} showHeader />

// after
<Card.Root>
  <Card.Header>…</Card.Header>
  <Card.Content>…</Card.Content>
  <Card.Footer>…</Card.Footer>
</Card.Root>
```

- Share state across subparts via a small `Context` only when more than one subpart actually reads it.
- Preserve old import paths through re-exports if the old API is public.

#### Criterion 2 — Minimal props

- Collapse ≥4 related booleans into a `variant` / `size` union or a small structured object.
- Remove props that callers already own from context, route params, constants, or `children`.
- For list/table rows, change from `allRows` + `index` to `item` + a narrow callback set.
- Keep public props **stable**; internal state belongs in state/refs, not props.

#### Criterion 3 — Logic in custom hooks

- Extract derived data, effects, and reusable algorithms to `use<Name>` modules:
  - Hook returns a typed object (state, handlers, refs); component reads and renders.
  - Effects have complete, stable dependency arrays and cleanup when applicable.
- Leave the component as JSX + conditional rendering + wiring.

#### Criterion 4 — File ≤500 lines

- Split by **UI region** (Header / Body / Footer subcomponents) or **state boundary** (presentational vs container).
- Co-locate new files next to the source: `Foo.Header.tsx`, `useFoo.ts`, `Foo.types.ts`.
- Shared types live in a leaf module to keep imports acyclic.

#### Criterion 5 — Styling (CSS Modules or Tailwind)

- Match the project's chosen system; **do not** introduce a new styling system as part of the fix.
- CSS Modules: collapse duplicated class lists via composed classes or shared helpers; keep names semantic.
- Tailwind: dedupe with `clsx` / `cva` or extract a small wrapper subcomponent; keep utility lists scannable.
- Verify dark / responsive / theme behavior the repo already expects still works.

#### Criterion 6 — a11y and HTML5 semantics

- Replace `div + onClick` with `button` / `a`; add `type="button"` to non-submit buttons.
- Pair every form control with `label htmlFor` or `aria-labelledby`; icon-only buttons get `aria-label`.
- Overlays: ensure focus trap, `Escape` to dismiss, restore focus on close — prefer the repo's existing overlay primitive over ad-hoc `div` stacks.
- Images: meaningful `alt`; decorative images use `alt=""`.
- Landmarks: `main` / `nav` / `header` / `footer`; sensible heading hierarchy, single `h1` per page region.

### 4. Verify

After all block + major fixes are applied, run what the repo defines and stop on the first failure:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

For any file touched under criterion 4, sanity-check the size:

```bash
wc -l <changed-files>
```

If a test or types fail, **fix forward** — do not revert a correct criterion fix to make a stale test green. Update the test to reflect the new (correct) behavior.

### 5. Report back

Emit one summary block at the end (this is the only freeform output the user reads):

```markdown
### Review resolution

**Resolved**
- block: <n> / <n>
- major: <n> / <n>
- minor: <n> / <n>

**Files touched**
- path/to/File.tsx (criterion 1, 4)
- path/to/useFoo.ts (criterion 3, new)

**Skipped (with reason)**
- path/to/Bar.tsx — criterion 2 — public design-system prop, scheduled in a follow-up.

**Verification**
- typecheck: pass
- lint: pass
- tests: pass (added 2, updated 1)
```

## Safety rules

- **Do not** widen scope: only touch files referenced in the report unless a fix forces a cross-file change (note it explicitly).
- **Do not** silently break public API. If a fix requires it, surface a follow-up note for the user.
- **Do not** mix styling systems within a single file as part of the fix.
- **Do not** delete tests to make them green; update them to the new behavior.
- **Do not** add new dependencies (UI libraries, headless kits) without user confirmation.
- Group commits by criterion when possible: `refactor(card): compound API`, `fix(a11y): label inputs`, `refactor(foo): extract useFoo`.

## Anti-patterns

- Bulk-rewriting a component to "match the recommendation" when the report flagged only one region.
- Replacing a clear, project-idiomatic pattern with a generic one just to clear a minor finding.
- Squashing all 6 criteria into one mega-commit with no test changes.
- Treating "minor" items as block: do block first, ship, then iterate.

## Boundaries vs other skills

- **react-reviewer**: produces the report; this skill consumes it.
- **typescript-fullstack-reviewer / backend-reviewer**: own findings outside the 6 React criteria — defer to their playbooks rather than guessing here.
- **changeset-add**: if the repo uses Changesets and the fixes are user-facing, add a changeset after the verification step.

## Additional resources

- For real before/after walkthroughs (compound API, hook extraction), see [examples.md](examples.md).
- For the report parser source and CLI, see [scripts/parse-report.ts](scripts/parse-report.ts).
