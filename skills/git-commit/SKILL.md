---
name: git-commit
description: >-
  Create a conventional-commit style git commit with a structured markdown bullet
  list body detailing every change, and a Co-Authored-By footer crediting the Claude
  AI model used in the session. Use whenever committing code changes produced with
  or reviewed by Claude.
---

# Git Commit (Conventional + AI Attribution)

Produces a **conventional commit** with a markdown bullet-list body and a
`Co-Authored-By` footer that attributes the Claude model used in the session.

## Commit message format

```
<type>(<optional scope>): <imperative subject, ≤72 chars>

- <what changed and why — one bullet per logical unit>
- <second change>
- <third change, etc.>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### Type reference

| Type       | When to use |
|------------|-------------|
| `feat`     | New feature or capability visible to users |
| `fix`      | Bug fix |
| `refactor` | Code restructure with no behaviour change |
| `docs`     | Documentation only |
| `test`     | Tests added or updated |
| `chore`    | Tooling, config, dependency updates |
| `perf`     | Performance improvement |
| `ci`       | CI/CD pipeline changes |

### Subject line rules

- Imperative mood: "add", "fix", "remove" — not "added", "fixes", "removes"
- No trailing period
- ≤72 characters
- Lowercase after the colon (except proper nouns, acronyms)

### Body rules

- Blank line between subject and body
- Each bullet starts with `- ` (single hyphen + space)
- One bullet per **logical change** (file group, feature slice, or config block)
- State **what** changed _and_ **why** when non-obvious
- Indent continuation lines 2 spaces under the opening `- `

### Footer rules

- Blank line between body and footer
- Always include the `Co-Authored-By` line when the commit was produced or
  substantially shaped by Claude
- Format exactly: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`

## Steps

### 1. Inspect staged changes

```bash
git diff --cached --stat
git diff --cached
```

If nothing is staged:

```bash
git status
git diff
```

Stage intentionally — prefer `git add <path>` over `git add -A` to avoid
accidentally committing `.env`, secrets, or unrelated files.

### 2. Draft the commit message

1. Pick the **type** from the table above.
2. Write the **subject**: one imperative clause, ≤72 chars.
3. Write **one bullet per logical change** derived from `git diff --cached`.
   - Group related file changes under a single bullet when they serve one purpose.
   - Split unrelated changes into separate bullets even if in the same file.
4. Append the **Co-Authored-By** footer after a blank line.

### 3. Commit using a heredoc

Pass the message via heredoc to preserve newlines and special characters:

```bash
git commit -m "$(cat <<'EOF'
feat(scope): short imperative subject

- Change one: what and why
- Change two: what and why
- Change three: what and why

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

### 4. Verify

```bash
git log -1 --pretty=fuller
```

Check:
- Subject matches type and is ≤72 chars
- Body bullets cover every staged hunk
- Footer is present and correctly formatted

## Examples

### Feature commit

```
feat(skills): add git-commit skill for conventional commits

- Add skills/git-commit/SKILL.md with commit format, type table, and step-by-step workflow
- Include heredoc example to preserve multi-line messages in non-interactive shells
- Document Co-Authored-By footer requirement for AI-assisted commits

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

### Fix commit

```
fix(parser): handle empty machine-readable issues block gracefully

- Return early with resolution-complete state when jsonl fence is empty or whitespace-only
- Add unit test for empty-fence edge case in parse-report.ts

Co-Authored-By: Codex GPT-5 <noreply@openai.com>
```

### Chore commit (no scope needed)

```
chore: update pnpm lockfile and bump eslint to 9.x

- Update pnpm-lock.yaml to resolve peer-dependency warnings from eslint 8 → 9
- Adjust .eslintrc config keys deprecated in v9 (env → languageOptions.globals)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

## Anti-patterns

- **Vague subject**: `fix: bug` — say _what_ was fixed.
- **Missing body**: subject-only is acceptable only for trivial one-liners; always add bullets when `git diff --cached` spans more than one file or concept.
- **Mixing unrelated changes**: stage and commit separately; one commit = one logical unit.
- **Omitting the Co-Authored-By footer**: include it whenever Claude participated in writing or reviewing the change.
- **Wrong footer format**: must be `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` — exact capitalisation and angle-bracket email.

## Checklist

- [ ] Type is one of the approved types
- [ ] Subject is imperative, ≤72 chars, no trailing period
- [ ] Blank line separates subject from body
- [ ] Each bullet covers one logical change
- [ ] Blank line separates body from footer
- [ ] `Co-Authored-By: {model name} {model version} <{email address}>` is present
- [ ] `git log -1 --pretty=fuller` looks correct
