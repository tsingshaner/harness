# harness

Small collection of agent-oriented **skills** (workflows and checklists) for tooling and release hygiene.

## Skills

| Skill | File | Summary |
|--------|------|---------|
| **git-commit** | [`skills/git-commit/SKILL.md`](skills/git-commit/SKILL.md) | Create a conventional-commit style commit with a markdown bullet-list body and a `Co-Authored-By: Claude Opus 4.7` footer for AI-assisted changes. |
| **changeset-add** | [`skills/changeset-add/SKILL.md`](skills/changeset-add/SKILL.md) | Create an empty changeset with `pnpm changeset --empty`, fill in frontmatter and release notes from your git changes, then commit with your code. |
| **figma-to-react-component** | [`skills/figma-to-react-component/SKILL.md`](skills/figma-to-react-component/SKILL.md) | Convert Figma node links into React + MCP-derived node data + @base-ui/react composable components. Supports Tailwind, CSS, and CSS Modules. Generates Playwright component tests after implementation; Vitest browser-mode unit tests after user acceptance unless the user opts out. |
| **frontend-reviewer** | [`skills/frontend-reviewer/SKILL.md`](skills/frontend-reviewer/SKILL.md) | Orchestrates React UI review and automated fix resolution with human gates and bounded iterations. |
| **react-reviewer** | [`skills/react-reviewer/SKILL.md`](skills/react-reviewer/SKILL.md) | Structured React + TypeScript reviews covering compound components, minimal props, custom hooks, file size, styling, and accessibility. |
| **review-resolver** | [`skills/review-resolver/SKILL.md`](skills/review-resolver/SKILL.md) | Resolve issues from a `react-reviewer` report by applying targeted fixes and verifying with typecheck, lint, and tests. |
| **react-component-design** | [`skills/react-component-design/SKILL.md`](skills/react-component-design/SKILL.md) | Guide React component architecture: Page/Feature/Model-Hook/UI layering, `useXxxModel` return-value conventions, state-lifting, type exports, and arrow-function component declarations. |
| **ui-component-design** | [`skills/ui-component-design/SKILL.md`](skills/ui-component-design/SKILL.md) | Guide reusable, business-free React UI component design: composition, `data-part`/`data-scope`/`data-state` attributes, controlled/uncontrolled state, ARIA, Context boundaries, and reusing installed headless primitive libraries (Radix UI, Base UI, Zag.js). |
| **unit-test-vitest** | [`skills/unit-test-vitest/SKILL.md`](skills/unit-test-vitest/SKILL.md) | Team conventions for writing Vitest test cases: describe/test/expect structure, AAA pattern, one-behavior-per-test, mock usage boundaries (MSW, fake timers, `vi.fn` vs `vi.mock`), assertion specificity, async testing, and file naming. |

Open a skill file for the full step-by-step workflow, validation checklist, and anti-patterns.

## Installation

Skills can be installed using the [Vercel Skills CLI](https://github.com/vercel-labs/skills):

**Install all skills to Claude Code:**
```bash
npx skills add https://github.com/tsingshaner/harness --all -a claude-code
```

**Install a specific skill:**
```bash
npx skills add https://github.com/tsingshaner/harness --skill git-commit -a claude-code
```

**Install globally (user directory):**
```bash
npx skills add https://github.com/tsingshaner/harness -a claude-code -g
```

**Skip confirmation prompts:**
```bash
npx skills add https://github.com/tsingshaner/harness -a claude-code -y
```

Once installed, invoke a skill in Claude Code by typing `/<skill-name>`, e.g. `/git-commit`.
