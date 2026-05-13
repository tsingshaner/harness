#!/usr/bin/env -S pnpx tsx
/**
 * parse-report.ts — turn a `react-reviewer` Markdown report into a structured
 * task list that `review-resolver` can consume directly.
 *
 * Usage:
 *   npx tsx parse-report.ts <report.md>          # file arg
 *   cat report.md | npx tsx parse-report.ts      # stdin
 *
 * Output: JSON array on stdout, sorted block → major → minor, then by file:line.
 * Non-zero exit if no issues can be parsed.
 *
 * Parsing strategy:
 *   1. Prefer the ```jsonl``` machine-readable block (contract from react-reviewer).
 *   2. Fall back to the bulleted "Must fix" / "Should fix" lines using the strict
 *      per-issue format documented in `react-reviewer/SKILL.md`.
 */

import { readFileSync } from 'node:fs';

type Severity = 'block' | 'major' | 'minor';

interface Task {
  severity: Severity;
  file: string;
  line: number;
  criterion: number;
  title: string;
  fix?: string;
  rationale?: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { block: 0, major: 1, minor: 2 };

const SEVERITIES = new Set<Severity>(['block', 'major', 'minor']);

function isSeverity(value: unknown): value is Severity {
  return typeof value === 'string' && SEVERITIES.has(value as Severity);
}

function readInput(): string {
  const [, , arg] = process.argv;
  if (arg) {
    return readFileSync(arg, 'utf8');
  }
  return readFileSync(0, 'utf8');
}

function parseJsonlBlock(md: string): Task[] | null {
  const match = md.match(/```jsonl\s*\n([\s\S]*?)```/);
  if (!match) {
    return null;
  }
  const body = match[1].trim();
  if (!body) {
    return [];
  }

  const tasks: Task[] = [];
  const errors: string[] = [];

  body.split('\n').forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) {
      return;
    }
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      const task = coerceTask(parsed);
      if (task) {
        tasks.push(task);
      } else {
        errors.push(`line ${idx + 1}: invalid shape`);
      }
    } catch (err) {
      errors.push(`line ${idx + 1}: ${(err as Error).message}`);
    }
  });

  if (errors.length) {
    process.stderr.write(`parse-report: jsonl errors:\n  ${errors.join('\n  ')}\n`);
  }
  return tasks;
}

function coerceTask(input: Record<string, unknown>): Task | null {
  const { severity, file, line, criterion, title, fix, rationale } = input;
  if (!isSeverity(severity)) {
    return null;
  }
  if (typeof file !== 'string' || !file) {
    return null;
  }
  if (typeof line !== 'number' || !Number.isInteger(line) || line < 1) {
    return null;
  }
  if (typeof criterion !== 'number' || criterion < 1 || criterion > 7) {
    return null;
  }
  if (typeof title !== 'string' || !title) {
    return null;
  }

  return {
    severity,
    file,
    line,
    criterion,
    title,
    fix: typeof fix === 'string' ? fix : undefined,
    rationale: typeof rationale === 'string' ? rationale : undefined
  };
}

// Fallback: `<index>. [<severity>] <file>:<line> — <title> — <rationale> (criterion <N>)`
// Em-dash (U+2014) is the canonical separator; we accept `-` and `–` defensively.
const FALLBACK_RE =
  /^\s*\d+\.\s*\[(block|major|minor)\]\s+(\S+?):(\d+)\s+[—\-–]\s+(.+?)\s+[—\-–]\s+(.+?)\s*\(criterion\s+([1-7])\)\s*$/gim;

function parseBulleted(md: string): Task[] {
  const tasks: Task[] = [];
  let match: RegExpExecArray | null;
  FALLBACK_RE.lastIndex = 0;
  while ((match = FALLBACK_RE.exec(md))) {
    const [, severity, file, line, title, rationale, criterion] = match;
    if (!isSeverity(severity)) {
      continue;
    }
    tasks.push({
      severity,
      file,
      line: Number(line),
      criterion: Number(criterion),
      title: title.trim(),
      rationale: rationale.trim()
    });
  }
  return tasks;
}

function dedupe(tasks: Task[]): Task[] {
  const byKey = new Map<string, Task>();
  for (const t of tasks) {
    const key = `${t.file}:${t.line}:${t.criterion}`;
    const prev = byKey.get(key);
    if (!prev || SEVERITY_ORDER[t.severity] < SEVERITY_ORDER[prev.severity]) {
      byKey.set(key, t);
    }
  }
  return [...byKey.values()];
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.criterion - b.criterion
  );
}

function main(): void {
  const input = readInput();
  const jsonl = parseJsonlBlock(input);
  const tasks = jsonl && jsonl.length ? jsonl : parseBulleted(input);

  if (!tasks.length) {
    process.stderr.write('parse-report: no issues parsed. Expected a ```jsonl block or strict bulleted lines.\n');
    process.exit(1);
  }

  const ordered = sortTasks(dedupe(tasks));
  process.stdout.write(`${JSON.stringify(ordered, null, 2)}\n`);
}

main();
