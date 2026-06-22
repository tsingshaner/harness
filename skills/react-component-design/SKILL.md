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

## Component Declaration

Prefer declaring components as arrow functions assigned to a `const`, not `function` declarations.

Prefer:

```tsx
export const AgentPage = () => {
  const { projectId } = Route.useParams();

  return (
    <PageLayout>
      <AgentListFeature projectId={projectId} />
    </PageLayout>
  );
};
```

Avoid:

```tsx
export function AgentPage() {
  const { projectId } = Route.useParams();

  return (
    <PageLayout>
      <AgentListFeature projectId={projectId} />
    </PageLayout>
  );
}
```

This applies to Page, Feature, and UI components. Model/Hook functions may keep either form, but stay consistent within a file.

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
export const AgentPage = () => {
  const { projectId } = Route.useParams();

  return (
    <PageLayout>
      <PageHeader title="Agent Management" />
      <AgentListFeature projectId={projectId} />
      <CreateAgentFeature projectId={projectId} />
    </PageLayout>
  );
};
```

Avoid:

```tsx
export const AgentPage = () => {
  const [selectedId, setSelectedId] = useState<string>();
  const agentsQuery = useQuery(...);
  const createMutation = useMutation(...);

  const handleCreate = async () => {
    // complex business logic
  };

  return <div>...</div>;
};
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
export const AgentListFeature = (props: AgentListFeatureProps) => {
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
};
```

### Avoid Over-Lifting State

Keep a Feature's own state local to the Feature (or its Model hook) by default. Do not lift state up to a Page or a parent Feature preemptively for hypothetical flexibility or to make the Feature "more reusable" — only lift it when there is a real coordination need between two or more Features.

Avoid:

```tsx
export const AgentPage = () => {
  const [selectedId, setSelectedId] = useState<string>();

  return (
    <PageLayout>
      <AgentListFeature selectedId={selectedId} onSelectedIdChange={setSelectedId} />
    </PageLayout>
  );
};
```

Prefer:

```tsx
export const AgentPage = () => {
  return (
    <PageLayout>
      <AgentListFeature projectId={projectId} />
    </PageLayout>
  );
};

export const AgentListFeature = (props: AgentListFeatureProps) => {
  const model = useAgentListModel(props); // selectedId stays here
  return <AgentListView agents={model.agents} selectedId={model.selectedId} onSelect={model.selectAgent} />;
};
```

Lift state only when, for example, a list Feature and a detail Feature both genuinely need the same `selectedId` — and prefer lifting it to the nearest Feature-level coordinator rather than jumping straight to the Page.

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

### useXxxModel Return Value Conventions

- Do not keep a flat return object as the long-term shape. A flat return is fine for a small model, but it stops scaling once the model grows.
- Once the return value exceeds about 10 fields, group fields by business domain instead of leaving them flat.
- Once handlers exceed about 8, split them into an `actions`/`commands` group, or extract a sub-model.
- State used only by one local/child component should not live in the main model — keep it local to that component.
- Prefer having the main model compose sub-models over re-flattening every field from each sub-model back into one object.
- Child components should receive their corresponding domain model directly (e.g. `tabs`, `list`, `permissionScope`, `actions`), not individual fields plucked out of it.

Avoid (flat return mixing every domain into one object):

```tsx
export const useAgentDetailModel = (props: AgentDetailFeatureProps) => {
  // ...
  return {
    agent,
    loading,
    error,
    tabs,
    activeTab,
    setActiveTab,
    items,
    itemsLoading,
    selectedItemId,
    selectItem,
    canEdit,
    canDelete,
    canInvite,
    deleteAgent,
    inviteMember,
  };
};
```

Prefer (grouped by domain, composed from sub-models):

```tsx
export const useAgentDetailModel = (props: AgentDetailFeatureProps) => {
  const { agent, loading, error } = useAgentQueryModel(props);
  const tabs = useAgentTabsModel(props);
  const list = useAgentItemListModel(props);
  const permissionScope = useAgentPermissionScopeModel(props);
  const actions = useAgentActionsModel(props);

  return { agent, loading, error, tabs, list, permissionScope, actions };
};
```

Pass each sub-model straight to its matching child instead of unpacking it into loose props:

```tsx
<AgentDetailView
  agent={model.agent}
  tabs={model.tabs}
  list={model.list}
  permissionScope={model.permissionScope}
  actions={model.actions}
/>
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

## Type Exports

Only export types that another module actually needs to import. Keep `Props` types and other internal types unexported by default; export a type only when a consumer (a parent composing the component, a test, or another layer) needs it.

Prefer:

```tsx
type AgentListFeatureProps = {
  projectId: string;
};

export const AgentListFeature = (props: AgentListFeatureProps) => {
  // ...
};
```

Avoid exporting every type "just in case":

```tsx
export type AgentListFeatureProps = {
  projectId: string;
};

export type AgentListItem = {
  id: string;
  name: string;
};
```

An intentionally small public surface makes it easier to change internal shapes without breaking other files.

## Placement Decision

Place code in Page when it owns page layout, route params, permission boundaries, or Feature composition.

Place code in Feature when it owns a business function, business state, workflow, API coordination, or multiple UI components for one scenario.

Place code in Model/Hook when it owns complex state, derived data, event handling, query/mutation aggregation, or form workflow.

Place code in UI Components when it is business-independent, reusable across features, controlled by props, and only expresses generic interaction, semantics, and style.

## AI Coding Rules

When generating or modifying React components:

- Keep Page components lightweight.
- Move complex Feature logic into `useXxxModel`.
- Keep `useXxxModel` return values grouped by domain once they exceed about 10 fields or 8 handlers, composing sub-models instead of flattening everything; keep child-local state out of the main model.
- Keep Feature state local to the Feature/Model layer; do not lift it to a parent Page or Feature without a real coordination need.
- Do not export types that aren't needed by another module; keep `Props` and internal types unexported unless a consumer needs them.
- Declare Page, Feature, and UI components as arrow functions assigned to `const` (e.g. `export const AgentPage = () => {...}`), not `function` declarations.
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
- `useXxxModel` return values are grouped by domain (not flat) once they grow large, and child-only state stays out of the main model.
- UI components are business-free.
- Props express the correct layer boundary.
- Duplicate business logic is removed or intentionally kept local.
- Feature state is not lifted to a parent component without a real coordination need.
- Types are exported only when another module needs them.
- Components are declared as arrow functions, not function declarations.
- The result is practical to test.
