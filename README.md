# harness

Small collection of agent-oriented **skills** (workflows and checklists) for tooling and release hygiene.

## Skills

| Skill | File | Summary |
|--------|------|---------|
| **changeset-add** | [`skills/changeset-add/SKILL.md`](skills/changeset-add/SKILL.md) | Create an empty changeset with `pnpm changeset --empty`, fill in frontmatter and release notes from your git changes, then commit with your code. |
| **figma-to-react-component** | [`skills/figma-to-react-compoent/SKILL.md`](skills/figma-to-react-compoent/SKILL.md) | Convert Figma node links into React + MCP-derived node data + @base-ui/react composable components. Supports Tailwind, CSS, and CSS Modules. Generates Playwright component tests after implementation; Vitest browser-mode unit tests after user acceptance unless the user opts out. |

Open a skill file for the full step-by-step workflow, validation checklist, and anti-patterns.
