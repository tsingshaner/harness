---
name: review-resolver
description: >-
  Apply fixes from a `react-reviewer` report against criteria 1–7 (compound
  Root/subparts APIs, minimal props, logic in hooks with return surface under 20
  fields, ≤500-line files incl. blanks/comments, CSS Modules or Tailwind, a11y
  and semantic HTML, TSDoc on public exports per reviewer severity rules), then
  verify with typecheck, lint, and tests. Use after a React review when findings
  should land as minimal, traceable code changes.
---

# Review Resolver

Consume a [`react-reviewer`](../react-reviewer/SKILL.md) report (or one structurally equivalent) and turn it into **safe, minimal, verifiable** edits. This skill **executes** fixes; `react-reviewer` **finds** them. **Criterion numbering, JSONL schema, and severity semantics** must match `react-reviewer` — do not invent alternate rules.

## When to use

- A `react-reviewer` report exists and the user wants items applied in code, not only discussed.
- PR block/major/minor items map to criteria **1–7** and you need them cleared without unrelated rewrites.
- Findings **outside** those criteria (e.g. general TypeScript, async, security, non-UI backend) belong to **`typescript-reviewer`**, **`backend-reviewer`**, or other domain skills — **defer** rather than guess here (same boundary split as `react-reviewer` vs `typescript-reviewer`).

## Criteria alignment (1–7)

Use this table as a quick index; full definitions and review severity live in `react-reviewer`.

| # | Criterion | Resolver focus |
|---|-----------|----------------|
| 1 | Compound components (library-agnostic `.Root` + subparts) | Split mega-props into composable subparts; composition seams; optional overlay primitives via DS/headless patterns — **no** mandated UI library. |
| 2 | Minimal props | Small stable public API; `variant` / `size` or small objects; rows as `item` + callbacks. |
| 3 | Logic in hooks; **return surface under 20 fields** | Thin views; extract `use*`; split or nest returns at ≥20 fields per reviewer; complete dependency arrays. |
| 4 | ≤500 lines (incl. blanks & comments) | Split by UI region or state boundary; avoid circular imports. |
| 5 | CSS Module / Tailwind | Match project choice; do not mix undocumented systems; dedupe utilities. |
| 6 | a11y / semantic HTML | Correct interactive primitives, labels, keyboard, focus trap / Escape per dialog pattern, `alt`, landmarks, headings. |
| 7 | TSDoc on public exports | `/** */` on exports reviewers flagged; follow reviewer minor vs major escalation; match project norms. |

## Inputs

- Latest `react-reviewer` Markdown. The report **must** end with `### Machine-readable issues` and a fenced ` ```jsonl ` block — **that is the contract** (see `react-reviewer` → *Machine-readable issues block (rules)*).
- Read-write access to listed files.
- Repo conventions: styling stack, lint, test runner.

### JSONL fields (must match `react-reviewer`)

| Field | Type | Notes |
|-------|------|-------|
| `severity` | `"block"` \| `"major"` \| `"minor"` | Lowercase. |
| `file` | `string` | Workspace-relative POSIX path. |
| `line` | `number` | Integer ≥ 1; whole-file issues → first relevant line. |
| `criterion` | `1`–`7` | As in `react-reviewer`. |
| `title` | `string` | Short, ≤80 chars, no newlines. |
| `fix` | `string` | Concrete direction, not a patch; no newlines. |
| `rationale` | `string` (optional) | When `fix` alone is insufficient. |

Bulleted `Must fix` / `Should fix` lines, if present, should mirror JSONL rows (reviewer rule); the parser prefers JSONL first.

### Preferred: structured parse

```bash
npx tsx skills/review-resolver/scripts/parse-report.ts <report.md> > tasks.json
```

The parser:

- Reads the ` ```jsonl ` block first (schema above).
- Falls back to bulleted `Must fix` / `Should fix` using the **strict per-issue line format** in `react-reviewer` (em-dash `—` separators, `(criterion N)`).
- Sorts **block → major → minor**, then file/line.
- Dedupes identical `file:line:criterion`, keeping highest severity.

### Fallback: manual parse

If the report is non-standard or parsing fails, normalize each issue to:

```text
severity | file:line | title | criterion (1–7) | fix direction
```

If `file:line` or criterion is missing or ambiguous, ask the user **once** — do not guess.

## Workflow

### 1. Parse and group

Prefer:

```bash
npx tsx skills/review-resolver/scripts/parse-report.ts <report.md> > tasks.json
```

`tasks.json` is sorted **block → major → minor** then `file:line`. Group consecutive tasks by file to reduce churn. Each task carries `criterion` (1–7).

Drop tasks already satisfied in current code (stale report); list under **Skipped** in the final summary.

### 2. Plan minimal-diff changes

Per task:

- **Scope**: file-local, multi-file, or new file (split).
- **API impact**: public exports or props? **grep** callers.
- **Tests**: what covers this? Add or update tests for changed behavior.

Smallest change that satisfies the **reviewer’s** criterion and `fix` text. No unrelated refactors.

### 3. Apply fixes per criterion (playbooks)

Match the task’s `criterion` to the playbook below; wording tracks `react-reviewer` criteria sections.

#### Criterion 1 — Compound components (library-agnostic)

- Target **`.Root` + named subparts** (optional `.Context` / hooks when shared state is real). Callers control layout and which regions render.
- Prefer **composition seams**: children, slots, or small subcomponents instead of one component that switches many regions via booleans.
- **Anti-patterns to fix**: single component toggling many UI regions with flags; props that duplicate composition; structure hidden so consumers cannot omit/reorder sections.
- **Overlays/dialogs**: prefer portal + focus patterns via design system or headless library — **without** mandating a package — not ad-hoc `div` stacks that break keyboard/focus.

