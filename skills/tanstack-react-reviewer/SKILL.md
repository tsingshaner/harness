---
name: tanstack-react-reviewer
description: >-
  Code review checklist for TanStack Start apps with React 19, shadcn/ui,
  TanStack Query, Table, and Form: SSR/streaming boundaries, cache keys,
  loaders/dehydration, table virtualization and a11y, form validators and
  async flows, and composition with Radix primitives. Use for PR reviews or
  when hardening full-stack React + TanStack stacks.
---

# TanStack React 全栈审查（Start + Query + Table + Form + shadcn + React 19）

面向 **TanStack Start**、**React 19**、**shadcn/ui**（Radix + Tailwind）、**TanStack Query**、**TanStack Table**、**TanStack Form** 的代码审查技能。与通用 UI 结构规则可叠加 [`react-reviewer`](../react-reviewer/SKILL.md)（compound API、hook 返回面、a11y 等）。

## 何时使用

- PR 或功能涉及 **Start 路由 / SSR / server functions** 与客户端数据的交界。
- 新增或改动 **Query 缓存、prefetch、dehydrate**、**大表格**、**复杂表单**（异步校验、数组字段、与 shadcn 控件组合）。
- 升级 **React 19**（`use`、Actions、`ref` 回调、`useOptimistic` 等）后与 Start/Query 的协作审查。

## 审查前准备

1. 阅读 `package.json` 中 **TanStack Start / Router / Query / Table / Form** 与 **React** 的大版本，结论按**当前主版本文档**为准，勿凭旧博客假设 API。
2. 区分 **服务端可运行代码**（loader、server function、middleware）与 **仅客户端**（`document`、`window`、部分 DevTools），Start 项目里混用是高频缺陷来源。
3. 若团队已采用 `react-reviewer` 的 **jsonl 报告**，本技能可作为 **附加维度（T1–T8）** 写入 `title`/`fix` 文案，或单独一节「TanStack 专项」；不必重复其 1–7 条除非明显冲突。

---

## 维度 T1 — TanStack Start（路由、SSR、数据边界）

**应检查**

- **Loader / 路由数据**：数据在 loader 获取还是在组件里 `useQuery` 重复拉取；是否存在瀑布请求（串行 await 可并行处）。
- **Server vs client**：敏感逻辑、密钥、权限校验是否只在服务端；client bundle 是否误 import 仅服务端模块。
- **Streaming / Pending**：`pendingComponent`、`defaultPendingComponent` 是否与 CLS/布局稳定策略一致；错误边界与 `notFound`/`errorComponent` 是否覆盖主要分支。
- **预取与导航**：对列表→详情等路径，`preload` / `loaderDeps` 是否与 Query 的 `prefetchQuery` 协调，避免双重来源不一致。
- **Head / SEO**：`head` 与文档元信息是否随路由正确更新；是否避免在 client-only 树里塞唯一 SEO 内容。

**常见反模式**

- 在 **client 组件**里做本应 **server function** 的校验或付费墙逻辑。
- Loader 返回 **不可序列化** 或过大 payload，导致脱水/传输膨胀。
- 路由 `params` / `search` 变更未反映到 **Query key** 或 Table 状态，出现「URL 与 UI 不一致」。

**改进建议**

- 单一事实来源：**URL / loader 输出** 与 **Query cache** 二选一做主源，另一侧只做派生或短期 UI 状态。
- 对慢路径组合 **defer + placeholderData / keepPreviousData**（Query 侧）与 Start 的 pending UI，并文档化「首屏 vs 可延迟」约定。

---

## 维度 T2 — React 19 互操作

**应检查**

