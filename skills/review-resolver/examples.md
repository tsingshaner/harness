# Review Resolver — before / after examples

Two end-to-end walkthroughs for the most common findings from `react-reviewer`. Each example shows: the JSONL issue → planned change → before code → after code → verification notes.

---

## Example 1 — Criterion 1 (compound components)

### Issue (from `react-reviewer`)

```jsonl
{"severity":"block","file":"src/Card.tsx","line":1,"criterion":1,"title":"Card has 9 boolean/section props","fix":"Refactor to Card.Root + Card.Header/Content/Footer subparts"}
```

### Plan

- Scope: single file `src/Card.tsx`; public API changes (callers exist).
- API impact: `<Card title footer showHeader ... />` → `<Card.Root>` + named subparts. Add re-export `Card` as alias of `Card.Root` to keep import paths working.
- Test impact: existing render test asserts title/footer text; rewrite it against the new shape.

### Before

```tsx
// src/Card.tsx
interface CardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  bordered?: boolean;
  elevated?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}

export const Card = ({
  title, subtitle, icon, footer,
  showHeader = true, showFooter = true,
  bordered, elevated, compact,
  children,
}: CardProps) => (
  <div className={cn('card', { bordered, elevated, compact })}>
    {showHeader && (
      <div className="card-header">
        {icon}
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
    )}
    <div className="card-content">{children}</div>
    {showFooter && footer && <div className="card-footer">{footer}</div>}
  </div>
);
```

### After

```tsx
// src/Card.tsx
type Variant = 'default' | 'bordered' | 'elevated';

interface RootProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  compact?: boolean;
}

const Root = ({ variant = 'default', compact, className, ...rest }: RootProps) => (
  <div className={cn('card', `card--${variant}`, compact && 'card--compact', className)} {...rest} />
);

const Header = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('card-header', className)} {...rest} />
);

const Content = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('card-content', className)} {...rest} />
);

const Footer = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('card-footer', className)} {...rest} />
);

export const Card = { Root, Header, Content, Footer };
// Keep the old default export so existing imports do not break in the same PR.
export default Root;
```

### Caller before → after

```tsx
// before
<Card title="Profile" subtitle="Admin" footer={<Save />} bordered>
  …body…
</Card>

// after
<Card.Root variant="bordered">
  <Card.Header>
    <h3>Profile</h3>
    <p>Admin</p>
  </Card.Header>
  <Card.Content>…body…</Card.Content>
  <Card.Footer><Save /></Card.Footer>
</Card.Root>
```

### Verification notes

- `pnpm typecheck` after each call-site migration; do not skip callers.
- Update the snapshot/component test to assert against `card-header` / `card-content` / `card-footer` regions.
- Commit message: `refactor(card): compound API — Root + Header/Content/Footer`.

---

## Example 2 — Criterion 3 (logic in hooks)

### Issue (from `react-reviewer`)

```jsonl
{"severity":"major","file":"src/OrdersTable.tsx","line":18,"criterion":3,"title":"Component mixes fetch, filter, sort, and analytics effects","fix":"Extract useOrdersTable hook; component renders only"}
```

### Plan

- Scope: split `src/OrdersTable.tsx` into `OrdersTable.tsx` (view) + `useOrdersTable.ts` (logic).
- No public API change (same default export).
- Test impact: keep the existing render test; add a hook test for filter/sort behavior.

### Before

```tsx
// src/OrdersTable.tsx
const OrdersTable = ({ status }: { status: Status }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof Order>('createdAt');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOrders({ status }).then((data) => {
      if (cancelled) return;
      setOrders(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [status]);

  useEffect(() => {
    track('orders_table_viewed', { status });
  }, [status]);

  const visible = useMemo(
    () => orders
      .filter((o) => o.customer.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1)),
    [orders, query, sortKey],
  );

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading ? <Spinner /> : <Table rows={visible} onSort={setSortKey} />}
    </div>
  );
};

export default OrdersTable;
```

### After

```ts
// src/useOrdersTable.ts
export const useOrdersTable = (status: Status) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof Order>('createdAt');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOrders({ status }).then((data) => {
      if (cancelled) return;
      setOrders(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [status]);

  useEffect(() => {
    track('orders_table_viewed', { status });
  }, [status]);

  const visible = useMemo(
    () => orders
      .filter((o) => o.customer.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1)),
    [orders, query, sortKey],
  );

  return { loading, visible, query, setQuery, setSortKey };
};
```

```tsx
// src/OrdersTable.tsx
const OrdersTable = ({ status }: { status: Status }) => {
  const { loading, visible, query, setQuery, setSortKey } = useOrdersTable(status);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search orders" />
      {loading ? <Spinner /> : <Table rows={visible} onSort={setSortKey} />}
    </div>
  );
};

export default OrdersTable;
```

### Verification notes

- Add `useOrdersTable.test.ts` covering: initial load, filter, sort, cancellation on `status` change.
- `OrdersTable.test.tsx` keeps its render assertion; mock the hook in the view test if you want strict separation.
- Picked up a free criterion-6 fix on the way (`aria-label` on the search input); call it out in the summary as an opportunistic improvement.
- Commit message: `refactor(orders): extract useOrdersTable; thin OrdersTable view`.

---

## Patterns shared by both examples

- **One criterion per commit** when possible; bundle only when a single edit naturally clears two (e.g. extracting a hook and adding an `aria-label` on the same input).
- **Preserve old imports for one release** when you change public shape — re-export the new root under the old name and remove the alias in a follow-up.
- **Tests track behavior**, not implementation. Update test names and queries to match the new shape; do not delete tests to silence them.
