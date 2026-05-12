---
name: react-reviewer
description: >-
  Structured React + TypeScript reviews: compound component APIs (Root /
  subparts style), minimal props, logic in custom hooks, 500-line file cap,
  CSS Modules or Tailwind, a11y and semantic HTML; optional parallel sub-agents
  with a lead agent merge. Use for PR reviews, component refactors, or when the
  user asks for a React review.
---

# React Reviewer

Structured review of React / TSX changes. Criteria **1–6** below are mandatory coverage areas. Criterion 1 means **compound components** (a composable *API shape*), not a requirement to use any specific UI library.

## When to use

- The user asks for a review of React/TSX components, hooks, or pages.
- A PR touches UI and should align with team conventions (component API shape, styling, a11y).
- Combined with `code-best-practices` or similar: this skill owns **React structure and library conventions**; the other skill owns broader TS/performance rules.

## Review criteria (must cover)

### 1. Compound component patterns (library-agnostic)

Public APIs should read like **named subparts** under a root, not one mega-component with dozens of props. This matches the *style* of composable headless libraries; it does **not** require `@base-ui/react` or any particular dependency.

**Example (target shape):**

```tsx
<Card.Root>
  <Card.Header />
  <Card.Content />
</Card.Root>
```

- Prefer **`.Root` + subcomponents** (and optional `.Context` / hooks if the feature needs shared state) so callers control layout and which regions render.
- **Composition seams**: expose children, slots, or small subcomponents instead of freezing everything behind a single `<Card title=… footer=… showHeader=… />` when those regions are naturally separate.
- **Anti-patterns**: one component that switches ten UI regions via booleans; props that duplicate what composition already expresses; hiding structure so consumers cannot omit or reorder sections.
- **Optional primitives**: for overlays/dialogs, prefer established patterns (portal, focus management) via your design system or a headless library—without mandating which package—rather than ad-hoc `div` stacks that fight keyboard and focus.

### 2. Keep props minimal

- Public API: **small and stable**; do not promote data to props when context, routing, constants, or children can express it.
- Collapse related flags: avoid ten-plus granular booleans; prefer a single `variant` / `size` or a small structured object (still readable and intentional).
- Separate **public props** from **implementation details**: internal state belongs in state/refs, not leaked through props.
- List/table rows: prefer `item` plus a few callbacks over piping the parent’s entire dataset into each row.

### 3. Logic in custom hooks; components stay thin

- **View components**: emphasize JSX structure, conditional rendering, and wiring; move heavy branching, derived data, and side effects into `use*` hooks.
- If one component accumulates **unrelated effects, long transforms, or reusable algorithms**, extract to `useFoo.ts` (or `useComponentName.ts`) with **clear naming and dependency arrays**.
- Avoid “god components” that mix data fetching, animation, and authorization in one file; split on **hook = logic, component = presentation**.

### 4. No file over 500 lines

- Hard cap: **500 lines including blanks and comments**; near the limit, recommend splits (child components, hooks, types, constants modules).
- Split guidance: by **UI region** or **state boundary**; call out import graph to avoid circular dependencies.

### 5. Styling: CSS Modules or Tailwind CSS

- Follow the project’s chosen approach; **do not** mix undocumented styling systems at the same layer unless the file already does so and the user asked to preserve it.
- CSS Modules: semantic class names, avoid global leakage. Tailwind: watch **readability** and **dedupe repeated classes** (`clsx` / `cva` or small subcomponents).
- Check responsive / dark / theme behavior if the product or repo already defines those expectations.

### 6. a11y and HTML5 semantics

- Interactive elements use the right primitives: **buttons, links, form controls**; avoid `div` + `onClick` as a button unless keyboard support and `role` / `tabIndex` are complete—and still prefer semantic tags.
- **Label controls**: `label` + `htmlFor`; icon-only buttons need `aria-label` or `aria-labelledby`.
- Keyboard: **tab order**, `Escape` to dismiss, **focus trap** in overlays consistent with the WAI-ARIA dialog pattern (or your design system’s overlay behavior).
- Images/media: meaningful `alt`; decorative images use empty `alt`. Sensible heading hierarchy.
- Landmarks: `main`, `nav`, `header`, `footer`, `section` (with a heading when appropriate); avoid an all-`div` soup.

## Multi-agent parallel review (recommended)

When the lead agent should not scan every file alone, split into **three sub-agents in parallel**, each read-only on its slice, returning structured findings; the lead agent **merges and dedupes** into one review.

