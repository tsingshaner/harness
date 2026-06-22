---
name: ui-component-design
description: Guide reusable React UI component design. Use when creating, reviewing, or refactoring business-free UI primitives and compound components such as Button, Dialog, Tabs, Select, Menu, Combobox, DataTable, FormField, Card, or EmptyState; when designing props, controlled/uncontrolled state, data-part/data-scope/data-state attributes, ARIA semantics, composition APIs, Context boundaries, and styling hooks.
---

# UI Component Design

## Core Goal

Design reusable UI components that are business-free, composable, accessible, state-transparent, and predictable to style.

UI components should handle generic interaction, structure, style, accessibility, controlled/uncontrolled state, compound composition, and structural/state attributes. They should not know about business concepts.

## Component Declaration

Prefer declaring components as arrow functions assigned to a `const`, not `function` declarations.

Prefer:

```tsx
export const CardRoot = (props: CardRootProps) => {
  return <div data-scope="card" data-part="root" {...props} />;
};
```

Avoid:

```tsx
export function CardRoot(props: CardRootProps) {
  return <div data-scope="card" data-part="root" {...props} />;
}
```

## Headless Primitive Libraries First

Before implementing interaction, focus management, keyboard handling, or ARIA wiring from scratch, check whether the project already has a headless/unstyled primitive library installed: Radix UI (`@radix-ui/react-*`), Base UI (`@base-ui/react`), or Zag.js (`@zag-js/*`, `zag-js`).

If one is installed, prefer building the component as a thin composition over that library's primitive instead of reimplementing behavior it already provides:

```tsx
import * as Dialog from "@radix-ui/react-dialog";

export const Modal = ({ open, defaultOpen, onOpenChange, children }: ModalProps) => {
  return (
    <Dialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay data-scope="modal" data-part="overlay" />
        <Dialog.Content data-scope="modal" data-part="content">{children}</Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
```

Rules:

- Detect the installed library from `package.json` or existing imports before choosing an implementation approach. Do not add a new primitive library when a suitable one is already present.
- Keep this project's own conventions (root/part naming, `data-part`/`data-scope`/`data-state`, controlled/uncontrolled prop shape) at the wrapper layer even when delegating behavior to the primitive.
- Only hand-roll interaction/ARIA/focus logic when no installed library covers that component, or the project has no headless library installed at all.
- Do not introduce a second headless library alongside an existing one (e.g. adding Base UI to a Radix-based project) without an explicit reason from the user.

## Boundary Rules

UI components may own:

- Generic interaction
- Generic structure
- Generic styling hooks
- Accessibility semantics
- Controlled and uncontrolled state
- Compound component composition
- `data-part`, `data-state`, and ARIA attributes

UI components must not depend on:

- Business APIs
- Business hooks
- Query or mutation objects
- Route parameters
- Permission logic
- Concrete business entities

Prefer:

```tsx
<Button loading={loading}>{children}</Button>
```

Avoid:

```tsx
<Button loading={createAgentMutation.isPending}>
  Create Agent
</Button>
```

Business-specific loading, entity names, permissions, and handlers should be adapted by Page, Feature, or Model/Hook layers before reaching the UI component.

## Composition First

Prefer composable APIs for complex components. Use root/part naming that describes the component structure, not business meaning or visual output.

Good UI component examples:

- `Button`
- `Dialog`
- `Tabs`
- `Select`
- `Card`
- `DataTable`
- `FormField`
- `EmptyState`

Use compound components when it improves clarity:

```tsx
<Card.Root>
  <Card.Header>
    <Card.Title>Title</Card.Title>
  </Card.Header>
  <Card.Content>Content</Card.Content>
</Card.Root>
```

Avoid large one-shot components with many styling props when named parts or composition would be clearer.

## Data Attributes

Whether a component needs `data-part`/`data-scope` depends on the styling approach.

### CSS or CSS Modules: use `data-scope` + `data-part`

When styling with plain CSS or CSS Modules, expose `data-scope` (the component namespace) and `data-part` (the structural part) so selectors can target structure without relying on generated class hashes or business-specific class names. `data-scope` prevents part-name collisions across components that share part names like `trigger` or `content`.

```tsx
export const CardRoot = (props: CardRootProps) => {
  return <div data-scope="card" data-part="root" {...props} />;
};

export const CardHeader = (props: CardHeaderProps) => {
  return <div data-scope="card" data-part="header" {...props} />;
};

export const CardContent = (props: CardContentProps) => {
  return <div data-scope="card" data-part="content" {...props} />;
};
```

Expose state where styling or testing needs it:

```tsx
<button
  data-scope="dialog"
  data-part="trigger"
  data-state={open ? "open" : "closed"}
  aria-expanded={open}
>
  {children}
</button>
```

Style through scope, structural, and state selectors:

```css
[data-scope="dialog"][data-part="trigger"][data-state="open"] {
  color: var(--color-primary);
}

[data-scope="card"][data-part="content"] {
  padding: 12px;
}
```

