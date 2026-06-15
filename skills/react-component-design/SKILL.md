---
name: react-component-design
description: Guide React component architecture and refactoring. Use when creating, reviewing, or modifying React components, pages, features, hooks, or state flows; when deciding whether code belongs in Page, Feature, Model/Hook, or UI layers; when a component is too large; or when business logic, query/mutation logic, forms, dialogs, and reusable UI are mixed together.
---

# React Component Design

## Core Goal

Design React code so pages stay light, business workflows are explicit, complex logic is testable, and reusable UI components remain business-free.

Prefer this component layering:

```txt
Page
  -> Feature
  -> Model / Hook
  -> UI Components
```

## Page Components

Use Page components for routing entry points and page composition.

Pages may handle:

- Page layout
- Route parameter reading
- Permission boundaries
- ErrorBoundary and Suspense boundaries
- Page title and metadata
- Composition of multiple Features

Keep Pages thin. Do not put complex business state, request mutation logic, form state, heavy `useMemo`, or business workflow orchestration in a Page.

Prefer:

```tsx
export function AgentPage() {
  const { projectId } = Route.useParams();

  return (
    <PageLayout>
      <PageHeader title="Agent Management" />
      <AgentListFeature projectId={projectId} />
      <CreateAgentFeature projectId={projectId} />
    </PageLayout>
  );
}
```

Avoid:

```tsx
export function AgentPage() {
  const [selectedId, setSelectedId] = useState<string>();
  const agentsQuery = useQuery(...);
  const createMutation = useMutation(...);

  const handleCreate = async () => {
    // complex business logic
  };

  return <div>...</div>;
}
```

## Feature Components

Use Feature components for complete business scenarios or modules, such as `AgentListFeature`, `CreateAgentFeature`, `TranslationTableFeature`, or `ApiKeyManagementFeature`.

Features may handle:

- Business state
- Business workflow orchestration
- Business hooks
- Query and mutation composition
- UI component composition
- Business event handlers
- Model/Hook layer calls

Feature props should express business boundaries, not styling details.

Prefer:

```tsx
<AgentListFeature projectId={projectId} />
<CreateAgentFeature defaultModel="auto" />
```

Avoid:

```tsx
<AgentListFeature
  buttonSize="sm"
  itemClassName="px-2 py-1"
  titleClassName="text-red-500"
/>
```

When a Feature becomes large or starts combining requests, state, forms, dialogs, and list rendering, extract a `useXxxModel` hook and usually a presentational view component.

Prefer:

```tsx
export function AgentListFeature(props: AgentListFeatureProps) {
  const model = useAgentListModel(props);

  return (
    <AgentListView
      agents={model.agents}
      loading={model.loading}
      selectedId={model.selectedId}
      onSelect={model.selectAgent}
      onRefresh={model.refresh}
    />
  );
}
```

## Model / Hook Layer

Use Model/Hook code for complex state, derived data, event handlers, and business workflow. This keeps Features readable and makes behavior easier to test.

Model hooks may handle:

- Complex state management
- Query and mutation aggregation
- Derived data
- Event handlers
- Form state
- Business workflows
- Loading and error state normalization

Do not return JSX from Model hooks.

Prefer:

```tsx
export function useAgentListModel(props: AgentListFeatureProps) {
  const [selectedId, setSelectedId] = useState<string>();
  const agentsQuery = useAgentsQuery({ projectId: props.projectId });

  const agents = useMemo(() => {
    return agentsQuery.data?.data ?? [];
  }, [agentsQuery.data]);

  const selectAgent = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const refresh = useCallback(() => {
    return agentsQuery.refetch();
  }, [agentsQuery]);

  return {
    agents,
    loading: agentsQuery.isPending,
    error: agentsQuery.error,
    selectedId,
    selectAgent,
    refresh,
  };
}
```

Avoid:

```tsx
const element = useAgentListModel(props);
return element;
```

## UI Component Boundary

Treat UI components as reusable, business-free building blocks. They should handle structure, interaction, style, accessibility, composition, and generic controlled/uncontrolled state. They must not depend on business APIs, business hooks, query/mutation state, routing, permissions, or concrete business entities.

When the task focuses on reusable UI component API design, controlled/uncontrolled behavior, `data-part`, `data-state`, ARIA, or compound components, also use `$ui-component-design`.

## Directory Guidance

For medium and large projects, prefer:

```txt
src/
  pages/
    agent/
      page.tsx
  features/
    agent-list/
      index.ts
      agent-list-feature.tsx
      agent-list-view.tsx
      use-agent-list-model.ts
    create-agent/
      index.ts
      create-agent-feature.tsx
      create-agent-form.tsx
      use-create-agent-model.ts
  entities/
    agent/
      api.ts
      query-options.ts
      types.ts
  shared/
    ui/
      button/
      dialog/
      tabs/
      card/
    hooks/
    lib/
```

For small projects, keep the same boundaries with fewer folders:

```txt
src/
  pages/
  features/
  components/
    ui/
  hooks/
  services/
```

## Naming

Use names that reveal the layer:

- Page: `AgentPage`, `TranslationPage`, `ApiKeyPage`
- Feature: `AgentListFeature`, `CreateAgentFeature`, `TranslationTableFeature`
- Model/Hook: `useAgentListModel`, `useCreateAgentModel`, `useTranslationTableModel`
- UI Components: `Button`, `Dialog`, `Tabs`, `Card`, `Select`, `DataTable`

## Placement Decision

Place code in Page when it owns page layout, route params, permission boundaries, or Feature composition.

Place code in Feature when it owns a business function, business state, workflow, API coordination, or multiple UI components for one scenario.

Place code in Model/Hook when it owns complex state, derived data, event handling, query/mutation aggregation, or form workflow.

Place code in UI Components when it is business-independent, reusable across features, controlled by props, and only expresses generic interaction, semantics, and style.

## AI Coding Rules

When generating or modifying React components:

- Keep Page components lightweight.
- Move complex Feature logic into `useXxxModel`.
- Do not put business API calls, business hooks, routing, or permission logic into reusable UI components.
- Prefer TypeScript, React function components, hooks, composition, semantic HTML, and accessible attributes.
- Do not create abstractions too early; first make boundaries clear.
- Consider splitting components over about 150 lines, especially when one component combines requests, state, forms, dialogs, and list rendering.
- Avoid class components, huge components, meaningless wrappers, large style-prop pass-through APIs, and scattered magic strings.

## Final Check

Before finishing component work, verify:

- Page is thin.
- Feature expresses one business function.
- Complex logic is in a Model/Hook.
- UI components are business-free.
- Props express the correct layer boundary.
- Duplicate business logic is removed or intentionally kept local.
- The result is practical to test.
