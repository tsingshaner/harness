---
name: changeset-add
description: >-
  Create an empty changeset with `pnpm changeset --empty`, fill in frontmatter
  and release notes from your git changes, then commit with your code. Use when
  interactive `pnpm changeset` fails (e.g. enquirer/readline `ERR_USE_AFTER_CLOSE`)
  or is unavailable in non-interactive environments.
---

# Empty changeset workflow

In non-interactive environments (IDE-integrated terminals, CI, no TTY), `pnpm changeset` often fails with enquirer/readline errors (e.g. `ERR_USE_AFTER_CLOSE`). Use **`pnpm changeset --empty`** to create an empty file first, then edit it by hand and commit.

## When to use this

- You need a new changeset, but interactive `pnpm changeset` fails or is not available.
- You already have code changes and want the changeset to match `git diff` / staged content.

## Steps

### 1. Create an empty changeset

From the project root:

```bash
pnpm changeset --empty
```

The terminal prints the new file path, e.g. `.changeset/<random-slug>.md`. It usually starts as:

```markdown
---
---
```

### 2. Fill in the Markdown (Changesets format)

Open that file. Set the frontmatter to a **package name → semver bump** map, and write user-facing release notes in the body (they end up in the CHANGELOG).

**Single-package example** (use the exact `name` from the repo’s `package.json`):

```markdown
---
"@scope/package-name": patch
---

- First user-facing change (English or match your repo’s CHANGELOG style).
- Second change…
```

**Bump level (quick reference)**

- `patch`: fixes, docs, internal config that does not affect the public API, typos / ignore paths, etc.
- `minor`: backward-compatible features, or dependency bumps you treat as a minor release.
- `major`: breaking changes.

Before editing, align with:

```bash
git status
git diff
git diff --cached
```

Keep bullets consistent with **what you actually commit**. If one commit mixes tooling config with shipped artifacts (e.g. an exported `cspell.yaml`), call those out separately in the notes.

### 3. Stage and commit

```bash
git add .changeset/<slug>.md
# If you have unstaged code changes, add those too
git commit -m "chore: <short subject>"
```

**GPG signing**: if you see `gpg: signing failed` or pinentry is unavailable, you can temporarily use:

```bash
git commit --no-gpg-sign -m "..."
```

Fix GPG locally, then run `git commit --amend --no-edit -S` if you need a signed commit.

## Checklist

- Frontmatter is valid YAML; package names match `package.json` `name` exactly (including scope).
- Each bump is `patch`, `minor`, or `major`, and matches the nature of the change.
- The body has at least one user-readable line (a list is fine).

## Anti-patterns

- Committing with empty frontmatter `---\n---` still unfilled (the changeset is invalid).
- Notes that do not match `git diff` (misleading release notes).
