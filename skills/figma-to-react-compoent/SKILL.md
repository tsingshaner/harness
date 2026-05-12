---
name: figma-to-react-component
description: Convert Figma node links into React + MCP-derived node data + @base-ui/react composable components. Supports Tailwind, CSS, and CSS Modules. Generates Playwright component tests after implementation; Vitest browser-mode unit tests after user acceptance unless the user opts out during the question phase.
origin: local
---

# /figma-to-react-component

Convert a Figma node link into a React + MCP-derived node data + @base-ui/react composable component. Styling can use Tailwind CSS, plain CSS, or CSS Modules (`*.module.css`) based on project conventions. After generating the component, write Playwright component tests. Once the user accepts the component, write Vitest browser-mode unit tests **unless** the user chose to skip unit tests when asked in Step 3.

## Usage

```bash
/figma-to-react-component <figma-node-link>
```

## When to Activate

- User provides a Figma node link and wants a matching React component
- Building UI from design handoff
- Need to translate Figma designs into @base-ui/react composable patterns

## Workflow

### Step 1: Parse the Figma Node Link

Extract the file key and node ID from the provided Figma URL.

Figma URL patterns:
- `https://www.figma.com/design/{fileKey}/...?node-id={nodeId}`
- `https://www.figma.com/file/{fileKey}/...?node-id={nodeId}`

If the URL is malformed or missing required parts, ask the user to re-share the link.

### Step 2: Fetch Node Details via Figma MCP (Mandatory)

Node details must be fetched through Figma MCP tools only (for example `get_design_context`, `get_metadata`, `get_screenshot` when needed). Do not use Figma REST/OpenAPI directly and do not request personal access tokens as a fallback path.

If MCP is unavailable or unauthenticated, stop implementation and ask the user to complete MCP authentication/connection first.

Analyze the returned JSON carefully:
- Node type (FRAME, GROUP, RECTANGLE, TEXT, COMPONENT, INSTANCE, etc.)
- Absolute bounding box and layout properties
- Fills, strokes, effects, corner radius
- Typography (font family, size, weight, line height)
- Children and their hierarchy
- Auto-layout properties (if available in `layoutMode`, `primaryAxisAlignItems`, etc.)

### Step 2.5: Detect Large Node Mode (Mandatory)

If any of the following conditions is met, you must enter **Large Node Mode**:
- Direct child count > 20
- Estimated generated code size > 400 lines
- At least 3 semantic regions (e.g., header/content/sidebar/footer)
- Repeated structures appear at least twice (cards, list rows, form rows)

In Large Node Mode:
- Do not generate a single monolithic component in one pass.
- Do not skip decomposition planning.
- You must ask for user confirmation of decomposition before implementation.

### Step 3: Determine Component Structure & Props

Based on the node analysis, decide:
1. Whether the node maps to a single component or a component with sub-parts
2. What props the component needs (e.g., `variant`, `size`, `disabled`, `children`)
3. Whether it should follow @base-ui/react composable patterns (recommended)
4. Which styling mode to use for this task: **Tailwind CSS** or **CSS Modules (`*.module.css`)**
5. Whether to write **Vitest browser-mode unit tests** (单测) for this component, or **skip** them

**Before writing any code**, present a proposed `Props` interface to the user. Example format:

```typescript
interface MyComponentProps {
  /** Visual variant */
  variant?: 'default' | 'primary' | 'destructive';
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Content to render inside */
  children?: React.ReactNode;
}
```

Ask the user these questions before coding:
1. "Does this Props interface look correct? Should I add, remove, or rename any props?"
2. "For styling, which do you want for this component: Tailwind CSS or CSS Modules?"
3. "Do you want Vitest browser-mode unit tests (`*.ct.test.tsx` style) for this component, or skip unit tests this time?"

Record the user's choice on unit tests. If they skip, do not write Vitest browser-mode tests (Step 7), do not require the 80% coverage gate for this component, and omit `*.ct.test.tsx` from subagent outputs for this task.

Wait for the user's confirmation or adjustments before proceeding.

### Step 3.5: Decomposition Plan First (Required in Large Node Mode)

Before writing any component code, output a decomposition plan containing:
1. Component tree (Container / Section / Leaf)
2. Responsibility and boundary of each component
3. Prop contract for each component (including `className`, `children`, and ref target type)
4. Shared style/token extraction points
5. Parallel task graph (what can be implemented independently)

Ask:
> "Does this decomposition look correct? Should I adjust component boundaries or naming before implementation?"

Only proceed after user confirmation.

### Step 4: Generate the React Component

Use the confirmed props to generate the component with these constraints:

#### Tech Stack
- **React** with TypeScript (`.tsx`)
- **Styling strategy determined from project conventions**:
  - Tailwind CSS
  - Plain CSS (`.css`)
  - CSS Modules (`*.module.css`)
