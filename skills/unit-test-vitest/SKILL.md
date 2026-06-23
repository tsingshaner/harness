---
name: unit-test-vitest
description: Team conventions for writing Vitest test cases — describe/test/expect structure, AAA pattern, one-behavior-per-test, mock usage boundaries (MSW, fake timers, vi.fn vs vi.mock), assertion specificity, async testing, and file naming. Use when writing, reviewing, or refactoring Vitest unit, component, or integration tests.
---

# Vitest Test Writing Conventions

## 1. Use describe / test / expect consistently

Import all test APIs explicitly:

```ts
import { describe, expect, test } from 'vitest';
```

Avoid mixing in `it`, `assert`, or implicit globals:

```ts
// Avoid
it('xxx', () => {});
assert.equal(a, b);
```

Prefer:

```ts
describe('sum', () => {
  test('returns sum of two numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });
});
```

Vitest's official docs treat `expect` as the assertion entry point, supporting Jest-style matchers such as `toBe`, `toEqual`, `toHaveBeenCalled`, etc.

## 2. describe names the subject, test names the behavior

`describe` answers "what is under test"; `test` answers "under what condition, what should happen."

```ts
describe('parseKimUserAgent', () => {
  test('returns Kim version when user agent contains Kim token', () => {
    const result = parseKimUserAgent('Kim/ 5.1.200 Yoda/3.2.14');
    expect(result.kimVersion).toBe('5.1.200');
  });

  test('returns undefined when Kim token is missing', () => {
    const result = parseKimUserAgent('Mozilla/5.0');
    expect(result.kimVersion).toBeUndefined();
  });
});
```

Avoid describing implementation details:

```ts
// Avoid
test('calls split and regex', () => {});
test('sets state to loading', () => {});
```

Prefer describing observable behavior:

```ts
test('shows error message when email format is invalid', () => {});
test('disables submit button while submitting', () => {});
```

Vitest's component testing docs also recommend that test descriptions focus on user-observable behavior, not internal implementation.

## 3. Structure tests as Arrange / Act / Assert

Keep each test in three sections where it helps clarity:

```ts
describe('createQueryString', () => {
  test('preserves existing query and updates target key', () => {
    // Arrange
    const search = '?page=1&keyword=old';

    // Act
    const result = createQueryString(search, {
      keyword: 'new',
    });

    // Assert
    expect(result).toBe('?page=1&keyword=new');
  });
});
```

Simple tests don't need the comments, but keep the same code order:

```ts
test('returns empty string when params are empty', () => {
  const result = createQueryString('', {});
  expect(result).toBe('');
});
```

## 4. One test verifies one primary behavior

Prefer:

```ts
describe('isIOS', () => {
  test('returns true for iPhone user agent', () => {
    expect(isIOS('Mozilla/5.0 iPhone')).toBe(true);
  });

  test('returns false for Android user agent', () => {
    expect(isIOS('Mozilla/5.0 Android')).toBe(false);
  });
});
```

Avoid stuffing multiple behaviors into one test:

```ts
// Avoid
test('works', () => {
  expect(isIOS('iPhone')).toBe(true);
  expect(isIOS('Android')).toBe(false);
  expect(isIOS('iPad')).toBe(true);
  expect(isIOS('Windows')).toBe(false);
});
```

When testing several inputs against the same rule, use `test.each`:

```ts
describe('isIOS', () => {
  test.each([
    ['iPhone', true],
    ['iPad', true],
    ['Android', false],
    ['Windows', false],
  ])('returns %s for %s user agent', (ua, expected) => {
    expect(isIOS(ua)).toBe(expected);
  });
});
```

## 5. Minimize mocking — prefer real input/output

Suggested priority order:

1. Pure functions: test input/output directly.
2. UI components: test user behavior and rendered results.
3. API / IO: prefer swappable dependencies, test databases, or MSW.
4. Reach for `vi.fn`, `vi.spyOn`, `vi.mock` only as a last resort.

Prefer:

```ts
describe('getVisibleAgents', () => {
  test('filters deleted agents', () => {
    const agents = [
      { id: '1', name: 'A', deleted: false },
      { id: '2', name: 'B', deleted: true },
    ];

    const result = getVisibleAgents(agents);

    expect(result).toEqual([{ id: '1', name: 'A', deleted: false }]);
  });
});
```

Avoid mocking internal implementation just to assert a call happened:

```ts
// Avoid
test('calls filterDeletedAgents', () => {
  const spy = vi.spyOn(utils, 'filterDeletedAgents');
  getVisibleAgents(agents);
  expect(spy).toHaveBeenCalled();
});
```

This tests "how it's implemented," not "whether the result is correct."

## 6. When mocking is acceptable

Minimizing mocks doesn't mean never using them. These scenarios are fine to mock:

### 6.1 Network requests

Prefer MSW over scattering `vi.mock(fetch)` everywhere. Vitest's official docs also recommend Mock Service Worker for mocking HTTP, WebSocket, and GraphQL requests.

```ts
test('shows user name after request success', async () => {
  render(<UserProfile />);
  expect(await screen.findByText('Denia')).toBeInTheDocument();
});
```

### 6.2 Time, randomness, browser APIs

```ts
import { afterEach, describe, expect, test, vi } from 'vitest';

describe('formatToday', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('formats current date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T10:00:00+08:00'));
    expect(formatToday()).toBe('2026-06-23');
  });
});
```

### 6.3 Callback functions

```ts
import { describe, expect, test, vi } from 'vitest';

describe('submitForm', () => {
  test('calls onSuccess after submit success', async () => {
    const onSuccess = vi.fn();
    await submitForm({ name: 'test' }, { onSuccess });
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
```

Vitest distinguishes spies from mocks: use `vi.spyOn` to observe an existing object method, and `vi.fn` to create a controllable function.

## 7. Use vi.mock sparingly

`vi.mock` is hoisted to the top of the file and executes before imports, which easily introduces implicit behavior and test pollution. Vitest's official docs also warn that `vi.mock` is hoisted above imports.

Avoid:

```ts
vi.mock('@/services/user');

test('xxx', () => {
  // The test gives no indication the real dependency was replaced
});
```

Prefer dependency injection instead:

```ts
type UserService = {
  getUser: (id: string) => Promise<User>;
};

export async function getUserName(id: string, userService: UserService) {
  const user = await userService.getUser(id);
  return user.name;
}
```

Test:

```ts
describe('getUserName', () => {
  test('returns user name', async () => {
    const userService = {
      getUser: async () => ({ id: '1', name: 'Denia' }),
    };

    await expect(getUserName('1', userService)).resolves.toBe('Denia');
  });
});
```

No `vi.mock` needed, and the test is more direct.

## 8. Each test must be independent, not order-dependent

Avoid:

```ts
let token: string;

test('creates token', () => {
  token = createToken();
});

test('validates token', () => {
  expect(validateToken(token)).toBe(true);
});
```

Prefer:

```ts
test('validates created token', () => {
  const token = createToken();
  expect(validateToken(token)).toBe(true);
});
```

If mocks are used, they must be cleaned up:

```ts
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});
```

Vitest's official docs also remind you to clear or restore mocks before/after each test to avoid mock state leaking into other tests.

## 9. Assertions should be specific

Prefer:

```ts
expect(result.status).toBe('success');
expect(result.data).toEqual({
  id: '1',
  name: 'Denia',
});
```

Avoid:

```ts
expect(result).toBeTruthy();
expect(result.data).toBeDefined();
```

`toBeTruthy` and `toBeDefined` are only suitable as fallback checks. Most business-logic tests should assert specific values.

## 10. Async tests must explicitly await the result

Prefer:

```ts
test('returns data after request success', async () => {
  await expect(fetchUser('1')).resolves.toEqual({
    id: '1',
    name: 'Denia',
  });
});
```

Or:

```ts
test('throws when user does not exist', async () => {
  await expect(fetchUser('unknown')).rejects.toThrow('User not found');
});
```

Avoid:

```ts
// Avoid — the test may finish before the assertion runs
test('returns data', () => {
  fetchUser('1').then((user) => {
    expect(user.name).toBe('Denia');
  });
});
```

## 11. File naming

Prefer:

```txt
src/
  utils/
    parse-kim-user-agent.ts
    parse-kim-user-agent.test.ts
  services/
    user-service.ts
    user-service.test.ts
  components/
    agent-card/
      agent-card.tsx
      agent-card.test.tsx
```

Rule:

```txt
*.test.ts
*.test.tsx
```

Avoid:

```txt
__tests__/xxx.spec.ts
xxx.testcase.ts
```

...unless the project already has an established convention.

## 12. Recommended template

```ts
import { describe, expect, test } from 'vitest';
import { targetFunction } from './target-function';

describe('targetFunction', () => {
  test('returns expected result when input is valid', () => {
    const result = targetFunction('input');
    expect(result).toBe('expected');
  });

  test('throws when input is invalid', () => {
    expect(() => targetFunction('')).toThrow('Invalid input');
  });
});
```

## Final principle

When writing Vitest cases, judge in this order:

1. Test the behavioral result first.
2. Then test boundary conditions.
3. Then test error/exception paths.
4. Avoid mocking whenever possible.
5. When mocking is unavoidable, mock the external boundary, not the internal implementation.

One-line rule: a test should verify "whether this module's external behavior is correct," not "whether this module is implemented in a particular way."