- **`use` 与 Promise**：是否在稳定边界消费；错误是否可被 Error Boundary 或路由 error 处理。
- **Actions / `useActionState` / `useFormStatus`**：与 TanStack Form 并存时，是否重复提交、双重 pending 指示。
- **`ref` as prop**：第三方库尚未支持时是否有兼容层；shadcn/Radix 包装组件是否仍需要 `forwardRef` 过渡。
- **`useOptimistic`**：是否与 Query 的 `onMutate` / 回滚一致，避免乐观 UI 与 cache 长期分叉。

**改进建议**

- 为「表单提交 + Server Action + Query invalidate」画清 **单一提交管线**，避免三套 pending 状态。
- 对仍依赖 legacy 模式的依赖，集中 **adapter 组件**，不在业务页面散落兼容代码。

---

## 维度 T3 — shadcn/ui（与 TanStack 表单/表格组合）

**应检查**

- **受控与非受控**：Radix + shadcn 控件与 `@tanstack/react-form` 的 `field()` API 是否一致；是否存在受控抖动（value 频繁变 undefined）。
- **可访问性**：组合件是否保留 **label / `aria-*` / `id`**；自定义 `FormControl` 时是否未切断关联。
- **样式**：Tailwind 类爆炸时是否用 `cva` 与 token；是否与 `react-reviewer` 的「单一层级样式体系」一致。
- **版本**：`components/ui/*` 是否为项目内源码；升级时是否检查 breaking（Radix 大版本）。

**改进建议**

- 为「Field + shadcn Input/Select/Checkbox」抽 **薄包装**（单一文件、可测），页面只组合不重复 wiring。
- 表格内嵌表单控件时，统一 **键盘导航**（Table 的 `meta` 与焦点顺序）与 **屏幕阅读器** 朗读（见 T5）。

---

## 维度 T4 — TanStack Query

**应检查**

- **`queryKey`**：是否稳定、可序列化、包含 **分页/排序/filters** 等所有影响结果的维度；是否误把非幂等对象放进 key。
- **`staleTime` / `gcTime`**：列表、详情、用户偏好是否区分；全局 `defaultOptions` 是否被局部合理覆盖。
- **SSR / dehydrate**：`dehydrate`/`HydrationBoundary` 是否与 Start 的 loader 输出对齐；是否避免 client-only 默认值导致 hydration mismatch。
- **错误与重试**：`retry` 对 4xx 是否关闭；全局 `QueryCache`/`MutationCache` 的 `onError` 是否与 toast/日志策略一致。
- **`placeholderData` / `initialData`**：语义是否用对；是否误把 `initialData` 当「永不过期」缓存。

**常见反模式**

- 在 `useEffect` 里 `refetch` 驱动主数据流（应优先事件、key 变化或 `enabled`）。
- `select` 返回新对象引用导致无关重渲染（大列表下放大）。
- Mutation 成功后只 `invalidateQueries` 无边界 key，导致 **风暴式 refetch**。

**改进建议**

- 为每类资源约定 **key 工厂**（`queryKeys.todos.list(filters)`），禁止手写散落字符串。
- 大列表配合 **prefetch 下一页** + `maxPages` 或虚拟化（T5），并监控 `fetchStatus` 与并发。

---

## 维度 T5 — TanStack Table

**应检查**

- **列定义**：`columnHelper`/`accessor` 是否稳定（避免 render 内新建 columns）；`meta` 是否类型化（`declare module '@tanstack/react-table'`）。
- **受控状态**：`sorting` / `columnFilters` / `pagination` / `rowSelection` 是否与 URL 或父状态同步（若产品需要可分享链接）。
- **服务端分页**：`manualPagination` + `pageCount` 是否与 Query 的 `data` 一致；loading/error 是否在表格层可见。
- **性能**：大行数是否 **虚拟化**（`@tanstack/react-virtual`）；cell 是否避免匿名内联组件。
- **a11y**：`table`/`thead`/`tbody` 语义；排序按钮的 `aria-sort`；行选择 checkbox 与 **全选** 的关联。

**改进建议**