- **@base-ui/react** for composable primitives (when applicable)

If the user explicitly selected a styling mode in Step 3, follow the user's selection first.

#### @base-ui/react Composable Style
- Prefer compound component patterns where it makes sense:
  ```tsx
  <Tabs.Root>
    <Tabs.List>
      <Tabs.Tab />
    </Tabs.List>
    <Tabs.Panel />
  </Tabs.Root>
  ```
- Export individual parts so consumers can compose them freely.
- Keep presentational components stateless when possible; let @base-ui/react handle behavior.
- Use `forwardRef` and spread rest props to maintain composability.

#### Implementation Rules
- Determine and follow the dominant styling pattern in the target project. If the project already uses CSS Modules, prefer `*.module.css`; if it uses plain CSS, use `.css`; if it uses Tailwind, use utility classes.
- Map Figma colors to project tokens/CSS variables and then to the selected styling approach. Do not hardcode arbitrary hex values unless necessary.
- Use exact or nearest project spacing, sizing, and typography tokens.
- Preserve the visual hierarchy from Figma (z-index, flex direction, gaps, padding).
- Add `className` prop support so callers can override styles.
- Keep files under 400 lines; split into sub-component files if the design is complex.
- Place the component in `src/components/` or the project's conventional component directory.

#### Design Variable Priority (Mandatory)
- Always use this style priority order:
  1. Figma/CSS design variables (`var(--token-name)`)
  2. Project design tokens
  3. Selected styling fallback (Tailwind utility / CSS variable / module class fallback, based on project conventions)
- Do not hardcode raw hex/rgb/hsl values unless explicitly approved by the user.
- Do not hardcode raw typography and spacing literals unless explicitly approved by the user.
- For every major visual property (color, typography, spacing, radius, shadow), ensure one semantic source of truth (no mixed token + literal style for the same semantic role).

#### Token Mapping Contract (Before Coding)
- Before implementation, output a token mapping table:
  - `figmaToken -> projectToken -> fallback (if needed)`
- Any unmapped token must be listed separately and confirmed by the user before coding.
- If token mapping is incomplete, pause implementation and ask whether to:
  - create missing project tokens, or
  - use temporary fallback classes.

### Step 4.5: Parallel Subagent Execution (Large Node Mode)

When decomposition yields 2 or more independent components, subagents must be used in parallel.

#### Parallelization Eligibility
Only parallelize tasks that satisfy all:
- No cyclic dependency between components
- No shared mutable state
- Communication only through typed props
- Style source is unified (Tailwind utilities and/or shared token mapping)

#### Main Agent Responsibilities
1. Create shared contracts first (`types.ts`, root exports, token mapping notes)
2. Create task briefs for each subagent (input, constraints, expected outputs)
3. Launch subagents in parallel for independent components
4. Integrate outputs in container/root component
5. Run full test suite and fix integration regressions (exclude Vitest browser-mode tests if the user skipped unit tests in Step 3)

#### Subagent Task Brief Template
- Component: `<ComponentName>`
- Input: design fragment summary + target props + visual constraints
- Must:
  - TypeScript + project-convention styling (Tailwind or CSS or CSS Modules)
  - `className` merge support
  - root `forwardRef`
  - stateless by default unless explicitly required
- Output:
  - `<ComponentName>.tsx`
  - `<ComponentName>.ct.test.tsx` (omit if the user skipped Vitest unit tests in Step 3)
  - self-check notes (a11y, states, edge cases)

### Step 5: Write Playwright Component Tests

Immediately after generating the component, create Playwright component tests that verify visual correctness and interaction.

Test file location: alongside the component or in `tests/components/` depending on project conventions.

Minimum test coverage:
1. **Render test**: component mounts without errors
2. **Visual regression / snapshot**: key states render correctly
3. **Interaction test**: user events (click, hover, focus) produce expected outcomes
4. **Prop variants test**: different prop combinations render distinct visuals

Example:
```ts
import { test, expect } from 'vitest';
import { MyComponent } from './MyComponent';

test('renders default variant', async ({ mount }) => {
  const component = await mount(<MyComponent>Label</MyComponent>);
  await expect(component).toHaveScreenshot();
});

test('handles click', async ({ mount }) => {
  let clicked = false;
  const component = await mount(<MyComponent onClick={() => { clicked = true; }}>Click me</MyComponent>);
  await component.click();
  expect(clicked).toBe(true);
});
```

Run the tests. If they fail, fix the component or tests before moving on.

### Step 6: User Acceptance

Show the user:
- The generated component code
- The Playwright test results
- A brief summary of design decisions (e.g., "I mapped the 8px gap to `gap-2`")

Ask: "Does this component match your expectations? Any adjustments needed?"