### Sub-agent split (suggested)

| Sub-agent | Focus | Typical inputs |
|-----------|--------|----------------|
| **A — Structure & API** | Criteria 1–2: compound component shape, prop surface and naming | Component implementation, public prop types, export map |
| **B — Logic & size** | Criteria 3–4: hook extraction, presentation purity, line counts | `.tsx` / `use*.ts`, line counts |
| **C — Style & a11y** | Criteria 5–6: CSS Module/Tailwind, semantic tags, ARIA, keyboard | Style modules, JSX tags and attributes |

### Sub-agent output format (fixed headings for easy merge)

Each sub-agent emits only:

```text
## Scope
- Files: …

## Passed (brief)
- …

## Issues (severity: block / major / minor)
1. [block|major|minor] file:line — title — rationale (criterion N)

## Suggested fix direction (not full patches)
- …
```

**Strict per-issue line format** (sub-agents and the lead agent must follow it byte-for-byte; downstream tooling parses this):

```text
<index>. [<severity>] <file>:<line> — <title> — <rationale> (criterion <N>)
```

- `<severity>` ∈ `block` | `major` | `minor` (lowercase, no brackets variants).
- `<file>` is a workspace-relative path with **no spaces**; if a path contains spaces, replace them with `\ ` so the regex stays single-token. Prefer renaming the bad path instead.
- `<line>` is a single integer; for whole-file issues, use the first relevant line (do **not** use `?` or ranges in this slot).
- Use the em-dash `—` as the field separator (U+2014). Never substitute `-` or `–`.
- `<N>` ∈ `1..6` matching the criteria above.

### Lead agent merge rules

1. **Dedupe**: one file/line keeps the **highest** severity only.
2. **Order**: block → major → minor; same severity sort by file path.
3. **Actionable**: each item maps to a **concrete change** (extract hook, change tag, shrink props, split file).
4. **Executive summary**: first **≤5 lines**—overall risk and whether merge should be blocked.

### Single-agent fallback

If parallel runs are not available: review in order **B (logic/size) → A (compound components / props) → C (style/a11y)** using the same issue-list format for consistent output.

## Final output template (lead → user)

```markdown
### React review summary
- …

### Must fix (block)
- …

### Should fix (major / minor)
- …

### Criteria checklist
| # | Criterion | Result |
|---|-----------|--------|
| 1 | Compound components | … |
| 2 | Minimal props | … |
| 3 | Logic in hooks | … |
| 4 | ≤500 lines | … |
| 5 | CSS Module / Tailwind | … |
| 6 | a11y / semantic HTML | … |

### Machine-readable issues

```jsonl
{"severity":"block","file":"src/Card.tsx","line":42,"criterion":1,"title":"Card has 9 boolean props for sections","fix":"Refactor to Card.Root + Card.Header/Content/Footer subparts"}
{"severity":"major","file":"src/Card.tsx","line":120,"criterion":3,"title":"useEffect mixes fetch and analytics","fix":"Extract useCardData hook; component renders only"}
```
```

#### Machine-readable issues block (rules)

- Always emit this fenced block (` ```jsonl `), even if empty (`{}`-free, just an empty block).
- **One JSON object per line**, no trailing commas, no comments.
- Schema (all fields required unless marked optional):

  | Field | Type | Notes |
  |-------|------|-------|
  | `severity` | `"block"` \| `"major"` \| `"minor"` | Lowercase. |
  | `file` | `string` | Workspace-relative POSIX path. |
  | `line` | `number` | Integer ≥ 1. For whole-file issues, use the first relevant line. |
  | `criterion` | `1`–`6` | Maps to the 6 criteria above. |
  | `title` | `string` | Short, ≤ 80 chars. No newlines. |
  | `fix` | `string` | Concrete change direction, not a patch. No newlines. |
  | `rationale` | `string` (optional) | Longer reasoning if `fix` alone is not enough. |

- Every line in the bulleted `Must fix` / `Should fix` sections **must** have a corresponding JSONL entry. The bulleted view is for humans; the JSONL view is the contract `review-resolver` consumes.

## Boundaries vs other skills

- **typescript-reviewer**: types, async, security; this skill is **React structure and UI conventions**.
- **code-best-practices** (if loaded): that skill’s reference rules win on overlap; **repo config wins**; note tradeoffs in the review.

## Versioning

Maintainers may record a version in the body; refresh criterion-1 examples if the team’s preferred compound-component conventions evolve.