- 列多时拆 **hooks：`useFooColumns()`** + **memoized defaultColumn**。
- 将「密度、列可见性」存 **localStorage** 时做 schema 校验，防止损坏 JSON 导致白屏。

---

## 维度 T6 — TanStack Form

**应检查**

- **Schema 与校验**：`zod`/自定义 validator 是否在 **onChange vs onSubmit** 上策略一致；异步校验是否 debounce、是否取消竞态（`abort`/`latest`）。
- **字段数组**：`fieldArray` 的 key 是否稳定；增删行后焦点与滚动是否合理。
- **默认值**：`defaultValues` 是否与服务端/Query 初始数据一致；是否避免「先空后填」的闪动（与 T1/T4 联动）。
- **与 Mutation**：`onSubmit` 是否 await；错误是否映射到 **field 级 / form 级**；是否在提交管线里统一 `isSubmitting`。

**常见反模式**

- 在 render 里 `form.Field` 的子函数创建 **新内联 validator** 引用，导致多余校验与重渲染。
- 用受控 input 直接绑 `value={...}` 绕过 Form 状态，失去统一 touched/error。

**改进建议**

- 对重复字段组使用 **可复用 `withFieldGroup`** 或小 hook，保持 `react-reviewer` 的 hook 返回面可控。
- 服务端返回的字段级错误（422）映射到 **`form.setFieldMeta`** 或等价 API，与 Zod 本地错误文案统一 i18n key。

---

## 维度 T7 — 横切：类型安全与测试

- Router 的 **search schema**（若使用）与表单默认值、Query key 是否 **同一类型源**（如 shared zod）。
- Table 的 `RowData` 与 API DTO 是否对齐；避免 `as any` 穿透列 `accessorFn`。
- 关键路径：**loader + Query prefetch**、**提交 + invalidate**、**表格排序变更** 至少一种 **集成测试或 E2E**（按项目现有栈）。

---

## 维度 T8 — 安全与运维

- Server function 的 **鉴权、CSRF（若适用）、速率限制**；日志是否脱敏。
- Query 的 **`meta` 禁止**塞入不可信的大对象或 PII 进持久化 devtools。
- 环境变量：`VITE_`/`PUBLIC_` 暴露面审查（Start/构建工具相关前缀以项目为准）。

---

## 严重程度参考（可与 react-reviewer 合并）

| 级别 | 示例 |
|------|------|
| **block** | 密钥或鉴权仅在客户端；SSR 与 client 数据必然不一致；表单提交无错误处理且丢数据 |
| **major** | `queryKey` 错误导致缓存串数据；无虚拟化的大表卡顿；server/client 边界错误但未泄露密钥 |
| **minor** | `staleTime` 不合理但可接受；缺 `aria-sort`；TSDoc 缺漏（若团队对 TanStack 包装层有文档要求） |

---

## 输出结构建议（审查报告）

1. **摘要**：Start 数据流、Query 键策略、Table 规模、Form 复杂度各一句。
2. **按文件**：问题 → 证据（路径/行）→ 建议（可执行）。
3. **改进路线图**：P0（正确性/安全）→ P1（性能/a11y）→ P2（DX/文档）。
4. 若使用 `react-reviewer` jsonl：每条可追加 `tags: ["tanstack-start"]` 等便于过滤（与现有 schema 冲突则放 Markdown 小节即可）。

---

## 与兄弟技能的分工

| 主题 | 优先技能 |
|------|----------|
| 通用 React 组件 API、a11y、hook 返回面、500 行、TSDoc | [`react-reviewer`](../react-reviewer/SKILL.md) |
| TypeScript 泛型、异步、非 UI 安全 | `typescript-reviewer` / `security-reviewer`（若启用） |
| 本栈 Start + Query + Table + Form + shadcn + R19 | **本技能** |

审查时 **先**应用 `react-reviewer` 的 1–7 条（若适用），**再**按 T1–T8 过一遍 TanStack 专项，避免遗漏数据层问题。