### Tailwind CSS: skip `data-part`/`data-scope`

When styling with Tailwind, utility classes are applied directly on each element, so attribute selectors for structure are unnecessary — omit `data-part` and `data-scope`. Express structure through composition (separate components/slots) instead.

Still expose `data-state` when behavior or testing needs it; Tailwind can style off it directly with data-attribute variants:

```tsx
<button
  data-state={open ? "open" : "closed"}
  aria-expanded={open}
  className="text-muted-foreground data-[state=open]:text-primary"
>
  {children}
</button>
```

Prefer part names such as:

- `root`
- `trigger`
- `content`
- `item`
- `indicator`
- `header`
- `body`
- `footer`
- `label`
- `description`

Avoid part names that encode business concepts, visual results, or implementation noise:

- `agent-list-create-button-wrapper-inner`
- `red-title`
- `left-box`

## Controlled / Uncontrolled State

For stateful UI components, support controlled and uncontrolled usage when both modes are useful.

Use the standard prop shape:

```tsx
type DialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};
```

Implement controlled state without suppressing change callbacks:

```tsx
const Dialog = (props: DialogProps) => {
  const [internalOpen, setInternalOpen] = useState(props.defaultOpen ?? false);
  const open = props.open ?? internalOpen;

  const setOpen = (nextOpen: boolean) => {
    props.onOpenChange?.(nextOpen);
    if (props.open === undefined) {
      setInternalOpen(nextOpen);
    }
  };

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {props.children}
    </DialogContext.Provider>
  );
};
```

Apply this pattern to components like Dialog, Tabs, Select, Menu, Combobox, Tree, DataTable, and Form controls.

## ARIA And Semantics

Use semantic HTML first, then add ARIA only when it communicates real semantics or state.

Rules:

- Keep `aria-*` accurate and synchronized with component state.
- Do not add ARIA purely as a styling hook.
- Prefer native elements when they provide the correct behavior.
- Connect labels, descriptions, controls, and errors with the proper attributes.
- Make keyboard behavior match the component role.

When a `data-state` value and an ARIA attribute describe the same state, keep them consistent.

## Context Boundaries

Use Context inside complex UI components when it reduces prop drilling and supports composition.

Context is appropriate for:

- Tabs
- Dialog
- Select
- Menu
- Combobox
- Tree
- DataTable
- Form

Avoid putting all state into one large Context object:

```tsx
const TabsContext = createContext({
  value,
  setValue,
  items,
  disabled,
  orientation,
  size,
  className,
});
```

Prefer narrower contexts or selector-style access:

```tsx
const TabsValueContext = createContext(...);
const TabsActionsContext = createContext(...);
const TabsConfigContext = createContext(...);

const value = useTabsContext((state) => state.value);
```

Keep context updates scoped so one state change does not re-render the whole component tree unnecessarily.

## Props Design

Keep UI props generic and component-focused.

Prefer:

- `open`
- `defaultOpen`
- `onOpenChange`
- `value`
- `defaultValue`
- `onValueChange`
- `disabled`
- `loading`
- `children`
- `aria-label`
- `data-*`

Avoid business props in reusable UI components:

- `agentId`
- `projectId`
- `canCreateAgent`
- `createAgentMutation`
- `apiKeyStatus`

Avoid exposing many one-off styling props. Prefer composition, slots, part attributes, CSS variables, or the project's established styling extension mechanism.

## AI Coding Rules

When generating or modifying UI components:

- Keep the component business-free.
- Check for an installed headless primitive library (Radix UI, Base UI, Zag.js) and prefer composing it over reimplementing interaction/ARIA/focus logic.
- Declare components as arrow functions assigned to `const` (e.g. `export const CardRoot = (props) => {...}`), not `function` declarations.
- Prefer TypeScript, React function components, hooks, composition, semantic HTML, and accessible attributes.
- With CSS or CSS Modules, use `data-scope` + `data-part` to describe structure; with Tailwind, omit them and express structure through composition.
- Use `data-state` to describe state, regardless of styling approach.
- Keep ARIA meaningful and true.
- Support controlled/uncontrolled state for complex stateful components.
- Use Context carefully and split it when broad updates would cause unnecessary renders.
- Avoid meaningless wrappers, magic strings scattered across files, and large style-prop APIs.
- If a reusable UI component starts calling business hooks or APIs, move that logic into a Feature or Model/Hook layer.

## Final Check

Before finishing UI component work, verify:

- The component has no business dependency.
- Components are declared as arrow functions, not function declarations.
- An installed headless primitive library (Radix UI/Base UI/Zag.js) was reused via composition where applicable, rather than reimplemented.
- Props are generic and stable.
- Composition is clear.
- `data-part`/`data-scope` are present and describe structure when styling with CSS or CSS Modules, and absent when styling with Tailwind.
- `data-state` values describe state.
- ARIA attributes express real semantics.
- Controlled and uncontrolled behavior is predictable.
- Context updates are scoped.
- Styling hooks are sufficient without leaking business concepts.