Iterate based on feedback until the user confirms acceptance.

### Step 7: Write Vitest Browser-Mode Unit Tests

**Skip this step entirely** if the user chose to skip unit tests in Step 3.

After the user accepts the component, write unit tests using **Vitest in browser mode** (unless skipped).

Test file naming: prefer project convention first. In this repo, use `MyComponent.ct.test.tsx`.

#### Vitest Browser Conventions (Must Follow)
- Import `render` from `vitest-browser-react` and call it with `await`.
- Destructure queries from `await render(...)` (e.g., `getByRole`, `getByText`, `getByAltText`, `container`).
- Use `await expect.element(...)` for DOM assertions.
- For root class assertions, assert against `container.firstChild as HTMLElement`.
- Include explicit tests for both `className` merge behavior and `ref` forwarding to the root element.

Coverage targets (minimum 80%):
1. **Rendering assertions**: verify DOM output for each prop variant
2. **Accessibility assertions**: verify labels, roles, and focus behavior
3. **Event handling**: simulate user events and assert callbacks fire
4. **Ref forwarding**: ensure `ref` is attached to the correct element
5. **ClassName merging**: ensure custom classes are applied

Example:
```ts
import { describe, expect, vi } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { render } from 'vitest-browser-react';
import { MyComponent } from './MyComponent';

describe('MyComponent', (test) => {
  test('renders children', async () => {
    const { getByText } = await render(<MyComponent>Hello</MyComponent>);
    await expect.element(getByText('Hello')).toBeInTheDocument();
  });

  test('applies custom className to root', async () => {
    const { container } = await render(<MyComponent className="my-custom-class">Hello</MyComponent>);
    await expect.element(container.firstChild as HTMLElement).toHaveClass('my-custom-class');
  });

  test('handles click events', async () => {
    const onClick = vi.fn();
    const { getByText } = await render(<MyComponent onClick={onClick}>Click me</MyComponent>);
    await userEvent.click(getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('forwards ref', async () => {
    let refElement: HTMLDivElement | null = null;
    const { container } = await render(
      <MyComponent ref={(el) => { refElement = el; }}>
        Hello
      </MyComponent>
    );
    await expect.element(container.firstChild as HTMLElement).toBeInTheDocument();
    expect(refElement).toBeInstanceOf(HTMLDivElement);
  });
});
```

Run the Vitest browser tests. Fix any failures. Ensure coverage meets the 80% minimum (not required when Step 7 was skipped).

### Step 8: Merge Gates (Mandatory Before Delivery)

Before final delivery, all gates must pass:
- Type check, lint, and tests are green (if Vitest unit tests were skipped, they are not part of "tests green" for this deliverable)
- Each sub-component covers render + className merge + ref forwarding **in tests**, unless the user skipped unit tests—in that case, rely on Playwright component tests and manual verification as agreed
- Composed integration tests verify key text/roles/interactions (Playwright where applicable)
- No duplicated token definitions or hardcoded magic values
- Export surface is clean and consistent (`index.ts` or equivalent)
- No unapproved raw style literals for color/typography/spacing in component source

## Error Handling

- If Figma MCP fails to locate the node, verify the link, file key, and node ID with the user.
- If Figma MCP cannot read node data (permission/auth errors), ask the user to complete MCP auth/permissions and retry.
- If the node contains unsupported features (complex vectors, blurs, masks), warn the user and approximate with CSS or SVG where feasible.
- If Playwright is not installed, ask whether to install the required devDependencies before proceeding. If Vitest browser tests are needed (user did not skip in Step 3) and tooling is missing, ask whether to install before Step 7.
- If token mapping is missing or ambiguous, stop and ask the user for token mapping decisions.

## Deliverable Checklist

- [ ] Props interface confirmed by user before implementation
- [ ] Styling mode confirmed by user in question phase (Tailwind CSS or CSS Modules)
- [ ] Unit test preference confirmed in question phase (write Vitest browser-mode tests or skip)
- [ ] Component styling follows project convention (Tailwind or CSS or CSS Modules)
- [ ] Component follows @base-ui/react composable conventions
- [ ] Playwright component tests exist and pass
- [ ] User has explicitly accepted the component
- [ ] Vitest browser-mode unit tests exist and pass **or** user explicitly skipped them in Step 3
- [ ] Test coverage is 80% or higher **or** Vitest unit tests were skipped (N/A for that gate)
- [ ] No hardcoded secrets or tokens in source code
- [ ] Large Node Mode was applied when required
- [ ] Decomposition plan was confirmed before coding
- [ ] Parallel subagent outputs were integrated and passed merge gates
- [ ] Design variable mapping table was produced and confirmed
- [ ] No unapproved raw style literals remain in implementation
- [ ] Figma node data was fetched via MCP tools only (no REST/OpenAPI fallback)
