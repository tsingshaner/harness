---
name: ui-component-design
description: Guide reusable React UI component design. Use when creating, reviewing, or refactoring business-free UI primitives and compound components such as Button, Dialog, Tabs, Select, Menu, Combobox, DataTable, FormField, Card, or EmptyState; when designing props, controlled/uncontrolled state, data-part/data-state attributes, ARIA semantics, composition APIs, Context boundaries, and styling hooks.
---

# UI Component Design

## Core Goal

Design reusable UI components that are business-free, composable, accessible, state-transparent, and predictable to style.

UI components should handle generic interaction, structure, style, accessibility, controlled/uncontrolled state, compound composition, and structural/state attributes. They should not know about business concepts.

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

Expose component structure and state with `data-part` and `data-state` for complex UI components.

Prefer structural parts:

```tsx
export function CardRoot(props: CardRootProps) {
  return <div data-part="root" {...props} />;
}

export function CardHeader(props: CardHeaderProps) {
  return <div data-part="header" {...props} />;
}

export function CardContent(props: CardContentProps) {
  return <div data-part="content" {...props} />;
}
```

Expose state where styling or testing needs it:

```tsx
<button
  data-part="trigger"
  data-state={open ? "open" : "closed"}
  aria-expanded={open}
>
  {children}
</button>
```

Style through structural and state selectors:

```css
[data-part="trigger"][data-state="open"] {
  color: var(--color-primary);
}

[data-part="content"] {
  padding: 12px;
}
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
function Dialog(props: DialogProps) {
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
}
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
- Prefer TypeScript, React function components, hooks, composition, semantic HTML, and accessible attributes.
- Use `data-part` to describe structure.
- Use `data-state` to describe state.
- Keep ARIA meaningful and true.
- Support controlled/uncontrolled state for complex stateful components.
- Use Context carefully and split it when broad updates would cause unnecessary renders.
- Avoid meaningless wrappers, magic strings scattered across files, and large style-prop APIs.
- If a reusable UI component starts calling business hooks or APIs, move that logic into a Feature or Model/Hook layer.

## Final Check

Before finishing UI component work, verify:

- The component has no business dependency.
- Props are generic and stable.
- Composition is clear.
- `data-part` names describe structure.
- `data-state` values describe state.
- ARIA attributes express real semantics.
- Controlled and uncontrolled behavior is predictable.
- Context updates are scoped.
- Styling hooks are sufficient without leaking business concepts.