```tsx
// before (mega-props)
<Card title="…" footer={…} showHeader />

// after (composable shape)
<Card.Root>
  <Card.Header>…</Card.Header>
  <Card.Content>…</Card.Content>
  <Card.Footer>…</Card.Footer>
</Card.Root>
```

- Share state via small `Context` only when multiple subparts read it.
- Preserve old import paths via re-exports if the old API was public.

#### Criterion 2 — Minimal props

- **Public API**: small and stable; do not promote data to props when context, routing, constants, or `children` can express it.
- Collapse **many related booleans** into `variant` / `size` or a small structured object (still intentional).
- Keep **public** vs **implementation** clear: internal state in state/refs, not props.
- **List/table rows**: `item` + narrow callbacks, not parent’s full dataset per row.

#### Criterion 3 — Logic in custom hooks; return surface under 20 fields

- **Components**: JSX, conditionals, wiring; move heavy branching, derived data, effects into `use*` modules (`useFoo.ts` / `useComponentName.ts`) with clear names and **complete, stable** dependency arrays and cleanup when needed.
- **Hook return surface**: a single `use*` return object must expose **fewer than 20** distinct properties (named object fields; array/tuple → count each position). If the report flags **≥20** (or type/clarity suffers): **split hooks**, **nest related fields** in stable objects, or **context + smaller hooks** — align with reviewer **major** / **block** intent.
- Avoid one file mixing unrelated fetching, animation, and auth; split on **hook = logic, component = presentation**.

#### Criterion 4 — No file over 500 lines

- Cap is **500 lines including blanks and comments**.
- Split by **UI region** or **state** boundary; co-locate e.g. `Foo.Header.tsx`, `useFoo.ts`, `Foo.types.ts`; keep imports acyclic.

#### Criterion 5 — Styling: CSS Modules or Tailwind CSS

- Match the project’s approach; **do not** introduce another system in the fix.
- **Do not** mix undocumented styling layers unless the file already did and the user asked to preserve it.
- CSS Modules: semantic names, composed/shared helpers where it removes duplication.
- Tailwind: readability; dedupe with `clsx` / `cva` or small wrapper subcomponents.
- Preserve responsive / dark / theme behavior the repo expects.

#### Criterion 6 — a11y and HTML5 semantics

- **Interactive**: `button` / `a` / real form controls; avoid `div` + `onClick` as a button unless full keyboard + `role` / `tabIndex` — still prefer semantic tags.
- **Labels**: `label` + `htmlFor`; icon-only controls: `aria-label` or `aria-labelledby`.
- **Keyboard**: tab order; **Escape** to dismiss; **focus trap** in overlays consistent with **WAI-ARIA dialog** or the design system’s overlay.
- **Images**: meaningful `alt`; decorative: `alt=""`. Sensible **heading** hierarchy.
- **Landmarks**: `main`, `nav`, `header`, `footer`, `section` (with heading when appropriate); avoid all-`div` soup.

#### Criterion 7 — TSDoc on public exports (reviewer-weighted)

- Add or refresh **`/** … */`** on **exported** symbols flagged in the task: components (including compound subparts), **`use*`** hooks, shared prop/options types, non-obvious module helpers tied to UI — per `react-reviewer` **Targets**.
- **Style**: TSDoc-compatible; short **summary**; `@param` / `@returns` / `@remarks` / `@example` only when they reduce misuse (effects, invariants, “caller must…”).
- **Severity**: reviewer usually treats gaps as **minor**; treat as **major**-level fix depth when the API is easy to misuse or has non-obvious preconditions. **Do not** blanket-document every internal helper; match **project norms**.

### 4. Verify

After block + major work, run repo commands; stop on first failure:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

For criterion 4 touches:

```bash
wc -l <changed-files>
```

If tests/types fail, **fix forward** — do not revert a correct criterion fix to appease a stale test; update tests to the new correct behavior.

### 5. Report back

Single summary block for the user:

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
- path/to/Bar.tsx — criterion 2 — public design-system prop, follow-up.

**Verification**
- typecheck: pass
- lint: pass
- tests: pass (added 2, updated 1)
```

## Safety rules

- **Scope**: only files from the report unless a fix unavoidably crosses files (say so explicitly).
- **Public API**: no silent breaks; if a fix needs API change, flag a follow-up.
- **Styling**: do not mix systems in one file as part of the fix.
- **Tests**: never delete tests to go green; update behavior expectations.
- **Dependencies**: no new UI/headless packages without user confirmation.
- **Commits**: group by theme when practical, e.g. `refactor(card): compound API`, `fix(a11y): label inputs`, `refactor(foo): extract useFoo`.

## Anti-patterns

- Rewriting whole components when the report scoped one region.
- Replacing project-idiomatic patterns with generic ones to clear a minor only.
- One mega-commit across all criteria with no test updates.
- Upgrading **minor** to **block**-level refactors: honor reviewer severity; do **block** first, then iterate.

## Boundaries vs other skills

- **`react-reviewer`**: emits the report and JSONL; this skill consumes them.
- **`typescript-reviewer`**: types, async, security — not owned here.
- **`code-best-practices`**: if loaded, its reference rules win on overlap with generic TS/React style; **repo config wins**; note tradeoffs in the resolution summary when relevant.
- **`backend-reviewer` / other stacks**: non-React findings — defer to the right skill.
- **`changeset-add`**: if the repo uses Changesets and changes are user-facing, add a changeset after verification.

## Additional resources

- Walkthroughs: [examples.md](examples.md).
- Parser implementation: [scripts/parse-report.ts](scripts/parse-report.ts).
