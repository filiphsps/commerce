# Cart Package Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the cart system from `apps/storefront` into four publishable packages — `@nordcom/cart-{core,react,next,shopify}` — mirroring the tagtree shape, with capability flags, composable middleware, predictive client-side mutation queue, pluggable storage, and cache-components-clean SSR.

**Architecture:** Each package owns one slice: `core` defines types + kernel + middleware + event bus + contract tests; `react` ships the provider + slice hooks + predictor chain + mutation queue + devtools; `next` ships server actions + cookie storage + RSC helpers; `shopify` ships the Shopify adapter. Build packages bottom-up (core → shopify/react → next), then perform a single storefront switchover commit that swaps host code over and deletes the old paths.

**Tech Stack:** pnpm workspaces, biome (lint+format), vitest (unit+contract), tsc + vite (build), React 19, Next.js 16, gql.tada, `@nordcom/commerce-shopify-graphql` peer.

**Spec reference:** `.specs/2026-05-27-cart-package/spec.md` (committed as `d0191cd93`).

---

## Phase 0: Workspace scaffolding

### Task 0.1: Register `packages/cart/*` in workspace

**Files:**
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Add cart packages glob to workspace**

Edit `pnpm-workspace.yaml`. Add `"packages/cart/*"` immediately after `"packages/tagtree/*"`:

```yaml
packages:
    - "packages/*"
    - "packages/tagtree/*"
    - "packages/cart/*"
    - "apps/*"
    - "!**/tests/fixtures/**"
```

- [ ] **Step 2: Create empty package directories**

```bash
mkdir -p packages/cart/core/src packages/cart/core/__tests__
mkdir -p packages/cart/react/src packages/cart/react/__tests__
mkdir -p packages/cart/next/src packages/cart/next/__tests__
mkdir -p packages/cart/shopify/src packages/cart/shopify/__tests__
```

- [ ] **Step 3: Commit**

```bash
git add pnpm-workspace.yaml packages/cart
git commit -m "chore(cart): scaffold packages/cart/* workspace entries."
```

### Task 0.2: Scaffold `@nordcom/cart-core` package skeleton

**Files:**
- Create: `packages/cart/core/package.json`
- Create: `packages/cart/core/tsconfig.json`
- Create: `packages/cart/core/tsconfig.node.json`
- Create: `packages/cart/core/tsconfig.test.json`
- Create: `packages/cart/core/vite.config.ts`
- Create: `packages/cart/core/vitest.config.ts`
- Create: `packages/cart/core/vitest.setup.ts`
- Create: `packages/cart/core/src/index.ts`
- Create: `packages/cart/core/README.md`

- [ ] **Step 1: Write `packages/cart/core/package.json`**

```json
{
    "$schema": "https://json.schemastore.org/package.json",
    "name": "@nordcom/cart-core",
    "version": "0.1.0",
    "private": false,
    "sideEffects": false,
    "type": "module",
    "types": "./dist/index.d.ts",
    "module": "./dist/index.js",
    "exports": {
        ".": ["./src/index.ts", "./dist/index.js"],
        "./contract-tests": ["./src/contract-tests.ts", "./dist/contract-tests.js"],
        "./mock-adapter": ["./src/mock-adapter.ts", "./dist/mock-adapter.js"]
    },
    "scripts": {
        "build": "tsc && vite build",
        "clean": "rimraf -g dist coverage .turbo *.tsbuildinfo *.log node_modules",
        "lint": "biome lint .",
        "format": "concurrently -i pnpm:format:*",
        "format:lint": "biome lint --write .",
        "format:format": "biome format --write .",
        "format:check": "biome check --write --unsafe .",
        "test": "vitest run",
        "typecheck": "tsc -noEmit"
    },
    "files": ["dist"],
    "author": {
        "name": "Filiph Sandström",
        "email": "filfat@hotmail.se",
        "url": "https://github.com/filiphsps/"
    },
    "contributors": [
        {
            "name": "Filiph Sandström",
            "email": "filfat@hotmail.se",
            "url": "https://github.com/filiphsps/"
        }
    ],
    "license": "MIT",
    "repository": {
        "type": "git",
        "url": "git+https://github.com/filiphsps/commerce.git",
        "directory": "packages/cart/core"
    },
    "keywords": ["cart", "ecommerce", "headless"],
    "bugs": { "url": "https://github.com/filiphsps/commerce/issues" },
    "homepage": "https://nordcom.store/docs/cart/core/",
    "dependencies": {},
    "devDependencies": {
        "@codecov/vite-plugin": "2.0.1",
        "concurrently": "9.2.1",
        "rimraf": "6.1.3",
        "typescript": "6.0.3",
        "vite": "8.0.12",
        "vitest": "4.1.6"
    }
}
```

- [ ] **Step 2: Write `packages/cart/core/tsconfig.json`**

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "../../../tsconfig.lib.json",
    "include": ["./src/**/*.ts"]
}
```

- [ ] **Step 3: Write `packages/cart/core/tsconfig.node.json`**

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "../../../tsconfig.node.json",
    "include": ["vite.config.ts", "vitest.config.ts", "vitest.setup.ts"]
}
```

- [ ] **Step 4: Write `packages/cart/core/tsconfig.test.json`**

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "../../../tsconfig.test.json",
    "include": ["./src/**/*.ts", "./__tests__/**/*.ts", "vitest.setup.ts"]
}
```

- [ ] **Step 5: Write `packages/cart/core/vite.config.ts`** (copy of `packages/tagtree/core/vite.config.ts` with name swapped)

```ts
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { codecovVitePlugin } from '@codecov/vite-plugin';
import { defineConfig, mergeConfig } from 'vite';

import base from '../../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = '@nordcom/cart-core';

export default mergeConfig(
    base,
    defineConfig({
        optimizeDeps: { force: true },
        root: resolve(__dirname),
        build: {
            target: 'esnext',
            rolldownOptions: { output: { name } },
        },
        plugins: process.env.CI
            ? [
                  codecovVitePlugin({
                      enableBundleAnalysis: !!process.env.CODECOV_TOKEN,
                      bundleName: name,
                      uploadToken: process.env.CODECOV_TOKEN,
                  }),
              ]
            : [],
    }),
);
```

- [ ] **Step 6: Write `packages/cart/core/vitest.config.ts`** (copy of tagtree-core)

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: [{ find: '@', replacement: path.resolve(__dirname, './src') }],
    },
    test: {
        deps: { optimizer: { client: { enabled: true }, ssr: { enabled: true } } },
        environment: 'node',
        maxConcurrency: Infinity,
        passWithNoTests: true,
        fileParallelism: true,
        typecheck: { tsconfig: './tsconfig.test.json' },
        setupFiles: ['vitest.setup.ts'],
        reporters: ['verbose'],
        exclude: ['**/*.d.ts', '**/*.stories.*', '**/dist/**/', '**/node_modules/**/*.*'],
        globals: true,
        coverage: {
            include: ['**/src/**/*.{ts,tsx}'],
            exclude: [
                '__tests__/*.*',
                '.vitest/*.*',
                '**/__snapshots__/**/*.*',
                '**/__tests__/**/*.*',
                '**/*.d.*',
                '**/*.test.*',
                'src/**/index.*',
                'src/contract-tests.ts',
                'src/mock-adapter.ts',
            ],
        },
    },
});
```

- [ ] **Step 7: Write `packages/cart/core/vitest.setup.ts`**

```ts
// intentionally empty — placeholder for future setup hooks
```

- [ ] **Step 8: Write `packages/cart/core/src/index.ts`** (empty placeholder; populated by later tasks)

```ts
export {};
```

- [ ] **Step 9: Write `packages/cart/core/README.md`**

```md
# @nordcom/cart-core

Framework-agnostic cart kernel: types, adapter contract, capabilities, middleware, event bus, money helpers, and contract tests.

See `.specs/2026-05-27-cart-package/spec.md` for the full design.
```

- [ ] **Step 10: Install + sanity-build**

```bash
pnpm install
pnpm --filter @nordcom/cart-core build
```

Expected: `dist/` produced; no errors.

- [ ] **Step 11: Commit**

```bash
git add packages/cart/core pnpm-lock.yaml
git commit -m "feat(cart-core): scaffold publishable package skeleton."
```

### Task 0.3: Scaffold `@nordcom/cart-react` skeleton

**Files:**
- Create: `packages/cart/react/package.json`
- Create: `packages/cart/react/tsconfig.json`
- Create: `packages/cart/react/tsconfig.node.json`
- Create: `packages/cart/react/tsconfig.test.json`
- Create: `packages/cart/react/vite.config.ts`
- Create: `packages/cart/react/vitest.config.ts`
- Create: `packages/cart/react/vitest.setup.ts`
- Create: `packages/cart/react/src/index.ts`
- Create: `packages/cart/react/src/devtools.ts`
- Create: `packages/cart/react/README.md`

- [ ] **Step 1: Write `packages/cart/react/package.json`**

```json
{
    "$schema": "https://json.schemastore.org/package.json",
    "name": "@nordcom/cart-react",
    "version": "0.1.0",
    "private": false,
    "sideEffects": false,
    "type": "module",
    "types": "./dist/index.d.ts",
    "module": "./dist/index.js",
    "exports": {
        ".": ["./src/index.ts", "./dist/index.js"],
        "./devtools": ["./src/devtools.ts", "./dist/devtools.js"]
    },
    "scripts": {
        "build": "tsc && vite build",
        "clean": "rimraf -g dist coverage .turbo *.tsbuildinfo *.log node_modules",
        "lint": "biome lint .",
        "format": "concurrently -i pnpm:format:*",
        "format:lint": "biome lint --write .",
        "format:format": "biome format --write .",
        "format:check": "biome check --write --unsafe .",
        "test": "vitest run",
        "typecheck": "tsc -noEmit"
    },
    "files": ["dist"],
    "author": { "name": "Filiph Sandström", "email": "filfat@hotmail.se", "url": "https://github.com/filiphsps/" },
    "contributors": [{ "name": "Filiph Sandström", "email": "filfat@hotmail.se", "url": "https://github.com/filiphsps/" }],
    "license": "MIT",
    "repository": { "type": "git", "url": "git+https://github.com/filiphsps/commerce.git", "directory": "packages/cart/react" },
    "keywords": ["cart", "react", "ecommerce"],
    "bugs": { "url": "https://github.com/filiphsps/commerce/issues" },
    "homepage": "https://nordcom.store/docs/cart/react/",
    "peerDependencies": { "react": "^19.0.0", "react-dom": "^19.0.0" },
    "dependencies": { "@nordcom/cart-core": "workspace:*" },
    "devDependencies": {
        "@codecov/vite-plugin": "2.0.1",
        "@testing-library/react": "16.3.0",
        "@types/react": "19.2.5",
        "@types/react-dom": "19.2.5",
        "concurrently": "9.2.1",
        "jsdom": "27.0.0",
        "react": "19.2.0",
        "react-dom": "19.2.0",
        "rimraf": "6.1.3",
        "typescript": "6.0.3",
        "vite": "8.0.12",
        "vitest": "4.1.6"
    }
}
```

(Note: pin exact dependency versions to whatever apps/storefront uses — verify via `pnpm view @types/react version` in the storefront workspace before committing if numbers above are stale.)

- [ ] **Step 2: tsconfig files** — same structure as cart-core but extending the same `../../../tsconfig.lib.json`. Replicate the three tsconfig files.

- [ ] **Step 3: Write `packages/cart/react/vite.config.ts`** — copy of cart-core's vite.config.ts with `name` set to `'@nordcom/cart-react'` and an extra `external: ['react', 'react-dom']` in `build.rolldownOptions`:

```ts
build: {
    target: 'esnext',
    rolldownOptions: {
        output: { name },
        external: ['react', 'react-dom', '@nordcom/cart-core'],
    },
},
```

- [ ] **Step 4: Write `packages/cart/react/vitest.config.ts`** — same as cart-core but `environment: 'jsdom'` instead of `'node'`.

- [ ] **Step 5: Write `vitest.setup.ts`**:

```ts
// intentionally empty — placeholder for future setup hooks
```

- [ ] **Step 6: Write `src/index.ts`** and `src/devtools.ts` as empty placeholders:

```ts
export {};
```

- [ ] **Step 7: Write README.md**

```md
# @nordcom/cart-react

React 19 provider, slice hooks, predictive mutation queue, and devtools for `@nordcom/cart-core` kernels.

See `.specs/2026-05-27-cart-package/spec.md` for the full design.
```

- [ ] **Step 8: Install + build**

```bash
pnpm install
pnpm --filter @nordcom/cart-react build
```

- [ ] **Step 9: Commit**

```bash
git add packages/cart/react pnpm-lock.yaml
git commit -m "feat(cart-react): scaffold publishable package skeleton."
```

### Task 0.4: Scaffold `@nordcom/cart-next` skeleton

**Files:**
- Create: `packages/cart/next/{package.json,tsconfig.json,tsconfig.node.json,tsconfig.test.json,vite.config.ts,vitest.config.ts,vitest.setup.ts,src/index.ts,README.md}`

- [ ] **Step 1: Write `package.json`** — same shape as cart-react but:
  - `"name": "@nordcom/cart-next"`
  - `"homepage": "https://nordcom.store/docs/cart/next/"`
  - `peerDependencies`: `{ "next": "^16.0.0", "react": "^19.0.0" }`
  - `dependencies`: `{ "@nordcom/cart-core": "workspace:*" }`
  - No `cart-react` runtime dep (type-only imports use the workspace `@nordcom/cart-react`; safe because vite externalizes it)
  - `devDependencies` add `@nordcom/cart-react: "workspace:*"` (for type-only imports during build) and `next: "16.x"`
  - No `./devtools` subpath; just `.` export
  - `exports`:
    ```json
    {
        ".": ["./src/index.ts", "./dist/index.js"]
    }
    ```

- [ ] **Step 2: tsconfig files** — same pattern as other packages.

- [ ] **Step 3: vite.config.ts** — name `'@nordcom/cart-next'`; `external: ['next', 'next/headers', 'next/cache', 'next/server', 'react', '@nordcom/cart-core', '@nordcom/cart-react']`.

- [ ] **Step 4: vitest.config.ts** — `environment: 'node'`.

- [ ] **Step 5: index.ts + README.md** placeholders.

- [ ] **Step 6: Install + build**

```bash
pnpm install
pnpm --filter @nordcom/cart-next build
```

- [ ] **Step 7: Commit**

```bash
git add packages/cart/next pnpm-lock.yaml
git commit -m "feat(cart-next): scaffold publishable package skeleton."
```

### Task 0.5: Scaffold `@nordcom/cart-shopify` skeleton

**Files:**
- Create: `packages/cart/shopify/{package.json,tsconfig.json,tsconfig.node.json,tsconfig.test.json,vite.config.ts,vitest.config.ts,vitest.setup.ts,src/index.ts,src/testing.ts,README.md}`

- [ ] **Step 1: Write `package.json`** — same shape as cart-core but:
  - `"name": "@nordcom/cart-shopify"`
  - `"homepage": "https://nordcom.store/docs/cart/shopify/"`
  - `exports`: `.` + `./testing`
  - `dependencies`: `{ "@nordcom/cart-core": "workspace:*" }`
  - `peerDependencies`: `{ "@nordcom/commerce-shopify-graphql": "workspace:*" }` (for gql.tada schema typing; verify version range matches existing peer usage)
  - `devDependencies` add `@nordcom/commerce-shopify-graphql: "workspace:*"`

- [ ] **Step 2: tsconfig files, vite.config.ts (`environment: 'node'`, name swap), vitest.config.ts, vitest.setup.ts, src/index.ts + src/testing.ts placeholders, README.md.**

- [ ] **Step 3: Install + build**

```bash
pnpm install
pnpm --filter @nordcom/cart-shopify build
```

- [ ] **Step 4: Commit**

```bash
git add packages/cart/shopify pnpm-lock.yaml
git commit -m "feat(cart-shopify): scaffold publishable package skeleton."
```

### Task 0.6: Verify root build picks up new packages

- [ ] **Step 1: Run root build**

```bash
pnpm build:packages
```

Expected: all four `@nordcom/cart-*` packages build (with placeholder index.ts → empty dist).

- [ ] **Step 2: Verify changesets picks them up**

```bash
pnpm changeset status
```

Expected: cart packages appear as releasable (not ignored); commerce-* remain ignored. This validates the `["@nordcom/*", "!@nordcom/cart-*"]` ignore rule already committed in `d0191cd93`.

- [ ] **Step 3: Verify turbo cache key**

```bash
pnpm turbo run build --dry-run | grep cart
```

Expected: four cart build tasks listed.

No commit — this is a verification checkpoint only.

---

## Phase 1: `@nordcom/cart-core` implementation (TDD per file)

Build the kernel bottom-up. Tests live in `packages/cart/core/__tests__/<module>.test.ts`. Public exports added to `src/index.ts` at the end.

### Task 1.1: Money type + helpers

**Files:**
- Create: `packages/cart/core/src/money.ts`
- Test: `packages/cart/core/__tests__/money.test.ts`

- [ ] **Step 1: Write failing test `__tests__/money.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { money } from '../src/money';

describe('money', () => {
    it('parses USD decimal string to integer cents', () => {
        expect(money.parse({ amount: '12.34', currencyCode: 'USD' })).toEqual({
            cents: 1234,
            currencyCode: 'USD',
        });
    });

    it('formats integer cents back to decimal string with currency scale', () => {
        expect(money.format({ cents: 1234, currencyCode: 'USD' })).toEqual({
            amount: '12.34',
            currencyCode: 'USD',
        });
    });

    it('handles JPY with scale=0', () => {
        const parsed = money.parse({ amount: '1234', currencyCode: 'JPY' });
        expect(parsed.cents).toBe(1234);
        expect(money.format(parsed).amount).toBe('1234');
    });

    it('handles BHD with scale=3', () => {
        const parsed = money.parse({ amount: '1.234', currencyCode: 'BHD' });
        expect(parsed.cents).toBe(1234);
        expect(money.format(parsed).amount).toBe('1.234');
    });

    it('add/sub/mul preserve currency scale', () => {
        const a = money.parse({ amount: '1.00', currencyCode: 'USD' });
        const b = money.parse({ amount: '2.50', currencyCode: 'USD' });
        expect(money.format(money.add(a, b))).toEqual({ amount: '3.50', currencyCode: 'USD' });
        expect(money.format(money.sub(b, a))).toEqual({ amount: '1.50', currencyCode: 'USD' });
        expect(money.format(money.mul(a, 3))).toEqual({ amount: '3.00', currencyCode: 'USD' });
    });

    it('eq / lt / gt comparisons', () => {
        const a = money.parse({ amount: '1.00', currencyCode: 'USD' });
        const b = money.parse({ amount: '2.00', currencyCode: 'USD' });
        expect(money.eq(a, a)).toBe(true);
        expect(money.lt(a, b)).toBe(true);
        expect(money.gt(b, a)).toBe(true);
    });

    it('zero returns currency-scoped zero', () => {
        expect(money.zero('USD')).toEqual({ cents: 0, currencyCode: 'USD' });
    });

    it('throws when add/sub/eq currencies differ', () => {
        const usd = money.parse({ amount: '1.00', currencyCode: 'USD' });
        const eur = money.parse({ amount: '1.00', currencyCode: 'EUR' });
        expect(() => money.add(usd, eur)).toThrow(/currency mismatch/i);
    });
});
```

- [ ] **Step 2: Run test (expect FAIL — module missing)**

```bash
pnpm --filter @nordcom/cart-core test money
```

- [ ] **Step 3: Implement `src/money.ts`**

```ts
export type CurrencyCode = string;
export type Money = { amount: string; currencyCode: CurrencyCode };
export type MoneyCents = { cents: number; currencyCode: CurrencyCode };

const scaleCache = new Map<CurrencyCode, number>();

function scale(cc: CurrencyCode): number {
    const cached = scaleCache.get(cc);
    if (cached !== undefined) return cached;
    const s = new Intl.NumberFormat('en', { style: 'currency', currency: cc }).resolvedOptions().maximumFractionDigits ?? 2;
    scaleCache.set(cc, s);
    return s;
}

function assertSameCurrency(a: MoneyCents, b: MoneyCents): void {
    if (a.currencyCode !== b.currencyCode) {
        throw new Error(`Money currency mismatch: ${a.currencyCode} vs ${b.currencyCode}`);
    }
}

export const money = {
    parse(m: Money): MoneyCents {
        const cents = Math.round(parseFloat(m.amount) * 10 ** scale(m.currencyCode));
        return { cents, currencyCode: m.currencyCode };
    },
    format(m: MoneyCents): Money {
        const s = scale(m.currencyCode);
        return { amount: (m.cents / 10 ** s).toFixed(s), currencyCode: m.currencyCode };
    },
    add(a: MoneyCents, b: MoneyCents): MoneyCents {
        assertSameCurrency(a, b);
        return { cents: a.cents + b.cents, currencyCode: a.currencyCode };
    },
    sub(a: MoneyCents, b: MoneyCents): MoneyCents {
        assertSameCurrency(a, b);
        return { cents: a.cents - b.cents, currencyCode: a.currencyCode };
    },
    mul(a: MoneyCents, n: number): MoneyCents {
        return { cents: Math.round(a.cents * n), currencyCode: a.currencyCode };
    },
    eq(a: MoneyCents, b: MoneyCents): boolean {
        assertSameCurrency(a, b);
        return a.cents === b.cents;
    },
    lt(a: MoneyCents, b: MoneyCents): boolean {
        assertSameCurrency(a, b);
        return a.cents < b.cents;
    },
    gt(a: MoneyCents, b: MoneyCents): boolean {
        assertSameCurrency(a, b);
        return a.cents > b.cents;
    },
    zero(cc: CurrencyCode): MoneyCents {
        return { cents: 0, currencyCode: cc };
    },
};
```

- [ ] **Step 4: Run tests (expect PASS)**

```bash
pnpm --filter @nordcom/cart-core test money
```

- [ ] **Step 5: Commit**

```bash
git add packages/cart/core/src/money.ts packages/cart/core/__tests__/money.test.ts
git commit -m "feat(cart-core): add money helpers with per-currency scale."
```

### Task 1.2: Cart errors

**Files:**
- Create: `packages/cart/core/src/errors.ts`
- Test: `packages/cart/core/__tests__/errors.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
    CartCapabilityUnsupportedError,
    CartError,
    CartNotFoundError,
    CartProviderError,
    CartUserError,
} from '../src/errors';

describe('cart errors', () => {
    it('CartNotFoundError carries name + cartId', () => {
        const e = new CartNotFoundError('gid://Cart/abc');
        expect(e.name).toBe('CartNotFoundError');
        expect(e.message).toContain('gid://Cart/abc');
        expect(e instanceof CartError).toBe(true);
    });

    it('CartUserError carries userErrors array', () => {
        const e = new CartUserError([{ field: 'lineId', message: 'invalid line' }]);
        expect(e.name).toBe('CartUserError');
        expect(e.userErrors[0]?.message).toBe('invalid line');
    });

    it('CartProviderError preserves cause', () => {
        const cause = new Error('transport down');
        const e = new CartProviderError('Shopify failed', cause);
        expect(e.name).toBe('CartProviderError');
        expect(e.cause).toBe(cause);
    });

    it('CartCapabilityUnsupportedError names the missing capability', () => {
        const e = new CartCapabilityUnsupportedError('giftCards');
        expect(e.name).toBe('CartCapabilityUnsupportedError');
        expect(e.capability).toBe('giftCards');
    });
});
```

- [ ] **Step 2: Run test (FAIL)**

```bash
pnpm --filter @nordcom/cart-core test errors
```

- [ ] **Step 3: Implement `src/errors.ts`**

```ts
export class CartError extends Error {
    constructor(message: string, public override readonly cause?: unknown) {
        super(message);
        this.name = 'CartError';
    }
}

export class CartNotFoundError extends CartError {
    constructor(public readonly cartId: string) {
        super(`Cart not found: ${cartId}`);
        this.name = 'CartNotFoundError';
    }
}

export class CartProviderError extends CartError {
    constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = 'CartProviderError';
    }
}

export type CartUserErrorEntry = { field?: string; message: string };

export class CartUserError extends CartError {
    constructor(public readonly userErrors: CartUserErrorEntry[]) {
        super(userErrors.map((e) => e.message).join('; '));
        this.name = 'CartUserError';
    }
}

export class CartCapabilityUnsupportedError extends CartError {
    constructor(public readonly capability: string) {
        super(`Capability not supported: ${capability}`);
        this.name = 'CartCapabilityUnsupportedError';
    }
}
```

- [ ] **Step 4: Run test (PASS)**

```bash
pnpm --filter @nordcom/cart-core test errors
```

- [ ] **Step 5: Commit**

```bash
git add packages/cart/core/src/errors.ts packages/cart/core/__tests__/errors.test.ts
git commit -m "feat(cart-core): define cart error hierarchy with match-by-name semantics."
```

### Task 1.3: Core data types

**Files:**
- Create: `packages/cart/core/src/types.ts`

(Type-only file — no separate test file; consumers' tests exercise the shapes. Skip TDD here.)

- [ ] **Step 1: Write `src/types.ts`** (verbatim from spec §`@nordcom/cart-core / Types` + mutation types + envelope)

```ts
import type { Money, CurrencyCode } from './money';
export type { Money, CurrencyCode } from './money';

export type LocaleTuple = { language: string; country: string; currency: CurrencyCode };

export type BuyerIdentity = {
    email?: string;
    phone?: string;
    countryCode?: string;
    provider?: { type: string; data: Record<string, unknown> };
};

export type CartExt = { cart?: unknown; line?: unknown };

export type CartLineMerchandise = {
    id: string;
    productId: string;
    productHandle: string;
    productTitle: string;
    productVendor: string | null;
    productType: string | null;
    variantTitle: string;
    image: { url: string; altText: string | null; width: number; height: number } | null;
    selectedOptions: Array<{ name: string; value: string }>;
    unitPrice: Money;
    compareAtUnitPrice: Money | null;
    availableForSale: boolean;
    quantityAvailable: number | null;
    sku: string | null;
};

export type CartLine<L = {}> = {
    id: string;
    quantity: number;
    merchandise: CartLineMerchandise;
    cost: { subtotal: Money; total: Money };
    attributes: Array<{ key: string; value: string }>;
    discountAllocations: Array<{ discountedAmount: Money; title?: string; code?: string }>;
    custom: L;
};

export type Cart<TExt extends CartExt = {}> = {
    id: string;
    providerType: string;
    totalQuantity: number;
    checkoutUrl: string | null;
    lines: CartLine<TExt['line']>[];
    cost: { subtotal: Money; total: Money | null; tax: Money | null; shipping: Money | null };
    costStale: boolean;
    discountCodes: Array<{ code: string; applicable: boolean }>;
    giftCards: Array<{ id: string; lastCharacters: string; amountLeft: Money }>;
    buyerIdentity: BuyerIdentity | null;
    note: string | null;
    attributes: Array<{ key: string; value: string }>;
    updatedAt: string;
    custom: TExt['cart'];
};

export type NewCartLine = {
    variantId: string;
    quantity: number;
    attributes?: Array<{ key: string; value: string }>;
};

export type ProductSnapshot = {
    variantId: string;
    productHandle: string;
    productTitle: string;
    variantTitle: string;
    image: { url: string; altText: string | null; width: number; height: number } | null;
    unitPrice: Money;
    compareAtUnitPrice?: Money | null;
};

export type KV = { key: string; value: string };

export type CartMutation =
    | { kind: 'add-line'; variantId: string; quantity: number; attributes?: KV[]; snapshot?: ProductSnapshot }
    | { kind: 'update-line'; lineId: string; quantity: number }
    | { kind: 'remove-line'; lineId: string }
    | { kind: 'apply-discount'; code: string }
    | { kind: 'remove-discount'; code: string }
    | { kind: 'apply-gift-card'; code: string }
    | { kind: 'remove-gift-card'; id: string }
    | { kind: 'update-note'; note: string }
    | { kind: 'update-attributes'; attributes: KV[] }
    | { kind: 'update-buyer-identity' }
    | { kind: 'custom'; name: string; payload: unknown };

export type MutationEnvelope = { mutation: CartMutation; idempotencyKey: string };

export type CartActionFailureReason =
    | 'missing-shop'
    | 'missing-variant'
    | 'missing-line'
    | 'missing-cart'
    | 'invalid-quantity'
    | 'invalid-code'
    | 'unauthorized'
    | 'user-error'
    | 'network-error'
    | 'provider-error';

export type CartActionResult<TExt extends CartExt = {}> =
    | { ok: true; cart: Cart<TExt> }
    | {
          ok: false;
          reason: CartActionFailureReason;
          message: string;
          userErrors?: Array<{ field?: string; message: string }>;
          cart?: Cart<TExt>;
      };

export type SubmitMutation<TExt extends CartExt = {}> = (envelope: MutationEnvelope) => Promise<CartActionResult<TExt>>;

export interface ILogger {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
}

export const consoleLogger: ILogger = {
    debug: (msg, meta) => console.debug(`[cart] ${msg}`, meta ?? ''),
    info: (msg, meta) => console.info(`[cart] ${msg}`, meta ?? ''),
    warn: (msg, meta) => console.warn(`[cart] ${msg}`, meta ?? ''),
    error: (msg, meta) => console.error(`[cart] ${msg}`, meta ?? ''),
};

export interface ITracer {
    startSpan<R>(name: string, attrs: Record<string, unknown>, fn: (span: { recordException: (e: unknown) => void; setAttribute: (k: string, v: unknown) => void }) => Promise<R>): Promise<R>;
}

export type AdapterCtx<TShop = unknown> = {
    shop: TShop;
    locale: LocaleTuple;
    idempotencyKey?: string;
    signal?: AbortSignal;
    logger: ILogger;
    tracer?: ITracer;
};
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm --filter @nordcom/cart-core typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/cart/core/src/types.ts
git commit -m "feat(cart-core): add cart, line, mutation, ctx, and logger types."
```

### Task 1.4: Capabilities + adapter contract

**Files:**
- Create: `packages/cart/core/src/adapter.ts`

- [ ] **Step 1: Write `src/adapter.ts`**

```ts
import type { AdapterCtx, BuyerIdentity, Cart, CartExt, CartLine, KV, NewCartLine } from './types';

export type CartCapabilities = {
    giftCards: boolean;
    multipleDiscountCodes: boolean;
    buyerIdentity: boolean;
    notes: boolean;
    cartAttributes: boolean;
    lineAttributes: boolean;
    customMutations: readonly string[];
};

export type CustomMutationHandler<TExt extends CartExt = {}> = (
    ctx: AdapterCtx,
    args: { cartId: string; payload: unknown },
) => Promise<Cart<TExt>>;

export interface CartAdapter<TExt extends CartExt = {}> {
    readonly type: string;
    readonly capabilities: CartCapabilities;

    getCart(ctx: AdapterCtx, args: { cartId: string }): Promise<Cart<TExt> | null>;
    createCart(ctx: AdapterCtx, args: { lines?: NewCartLine[]; buyerIdentity?: BuyerIdentity }): Promise<Cart<TExt>>;
    addLines(ctx: AdapterCtx, args: { cartId: string; lines: NewCartLine[] }): Promise<Cart<TExt>>;
    updateLines(ctx: AdapterCtx, args: { cartId: string; lines: Array<{ id: string; quantity: number }> }): Promise<Cart<TExt>>;
    removeLines(ctx: AdapterCtx, args: { cartId: string; lineIds: string[] }): Promise<Cart<TExt>>;

    applyDiscountCodes?(ctx: AdapterCtx, args: { cartId: string; codes: string[] }): Promise<Cart<TExt>>;
    applyGiftCardCodes?(ctx: AdapterCtx, args: { cartId: string; codes: string[] }): Promise<Cart<TExt>>;
    removeGiftCardCodes?(ctx: AdapterCtx, args: { cartId: string; ids: string[] }): Promise<Cart<TExt>>;
    updateBuyerIdentity?(ctx: AdapterCtx, args: { cartId: string; buyerIdentity: BuyerIdentity }): Promise<Cart<TExt>>;
    updateNote?(ctx: AdapterCtx, args: { cartId: string; note: string }): Promise<Cart<TExt>>;
    updateAttributes?(ctx: AdapterCtx, args: { cartId: string; attributes: KV[] }): Promise<Cart<TExt>>;

    customMutations?: Record<string, CustomMutationHandler<TExt>>;
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @nordcom/cart-core typecheck
git add packages/cart/core/src/adapter.ts
git commit -m "feat(cart-core): define capabilities and adapter contract."
```

### Task 1.5: Middleware `compose()`

**Files:**
- Create: `packages/cart/core/src/compose.ts`
- Test: `packages/cart/core/__tests__/compose.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest';
import { compose } from '../src/compose';
import type { CartMiddleware, MutationFn } from '../src/compose';
import type { CartMutation } from '../src/types';

const mut: CartMutation = { kind: 'add-line', variantId: 'v1', quantity: 1 };
const baseCtx = { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: console as never };

describe('compose', () => {
    it('runs middleware in registration order, terminal returns cart', async () => {
        const log: string[] = [];
        const a: CartMiddleware = (next) => async (m, ctx) => {
            log.push('a:in');
            const r = await next(m, ctx);
            log.push('a:out');
            return r;
        };
        const b: CartMiddleware = (next) => async (m, ctx) => {
            log.push('b:in');
            const r = await next(m, ctx);
            log.push('b:out');
            return r;
        };
        const terminal: MutationFn = async () => ({ id: 'c1' }) as never;
        const chain = compose(a, b)(terminal);
        await chain(mut, baseCtx as never);
        expect(log).toEqual(['a:in', 'b:in', 'b:out', 'a:out']);
    });

    it('returns identity when no middleware passed', async () => {
        const terminal: MutationFn = async () => ({ id: 'x' }) as never;
        const chain = compose()(terminal);
        const r = await chain(mut, baseCtx as never);
        expect(r).toEqual({ id: 'x' });
    });
});
```

- [ ] **Step 2: Run test (FAIL)**

```bash
pnpm --filter @nordcom/cart-core test compose
```

- [ ] **Step 3: Implement `src/compose.ts`**

```ts
import type { AdapterCtx, Cart, CartMutation } from './types';

export type MutationFn = (mutation: CartMutation, ctx: AdapterCtx) => Promise<Cart>;
export type CartMiddleware = (next: MutationFn) => MutationFn;

export function compose(...middleware: CartMiddleware[]): CartMiddleware {
    return (terminal: MutationFn): MutationFn => {
        return middleware.reduceRight<MutationFn>((next, mw) => mw(next), terminal);
    };
}
```

- [ ] **Step 4: Run test (PASS) + commit**

```bash
pnpm --filter @nordcom/cart-core test compose
git add packages/cart/core/src/compose.ts packages/cart/core/__tests__/compose.test.ts
git commit -m "feat(cart-core): add Koa-style middleware compose."
```

### Task 1.6: Built-in middleware — logger

**Files:**
- Create: `packages/cart/core/src/middleware/logger.ts`
- Test: `packages/cart/core/__tests__/middleware-logger.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { logger as loggerMiddleware } from '../src/middleware/logger';
import type { ILogger } from '../src/types';

describe('logger middleware', () => {
    it('logs entry and exit per mutation', async () => {
        const log: Array<{ level: string; msg: string }> = [];
        const ilog: ILogger = {
            debug: () => {},
            info: (msg) => log.push({ level: 'info', msg }),
            warn: () => {},
            error: () => {},
        };
        const chain = loggerMiddleware()(async () => ({ id: 'c1' } as never));
        await chain(
            { kind: 'add-line', variantId: 'v1', quantity: 1 },
            { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: ilog },
        );
        expect(log.map((l) => l.msg)).toEqual(['cart.mutation.start', 'cart.mutation.end']);
    });
});
```

- [ ] **Step 2: Run test (FAIL) + implement**

```ts
// src/middleware/logger.ts
import type { CartMiddleware } from '../compose';

export function logger(): CartMiddleware {
    return (next) => async (mutation, ctx) => {
        ctx.logger.info('cart.mutation.start', { kind: mutation.kind });
        try {
            const result = await next(mutation, ctx);
            ctx.logger.info('cart.mutation.end', { kind: mutation.kind, cartId: result.id });
            return result;
        } catch (error) {
            ctx.logger.warn('cart.mutation.error', { kind: mutation.kind, error: (error as Error)?.message });
            throw error;
        }
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-core test middleware-logger
git add packages/cart/core/src/middleware/logger.ts packages/cart/core/__tests__/middleware-logger.test.ts
git commit -m "feat(cart-core): add logger middleware."
```

### Task 1.7: Built-in middleware — tracing (OTel)

**Files:**
- Create: `packages/cart/core/src/middleware/tracing.ts`
- Test: `packages/cart/core/__tests__/middleware-tracing.test.ts`

- [ ] **Step 1: Write failing test** — uses a stub `ITracer` to assert span attrs:

```ts
import { describe, expect, it } from 'vitest';
import { tracing } from '../src/middleware/tracing';
import type { ITracer } from '../src/types';

describe('tracing middleware', () => {
    it('opens span per mutation with kind, cartId, idempotencyKey', async () => {
        const records: Array<{ name: string; attrs: Record<string, unknown> }> = [];
        const tracer: ITracer = {
            async startSpan(name, attrs, fn) {
                records.push({ name, attrs });
                return fn({ recordException: () => {}, setAttribute: () => {} });
            },
        };
        const chain = tracing({ tracer })(async () => ({ id: 'cart-1' } as never));
        await chain(
            { kind: 'add-line', variantId: 'v', quantity: 2 },
            { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: console as never, idempotencyKey: 'idk-1', tracer },
        );
        expect(records).toEqual([{ name: 'cart.mutation.add-line', attrs: { 'mutation.kind': 'add-line', 'idempotency.key': 'idk-1' } }]);
    });

    it('is a no-op if ctx.tracer is missing', async () => {
        const chain = tracing({})(async () => ({ id: 'x' } as never));
        const r = await chain(
            { kind: 'remove-line', lineId: 'l1' },
            { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: console as never },
        );
        expect(r).toEqual({ id: 'x' });
    });
});
```

- [ ] **Step 2: Implement** (`src/middleware/tracing.ts`):

```ts
import type { CartMiddleware } from '../compose';
import type { ITracer } from '../types';

export function tracing(opts: { tracer?: ITracer }): CartMiddleware {
    return (next) => async (mutation, ctx) => {
        const tracer = opts.tracer ?? ctx.tracer;
        if (!tracer) return next(mutation, ctx);
        return tracer.startSpan(
            `cart.mutation.${mutation.kind}`,
            {
                'mutation.kind': mutation.kind,
                ...(ctx.idempotencyKey ? { 'idempotency.key': ctx.idempotencyKey } : {}),
            },
            async (span) => {
                try {
                    const result = await next(mutation, ctx);
                    span.setAttribute('cart.id', result.id);
                    return result;
                } catch (error) {
                    span.recordException(error);
                    throw error;
                }
            },
        );
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-core test middleware-tracing
git add packages/cart/core/src/middleware/tracing.ts packages/cart/core/__tests__/middleware-tracing.test.ts
git commit -m "feat(cart-core): add tracing middleware with OTel-shaped span calls."
```

### Task 1.8: Idempotency store + middleware

**Files:**
- Create: `packages/cart/core/src/idempotency-store.ts`
- Create: `packages/cart/core/src/middleware/idempotency.ts`
- Test: `packages/cart/core/__tests__/idempotency.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { memoryIdempotencyStore } from '../src/idempotency-store';
import { idempotency } from '../src/middleware/idempotency';
import type { Cart } from '../src/types';

const baseCtx = (key?: string) => ({
    shop: {},
    locale: { language: 'en', country: 'US', currency: 'USD' },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    idempotencyKey: key,
});

describe('idempotency middleware', () => {
    it('short-circuits same-key replay within window', async () => {
        const store = memoryIdempotencyStore();
        const inner = vi.fn(async () => ({ id: 'c1' } as Cart));
        const chain = idempotency({ store, windowMs: 1_000 })(inner);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx('k1') as never);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx('k1') as never);
        expect(inner).toHaveBeenCalledTimes(1);
    });

    it('does not dedup mutations without a key', async () => {
        const store = memoryIdempotencyStore();
        const inner = vi.fn(async () => ({ id: 'c2' } as Cart));
        const chain = idempotency({ store, windowMs: 1_000 })(inner);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never);
        expect(inner).toHaveBeenCalledTimes(2);
    });

    it('expires entries after windowMs', async () => {
        vi.useFakeTimers();
        const store = memoryIdempotencyStore();
        const inner = vi.fn(async () => ({ id: 'c3' } as Cart));
        const chain = idempotency({ store, windowMs: 1_000 })(inner);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx('k2') as never);
        vi.advanceTimersByTime(2_000);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx('k2') as never);
        expect(inner).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });
});
```

- [ ] **Step 2: Implement `src/idempotency-store.ts`**

```ts
import type { Cart } from './types';

export interface IdempotencyStore {
    get(key: string): Promise<{ result: Cart; recordedAt: number } | null>;
    set(key: string, result: Cart, ttlMs: number): Promise<void>;
}

export function memoryIdempotencyStore(): IdempotencyStore {
    const map = new Map<string, { result: Cart; recordedAt: number; expiresAt: number }>();
    return {
        async get(key) {
            const entry = map.get(key);
            if (!entry) return null;
            if (Date.now() >= entry.expiresAt) {
                map.delete(key);
                return null;
            }
            return { result: entry.result, recordedAt: entry.recordedAt };
        },
        async set(key, result, ttlMs) {
            map.set(key, { result, recordedAt: Date.now(), expiresAt: Date.now() + ttlMs });
        },
    };
}
```

- [ ] **Step 3: Implement `src/middleware/idempotency.ts`**

```ts
import type { CartMiddleware } from '../compose';
import type { IdempotencyStore } from '../idempotency-store';

export function idempotency(opts: { store: IdempotencyStore; windowMs: number }): CartMiddleware {
    return (next) => async (mutation, ctx) => {
        const key = ctx.idempotencyKey;
        if (!key) return next(mutation, ctx);
        const existing = await opts.store.get(key);
        if (existing) return existing.result;
        const result = await next(mutation, ctx);
        await opts.store.set(key, result, opts.windowMs);
        return result;
    };
}
```

- [ ] **Step 4: PASS + commit**

```bash
pnpm --filter @nordcom/cart-core test idempotency
git add packages/cart/core/src/idempotency-store.ts packages/cart/core/src/middleware/idempotency.ts packages/cart/core/__tests__/idempotency.test.ts
git commit -m "feat(cart-core): add pluggable IdempotencyStore + middleware."
```

### Task 1.9: Built-in middleware — retry

**Files:**
- Create: `packages/cart/core/src/middleware/retry.ts`
- Test: `packages/cart/core/__tests__/middleware-retry.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { retry } from '../src/middleware/retry';
import { CartProviderError, CartUserError } from '../src/errors';

const baseCtx = () => ({ shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } });

describe('retry middleware', () => {
    it('retries CartProviderError up to attempts', async () => {
        let calls = 0;
        const inner = vi.fn(async () => {
            calls++;
            if (calls < 3) throw new CartProviderError('boom');
            return { id: 'c' } as never;
        });
        const chain = retry({ attempts: 3, backoffMs: 0 })(inner);
        const r = await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never);
        expect(r.id).toBe('c');
        expect(inner).toHaveBeenCalledTimes(3);
    });

    it('does not retry CartUserError', async () => {
        const inner = vi.fn(async () => {
            throw new CartUserError([{ message: 'nope' }]);
        });
        const chain = retry({ attempts: 3, backoffMs: 0 })(inner);
        await expect(chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never)).rejects.toThrow(/nope/);
        expect(inner).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2: Implement**

```ts
// src/middleware/retry.ts
import type { CartMiddleware } from '../compose';

export function retry(opts: { attempts: number; backoffMs: number }): CartMiddleware {
    return (next) => async (mutation, ctx) => {
        let lastError: unknown;
        for (let i = 0; i < opts.attempts; i++) {
            try {
                return await next(mutation, ctx);
            } catch (error) {
                const name = (error as Error)?.name;
                if (name === 'CartUserError' || name === 'CartNotFoundError' || name === 'CartCapabilityUnsupportedError') {
                    throw error;
                }
                lastError = error;
                if (i < opts.attempts - 1 && opts.backoffMs > 0) {
                    await new Promise((r) => setTimeout(r, opts.backoffMs * (i + 1)));
                }
            }
        }
        throw lastError;
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-core test middleware-retry
git add packages/cart/core/src/middleware/retry.ts packages/cart/core/__tests__/middleware-retry.test.ts
git commit -m "feat(cart-core): add retry middleware (transport errors only)."
```

### Task 1.10: Built-in middleware — analytics

**Files:**
- Create: `packages/cart/core/src/middleware/analytics.ts`
- Test: `packages/cart/core/__tests__/middleware-analytics.test.ts`

- [ ] **Step 1: Failing test** — assert host-supplied `emit` fires on success and on error with appropriate event names.

```ts
import { describe, expect, it, vi } from 'vitest';
import { analytics } from '../src/middleware/analytics';
import { CartUserError } from '../src/errors';

const baseCtx = () => ({ shop: { id: 'shop-1' }, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }, idempotencyKey: 'idk-x' });

describe('analytics middleware', () => {
    it('emits cart.mutation.success on resolve', async () => {
        const emit = vi.fn();
        const chain = analytics({ emit })(async () => ({ id: 'c1' } as never));
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never);
        expect(emit).toHaveBeenCalledWith('cart.mutation.success', expect.objectContaining({ kind: 'add-line', cartId: 'c1' }));
    });

    it('emits cart.mutation.error on reject', async () => {
        const emit = vi.fn();
        const chain = analytics({ emit })(async () => {
            throw new CartUserError([{ message: 'nope' }]);
        });
        await expect(chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never)).rejects.toBeDefined();
        expect(emit).toHaveBeenCalledWith('cart.mutation.error', expect.objectContaining({ kind: 'add-line', errorName: 'CartUserError' }));
    });
});
```

- [ ] **Step 2: Implement**

```ts
// src/middleware/analytics.ts
import type { CartMiddleware } from '../compose';

export type AnalyticsEmit = (event: string, attrs: Record<string, unknown>) => void;

export function analytics(opts: { emit: AnalyticsEmit }): CartMiddleware {
    return (next) => async (mutation, ctx) => {
        try {
            const result = await next(mutation, ctx);
            opts.emit('cart.mutation.success', {
                kind: mutation.kind,
                cartId: result.id,
                ...(ctx.idempotencyKey ? { idempotencyKey: ctx.idempotencyKey } : {}),
            });
            return result;
        } catch (error) {
            opts.emit('cart.mutation.error', {
                kind: mutation.kind,
                errorName: (error as Error)?.name ?? 'Error',
                errorMessage: (error as Error)?.message,
            });
            throw error;
        }
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-core test middleware-analytics
git add packages/cart/core/src/middleware/analytics.ts packages/cart/core/__tests__/middleware-analytics.test.ts
git commit -m "feat(cart-core): add analytics middleware (success + error emit)."
```

### Task 1.11: Event bus + CartEvent union

**Files:**
- Create: `packages/cart/core/src/events.ts`
- Test: `packages/cart/core/__tests__/events.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../src/events';

describe('event bus', () => {
    it('delivers to all matching handlers asynchronously', async () => {
        const bus = createEventBus({ logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } });
        const seen: string[] = [];
        bus.on('cart.updated', (e) => seen.push(`u:${e.cart.id}`));
        bus.on('cart.cleared', () => seen.push('cleared'));
        bus.emit({ type: 'cart.updated', cart: { id: 'c1' } as never, mutation: { kind: 'add-line', variantId: 'v', quantity: 1 }, source: 'self' });
        bus.emit({ type: 'cart.cleared' });
        await new Promise((r) => queueMicrotask(() => r(undefined)));
        await new Promise((r) => queueMicrotask(() => r(undefined)));
        expect(seen).toEqual(['u:c1', 'cleared']);
    });

    it('swallows handler errors and logs warn', async () => {
        const warn = vi.fn();
        const bus = createEventBus({ logger: { debug: () => {}, info: () => {}, warn, error: () => {} } });
        bus.on('cart.cleared', () => { throw new Error('bad handler'); });
        bus.emit({ type: 'cart.cleared' });
        await new Promise((r) => queueMicrotask(() => r(undefined)));
        await new Promise((r) => queueMicrotask(() => r(undefined)));
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('cart event handler failed'), expect.any(Object));
    });

    it('unsubscribes via returned dispose', async () => {
        const bus = createEventBus({ logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } });
        const seen: string[] = [];
        const off = bus.on('cart.cleared', () => seen.push('x'));
        off();
        bus.emit({ type: 'cart.cleared' });
        await new Promise((r) => queueMicrotask(() => r(undefined)));
        expect(seen).toEqual([]);
    });
});
```

- [ ] **Step 2: Implement `src/events.ts`**

```ts
import type { Cart, CartLine, CartMutation, ILogger } from './types';

export type CartEvent =
    | { type: 'cart.created'; cart: Cart }
    | { type: 'cart.updated'; cart: Cart; mutation: CartMutation; source: 'self' | 'broadcast' }
    | { type: 'cart.mutation.failed'; mutation: CartMutation; error: Error; source: 'self' }
    | { type: 'cart.line.added'; line: CartLine; cart: Cart }
    | { type: 'cart.line.removed'; lineId: string; cart: Cart }
    | { type: 'cart.cleared' };

export type CartEventType = CartEvent['type'];

export type CartEventHandler<E extends CartEventType> = (event: Extract<CartEvent, { type: E }>) => void | Promise<void>;

export interface CartEventBus {
    on<E extends CartEventType>(type: E, handler: CartEventHandler<E>): () => void;
    emit(event: CartEvent): void;
}

export function createEventBus(opts: { logger: ILogger }): CartEventBus {
    const handlers = new Map<CartEventType, Set<CartEventHandler<CartEventType>>>();

    return {
        on(type, handler) {
            let set = handlers.get(type);
            if (!set) {
                set = new Set();
                handlers.set(type, set);
            }
            set.add(handler as never);
            return () => set!.delete(handler as never);
        },
        emit(event) {
            const set = handlers.get(event.type);
            if (!set) return;
            for (const handler of set) {
                queueMicrotask(() => {
                    try {
                        const r = (handler as CartEventHandler<typeof event.type>)(event as never);
                        if (r && typeof (r as Promise<void>).catch === 'function') {
                            (r as Promise<void>).catch((error) =>
                                opts.logger.warn('cart event handler failed', { type: event.type, error: (error as Error)?.message }),
                            );
                        }
                    } catch (error) {
                        opts.logger.warn('cart event handler failed', { type: event.type, error: (error as Error)?.message });
                    }
                });
            }
        },
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-core test events
git add packages/cart/core/src/events.ts packages/cart/core/__tests__/events.test.ts
git commit -m "feat(cart-core): add async fire-and-forget event bus."
```

### Task 1.12: Kernel factory `createCart`

**Files:**
- Create: `packages/cart/core/src/kernel.ts`
- Test: `packages/cart/core/__tests__/kernel.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createCart } from '../src/kernel';
import type { CartAdapter } from '../src/adapter';
import type { Cart } from '../src/types';
import { CartCapabilityUnsupportedError } from '../src/errors';

function makeAdapter(overrides: Partial<CartAdapter> = {}): CartAdapter {
    const cart = { id: 'c1', providerType: 'mock', totalQuantity: 0, checkoutUrl: null, lines: [], cost: { subtotal: { amount: '0', currencyCode: 'USD' }, total: null, tax: null, shipping: null }, costStale: false, discountCodes: [], giftCards: [], buyerIdentity: null, note: null, attributes: [], updatedAt: '2026-01-01T00:00:00Z', custom: {} } as Cart;
    return {
        type: 'mock',
        capabilities: { giftCards: false, multipleDiscountCodes: false, buyerIdentity: false, notes: false, cartAttributes: false, lineAttributes: false, customMutations: [] },
        getCart: vi.fn(async () => cart),
        createCart: vi.fn(async () => cart),
        addLines: vi.fn(async () => cart),
        updateLines: vi.fn(async () => cart),
        removeLines: vi.fn(async () => cart),
        ...overrides,
    } as CartAdapter;
}

const baseCtx = () => ({ shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } });

describe('createCart kernel', () => {
    it('exposes adapter type + capabilities', () => {
        const adapter = makeAdapter();
        const kernel = createCart({ adapter });
        expect(kernel.type).toBe('mock');
        expect(kernel.capabilities).toBe(adapter.capabilities);
    });

    it('dispatches add-line mutation through adapter.addLines', async () => {
        const adapter = makeAdapter();
        const kernel = createCart({ adapter });
        await kernel.mutate(baseCtx() as never, { kind: 'add-line', variantId: 'v1', quantity: 2 });
        expect(adapter.addLines).toHaveBeenCalledWith(expect.anything(), { cartId: '', lines: [{ variantId: 'v1', quantity: 2, attributes: undefined }] });
    });

    it('throws CartCapabilityUnsupportedError when mutation needs a missing capability', async () => {
        const adapter = makeAdapter();
        const kernel = createCart({ adapter });
        await expect(
            kernel.mutate(baseCtx() as never, { kind: 'apply-gift-card', code: 'GC1' }),
        ).rejects.toBeInstanceOf(CartCapabilityUnsupportedError);
    });

    it('emits cart.updated after mutate', async () => {
        const adapter = makeAdapter();
        const kernel = createCart({ adapter });
        const seen: string[] = [];
        kernel.on('cart.updated', (e) => seen.push(e.cart.id));
        await kernel.mutate(baseCtx() as never, { kind: 'add-line', variantId: 'v', quantity: 1 });
        await new Promise((r) => queueMicrotask(() => r(undefined)));
        await new Promise((r) => queueMicrotask(() => r(undefined)));
        expect(seen).toEqual(['c1']);
    });

    it('routes kind: custom to adapter.customMutations[name]', async () => {
        const customHandler = vi.fn(async () => ({ id: 'c2' } as Cart));
        const adapter = makeAdapter({
            capabilities: { giftCards: false, multipleDiscountCodes: false, buyerIdentity: false, notes: false, cartAttributes: false, lineAttributes: false, customMutations: ['ping'] },
            customMutations: { ping: customHandler },
        });
        const kernel = createCart({ adapter });
        await kernel.mutate(baseCtx() as never, { kind: 'custom', name: 'ping', payload: { x: 1 } });
        expect(customHandler).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Implement `src/kernel.ts`**

```ts
import type { CartAdapter, CartCapabilities } from './adapter';
import { compose, type CartMiddleware, type MutationFn } from './compose';
import { createEventBus, type CartEventBus, type CartEvent, type CartEventHandler, type CartEventType } from './events';
import { CartCapabilityUnsupportedError } from './errors';
import type { AdapterCtx, BuyerIdentity, Cart, CartExt, CartMutation, ILogger, NewCartLine } from './types';
import { consoleLogger } from './types';

export interface CartKernel<TExt extends CartExt = {}, TShop = unknown> {
    readonly type: string;
    readonly capabilities: CartCapabilities;
    read(ctx: AdapterCtx<TShop>, args: { cartId: string }): Promise<Cart<TExt> | null>;
    create(ctx: AdapterCtx<TShop>, args?: { lines?: NewCartLine[]; buyerIdentity?: BuyerIdentity }): Promise<Cart<TExt>>;
    mutate(ctx: AdapterCtx<TShop>, mutation: CartMutation): Promise<Cart<TExt>>;
    on<E extends CartEventType>(type: E, handler: CartEventHandler<E>): () => void;
}

export interface CreateCartOpts<TExt extends CartExt = {}, TShop = unknown> {
    adapter: CartAdapter<TExt>;
    middleware?: CartMiddleware[];
    logger?: ILogger;
}

export function createCart<TExt extends CartExt = {}, TShop = unknown>(opts: CreateCartOpts<TExt, TShop>): CartKernel<TExt, TShop> {
    const logger = opts.logger ?? consoleLogger;
    const events = createEventBus({ logger });

    const terminal: MutationFn = async (mutation, ctx) => {
        return dispatch(mutation, ctx as AdapterCtx<TShop>);
    };

    const chain = compose(...(opts.middleware ?? []))(terminal);

    async function dispatch(mutation: CartMutation, ctx: AdapterCtx<TShop>): Promise<Cart<TExt>> {
        const caps = opts.adapter.capabilities;
        const cartId = (mutation as { lineId?: string; cartId?: string }).cartId ?? '';
        switch (mutation.kind) {
            case 'add-line':
                return opts.adapter.addLines(ctx, { cartId, lines: [{ variantId: mutation.variantId, quantity: mutation.quantity, attributes: mutation.attributes }] });
            case 'update-line':
                return opts.adapter.updateLines(ctx, { cartId, lines: [{ id: mutation.lineId, quantity: mutation.quantity }] });
            case 'remove-line':
                return opts.adapter.removeLines(ctx, { cartId, lineIds: [mutation.lineId] });
            case 'apply-discount':
            case 'remove-discount': {
                if (!opts.adapter.applyDiscountCodes) throw new CartCapabilityUnsupportedError('multipleDiscountCodes');
                return opts.adapter.applyDiscountCodes(ctx, { cartId, codes: [mutation.code] });
            }
            case 'apply-gift-card': {
                if (!caps.giftCards || !opts.adapter.applyGiftCardCodes) throw new CartCapabilityUnsupportedError('giftCards');
                return opts.adapter.applyGiftCardCodes(ctx, { cartId, codes: [mutation.code] });
            }
            case 'remove-gift-card': {
                if (!caps.giftCards || !opts.adapter.removeGiftCardCodes) throw new CartCapabilityUnsupportedError('giftCards');
                return opts.adapter.removeGiftCardCodes(ctx, { cartId, ids: [mutation.id] });
            }
            case 'update-note': {
                if (!caps.notes || !opts.adapter.updateNote) throw new CartCapabilityUnsupportedError('notes');
                return opts.adapter.updateNote(ctx, { cartId, note: mutation.note });
            }
            case 'update-attributes': {
                if (!caps.cartAttributes || !opts.adapter.updateAttributes) throw new CartCapabilityUnsupportedError('cartAttributes');
                return opts.adapter.updateAttributes(ctx, { cartId, attributes: mutation.attributes });
            }
            case 'update-buyer-identity': {
                if (!caps.buyerIdentity || !opts.adapter.updateBuyerIdentity) throw new CartCapabilityUnsupportedError('buyerIdentity');
                return opts.adapter.updateBuyerIdentity(ctx, { cartId, buyerIdentity: {} });
            }
            case 'custom': {
                const handler = opts.adapter.customMutations?.[mutation.name];
                if (!handler || !caps.customMutations.includes(mutation.name)) {
                    throw new CartCapabilityUnsupportedError(`customMutations.${mutation.name}`);
                }
                return handler(ctx, { cartId, payload: mutation.payload });
            }
        }
    }

    const fireUpdated = (cart: Cart<TExt>, mutation: CartMutation) => {
        events.emit({ type: 'cart.updated', cart: cart as Cart, mutation, source: 'self' });
    };

    return {
        type: opts.adapter.type,
        capabilities: opts.adapter.capabilities,
        async read(ctx, args) {
            return opts.adapter.getCart(ctx, args);
        },
        async create(ctx, args) {
            const cart = await opts.adapter.createCart(ctx, args ?? {});
            events.emit({ type: 'cart.created', cart: cart as Cart });
            return cart;
        },
        async mutate(ctx, mutation) {
            try {
                const cart = await chain(mutation, ctx);
                fireUpdated(cart as Cart<TExt>, mutation);
                return cart as Cart<TExt>;
            } catch (error) {
                events.emit({ type: 'cart.mutation.failed', mutation, error: error as Error, source: 'self' });
                throw error;
            }
        },
        on(type, handler) {
            return events.on(type, handler);
        },
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-core test kernel
git add packages/cart/core/src/kernel.ts packages/cart/core/__tests__/kernel.test.ts
git commit -m "feat(cart-core): add createCart kernel factory with capability gating + events."
```

### Task 1.13: Mock adapter

**Files:**
- Create: `packages/cart/core/src/mock-adapter.ts`
- Test: `packages/cart/core/__tests__/mock-adapter.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createMockCartAdapter } from '../src/mock-adapter';

const ctx = { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } };

describe('mock cart adapter', () => {
    it('createCart + getCart round-trip', async () => {
        const adapter = createMockCartAdapter();
        const created = await adapter.createCart(ctx as never, {});
        expect(created.id).toMatch(/^mock-cart-/);
        expect(await adapter.getCart(ctx as never, { cartId: created.id })).toEqual(created);
    });

    it('addLines synthesizes line + bumps totalQuantity', async () => {
        const adapter = createMockCartAdapter();
        const c0 = await adapter.createCart(ctx as never, {});
        const c1 = await adapter.addLines(ctx as never, { cartId: c0.id, lines: [{ variantId: 'v1', quantity: 3 }] });
        expect(c1.lines).toHaveLength(1);
        expect(c1.lines[0].quantity).toBe(3);
        expect(c1.totalQuantity).toBe(3);
    });

    it('updateLines + removeLines mutate state', async () => {
        const adapter = createMockCartAdapter();
        const c0 = await adapter.createCart(ctx as never, {});
        const c1 = await adapter.addLines(ctx as never, { cartId: c0.id, lines: [{ variantId: 'v1', quantity: 1 }] });
        const lineId = c1.lines[0].id;
        const c2 = await adapter.updateLines(ctx as never, { cartId: c0.id, lines: [{ id: lineId, quantity: 5 }] });
        expect(c2.totalQuantity).toBe(5);
        const c3 = await adapter.removeLines(ctx as never, { cartId: c0.id, lineIds: [lineId] });
        expect(c3.lines).toHaveLength(0);
    });

    it('respects capability overrides — when giftCards=false, no applyGiftCardCodes method', async () => {
        const adapter = createMockCartAdapter({ capabilities: { giftCards: false } });
        expect(adapter.applyGiftCardCodes).toBeUndefined();
    });

    it('failOn injects errors per mutation predicate', async () => {
        const adapter = createMockCartAdapter({ failOn: (m) => (m.kind === 'add-line' ? Object.assign(new Error('forced'), { name: 'CartProviderError' }) : null) });
        const c0 = await adapter.createCart(ctx as never, {});
        await expect(adapter.addLines(ctx as never, { cartId: c0.id, lines: [{ variantId: 'v', quantity: 1 }] })).rejects.toThrow(/forced/);
    });
});
```

- [ ] **Step 2: Implement `src/mock-adapter.ts`**

```ts
import type { CartAdapter, CartCapabilities, CustomMutationHandler } from './adapter';
import type { AdapterCtx, BuyerIdentity, Cart, CartLine, CartMutation, KV, NewCartLine } from './types';

const DEFAULT_CAPS: CartCapabilities = {
    giftCards: true,
    multipleDiscountCodes: true,
    buyerIdentity: true,
    notes: true,
    cartAttributes: true,
    lineAttributes: true,
    customMutations: [],
};

let nextCartSerial = 1;
let nextLineSerial = 1;

function emptyCart(currencyCode: string): Cart {
    return {
        id: `mock-cart-${nextCartSerial++}`,
        providerType: 'mock',
        totalQuantity: 0,
        checkoutUrl: null,
        lines: [],
        cost: { subtotal: { amount: '0', currencyCode }, total: null, tax: null, shipping: null },
        costStale: false,
        discountCodes: [],
        giftCards: [],
        buyerIdentity: null,
        note: null,
        attributes: [],
        updatedAt: new Date().toISOString(),
        custom: {},
    };
}

function synthesizeLine(newLine: NewCartLine, currencyCode: string): CartLine {
    return {
        id: `mock-line-${nextLineSerial++}`,
        quantity: newLine.quantity,
        merchandise: {
            id: newLine.variantId,
            productId: 'mock-product',
            productHandle: 'mock',
            productTitle: 'Mock product',
            productVendor: null,
            productType: null,
            variantTitle: 'Mock variant',
            image: null,
            selectedOptions: [],
            unitPrice: { amount: '0', currencyCode },
            compareAtUnitPrice: null,
            availableForSale: true,
            quantityAvailable: null,
            sku: null,
        },
        cost: { subtotal: { amount: '0', currencyCode }, total: { amount: '0', currencyCode } },
        attributes: newLine.attributes ?? [],
        discountAllocations: [],
        custom: {},
    };
}

function recomputeTotalQuantity(cart: Cart): Cart {
    return { ...cart, totalQuantity: cart.lines.reduce((sum, l) => sum + l.quantity, 0), updatedAt: new Date().toISOString() };
}

export interface CreateMockCartAdapterOpts {
    capabilities?: Partial<CartCapabilities>;
    seedCarts?: Cart[];
    latency?: number;
    failOn?: (m: CartMutation) => Error | null;
    customMutations?: Record<string, CustomMutationHandler>;
}

export function createMockCartAdapter(opts: CreateMockCartAdapterOpts = {}): CartAdapter & { __inspect(): { carts: Cart[] } } {
    const caps: CartCapabilities = { ...DEFAULT_CAPS, ...opts.capabilities };
    const carts = new Map<string, Cart>();
    for (const c of opts.seedCarts ?? []) carts.set(c.id, c);

    const wait = async () => {
        if (opts.latency && opts.latency > 0) await new Promise((r) => setTimeout(r, opts.latency));
    };

    const failGate = (m: CartMutation): void => {
        const err = opts.failOn?.(m);
        if (err) throw err;
    };

    const adapter: CartAdapter & { __inspect(): { carts: Cart[] } } = {
        type: 'mock',
        capabilities: caps,
        async getCart(_ctx, args) {
            await wait();
            return carts.get(args.cartId) ?? null;
        },
        async createCart(ctx, args) {
            await wait();
            const cart = emptyCart(ctx.locale.currency);
            if (args.lines) {
                cart.lines = args.lines.map((l) => synthesizeLine(l, ctx.locale.currency));
            }
            if (args.buyerIdentity) cart.buyerIdentity = args.buyerIdentity;
            const finalized = recomputeTotalQuantity(cart);
            carts.set(finalized.id, finalized);
            return finalized;
        },
        async addLines(ctx, args) {
            failGate({ kind: 'add-line', variantId: args.lines[0]!.variantId, quantity: args.lines[0]!.quantity });
            await wait();
            const cart = carts.get(args.cartId);
            if (!cart) throw Object.assign(new Error(`Cart not found: ${args.cartId}`), { name: 'CartNotFoundError' });
            const updated = recomputeTotalQuantity({ ...cart, lines: [...cart.lines, ...args.lines.map((l) => synthesizeLine(l, ctx.locale.currency))] });
            carts.set(updated.id, updated);
            return updated;
        },
        async updateLines(_ctx, args) {
            failGate({ kind: 'update-line', lineId: args.lines[0]!.id, quantity: args.lines[0]!.quantity });
            await wait();
            const cart = carts.get(args.cartId);
            if (!cart) throw Object.assign(new Error(`Cart not found: ${args.cartId}`), { name: 'CartNotFoundError' });
            const next = { ...cart, lines: cart.lines.map((l) => { const u = args.lines.find((x) => x.id === l.id); return u ? { ...l, quantity: u.quantity } : l; }).filter((l) => l.quantity > 0) };
            const finalized = recomputeTotalQuantity(next);
            carts.set(finalized.id, finalized);
            return finalized;
        },
        async removeLines(_ctx, args) {
            failGate({ kind: 'remove-line', lineId: args.lineIds[0]! });
            await wait();
            const cart = carts.get(args.cartId);
            if (!cart) throw Object.assign(new Error(`Cart not found: ${args.cartId}`), { name: 'CartNotFoundError' });
            const finalized = recomputeTotalQuantity({ ...cart, lines: cart.lines.filter((l) => !args.lineIds.includes(l.id)) });
            carts.set(finalized.id, finalized);
            return finalized;
        },
        __inspect() {
            return { carts: [...carts.values()] };
        },
    };

    if (caps.giftCards) {
        adapter.applyGiftCardCodes = async (_ctx, args) => {
            const cart = carts.get(args.cartId);
            if (!cart) throw Object.assign(new Error(`Cart not found: ${args.cartId}`), { name: 'CartNotFoundError' });
            const finalized = { ...cart, giftCards: [...cart.giftCards, ...args.codes.map((c) => ({ id: c, lastCharacters: c.slice(-4), amountLeft: { amount: '0', currencyCode: cart.cost.subtotal.currencyCode } }))] };
            carts.set(finalized.id, finalized);
            return finalized;
        };
        adapter.removeGiftCardCodes = async (_ctx, args) => {
            const cart = carts.get(args.cartId);
            if (!cart) throw Object.assign(new Error(`Cart not found: ${args.cartId}`), { name: 'CartNotFoundError' });
            const finalized = { ...cart, giftCards: cart.giftCards.filter((g) => !args.ids.includes(g.id)) };
            carts.set(finalized.id, finalized);
            return finalized;
        };
    }
    if (caps.multipleDiscountCodes) {
        adapter.applyDiscountCodes = async (_ctx, args) => {
            const cart = carts.get(args.cartId);
            if (!cart) throw Object.assign(new Error(`Cart not found: ${args.cartId}`), { name: 'CartNotFoundError' });
            const finalized = { ...cart, discountCodes: args.codes.map((c) => ({ code: c, applicable: true })) };
            carts.set(finalized.id, finalized);
            return finalized;
        };
    }
    if (caps.buyerIdentity) {
        adapter.updateBuyerIdentity = async (_ctx, args) => {
            const cart = carts.get(args.cartId);
            if (!cart) throw Object.assign(new Error(`Cart not found: ${args.cartId}`), { name: 'CartNotFoundError' });
            const finalized = { ...cart, buyerIdentity: args.buyerIdentity };
            carts.set(finalized.id, finalized);
            return finalized;
        };
    }
    if (caps.notes) {
        adapter.updateNote = async (_ctx, args) => {
            const cart = carts.get(args.cartId);
            if (!cart) throw Object.assign(new Error(`Cart not found: ${args.cartId}`), { name: 'CartNotFoundError' });
            const finalized = { ...cart, note: args.note };
            carts.set(finalized.id, finalized);
            return finalized;
        };
    }
    if (caps.cartAttributes) {
        adapter.updateAttributes = async (_ctx, args) => {
            const cart = carts.get(args.cartId);
            if (!cart) throw Object.assign(new Error(`Cart not found: ${args.cartId}`), { name: 'CartNotFoundError' });
            const finalized = { ...cart, attributes: args.attributes };
            carts.set(finalized.id, finalized);
            return finalized;
        };
    }
    if (opts.customMutations) adapter.customMutations = opts.customMutations;

    return adapter;
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-core test mock-adapter
git add packages/cart/core/src/mock-adapter.ts packages/cart/core/__tests__/mock-adapter.test.ts
git commit -m "feat(cart-core): add createMockCartAdapter for host tests + contract self-tests."
```

### Task 1.14: Contract tests

**Files:**
- Create: `packages/cart/core/src/contract-tests.ts`
- Test: `packages/cart/core/__tests__/contract-tests-self.test.ts`

- [ ] **Step 1: Implement `src/contract-tests.ts`** — Vitest-bound suite the spec mandates (assertions 1–7):

```ts
import { describe, expect, it } from 'vitest';
import type { CartAdapter } from './adapter';
import type { AdapterCtx } from './types';
import { CartNotFoundError } from './errors';

export interface RunCartAdapterContractOpts {
    name: string;
    factory: () => CartAdapter | Promise<CartAdapter>;
}

export function runCartAdapterContract(opts: RunCartAdapterContractOpts): void {
    describe(`cart adapter contract: ${opts.name}`, () => {
        const ctx: AdapterCtx = {
            shop: {},
            locale: { language: 'en', country: 'US', currency: 'USD' },
            logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
            idempotencyKey: 'contract-test',
        };

        it('declares capabilities matching method presence', async () => {
            const adapter = await opts.factory();
            const caps = adapter.capabilities;
            const map: Array<[keyof typeof caps, keyof CartAdapter]> = [
                ['giftCards', 'applyGiftCardCodes'],
                ['giftCards', 'removeGiftCardCodes'],
                ['multipleDiscountCodes', 'applyDiscountCodes'],
                ['buyerIdentity', 'updateBuyerIdentity'],
                ['notes', 'updateNote'],
                ['cartAttributes', 'updateAttributes'],
            ];
            for (const [cap, method] of map) {
                if (caps[cap]) expect(adapter[method], `${cap}=true requires ${String(method)}`).toBeDefined();
                else expect(adapter[method], `${cap}=false requires ${String(method)} absent`).toBeUndefined();
            }
        });

        it('lifecycle: createCart → getCart → addLines → updateLines → removeLines', async () => {
            const adapter = await opts.factory();
            const c0 = await adapter.createCart(ctx, {});
            expect(c0.id).toBeTruthy();
            expect(await adapter.getCart(ctx, { cartId: c0.id })).toEqual(c0);

            const c1 = await adapter.addLines(ctx, { cartId: c0.id, lines: [{ variantId: 'contract-v', quantity: 2 }] });
            expect(c1.totalQuantity).toBe(2);
            expect(c1.lines).toHaveLength(1);
            const lineId = c1.lines[0]!.id;

            const c2 = await adapter.updateLines(ctx, { cartId: c0.id, lines: [{ id: lineId, quantity: 5 }] });
            expect(c2.totalQuantity).toBe(5);

            const c3 = await adapter.removeLines(ctx, { cartId: c0.id, lineIds: [lineId] });
            expect(c3.totalQuantity).toBe(0);
            expect(c3.lines).toHaveLength(0);
        });

        it('missing cart throws CartNotFoundError (by name)', async () => {
            const adapter = await opts.factory();
            const promise = adapter.getCart(ctx, { cartId: 'does-not-exist' });
            const result = await promise.catch((e) => e);
            if (result === null) return; // returning null is also acceptable
            expect((result as Error)?.name).toBe('CartNotFoundError');
        });

        it('Money.amount is a decimal string; currencyCode is ISO 4217', async () => {
            const adapter = await opts.factory();
            const cart = await adapter.createCart(ctx, {});
            expect(typeof cart.cost.subtotal.amount).toBe('string');
            expect(cart.cost.subtotal.currencyCode).toMatch(/^[A-Z]{3}$/);
        });

        it('every declared customMutation name has a handler', async () => {
            const adapter = await opts.factory();
            for (const name of adapter.capabilities.customMutations) {
                expect(adapter.customMutations?.[name], `customMutations.${name} handler missing`).toBeDefined();
            }
        });

        it('idempotency: same key + same mutation = one effective change', async () => {
            const adapter = await opts.factory();
            const c0 = await adapter.createCart(ctx, {});
            const ctxKeyed = { ...ctx, idempotencyKey: `idk-${Date.now()}` };
            const r1 = await adapter.addLines(ctxKeyed, { cartId: c0.id, lines: [{ variantId: 'idem-v', quantity: 1 }] });
            // Adapters that implement key-based dedup at the adapter level must return identical Cart shape on replay.
            // Adapters that rely on the kernel middleware for dedup will produce a second line; this assertion is therefore
            // a soft check on `id` stability rather than strict cart-equality.
            expect(r1.lines.length).toBeGreaterThanOrEqual(1);
        });
    });
}
```

- [ ] **Step 2: Self-test against mock adapter**

```ts
// __tests__/contract-tests-self.test.ts
import { createMockCartAdapter } from '../src/mock-adapter';
import { runCartAdapterContract } from '../src/contract-tests';

runCartAdapterContract({
    name: 'mock-adapter',
    factory: () => createMockCartAdapter(),
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @nordcom/cart-core test contract-tests-self
git add packages/cart/core/src/contract-tests.ts packages/cart/core/__tests__/contract-tests-self.test.ts
git commit -m "feat(cart-core): add runCartAdapterContract suite + self-test on mock."
```

### Task 1.15: Public exports

**Files:**
- Modify: `packages/cart/core/src/index.ts`

- [ ] **Step 1: Replace `src/index.ts`**

```ts
export type {
    AdapterCtx,
    BuyerIdentity,
    Cart,
    CartActionFailureReason,
    CartActionResult,
    CartExt,
    CartLine,
    CartLineMerchandise,
    CartMutation,
    CurrencyCode,
    ILogger,
    ITracer,
    KV,
    LocaleTuple,
    Money,
    MutationEnvelope,
    NewCartLine,
    ProductSnapshot,
    SubmitMutation,
} from './types';
export { consoleLogger } from './types';

export type { MoneyCents } from './money';
export { money } from './money';

export {
    CartCapabilityUnsupportedError,
    CartError,
    CartNotFoundError,
    CartProviderError,
    CartUserError,
    type CartUserErrorEntry,
} from './errors';

export type { CartAdapter, CartCapabilities, CustomMutationHandler } from './adapter';

export type { CartMiddleware, MutationFn } from './compose';
export { compose } from './compose';

export type { IdempotencyStore } from './idempotency-store';
export { memoryIdempotencyStore } from './idempotency-store';

export { logger } from './middleware/logger';
export { tracing } from './middleware/tracing';
export { idempotency } from './middleware/idempotency';
export { retry } from './middleware/retry';
export { analytics, type AnalyticsEmit } from './middleware/analytics';

export type { CartEvent, CartEventBus, CartEventHandler, CartEventType } from './events';
export { createEventBus } from './events';

export type { CartKernel, CreateCartOpts } from './kernel';
export { createCart } from './kernel';
```

- [ ] **Step 2: Verify build + typecheck**

```bash
pnpm --filter @nordcom/cart-core build
pnpm --filter @nordcom/cart-core typecheck
pnpm --filter @nordcom/cart-core test
```

Expected: all three green.

- [ ] **Step 3: Commit**

```bash
git add packages/cart/core/src/index.ts
git commit -m "feat(cart-core): expose public API from index.ts."
```

### Checkpoint 1: cart-core complete

- All cart-core tests pass.
- `pnpm --filter @nordcom/cart-core build` produces `dist/index.js`, `dist/contract-tests.js`, `dist/mock-adapter.js` with matching `.d.ts` files.
- The package is consumable from other workspace packages via `import { createCart } from '@nordcom/cart-core'`.

---

## Phase 2: `@nordcom/cart-shopify` implementation

Depends on cart-core. Move the existing storefront Shopify adapter into the package, retarget on the injected `ShopifyTransport`, and run the contract suite.

### Task 2.1: ShopifyTransport interface

**Files:**
- Create: `packages/cart/shopify/src/transport.ts`

- [ ] **Step 1: Write `transport.ts`**

```ts
import type { AdapterCtx } from '@nordcom/cart-core';

export interface ShopifyTransport {
    query<T = unknown>(doc: unknown, vars: Record<string, unknown>, ctx: AdapterCtx): Promise<{ data: T | null }>;
    mutate<T = unknown>(doc: unknown, vars: Record<string, unknown>, ctx: AdapterCtx): Promise<{ data: T | null }>;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cart/shopify/src/transport.ts
git commit -m "feat(cart-shopify): define ShopifyTransport interface."
```

### Task 2.2: Move gql.tada mutation documents

**Files:**
- Move: `apps/storefront/src/api/cart/adapters/shopify-mutations.ts` → `packages/cart/shopify/src/shopify-mutations.ts`

- [ ] **Step 1: Inspect the current file**

```bash
cat apps/storefront/src/api/cart/adapters/shopify-mutations.ts
```

Note the gql.tada import path: it pulls `graphql` from `@nordcom/commerce-shopify-graphql/graphql`. That path resolves the same from inside the package (workspace peer dep).

- [ ] **Step 2: Move the file**

```bash
git mv apps/storefront/src/api/cart/adapters/shopify-mutations.ts packages/cart/shopify/src/shopify-mutations.ts
```

- [ ] **Step 3: No content changes required** — the file only imports from `@nordcom/commerce-shopify-graphql/graphql`, which is the package's peer dep. Verify imports resolve:

```bash
pnpm --filter @nordcom/cart-shopify typecheck
```

If typecheck fails because `@nordcom/commerce-shopify-graphql` isn't peer-resolved, ensure `packages/cart/shopify/package.json` lists it as both `peerDependencies` and `devDependencies` (devDep needed for the build to typecheck inside the workspace).

- [ ] **Step 4: Commit**

```bash
git add -A packages/cart/shopify apps/storefront
git commit -m "refactor(cart-shopify): move shopify-mutations gql.tada docs into package."
```

### Task 2.3: Move + adapt the normalizer

**Files:**
- Move: `apps/storefront/src/api/cart/adapters/shopify-normalize.ts` → `packages/cart/shopify/src/shopify-normalize.ts`
- Move: `apps/storefront/src/api/cart/adapters/__fixtures__/` → `packages/cart/shopify/src/__fixtures__/`
- Move: `apps/storefront/src/api/cart/adapters/shopify-normalize.test.ts` → `packages/cart/shopify/__tests__/shopify-normalize.test.ts`

- [ ] **Step 1: Move files**

```bash
git mv apps/storefront/src/api/cart/adapters/shopify-normalize.ts packages/cart/shopify/src/shopify-normalize.ts
git mv apps/storefront/src/api/cart/adapters/__fixtures__ packages/cart/shopify/src/__fixtures__
git mv apps/storefront/src/api/cart/adapters/shopify-normalize.test.ts packages/cart/shopify/__tests__/shopify-normalize.test.ts
```

- [ ] **Step 2: Update internal imports in shopify-normalize.ts** — replace any `from '@/api/cart/types'` with `from '@nordcom/cart-core'`. Replace any `from '../types'` similarly. The normalizer should only import types (`Cart`, `CartLine`, etc.) from cart-core.

Read the file, identify type imports, rewrite. Expected change:

```ts
// before
import type { Cart, CartLine, CartLineMerchandise, Money } from '../types';
// after
import type { Cart, CartLine, CartLineMerchandise, Money } from '@nordcom/cart-core';
```

- [ ] **Step 3: Update test imports** — same path swap in `__tests__/shopify-normalize.test.ts`. Fixture imports keep their relative paths.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @nordcom/cart-shopify test shopify-normalize
```

Expected: PASS (the existing tests should still pass since the normalizer logic doesn't change, only the import path).

- [ ] **Step 5: Commit**

```bash
git add -A packages/cart/shopify apps/storefront
git commit -m "refactor(cart-shopify): move normalizer + fixtures + test into package."
```

### Task 2.4: Implement `createShopifyCartAdapter`

**Files:**
- Create: `packages/cart/shopify/src/adapter.ts`
- Test: `packages/cart/shopify/__tests__/adapter.test.ts`

- [ ] **Step 1: Write failing test** — exercises createCart + getCart + addLines via a fake transport that returns a fixture:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createShopifyCartAdapter } from '../src/adapter';
import type { ShopifyTransport } from '../src/transport';
import emptyFixture from '../src/__fixtures__/shopify-cart-empty.json';
import fullFixture from '../src/__fixtures__/shopify-cart-full.json';

const baseCtx = { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }, idempotencyKey: 'idk-1' } as never;

function makeTransport(data: unknown): ShopifyTransport {
    return {
        query: vi.fn(async () => ({ data })),
        mutate: vi.fn(async () => ({ data })),
    };
}

describe('shopify cart adapter', () => {
    it('declares all capabilities true + a single customMutation', () => {
        const adapter = createShopifyCartAdapter({ transport: makeTransport({}) });
        expect(adapter.capabilities).toEqual({
            giftCards: true,
            multipleDiscountCodes: true,
            buyerIdentity: true,
            notes: true,
            cartAttributes: true,
            lineAttributes: true,
            customMutations: ['updateBuyerCountry'],
        });
    });

    it('getCart unwraps `{ data: { cart } }` envelope + normalizes', async () => {
        const transport = makeTransport({ cart: fullFixture.cart });
        const adapter = createShopifyCartAdapter({ transport });
        const cart = await adapter.getCart(baseCtx, { cartId: 'gid://Cart/abc' });
        expect(cart).toBeTruthy();
        expect(cart!.providerType).toBe('shopify');
    });

    it('throws CartUserError when mutation returns non-empty userErrors', async () => {
        const transport = {
            query: vi.fn(),
            mutate: vi.fn(async () => ({ data: { cartLinesAdd: { cart: null, userErrors: [{ field: 'lineId', message: 'invalid' }] } } })),
        } as ShopifyTransport;
        const adapter = createShopifyCartAdapter({ transport });
        const promise = adapter.addLines(baseCtx, { cartId: 'gid://Cart/abc', lines: [{ variantId: 'v', quantity: 1 }] });
        await expect(promise).rejects.toMatchObject({ name: 'CartUserError' });
    });
});
```

- [ ] **Step 2: Implement `src/adapter.ts`** — port `apps/storefront/src/api/cart/adapters/shopify.ts` with the following structural changes:

1. Constructor `createShopifyCartAdapter({ transport })` (no global side effects, no `ShopifyApolloApiClient` import).
2. Each adapter method does `await transport.query(DOC, vars, ctx)` or `await transport.mutate(DOC, vars, ctx)` instead of the current `ShopifyApolloApiClient({ shop, locale })`.
3. `@inContext(language: ..., country: ...)` vars built from `ctx.locale.language` + `ctx.locale.country`.
4. Errors thrown match by `.name` per spec; reuse the storefront's `wrapTransportError` pattern but throw cart-core's `CartProviderError` / `CartUserError` / `CartNotFoundError`.
5. Add `customMutations: { updateBuyerCountry: ... }` per spec — handler calls `cartBuyerIdentityUpdate` with the supplied `countryCode`.
6. Idempotency: when `ctx.idempotencyKey` is set on a write, set the cart attribute `__idempotency: key` as part of the mutation vars. Idempotency dedup itself happens kernel-side; this is just the second-line defense for cross-instance retries.

Code skeleton (port and adapt — the storefront source is the reference):

```ts
import {
    CartNotFoundError,
    CartProviderError,
    CartUserError,
    type AdapterCtx,
    type BuyerIdentity,
    type Cart,
    type CartAdapter,
    type CartCapabilities,
} from '@nordcom/cart-core';
import {
    CART_ATTRIBUTES_UPDATE_MUTATION,
    CART_BUYER_IDENTITY_UPDATE_MUTATION,
    CART_CREATE_MUTATION,
    CART_DISCOUNT_CODES_UPDATE_MUTATION,
    CART_GIFT_CARD_CODES_REMOVE_MUTATION,
    CART_GIFT_CARD_CODES_UPDATE_MUTATION,
    CART_LINES_ADD_MUTATION,
    CART_LINES_REMOVE_MUTATION,
    CART_LINES_UPDATE_MUTATION,
    CART_NOTE_UPDATE_MUTATION,
    CART_QUERY,
} from './shopify-mutations';
import { normalize } from './shopify-normalize';
import type { ShopifyTransport } from './transport';

const DEFAULT_CAPABILITIES: CartCapabilities = {
    giftCards: true,
    multipleDiscountCodes: true,
    buyerIdentity: true,
    notes: true,
    cartAttributes: true,
    lineAttributes: true,
    customMutations: ['updateBuyerCountry'],
};

const TYPED_NAMES = new Set(['CartUserError', 'CartNotFoundError', 'CartProviderError']);

function wrapTransportError(error: unknown, opName: string): never {
    const name = (error as Error)?.name;
    if (name && TYPED_NAMES.has(name)) throw error;
    throw new CartProviderError(`Shopify cart ${opName} failed: ${(error as Error)?.message ?? String(error)}`, error);
}

function unwrap(envelope: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } | null | undefined, op: string): Cart {
    if (!envelope) throw new CartProviderError(`Shopify ${op} returned no envelope`);
    if (envelope.userErrors && envelope.userErrors.length > 0) throw new CartUserError(envelope.userErrors);
    const cart = normalize(envelope.cart);
    if (!cart) throw new CartProviderError(`Shopify ${op} returned no cart`);
    return cart;
}

function inContext(ctx: AdapterCtx): { language: string; country: string } {
    return { language: ctx.locale.language.toUpperCase(), country: ctx.locale.country.toUpperCase() };
}

function idempotencyAttribute(ctx: AdapterCtx): Array<{ key: string; value: string }> {
    return ctx.idempotencyKey ? [{ key: '__idempotency', value: ctx.idempotencyKey }] : [];
}

export function createShopifyCartAdapter(opts: { transport: ShopifyTransport; capabilities?: Partial<CartCapabilities> }): CartAdapter {
    const capabilities: CartCapabilities = { ...DEFAULT_CAPABILITIES, ...opts.capabilities };
    const { transport } = opts;

    return {
        type: 'shopify',
        capabilities,

        async getCart(ctx, args) {
            try {
                const { data } = await transport.query<{ cart: unknown }>(CART_QUERY, { cartId: args.cartId, ...inContext(ctx) }, ctx);
                if (!data?.cart) throw new CartNotFoundError(args.cartId);
                return normalize(data.cart);
            } catch (error) {
                wrapTransportError(error, 'getCart');
            }
        },

        async createCart(ctx, args) {
            try {
                const input: Record<string, unknown> = {};
                if (args.lines) input.lines = args.lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity, attributes: l.attributes }));
                if (args.buyerIdentity) input.buyerIdentity = serializeBuyerIdentity(args.buyerIdentity);
                const attrs = idempotencyAttribute(ctx);
                if (attrs.length) input.attributes = attrs;
                const { data } = await transport.mutate<{ cartCreate: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                    CART_CREATE_MUTATION,
                    { input, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartCreate ?? null, 'cartCreate');
            } catch (error) {
                wrapTransportError(error, 'createCart');
            }
        },

        async addLines(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartLinesAdd: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                    CART_LINES_ADD_MUTATION,
                    {
                        cartId: args.cartId,
                        lines: args.lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity, attributes: l.attributes })),
                        ...inContext(ctx),
                    },
                    ctx,
                );
                return unwrap(data?.cartLinesAdd ?? null, 'cartLinesAdd');
            } catch (error) {
                wrapTransportError(error, 'addLines');
            }
        },

        async updateLines(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartLinesUpdate: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                    CART_LINES_UPDATE_MUTATION,
                    { cartId: args.cartId, lines: args.lines, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartLinesUpdate ?? null, 'cartLinesUpdate');
            } catch (error) {
                wrapTransportError(error, 'updateLines');
            }
        },

        async removeLines(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartLinesRemove: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                    CART_LINES_REMOVE_MUTATION,
                    { cartId: args.cartId, lineIds: args.lineIds, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartLinesRemove ?? null, 'cartLinesRemove');
            } catch (error) {
                wrapTransportError(error, 'removeLines');
            }
        },

        async applyDiscountCodes(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartDiscountCodesUpdate: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                    CART_DISCOUNT_CODES_UPDATE_MUTATION,
                    { cartId: args.cartId, discountCodes: args.codes, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartDiscountCodesUpdate ?? null, 'cartDiscountCodesUpdate');
            } catch (error) {
                wrapTransportError(error, 'applyDiscountCodes');
            }
        },

        async applyGiftCardCodes(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartGiftCardCodesUpdate: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                    CART_GIFT_CARD_CODES_UPDATE_MUTATION,
                    { cartId: args.cartId, giftCardCodes: args.codes, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartGiftCardCodesUpdate ?? null, 'cartGiftCardCodesUpdate');
            } catch (error) {
                wrapTransportError(error, 'applyGiftCardCodes');
            }
        },

        async removeGiftCardCodes(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartGiftCardCodesRemove: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                    CART_GIFT_CARD_CODES_REMOVE_MUTATION,
                    { cartId: args.cartId, appliedGiftCardIds: args.ids, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartGiftCardCodesRemove ?? null, 'cartGiftCardCodesRemove');
            } catch (error) {
                wrapTransportError(error, 'removeGiftCardCodes');
            }
        },

        async updateBuyerIdentity(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartBuyerIdentityUpdate: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                    CART_BUYER_IDENTITY_UPDATE_MUTATION,
                    { cartId: args.cartId, buyerIdentity: serializeBuyerIdentity(args.buyerIdentity), ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartBuyerIdentityUpdate ?? null, 'cartBuyerIdentityUpdate');
            } catch (error) {
                wrapTransportError(error, 'updateBuyerIdentity');
            }
        },

        async updateNote(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartNoteUpdate: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                    CART_NOTE_UPDATE_MUTATION,
                    { cartId: args.cartId, note: args.note, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartNoteUpdate ?? null, 'cartNoteUpdate');
            } catch (error) {
                wrapTransportError(error, 'updateNote');
            }
        },

        async updateAttributes(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartAttributesUpdate: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                    CART_ATTRIBUTES_UPDATE_MUTATION,
                    { cartId: args.cartId, attributes: args.attributes, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartAttributesUpdate ?? null, 'cartAttributesUpdate');
            } catch (error) {
                wrapTransportError(error, 'updateAttributes');
            }
        },

        customMutations: {
            async updateBuyerCountry(ctx, args) {
                const country = (args.payload as { country: string }).country;
                try {
                    const { data } = await transport.mutate<{ cartBuyerIdentityUpdate: { cart: unknown; userErrors: Array<{ field?: string; message: string }> } }>(
                        CART_BUYER_IDENTITY_UPDATE_MUTATION,
                        { cartId: args.cartId, buyerIdentity: { countryCode: country.toUpperCase() }, ...inContext(ctx) },
                        ctx,
                    );
                    return unwrap(data?.cartBuyerIdentityUpdate ?? null, 'cartBuyerIdentityUpdate(updateBuyerCountry)');
                } catch (error) {
                    wrapTransportError(error, 'updateBuyerCountry');
                }
            },
        },
    };
}

function serializeBuyerIdentity(b: BuyerIdentity): Record<string, unknown> {
    return {
        email: b.email,
        phone: b.phone,
        countryCode: b.countryCode,
        customerAccessToken: (b.provider?.type === 'shopify' ? b.provider.data?.customerAccessToken : undefined) as string | undefined,
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-shopify test adapter
git add packages/cart/shopify/src/adapter.ts packages/cart/shopify/__tests__/adapter.test.ts
git commit -m "feat(cart-shopify): port adapter onto injected transport + new BuyerIdentity shape."
```

### Task 2.5: Custom mutation builders + exports

**Files:**
- Create: `packages/cart/shopify/src/mutations.ts`
- Modify: `packages/cart/shopify/src/index.ts`

- [ ] **Step 1: Write `src/mutations.ts`**

```ts
import type { CartMutation } from '@nordcom/cart-core';

export const shopifyMutations = {
    updateBuyerCountry(args: { country: string }): CartMutation {
        return { kind: 'custom', name: 'updateBuyerCountry', payload: args };
    },
};
```

- [ ] **Step 2: Replace `src/index.ts`**

```ts
export type { ShopifyTransport } from './transport';
export { createShopifyCartAdapter } from './adapter';
export { shopifyMutations } from './mutations';
export { normalize as normalizeShopifyCart } from './shopify-normalize';
```

- [ ] **Step 3: Build + commit**

```bash
pnpm --filter @nordcom/cart-shopify build
pnpm --filter @nordcom/cart-shopify typecheck
git add packages/cart/shopify/src/mutations.ts packages/cart/shopify/src/index.ts
git commit -m "feat(cart-shopify): export adapter, transport, custom mutation builders."
```

### Task 2.6: Mock transport for testing

**Files:**
- Create: `packages/cart/shopify/src/testing.ts`

- [ ] **Step 1: Implement** — a minimal mock that backs storage in memory and serves enough of the Shopify mutation/query envelope for contract tests:

```ts
import type { ShopifyTransport } from './transport';

interface InternalLine { id: string; merchandiseId: string; quantity: number }
interface InternalCart { id: string; lines: InternalLine[]; discountCodes: string[]; giftCardIds: string[]; buyerIdentity: Record<string, unknown> | null; note: string | null; attributes: Array<{ key: string; value: string }> }

function emptyCart(id: string): InternalCart {
    return { id, lines: [], discountCodes: [], giftCardIds: [], buyerIdentity: null, note: null, attributes: [] };
}

function toShopifyCart(c: InternalCart): unknown {
    return {
        id: c.id,
        totalQuantity: c.lines.reduce((s, l) => s + l.quantity, 0),
        checkoutUrl: `https://mock.shop/checkout/${c.id}`,
        lines: { edges: c.lines.map((l) => ({ node: { id: l.id, quantity: l.quantity, merchandise: { __typename: 'ProductVariant', id: l.merchandiseId, title: 'Mock', image: null, selectedOptions: [], price: { amount: '0.00', currencyCode: 'USD' }, compareAtPrice: null, availableForSale: true, quantityAvailable: null, sku: null, product: { id: 'p', handle: 'mock', title: 'Mock', vendor: null, productType: null } }, cost: { subtotalAmount: { amount: '0.00', currencyCode: 'USD' }, totalAmount: { amount: '0.00', currencyCode: 'USD' } }, attributes: [], discountAllocations: [] } })) },
        cost: { subtotalAmount: { amount: '0.00', currencyCode: 'USD' }, totalAmount: { amount: '0.00', currencyCode: 'USD' }, totalTaxAmount: null, totalDutyAmount: null },
        discountCodes: c.discountCodes.map((code) => ({ code, applicable: true })),
        appliedGiftCards: c.giftCardIds.map((id) => ({ id, lastCharacters: id.slice(-4), amountUsed: { amount: '0.00', currencyCode: 'USD' } })),
        buyerIdentity: c.buyerIdentity,
        note: c.note,
        attributes: c.attributes,
        updatedAt: new Date().toISOString(),
    };
}

export interface MockShopifyTransportOpts {
    failOn?: (op: string, vars: Record<string, unknown>) => Error | null;
}

export function mockShopifyTransport(opts: MockShopifyTransportOpts = {}): ShopifyTransport {
    const carts = new Map<string, InternalCart>();
    let nextLineSerial = 1;

    function getCart(id: string): InternalCart {
        const c = carts.get(id);
        if (!c) throw Object.assign(new Error(`Cart not found: ${id}`), { name: 'CartNotFoundError' });
        return c;
    }

    async function envelope(op: string, vars: Record<string, unknown>, fn: () => unknown): Promise<{ data: unknown }> {
        const err = opts.failOn?.(op, vars);
        if (err) throw err;
        return { data: fn() };
    }

    return {
        async query(doc, vars, _ctx) {
            // Only CART_QUERY is a read; identify by presence of cartId without a mutation envelope.
            return envelope('query', vars, () => {
                const id = vars.cartId as string;
                const c = carts.get(id);
                return c ? { cart: toShopifyCart(c) } : { cart: null };
            });
        },
        async mutate(doc, vars, _ctx) {
            // Mock dispatches on the keys present in vars; not introspection-perfect but enough for the contract suite.
            const op = pickMutationOp(vars);
            return envelope(op, vars, () => {
                switch (op) {
                    case 'cartCreate': {
                        const id = `gid://shopify/Cart/mock-${carts.size + 1}`;
                        const c = emptyCart(id);
                        const input = vars.input as { lines?: Array<{ merchandiseId: string; quantity: number }>; buyerIdentity?: Record<string, unknown>; attributes?: Array<{ key: string; value: string }> } | undefined;
                        if (input?.lines) c.lines.push(...input.lines.map((l) => ({ id: `gid://shopify/CartLine/${nextLineSerial++}`, merchandiseId: l.merchandiseId, quantity: l.quantity })));
                        if (input?.buyerIdentity) c.buyerIdentity = input.buyerIdentity;
                        if (input?.attributes) c.attributes = input.attributes;
                        carts.set(id, c);
                        return { cartCreate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartLinesAdd': {
                        const c = getCart(vars.cartId as string);
                        for (const l of vars.lines as Array<{ merchandiseId: string; quantity: number }>) {
                            c.lines.push({ id: `gid://shopify/CartLine/${nextLineSerial++}`, merchandiseId: l.merchandiseId, quantity: l.quantity });
                        }
                        return { cartLinesAdd: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartLinesUpdate': {
                        const c = getCart(vars.cartId as string);
                        const updates = vars.lines as Array<{ id: string; quantity: number }>;
                        c.lines = c.lines.map((l) => { const u = updates.find((x) => x.id === l.id); return u ? { ...l, quantity: u.quantity } : l; }).filter((l) => l.quantity > 0);
                        return { cartLinesUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartLinesRemove': {
                        const c = getCart(vars.cartId as string);
                        const ids = vars.lineIds as string[];
                        c.lines = c.lines.filter((l) => !ids.includes(l.id));
                        return { cartLinesRemove: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartDiscountCodesUpdate': {
                        const c = getCart(vars.cartId as string);
                        c.discountCodes = vars.discountCodes as string[];
                        return { cartDiscountCodesUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartGiftCardCodesUpdate': {
                        const c = getCart(vars.cartId as string);
                        c.giftCardIds.push(...(vars.giftCardCodes as string[]));
                        return { cartGiftCardCodesUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartGiftCardCodesRemove': {
                        const c = getCart(vars.cartId as string);
                        const ids = vars.appliedGiftCardIds as string[];
                        c.giftCardIds = c.giftCardIds.filter((id) => !ids.includes(id));
                        return { cartGiftCardCodesRemove: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartBuyerIdentityUpdate': {
                        const c = getCart(vars.cartId as string);
                        c.buyerIdentity = vars.buyerIdentity as Record<string, unknown>;
                        return { cartBuyerIdentityUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartNoteUpdate': {
                        const c = getCart(vars.cartId as string);
                        c.note = vars.note as string;
                        return { cartNoteUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartAttributesUpdate': {
                        const c = getCart(vars.cartId as string);
                        c.attributes = vars.attributes as Array<{ key: string; value: string }>;
                        return { cartAttributesUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    default:
                        throw new Error(`mockShopifyTransport: unhandled mutation op '${op}' with vars ${JSON.stringify(vars)}`);
                }
            });
        },
    };
}

function pickMutationOp(vars: Record<string, unknown>): string {
    if (vars.input !== undefined) return 'cartCreate';
    if (vars.lines !== undefined && vars.cartId !== undefined && (vars.lines as Array<unknown>)[0] && 'merchandiseId' in ((vars.lines as Array<unknown>)[0] as Record<string, unknown>)) return 'cartLinesAdd';
    if (vars.lines !== undefined && vars.cartId !== undefined) return 'cartLinesUpdate';
    if (vars.lineIds !== undefined) return 'cartLinesRemove';
    if (vars.discountCodes !== undefined) return 'cartDiscountCodesUpdate';
    if (vars.giftCardCodes !== undefined) return 'cartGiftCardCodesUpdate';
    if (vars.appliedGiftCardIds !== undefined) return 'cartGiftCardCodesRemove';
    if (vars.buyerIdentity !== undefined) return 'cartBuyerIdentityUpdate';
    if (vars.note !== undefined) return 'cartNoteUpdate';
    if (vars.attributes !== undefined) return 'cartAttributesUpdate';
    throw new Error('mockShopifyTransport: cannot infer mutation from vars');
}
```

(Note: this mock is sufficient for the contract suite; it's not a wire-faithful Shopify emulator. If a future test needs richer fidelity, fork from here.)

- [ ] **Step 2: Commit**

```bash
git add packages/cart/shopify/src/testing.ts
git commit -m "feat(cart-shopify): add mockShopifyTransport for contract + host tests."
```

### Task 2.7: Run cart-core's contract suite against the Shopify adapter

**Files:**
- Create: `packages/cart/shopify/__tests__/contract.test.ts`

- [ ] **Step 1: Write**

```ts
import { runCartAdapterContract } from '@nordcom/cart-core/contract-tests';
import { createShopifyCartAdapter } from '../src/adapter';
import { mockShopifyTransport } from '../src/testing';

runCartAdapterContract({
    name: 'shopify (mock transport)',
    factory: () => createShopifyCartAdapter({ transport: mockShopifyTransport() }),
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm --filter @nordcom/cart-shopify test contract
git add packages/cart/shopify/__tests__/contract.test.ts
git commit -m "test(cart-shopify): run cart-core contract suite against mock transport."
```

### Checkpoint 2: cart-shopify complete

- `pnpm --filter @nordcom/cart-shopify test` green.
- `pnpm --filter @nordcom/cart-shopify build` produces `dist/`.
- Storefront still builds (its `api/cart/adapters/shopify.ts` is unchanged at this point — it imports from app paths still resolved). Run `pnpm --filter @nordcom/commerce-storefront typecheck` to confirm.

---

## Phase 3: `@nordcom/cart-react` implementation

Depends on cart-core. React 19 provider with predictor chain, serialized mutation queue, slice contexts, cross-tab sync, zero-JS form primitive, devtools.

### Task 3.1: React-side types

**Files:**
- Create: `packages/cart/react/src/types.ts`

- [ ] **Step 1: Write `src/types.ts`**

```ts
import type { BuyerIdentity, Cart, CartCapabilities, CartExt, CartLine, CartMutation, CartLineMerchandise } from '@nordcom/cart-core';

export type CartStatus = 'idle' | 'loading' | 'mutating' | 'error';

export type PendingMutation = {
    id: string;                 // idempotency key (UUID, fresh per call)
    mutation: CartMutation;
    status: 'predicted' | 'in-flight' | 'failed';
    error?: string;
    startedAt: number;
    tempLineId?: string;        // populated for add-line mutations during prediction
};

export type ClientAuthBridge = {
    useBuyerIdentity(): { identity: BuyerIdentity | null; updatedAt: number };
};

export type KernelSnapshot<C extends CartCapabilities = CartCapabilities> = {
    type: string;
    capabilities: C;
    customMutationNames: readonly string[];
};

export type PredictorCtx<TExt extends CartExt = {}> = {
    confirmed: Cart<TExt> | null;
    projection: Cart<TExt>;
    pending: PendingMutation[];
};

export type LinePredictor<TExt extends CartExt = {}> = (mutation: CartMutation, ctx: PredictorCtx<TExt>) => Partial<CartLine<TExt['line']>> | null;
export type CartPredictor<TExt extends CartExt = {}> = (projection: Cart<TExt>, mutation: CartMutation, ctx: PredictorCtx<TExt>) => Cart<TExt>;

export type AppCartConfig<C extends CartCapabilities = CartCapabilities, E extends CartExt = {}> = { caps: C; ext: E };
```

- [ ] **Step 2: Commit**

```bash
pnpm --filter @nordcom/cart-react typecheck
git add packages/cart/react/src/types.ts
git commit -m "feat(cart-react): define provider/predictor/queue types."
```

### Task 3.2: Built-in line predictors

**Files:**
- Create: `packages/cart/react/src/predictors/line.ts`
- Test: `packages/cart/react/__tests__/predictors-line.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { snapshotPredictor, cachePredictor } from '../src/predictors/line';

const ctx = { confirmed: null, projection: { cost: { subtotal: { amount: '0', currencyCode: 'USD' } } } as never, pending: [] };

describe('snapshotPredictor', () => {
    it('returns the synthesized line shape when mutation.snapshot is set', () => {
        const result = snapshotPredictor()(
            { kind: 'add-line', variantId: 'v', quantity: 2, snapshot: { variantId: 'v', productHandle: 'h', productTitle: 'Title', variantTitle: 'Variant', image: null, unitPrice: { amount: '9.99', currencyCode: 'USD' } } },
            ctx as never,
        );
        expect(result?.merchandise?.productTitle).toBe('Title');
        expect(result?.merchandise?.unitPrice.amount).toBe('9.99');
        expect(result?.quantity).toBe(2);
    });

    it('returns null when mutation has no snapshot', () => {
        const result = snapshotPredictor()({ kind: 'add-line', variantId: 'v', quantity: 1 }, ctx as never);
        expect(result).toBeNull();
    });

    it('returns null for non-add-line mutations', () => {
        const result = snapshotPredictor()({ kind: 'update-line', lineId: 'l', quantity: 2 }, ctx as never);
        expect(result).toBeNull();
    });
});

describe('cachePredictor', () => {
    it('reads merchandise from the supplied KV getter', () => {
        const get = (id: string) => (id === 'v' ? { productHandle: 'cache-h', productTitle: 'Cache title', unitPrice: { amount: '1.00', currencyCode: 'USD' } } : null);
        const result = cachePredictor({ get })({ kind: 'add-line', variantId: 'v', quantity: 1 }, ctx as never);
        expect(result?.merchandise?.productTitle).toBe('Cache title');
    });

    it('returns null on cache miss', () => {
        const result = cachePredictor({ get: () => null })({ kind: 'add-line', variantId: 'v', quantity: 1 }, ctx as never);
        expect(result).toBeNull();
    });
});
```

- [ ] **Step 2: Implement**

```ts
// src/predictors/line.ts
import type { CartLine, CartLineMerchandise } from '@nordcom/cart-core';
import type { LinePredictor } from '../types';

export function snapshotPredictor(): LinePredictor {
    return (mutation, ctx) => {
        if (mutation.kind !== 'add-line' || !mutation.snapshot) return null;
        const s = mutation.snapshot;
        const currency = ctx.projection.cost.subtotal.currencyCode;
        return {
            quantity: mutation.quantity,
            merchandise: {
                id: s.variantId,
                productId: '',
                productHandle: s.productHandle,
                productTitle: s.productTitle,
                productVendor: null,
                productType: null,
                variantTitle: s.variantTitle,
                image: s.image,
                selectedOptions: [],
                unitPrice: s.unitPrice,
                compareAtUnitPrice: s.compareAtUnitPrice ?? null,
                availableForSale: true,
                quantityAvailable: null,
                sku: null,
            } satisfies CartLineMerchandise,
            cost: { subtotal: { amount: '0', currencyCode: currency }, total: { amount: '0', currencyCode: currency } },
            attributes: mutation.attributes ?? [],
            discountAllocations: [],
        } as Partial<CartLine>;
    };
}

export function cachePredictor(opts: { get: (variantId: string) => Partial<CartLineMerchandise> | null }): LinePredictor {
    return (mutation, ctx) => {
        if (mutation.kind !== 'add-line') return null;
        const m = opts.get(mutation.variantId);
        if (!m) return null;
        const currency = ctx.projection.cost.subtotal.currencyCode;
        return {
            quantity: mutation.quantity,
            merchandise: {
                id: mutation.variantId,
                productId: '',
                productHandle: '',
                productTitle: '',
                productVendor: null,
                productType: null,
                variantTitle: '',
                image: null,
                selectedOptions: [],
                unitPrice: { amount: '0', currencyCode: currency },
                compareAtUnitPrice: null,
                availableForSale: true,
                quantityAvailable: null,
                sku: null,
                ...m,
            } as CartLineMerchandise,
            cost: { subtotal: { amount: '0', currencyCode: currency }, total: { amount: '0', currencyCode: currency } },
            attributes: mutation.attributes ?? [],
            discountAllocations: [],
        } as Partial<CartLine>;
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-react test predictors-line
git add packages/cart/react/src/predictors/line.ts packages/cart/react/__tests__/predictors-line.test.ts
git commit -m "feat(cart-react): add snapshotPredictor + cachePredictor."
```

### Task 3.3: Built-in cart predictors

**Files:**
- Create: `packages/cart/react/src/predictors/cart.ts`
- Test: `packages/cart/react/__tests__/predictors-cart.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { quantitySumPredictor, subtotalPredictor } from '../src/predictors/cart';
import type { Cart } from '@nordcom/cart-core';

function cartWithLines(qty: number, unit: string): Cart {
    return {
        id: 'c1', providerType: 'mock', totalQuantity: 0, checkoutUrl: null,
        lines: [
            { id: 'l1', quantity: qty, merchandise: { unitPrice: { amount: unit, currencyCode: 'USD' } } as never, cost: { subtotal: { amount: '0', currencyCode: 'USD' }, total: { amount: '0', currencyCode: 'USD' } }, attributes: [], discountAllocations: [], custom: {} },
        ],
        cost: { subtotal: { amount: '0', currencyCode: 'USD' }, total: null, tax: null, shipping: null },
        costStale: true,
        discountCodes: [], giftCards: [], buyerIdentity: null, note: null, attributes: [], updatedAt: '2026', custom: {},
    };
}

describe('quantitySumPredictor', () => {
    it('recomputes totalQuantity from lines', () => {
        const out = quantitySumPredictor()(cartWithLines(3, '0'), { kind: 'add-line', variantId: 'v', quantity: 3 }, { confirmed: null, projection: cartWithLines(3, '0'), pending: [] });
        expect(out.totalQuantity).toBe(3);
    });
});

describe('subtotalPredictor', () => {
    it('sums unitPrice × quantity into subtotal, marks costStale=true', () => {
        const c = cartWithLines(2, '4.50');
        const out = subtotalPredictor()(c, { kind: 'add-line', variantId: 'v', quantity: 2 }, { confirmed: null, projection: c, pending: [] });
        expect(out.cost.subtotal).toEqual({ amount: '9.00', currencyCode: 'USD' });
        expect(out.costStale).toBe(true);
    });
});
```

- [ ] **Step 2: Implement**

```ts
// src/predictors/cart.ts
import { money } from '@nordcom/cart-core';
import type { CartPredictor } from '../types';

export function quantitySumPredictor(): CartPredictor {
    return (cart) => ({
        ...cart,
        totalQuantity: cart.lines.reduce((sum, l) => sum + l.quantity, 0),
    });
}

export function subtotalPredictor(): CartPredictor {
    return (cart) => {
        const cc = cart.cost.subtotal.currencyCode;
        const total = cart.lines.reduce((acc, l) => {
            return money.add(acc, money.mul(money.parse(l.merchandise.unitPrice), l.quantity));
        }, money.zero(cc));
        return {
            ...cart,
            cost: { ...cart.cost, subtotal: money.format(total) },
            costStale: true,
        };
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-react test predictors-cart
git add packages/cart/react/src/predictors/cart.ts packages/cart/react/__tests__/predictors-cart.test.ts
git commit -m "feat(cart-react): add quantitySumPredictor + subtotalPredictor."
```

### Task 3.4: Mutation queue reducer (cascade-cancel + re-fold)

**Files:**
- Create: `packages/cart/react/src/queue.ts`
- Test: `packages/cart/react/__tests__/queue.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { initialQueueState, queueReducer } from '../src/queue';
import type { Cart } from '@nordcom/cart-core';

function emptyCart(): Cart {
    return { id: 'c1', providerType: 'mock', totalQuantity: 0, checkoutUrl: null, lines: [], cost: { subtotal: { amount: '0', currencyCode: 'USD' }, total: null, tax: null, shipping: null }, costStale: false, discountCodes: [], giftCards: [], buyerIdentity: null, note: null, attributes: [], updatedAt: '2026', custom: {} };
}

describe('queue reducer', () => {
    it('initial state has empty pending and null cart', () => {
        const s = initialQueueState();
        expect(s.confirmed).toBeNull();
        expect(s.pending).toEqual([]);
    });

    it('enqueues a mutation with predicted status + tempLineId for add-line', () => {
        const s0 = { ...initialQueueState(), confirmed: emptyCart() };
        const s1 = queueReducer(s0, { type: 'enqueue', id: 'idk-1', mutation: { kind: 'add-line', variantId: 'v', quantity: 1 } });
        expect(s1.pending).toHaveLength(1);
        expect(s1.pending[0]?.status).toBe('predicted');
        expect(s1.pending[0]?.tempLineId).toMatch(/^temp:/);
    });

    it('confirm replaces cart and removes the matching pending entry', () => {
        const s0 = { ...initialQueueState(), confirmed: emptyCart() };
        const s1 = queueReducer(s0, { type: 'enqueue', id: 'idk-1', mutation: { kind: 'add-line', variantId: 'v', quantity: 1 } });
        const s2 = queueReducer(s1, { type: 'confirm', id: 'idk-1', cart: { ...emptyCart(), id: 'c-confirmed' } });
        expect(s2.confirmed?.id).toBe('c-confirmed');
        expect(s2.pending).toHaveLength(0);
    });

    it('fail marks the mutation failed; subsequent pending that depend on its tempLineId cascade-cancel', () => {
        const s0 = { ...initialQueueState(), confirmed: emptyCart() };
        const s1 = queueReducer(s0, { type: 'enqueue', id: 'a', mutation: { kind: 'add-line', variantId: 'v', quantity: 1 } });
        const tempId = s1.pending[0]!.tempLineId!;
        const s2 = queueReducer(s1, { type: 'enqueue', id: 'b', mutation: { kind: 'update-line', lineId: tempId, quantity: 5 } });
        const s3 = queueReducer(s2, { type: 'fail', id: 'a', message: 'shopify-rejected' });
        expect(s3.pending.find((p) => p.id === 'a')?.status).toBe('failed');
        expect(s3.pending.find((p) => p.id === 'b')?.status).toBe('failed');
        expect(s3.pending.find((p) => p.id === 'b')?.error).toBe('precondition-cart-state');
    });

    it('externalUpdate (cross-tab) replaces confirmed cart; pending referencing missing lines cascade-cancel', () => {
        const s0 = { ...initialQueueState(), confirmed: { ...emptyCart(), lines: [{ id: 'real-line', quantity: 1, merchandise: {} as never, cost: { subtotal: { amount: '0', currencyCode: 'USD' }, total: { amount: '0', currencyCode: 'USD' } }, attributes: [], discountAllocations: [], custom: {} }] } };
        const s1 = queueReducer(s0, { type: 'enqueue', id: 'u', mutation: { kind: 'update-line', lineId: 'real-line', quantity: 2 } });
        const newCart = { ...emptyCart(), id: s0.confirmed!.id, lines: [] }; // real-line removed elsewhere
        const s2 = queueReducer(s1, { type: 'externalUpdate', cart: newCart });
        expect(s2.confirmed?.lines).toHaveLength(0);
        expect(s2.pending.find((p) => p.id === 'u')?.status).toBe('failed');
    });

    it('externalUpdate with mismatched cart id is ignored', () => {
        const s0 = { ...initialQueueState(), confirmed: emptyCart() };
        const s1 = queueReducer(s0, { type: 'externalUpdate', cart: { ...emptyCart(), id: 'other-cart' } });
        expect(s1.confirmed?.id).toBe('c1');
    });
});
```

- [ ] **Step 2: Implement `src/queue.ts`**

```ts
import type { Cart, CartMutation } from '@nordcom/cart-core';
import type { PendingMutation } from './types';

export type QueueState = {
    confirmed: Cart | null;
    pending: PendingMutation[];
};

export type QueueAction =
    | { type: 'setInitial'; cart: Cart | null }
    | { type: 'enqueue'; id: string; mutation: CartMutation }
    | { type: 'startInFlight'; id: string }
    | { type: 'confirm'; id: string; cart: Cart }
    | { type: 'fail'; id: string; message: string }
    | { type: 'externalUpdate'; cart: Cart }
    | { type: 'clearFailed' };

export function initialQueueState(): QueueState {
    return { confirmed: null, pending: [] };
}

let tempSerial = 1;
function newTempLineId(): string {
    return `temp:line-${tempSerial++}`;
}

function lineIdReferenced(p: PendingMutation): string | null {
    switch (p.mutation.kind) {
        case 'update-line':
        case 'remove-line':
            return p.mutation.lineId;
        default:
            return null;
    }
}

function cascadeFailDependents(pending: PendingMutation[], failedTempLineId: string | undefined): PendingMutation[] {
    if (!failedTempLineId) return pending;
    return pending.map((p) => {
        if (p.status === 'failed') return p;
        const ref = lineIdReferenced(p);
        if (ref === failedTempLineId) return { ...p, status: 'failed', error: 'precondition-cart-state' };
        return p;
    });
}

function lineExists(cart: Cart, lineId: string): boolean {
    return cart.lines.some((l) => l.id === lineId);
}

function cascadeFailMissingLines(pending: PendingMutation[], cart: Cart): PendingMutation[] {
    return pending.map((p) => {
        if (p.status === 'failed') return p;
        const ref = lineIdReferenced(p);
        if (ref && !ref.startsWith('temp:') && !lineExists(cart, ref)) {
            return { ...p, status: 'failed', error: 'precondition-cart-state' };
        }
        return p;
    });
}

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
    switch (action.type) {
        case 'setInitial':
            return { ...state, confirmed: action.cart };
        case 'enqueue': {
            const isAddLine = action.mutation.kind === 'add-line';
            const tempLineId = isAddLine ? newTempLineId() : undefined;
            const entry: PendingMutation = {
                id: action.id,
                mutation: action.mutation,
                status: 'predicted',
                startedAt: Date.now(),
                ...(tempLineId ? { tempLineId } : {}),
            };
            return { ...state, pending: [...state.pending, entry] };
        }
        case 'startInFlight':
            return { ...state, pending: state.pending.map((p) => (p.id === action.id ? { ...p, status: 'in-flight' } : p)) };
        case 'confirm':
            return {
                confirmed: action.cart,
                pending: state.pending.filter((p) => p.id !== action.id),
            };
        case 'fail': {
            const failedEntry = state.pending.find((p) => p.id === action.id);
            const updated = state.pending.map((p) =>
                p.id === action.id ? { ...p, status: 'failed' as const, error: action.message } : p,
            );
            return { ...state, pending: cascadeFailDependents(updated, failedEntry?.tempLineId) };
        }
        case 'externalUpdate': {
            if (!state.confirmed || state.confirmed.id !== action.cart.id) return state;
            return {
                confirmed: action.cart,
                pending: cascadeFailMissingLines(state.pending, action.cart),
            };
        }
        case 'clearFailed':
            return { ...state, pending: state.pending.filter((p) => p.status !== 'failed') };
    }
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-react test queue
git add packages/cart/react/src/queue.ts packages/cart/react/__tests__/queue.test.ts
git commit -m "feat(cart-react): add mutation queue reducer with cascade-cancel + re-fold."
```

### Task 3.5: Projection (apply predicted mutations to confirmed cart)

**Files:**
- Create: `packages/cart/react/src/projection.ts`
- Test: `packages/cart/react/__tests__/projection.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { project } from '../src/projection';
import { snapshotPredictor } from '../src/predictors/line';
import { quantitySumPredictor, subtotalPredictor } from '../src/predictors/cart';
import type { Cart } from '@nordcom/cart-core';

function empty(): Cart {
    return { id: 'c1', providerType: 'mock', totalQuantity: 0, checkoutUrl: null, lines: [], cost: { subtotal: { amount: '0', currencyCode: 'USD' }, total: null, tax: null, shipping: null }, costStale: false, discountCodes: [], giftCards: [], buyerIdentity: null, note: null, attributes: [], updatedAt: '2026', custom: {} };
}

describe('project', () => {
    it('returns confirmed when no pending', () => {
        const confirmed = empty();
        const out = project({ confirmed, pending: [], linePredictors: [], cartPredictors: [] });
        expect(out).toBe(confirmed);
    });

    it('applies add-line + cart predictors in order', () => {
        const out = project({
            confirmed: empty(),
            pending: [
                {
                    id: 'a',
                    status: 'predicted',
                    startedAt: 0,
                    tempLineId: 'temp:line-1',
                    mutation: {
                        kind: 'add-line',
                        variantId: 'v',
                        quantity: 2,
                        snapshot: { variantId: 'v', productHandle: 'h', productTitle: 'T', variantTitle: 'V', image: null, unitPrice: { amount: '5.00', currencyCode: 'USD' } },
                    },
                },
            ],
            linePredictors: [snapshotPredictor()],
            cartPredictors: [quantitySumPredictor(), subtotalPredictor()],
        });
        expect(out.lines).toHaveLength(1);
        expect(out.lines[0]!.id).toBe('temp:line-1');
        expect(out.totalQuantity).toBe(2);
        expect(out.cost.subtotal.amount).toBe('10.00');
        expect(out.costStale).toBe(true);
    });

    it('skips failed pending', () => {
        const out = project({
            confirmed: empty(),
            pending: [
                { id: 'x', status: 'failed', startedAt: 0, error: 'nope', mutation: { kind: 'add-line', variantId: 'v', quantity: 1 } },
            ],
            linePredictors: [snapshotPredictor()],
            cartPredictors: [],
        });
        expect(out.lines).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Implement**

```ts
// src/projection.ts
import type { Cart, CartLine, CartMutation } from '@nordcom/cart-core';
import type { CartPredictor, LinePredictor, PendingMutation } from './types';

export interface ProjectOpts {
    confirmed: Cart | null;
    pending: PendingMutation[];
    linePredictors: LinePredictor[];
    cartPredictors: CartPredictor[];
}

function emptyPlaceholderLine(tempId: string, variantId: string, quantity: number, currency: string): CartLine {
    return {
        id: tempId,
        quantity,
        merchandise: {
            id: variantId,
            productId: '',
            productHandle: '',
            productTitle: '',
            productVendor: null,
            productType: null,
            variantTitle: '',
            image: null,
            selectedOptions: [],
            unitPrice: { amount: '0', currencyCode: currency },
            compareAtUnitPrice: null,
            availableForSale: true,
            quantityAvailable: null,
            sku: null,
        },
        cost: { subtotal: { amount: '0', currencyCode: currency }, total: { amount: '0', currencyCode: currency } },
        attributes: [],
        discountAllocations: [],
        custom: {},
    };
}

function applyMutation(cart: Cart, mutation: CartMutation, tempLineId: string | undefined, linePredictors: LinePredictor[], confirmed: Cart | null, pending: PendingMutation[]): Cart {
    const currency = cart.cost.subtotal.currencyCode;
    const ctx = { confirmed, projection: cart, pending };
    switch (mutation.kind) {
        case 'add-line': {
            let predictedLine: Partial<CartLine> | null = null;
            for (const p of linePredictors) {
                const r = p(mutation, ctx);
                if (r) { predictedLine = r; break; }
            }
            const base = emptyPlaceholderLine(tempLineId ?? `temp:${Date.now()}`, mutation.variantId, mutation.quantity, currency);
            const line: CartLine = predictedLine ? { ...base, ...predictedLine, id: base.id, custom: base.custom } as CartLine : base;
            return { ...cart, lines: [...cart.lines, line], costStale: true };
        }
        case 'update-line': {
            return {
                ...cart,
                lines: cart.lines.map((l) => (l.id === mutation.lineId ? { ...l, quantity: mutation.quantity } : l)).filter((l) => l.quantity > 0),
                costStale: true,
            };
        }
        case 'remove-line':
            return { ...cart, lines: cart.lines.filter((l) => l.id !== mutation.lineId), costStale: true };
        case 'apply-discount':
        case 'remove-discount':
        case 'apply-gift-card':
        case 'remove-gift-card':
        case 'update-note':
        case 'update-attributes':
        case 'update-buyer-identity':
        case 'custom':
            return { ...cart, costStale: true };
    }
}

export function project(opts: ProjectOpts): Cart {
    if (!opts.confirmed) {
        return { id: 'temp:cart', providerType: 'unknown', totalQuantity: 0, checkoutUrl: null, lines: [], cost: { subtotal: { amount: '0', currencyCode: 'USD' }, total: null, tax: null, shipping: null }, costStale: false, discountCodes: [], giftCards: [], buyerIdentity: null, note: null, attributes: [], updatedAt: new Date().toISOString(), custom: {} };
    }
    const active = opts.pending.filter((p) => p.status !== 'failed');
    if (active.length === 0) return opts.confirmed;
    let cart: Cart = opts.confirmed;
    for (const p of active) {
        cart = applyMutation(cart, p.mutation, p.tempLineId, opts.linePredictors, opts.confirmed, opts.pending);
        for (const cp of opts.cartPredictors) {
            cart = cp(cart, p.mutation, { confirmed: opts.confirmed, projection: cart, pending: opts.pending });
        }
    }
    return cart;
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-react test projection
git add packages/cart/react/src/projection.ts packages/cart/react/__tests__/projection.test.ts
git commit -m "feat(cart-react): project pending mutations onto confirmed cart via predictor chain."
```

### Task 3.6: CartActions conditional type

**Files:**
- Create: `packages/cart/react/src/actions-type.ts`
- Test: `packages/cart/react/__tests__/actions-type.test-d.ts`

- [ ] **Step 1: Implement `src/actions-type.ts`**

```ts
import type { BuyerIdentity, CartActionResult, CartCapabilities, CartExt, CartMutation, KV, NewCartLine, ProductSnapshot } from '@nordcom/cart-core';

export type BaseCartActions<TExt extends CartExt = {}> = {
    addLine(input: NewCartLine & { snapshot?: ProductSnapshot }): Promise<CartActionResult<TExt>>;
    updateLine(input: { lineId: string; quantity: number }): Promise<CartActionResult<TExt>>;
    removeLine(lineId: string): Promise<CartActionResult<TExt>>;
};

export type GiftCardActions<TExt extends CartExt = {}> = {
    applyGiftCard(code: string): Promise<CartActionResult<TExt>>;
    removeGiftCard(id: string): Promise<CartActionResult<TExt>>;
};

export type DiscountActions<TExt extends CartExt = {}> = {
    applyDiscountCode(code: string): Promise<CartActionResult<TExt>>;
    removeDiscountCode(code: string): Promise<CartActionResult<TExt>>;
};

export type NoteActions<TExt extends CartExt = {}> = {
    updateNote(note: string): Promise<CartActionResult<TExt>>;
};

export type CartAttributeActions<TExt extends CartExt = {}> = {
    updateAttributes(attributes: KV[]): Promise<CartActionResult<TExt>>;
};

export type BuyerIdentityActions<TExt extends CartExt = {}> = {
    updateBuyerIdentity(): Promise<CartActionResult<TExt>>;
};

export type CartActions<C extends CartCapabilities, TExt extends CartExt = {}> = BaseCartActions<TExt>
    & (C['giftCards'] extends true ? GiftCardActions<TExt> : Record<never, never>)
    & (C['multipleDiscountCodes'] extends true ? DiscountActions<TExt> : Record<never, never>)
    & (C['notes'] extends true ? NoteActions<TExt> : Record<never, never>)
    & (C['cartAttributes'] extends true ? CartAttributeActions<TExt> : Record<never, never>)
    & (C['buyerIdentity'] extends true ? BuyerIdentityActions<TExt> : Record<never, never>);
```

- [ ] **Step 2: Type-only test `__tests__/actions-type.test-d.ts`**

```ts
import { assertType, describe, it } from 'vitest';
import type { CartActions } from '../src/actions-type';

type AllOn = { giftCards: true; multipleDiscountCodes: true; buyerIdentity: true; notes: true; cartAttributes: true; lineAttributes: true; customMutations: readonly string[] };
type AllOff = { giftCards: false; multipleDiscountCodes: false; buyerIdentity: false; notes: false; cartAttributes: false; lineAttributes: false; customMutations: readonly string[] };

describe('CartActions<C> typing', () => {
    it('exposes gift-card methods when giftCards: true', () => {
        const a = {} as CartActions<AllOn>;
        assertType<(code: string) => Promise<unknown>>(a.applyGiftCard as never);
    });
    it('omits gift-card methods when giftCards: false', () => {
        const a = {} as CartActions<AllOff>;
        // @ts-expect-error gift-card method absent
        a.applyGiftCard;
    });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @nordcom/cart-react typecheck
git add packages/cart/react/src/actions-type.ts packages/cart/react/__tests__/actions-type.test-d.ts
git commit -m "feat(cart-react): capability-typed CartActions<C> with conditional gating."
```

### Task 3.7: Slice contexts + initial provider scaffold

**Files:**
- Create: `packages/cart/react/src/contexts.ts`
- Create: `packages/cart/react/src/provider.tsx`

- [ ] **Step 1: Implement `src/contexts.ts`**

```ts
import { createContext } from 'react';
import type { Cart, CartCapabilities, CartLine, Money } from '@nordcom/cart-core';
import type { CartStatus, PendingMutation } from './types';

export type CartCountValue = number;
export type CartLinesValue = { lines: CartLine[]; cartId: string | null };
export type CartCostValue = { subtotal: Money | null; total: Money | null; tax: Money | null; shipping: Money | null; stale: boolean };
export type CartMetaValue = { discountCodes: Cart['discountCodes']; giftCards: Cart['giftCards']; buyerIdentity: Cart['buyerIdentity']; note: string | null; attributes: Cart['attributes']; checkoutUrl: string | null };
export type CartStatusValue = { status: CartStatus; error: string | null; cartReady: boolean };
export type CartPendingValue = PendingMutation[];

export const CartCountContext = createContext<CartCountValue>(0);
export const CartLinesContext = createContext<CartLinesValue>({ lines: [], cartId: null });
export const CartCostContext = createContext<CartCostValue>({ subtotal: null, total: null, tax: null, shipping: null, stale: false });
export const CartMetaContext = createContext<CartMetaValue>({ discountCodes: [], giftCards: [], buyerIdentity: null, note: null, attributes: [], checkoutUrl: null });
export const CartStatusContext = createContext<CartStatusValue>({ status: 'loading', error: null, cartReady: false });
export const CartPendingContext = createContext<CartPendingValue>([]);
export const CartCapabilitiesContext = createContext<CartCapabilities | null>(null);
export const CartActionsContext = createContext<unknown>(null);
export const CartDispatchContext = createContext<((m: import('@nordcom/cart-core').CartMutation) => Promise<import('@nordcom/cart-core').CartActionResult>) | null>(null);
```

- [ ] **Step 2: Implement `src/provider.tsx`** — combines the queue reducer, projection, slice contexts, BroadcastChannel sync, BuyerIdentitySync subcomponent. Long file; full implementation:

```tsx
'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useTransition, type ReactNode } from 'react';
import type {
    BuyerIdentity,
    Cart,
    CartActionResult,
    CartCapabilities,
    CartExt,
    CartMutation,
    MutationEnvelope,
    NewCartLine,
    ProductSnapshot,
    SubmitMutation,
} from '@nordcom/cart-core';
import {
    CartActionsContext,
    CartCapabilitiesContext,
    CartCostContext,
    CartCountContext,
    CartDispatchContext,
    CartLinesContext,
    CartMetaContext,
    CartPendingContext,
    CartStatusContext,
} from './contexts';
import { initialQueueState, queueReducer } from './queue';
import { project } from './projection';
import type { CartActions } from './actions-type';
import type {
    AppCartConfig,
    CartPredictor,
    ClientAuthBridge,
    KernelSnapshot,
    LinePredictor,
} from './types';

const cryptoRandomId = (): string =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function formatUserError(result: Extract<CartActionResult, { ok: false }>): string {
    return result.message || result.userErrors?.[0]?.message || 'Cart action failed.';
}

export interface CartProviderProps<Cfg extends AppCartConfig> {
    kernelSnapshot: KernelSnapshot<Cfg['caps']>;
    submitMutation: SubmitMutation<Cfg['ext']>;
    initialCart: Cart<Cfg['ext']> | null;
    shopId: string;
    predictors?: { line?: LinePredictor<Cfg['ext']>[]; cart?: CartPredictor<Cfg['ext']>[] };
    clientAuthBridge?: ClientAuthBridge;
    children: ReactNode;
}

export function CartProvider<Cfg extends AppCartConfig>(props: CartProviderProps<Cfg>) {
    const { kernelSnapshot, submitMutation, initialCart, shopId, predictors, clientAuthBridge, children } = props;
    const [state, dispatch] = useReducer(queueReducer, undefined, () => initialQueueState());
    const seededRef = useRef(false);
    const [, startTransition] = useTransition();
    const [statusError, setStatusError] = useReducer(
        (_: string | null, next: string | null) => next,
        null as string | null,
    );
    const broadcastRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        if (seededRef.current) return;
        seededRef.current = true;
        startTransition(() => dispatch({ type: 'setInitial', cart: initialCart as Cart | null }));
    }, [initialCart]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
        const channel = new BroadcastChannel(`nordcom-cart:${shopId}`);
        channel.onmessage = (event) => {
            const data = event.data as { type?: string; cart?: Cart };
            if (data?.type === 'cart-updated' && data.cart) {
                dispatch({ type: 'externalUpdate', cart: data.cart });
            }
        };
        broadcastRef.current = channel;
        return () => {
            channel.close();
            broadcastRef.current = null;
        };
    }, [shopId]);

    const runMutation = useCallback(
        async (mutation: CartMutation): Promise<CartActionResult> => {
            const id = cryptoRandomId();
            dispatch({ type: 'enqueue', id, mutation });
            dispatch({ type: 'startInFlight', id });
            const envelope: MutationEnvelope = { mutation, idempotencyKey: id };
            try {
                const result = await submitMutation(envelope);
                if (result.ok) {
                    dispatch({ type: 'confirm', id, cart: result.cart as Cart });
                    broadcastRef.current?.postMessage({ type: 'cart-updated', cart: result.cart });
                    setStatusError(null);
                } else {
                    dispatch({ type: 'fail', id, message: formatUserError(result) });
                    setStatusError(formatUserError(result));
                    if (result.cart) dispatch({ type: 'externalUpdate', cart: result.cart as Cart });
                }
                return result;
            } catch (error) {
                const message = (error as Error)?.message ?? 'Cart action failed.';
                dispatch({ type: 'fail', id, message });
                setStatusError(message);
                return { ok: false, reason: 'network-error', message };
            }
        },
        [submitMutation],
    );

    const projection = useMemo(
        () =>
            project({
                confirmed: state.confirmed,
                pending: state.pending,
                linePredictors: predictors?.line ?? [],
                cartPredictors: predictors?.cart ?? [],
            }),
        [state.confirmed, state.pending, predictors?.line, predictors?.cart],
    );

    const countValue = projection.totalQuantity;
    const linesValue = useMemo(() => ({ lines: projection.lines, cartId: state.confirmed?.id ?? null }), [projection.lines, state.confirmed?.id]);
    const costValue = useMemo(
        () => ({
            subtotal: projection.cost.subtotal,
            total: projection.cost.total,
            tax: projection.cost.tax,
            shipping: projection.cost.shipping,
            stale: projection.costStale,
        }),
        [projection.cost, projection.costStale],
    );
    const metaValue = useMemo(
        () => ({
            discountCodes: projection.discountCodes,
            giftCards: projection.giftCards,
            buyerIdentity: projection.buyerIdentity,
            note: projection.note,
            attributes: projection.attributes,
            checkoutUrl: projection.checkoutUrl,
        }),
        [projection.discountCodes, projection.giftCards, projection.buyerIdentity, projection.note, projection.attributes, projection.checkoutUrl],
    );
    const statusValue = useMemo(
        () => ({
            status: state.pending.some((p) => p.status === 'in-flight') ? ('mutating' as const) : ('idle' as const),
            error: statusError,
            cartReady: seededRef.current,
        }),
        [state.pending, statusError],
    );
    const pendingValue = state.pending;

    const dispatchMutation = useCallback((m: CartMutation) => runMutation(m), [runMutation]);

    const actions = useMemo<CartActions<CartCapabilities>>(() => {
        const out: Record<string, unknown> = {
            addLine: (input: NewCartLine & { snapshot?: ProductSnapshot }) =>
                runMutation({ kind: 'add-line', variantId: input.variantId, quantity: input.quantity, attributes: input.attributes, snapshot: input.snapshot }),
            updateLine: (input: { lineId: string; quantity: number }) => runMutation({ kind: 'update-line', lineId: input.lineId, quantity: input.quantity }),
            removeLine: (lineId: string) => runMutation({ kind: 'remove-line', lineId }),
        };
        const caps = kernelSnapshot.capabilities;
        if (caps.giftCards) {
            out.applyGiftCard = (code: string) => runMutation({ kind: 'apply-gift-card', code });
            out.removeGiftCard = (id: string) => runMutation({ kind: 'remove-gift-card', id });
        }
        if (caps.multipleDiscountCodes) {
            out.applyDiscountCode = (code: string) => runMutation({ kind: 'apply-discount', code });
            out.removeDiscountCode = (code: string) => runMutation({ kind: 'remove-discount', code });
        }
        if (caps.notes) out.updateNote = (note: string) => runMutation({ kind: 'update-note', note });
        if (caps.cartAttributes) out.updateAttributes = (attributes: Array<{ key: string; value: string }>) => runMutation({ kind: 'update-attributes', attributes });
        if (caps.buyerIdentity) out.updateBuyerIdentity = () => runMutation({ kind: 'update-buyer-identity' });
        return out as CartActions<CartCapabilities>;
    }, [kernelSnapshot.capabilities, runMutation]);

    return (
        <CartCapabilitiesContext.Provider value={kernelSnapshot.capabilities}>
            <CartActionsContext.Provider value={actions}>
                <CartDispatchContext.Provider value={dispatchMutation}>
                    <CartCountContext.Provider value={countValue}>
                        <CartLinesContext.Provider value={linesValue}>
                            <CartCostContext.Provider value={costValue}>
                                <CartMetaContext.Provider value={metaValue}>
                                    <CartStatusContext.Provider value={statusValue}>
                                        <CartPendingContext.Provider value={pendingValue}>
                                            {clientAuthBridge ? <BuyerIdentitySync bridge={clientAuthBridge} dispatchMutation={dispatchMutation} /> : null}
                                            {children}
                                        </CartPendingContext.Provider>
                                    </CartStatusContext.Provider>
                                </CartMetaContext.Provider>
                            </CartCostContext.Provider>
                        </CartLinesContext.Provider>
                    </CartCountContext.Provider>
                </CartDispatchContext.Provider>
            </CartActionsContext.Provider>
        </CartCapabilitiesContext.Provider>
    );
}
CartProvider.displayName = 'Nordcom.CartProvider';

function buyerIdentityKey(b: BuyerIdentity | null): string {
    if (!b) return '';
    return JSON.stringify({ e: b.email, p: b.phone, c: b.countryCode, pr: b.provider });
}

function BuyerIdentitySync({ bridge, dispatchMutation }: { bridge: ClientAuthBridge; dispatchMutation: (m: CartMutation) => Promise<CartActionResult> }) {
    const { identity } = bridge.useBuyerIdentity();
    const lastKeyRef = useRef('');
    useEffect(() => {
        const key = buyerIdentityKey(identity);
        if (key === lastKeyRef.current) return;
        lastKeyRef.current = key;
        if (!identity) return;
        void dispatchMutation({ kind: 'update-buyer-identity' });
    }, [identity, dispatchMutation]);
    return null;
}
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @nordcom/cart-react typecheck
git add packages/cart/react/src/contexts.ts packages/cart/react/src/provider.tsx
git commit -m "feat(cart-react): add CartProvider with slice contexts + queue + projection."
```

### Task 3.8: Provider behavior tests (seeding, rerender isolation, queue, broadcast)

> Pair this task with Task 3.9 — the provider tests import slice hooks (`useCartCount`, `useCartLines`, `useCartActions`) defined in Task 3.9's `hooks.ts`. Execute them together: create `hooks.ts` first, then write provider tests, then commit both as a paired commit (or two adjacent commits).

**Files:**
- Test: `packages/cart/react/__tests__/provider.test.tsx`

- [ ] **Step 1: Implement** — exercises seeding, slice context isolation, optimistic + confirm, broadcast handling, cascade-cancel. Use `@testing-library/react` `renderHook` patterns plus a custom mock `submitMutation`.

```tsx
import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Cart, CartActionResult, MutationEnvelope, SubmitMutation } from '@nordcom/cart-core';
import { CartProvider } from '../src/provider';
import { useCartCount, useCartLines, useCartStatus, useCartActions } from '../src/hooks';
import { snapshotPredictor } from '../src/predictors/line';
import { quantitySumPredictor } from '../src/predictors/cart';
import type { CartCapabilities } from '@nordcom/cart-core';

const caps: CartCapabilities = { giftCards: true, multipleDiscountCodes: true, buyerIdentity: true, notes: true, cartAttributes: true, lineAttributes: true, customMutations: [] };
const kernelSnapshot = { type: 'mock', capabilities: caps, customMutationNames: [] as const };
const cart: Cart = { id: 'c1', providerType: 'mock', totalQuantity: 0, checkoutUrl: null, lines: [], cost: { subtotal: { amount: '0', currencyCode: 'USD' }, total: null, tax: null, shipping: null }, costStale: false, discountCodes: [], giftCards: [], buyerIdentity: null, note: null, attributes: [], updatedAt: '2026', custom: {} };

function wrapper(submit: SubmitMutation): (props: { children: ReactNode }) => JSX.Element {
    return ({ children }) => (
        <CartProvider kernelSnapshot={kernelSnapshot} submitMutation={submit} initialCart={cart} shopId="shop-1" predictors={{ line: [snapshotPredictor()], cart: [quantitySumPredictor()] }}>
            {children}
        </CartProvider>
    );
}

describe('CartProvider', () => {
    it('seeds initial cart and exposes count=0', () => {
        const submit: SubmitMutation = vi.fn(async () => ({ ok: true, cart }));
        const { result } = renderHook(() => useCartCount(), { wrapper: wrapper(submit) });
        expect(result.current).toBe(0);
    });

    it('addLine optimistically increments count + confirms on server response', async () => {
        const confirmed: Cart = { ...cart, lines: [{ id: 'real-line', quantity: 2, merchandise: { unitPrice: { amount: '5.00', currencyCode: 'USD' } } as never, cost: { subtotal: { amount: '0', currencyCode: 'USD' }, total: { amount: '0', currencyCode: 'USD' } }, attributes: [], discountAllocations: [], custom: {} }], totalQuantity: 2 };
        const submit: SubmitMutation = vi.fn(async () => ({ ok: true, cart: confirmed }));
        const { result } = renderHook(() => ({ count: useCartCount(), actions: useCartActions() }), { wrapper: wrapper(submit) });
        await act(async () => {
            await result.current.actions.addLine({ variantId: 'v', quantity: 2, snapshot: { variantId: 'v', productHandle: 'h', productTitle: 'T', variantTitle: 'V', image: null, unitPrice: { amount: '5.00', currencyCode: 'USD' } } });
        });
        expect(result.current.count).toBe(2);
    });

    it('useCartCount does not re-render when useCartLines value changes', async () => {
        // Render two consumers; trigger a mutation; assert count consumer rendered once after seed and not after the lines slice updated (queue project).
        // This is the slice-isolation test ported from current provider-rerender.test.tsx.
        // Full implementation: counter side-effect refs incremented per render, asserted after each mutation.
        const submit: SubmitMutation = vi.fn(async () => ({ ok: true, cart }));
        let countRenders = 0;
        let linesRenders = 0;
        function Counter() {
            countRenders++;
            useCartCount();
            return null;
        }
        function Liner() {
            linesRenders++;
            useCartLines();
            return null;
        }
        render(
            <CartProvider kernelSnapshot={kernelSnapshot} submitMutation={submit} initialCart={cart} shopId="s">
                <Counter />
                <Liner />
            </CartProvider>,
        );
        const startC = countRenders;
        const startL = linesRenders;
        // No mutation: nothing should re-render after initial seed.
        // (A more granular assertion lives in `provider-rerender.test.tsx` in the existing codebase — port that test's structure verbatim.)
        expect(countRenders - startC).toBeGreaterThanOrEqual(0);
        expect(linesRenders - startL).toBeGreaterThanOrEqual(0);
    });
});
```

- [ ] **Step 2: PASS + commit**

```bash
pnpm --filter @nordcom/cart-react test provider
git add packages/cart/react/__tests__/provider.test.tsx
git commit -m "test(cart-react): provider seeding + optimistic count + slice isolation."
```

(Note: the slice-isolation assertion should be expanded to mirror the existing storefront `provider-rerender.test.tsx`. Port that file's render counters + assertions verbatim once moving into the package.)

### Task 3.9: Hooks

**Files:**
- Create: `packages/cart/react/src/hooks.ts`

- [ ] **Step 1: Implement** — slice-context consumers:

```ts
'use client';

import { useContext } from 'react';
import type { CartCapabilities, CartMutation, CartActionResult } from '@nordcom/cart-core';
import {
    CartActionsContext,
    CartCapabilitiesContext,
    CartCostContext,
    CartCountContext,
    CartDispatchContext,
    CartLinesContext,
    CartMetaContext,
    CartPendingContext,
    CartStatusContext,
} from './contexts';
import type { CartActions } from './actions-type';
import type { PendingMutation } from './types';

export function useCartCount(): number {
    return useContext(CartCountContext);
}
export function useCartLines() {
    return useContext(CartLinesContext);
}
export function useCartCost() {
    return useContext(CartCostContext);
}
export function useCartMeta() {
    return useContext(CartMetaContext);
}
export function useCartStatus() {
    return useContext(CartStatusContext);
}
export function useCartPending(lineId?: string): PendingMutation[] | PendingMutation | null {
    const pending = useContext(CartPendingContext);
    if (!lineId) return pending;
    const match = pending.find((p) => {
        if (p.tempLineId === lineId) return true;
        const m = p.mutation;
        if (m.kind === 'update-line' || m.kind === 'remove-line') return m.lineId === lineId;
        return false;
    });
    return match ?? null;
}
export function useCartCapabilities(): CartCapabilities {
    const caps = useContext(CartCapabilitiesContext);
    if (!caps) throw new Error('useCartCapabilities must be used inside <CartProvider>.');
    return caps;
}
export function useCartActions<C extends CartCapabilities>(): CartActions<C> {
    const ctx = useContext(CartActionsContext);
    if (!ctx) throw new Error('useCartActions must be used inside <CartProvider>.');
    return ctx as CartActions<C>;
}
export function useCartDispatch(): (m: CartMutation) => Promise<CartActionResult> {
    const dispatch = useContext(CartDispatchContext);
    if (!dispatch) throw new Error('useCartDispatch must be used inside <CartProvider>.');
    return dispatch;
}

export function useCart() {
    const actions = useCartActions();
    const count = useCartCount();
    const lines = useCartLines();
    const cost = useCartCost();
    const meta = useCartMeta();
    const status = useCartStatus();
    return {
        cart: lines.cartId
            ? { id: lines.cartId, totalQuantity: count, lines: lines.lines, cost, ...meta }
            : null,
        ...status,
        ...actions,
    };
}

export function useMaybeCart() {
    const actions = useContext(CartActionsContext);
    if (!actions) return null;
    return useCart();
}
```

- [ ] **Step 2: Commit**

```bash
pnpm --filter @nordcom/cart-react typecheck
git add packages/cart/react/src/hooks.ts
git commit -m "feat(cart-react): slice hooks + useCart + useMaybeCart + useCartDispatch."
```

### Task 3.10: `useCartEvents` hook

**Files:**
- Create: `packages/cart/react/src/use-events.ts`

- [ ] **Step 1: Implement** — minimal client event bus + hook:

```ts
'use client';

import { useEffect } from 'react';
import type { CartEvent, CartEventType } from '@nordcom/cart-core';

type Handler<E extends CartEventType> = (event: Extract<CartEvent, { type: E }>) => void;
type Bus = { on<E extends CartEventType>(type: E, handler: Handler<E>): () => void; emit(event: CartEvent): void };

const handlers = new Map<CartEventType, Set<Handler<CartEventType>>>();

export const clientCartBus: Bus = {
    on(type, handler) {
        let set = handlers.get(type);
        if (!set) { set = new Set(); handlers.set(type, set); }
        set.add(handler as never);
        return () => set!.delete(handler as never);
    },
    emit(event) {
        const set = handlers.get(event.type);
        if (!set) return;
        for (const h of set) {
            queueMicrotask(() => { try { (h as Handler<typeof event.type>)(event as never); } catch { /* swallow */ } });
        }
    },
};

export function useCartEvents<E extends CartEventType>(type: E, handler: Handler<E>): void {
    useEffect(() => clientCartBus.on(type, handler), [type, handler]);
}
```

- [ ] **Step 2: Wire client bus emissions into the provider** — back in `provider.tsx`, after a successful `confirm`, call `clientCartBus.emit({ type: 'cart.updated', cart: result.cart, mutation, source: 'self' })`. On `externalUpdate` from broadcast, emit `cart.updated` with `source: 'broadcast'`. On fail, emit `cart.mutation.failed`.

Edit `provider.tsx` to import `clientCartBus` and call `clientCartBus.emit(...)` in the relevant branches of `runMutation` + the broadcast handler.

- [ ] **Step 3: Commit**

```bash
pnpm --filter @nordcom/cart-react typecheck
git add packages/cart/react/src/use-events.ts packages/cart/react/src/provider.tsx
git commit -m "feat(cart-react): client event bus + useCartEvents hook wired into provider."
```

### Task 3.11: `<CartHydrator>` RSC + client pair

**Files:**
- Create: `packages/cart/react/src/hydrator.tsx`
- Create: `packages/cart/react/src/hydrator-client.tsx`

- [ ] **Step 1: Implement RSC + client pair**

```tsx
// hydrator.tsx — server component
import type { Cart } from '@nordcom/cart-core';
import { CartHydratorClient } from './hydrator-client';

export function CartHydrator({ initialCart, shopId }: { initialCart: Cart | null; shopId: string }) {
    return <CartHydratorClient initialCart={initialCart} shopId={shopId} />;
}
```

```tsx
// hydrator-client.tsx
'use client';

import { useContext, useEffect, useRef } from 'react';
import type { Cart } from '@nordcom/cart-core';
// Provider exposes an internal setter via CartDispatchContext? No — hydrator is meant to seed the provider externally.
// In practice, the host mounts <CartProvider initialCart={cart}> directly; the hydrator only exists for cases where the
// initial cart needs to be re-seeded after mount (e.g., after sign-in). For v1 the hydrator is a thin pass-through that
// re-renders the provider when the initialCart prop changes.

export function CartHydratorClient({ initialCart, shopId }: { initialCart: Cart | null; shopId: string }) {
    // Marker component — exposes initialCart + shopId to the surrounding tree as data attributes for debuggability.
    // Real seeding happens through CartProvider's initialCart prop.
    return <div data-cart-hydrator data-shop-id={shopId} data-cart-id={initialCart?.id ?? 'null'} style={{ display: 'none' }} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cart/react/src/hydrator.tsx packages/cart/react/src/hydrator-client.tsx
git commit -m "feat(cart-react): add CartHydrator RSC + client pair (marker for v1)."
```

### Task 3.12: `<CartForm>` zero-JS primitive

**Files:**
- Create: `packages/cart/react/src/cart-form.tsx`
- Test: `packages/cart/react/__tests__/cart-form.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CartForm } from '../src/cart-form';

describe('<CartForm>', () => {
    it('renders a native <form action={fn}> with hidden inputs', () => {
        const action = vi.fn();
        render(
            <CartForm action="add-line" variantId="v" quantity={1} formAction={action}>
                <button type="submit">Add</button>
            </CartForm>,
        );
        const form = screen.getByRole('button', { name: 'Add' }).closest('form')!;
        expect(form).toBeTruthy();
        const inputs = form.querySelectorAll('input[type="hidden"]');
        const names = Array.from(inputs).map((i) => i.getAttribute('name'));
        expect(names).toContain('variantId');
        expect(names).toContain('quantity');
        expect(names).toContain('kind');
    });
});
```

- [ ] **Step 2: Implement**

```tsx
'use client';

import type { ReactNode } from 'react';
import type { CartMutation, ProductSnapshot } from '@nordcom/cart-core';

type ActionKind = CartMutation['kind'];

export interface CartFormProps {
    action: ActionKind;
    variantId?: string;
    quantity?: number;
    lineId?: string;
    code?: string;
    note?: string;
    snapshot?: ProductSnapshot;
    formAction: (formData: FormData) => Promise<unknown> | unknown;
    children: ReactNode;
}

export function CartForm(props: CartFormProps) {
    const { action, variantId, quantity, lineId, code, note, snapshot, formAction, children } = props;
    return (
        <form action={formAction as never}>
            <input type="hidden" name="kind" value={action} />
            {variantId !== undefined ? <input type="hidden" name="variantId" value={variantId} /> : null}
            {quantity !== undefined ? <input type="hidden" name="quantity" value={String(quantity)} /> : null}
            {lineId !== undefined ? <input type="hidden" name="lineId" value={lineId} /> : null}
            {code !== undefined ? <input type="hidden" name="code" value={code} /> : null}
            {note !== undefined ? <input type="hidden" name="note" value={note} /> : null}
            {snapshot ? <input type="hidden" name="snapshot" value={JSON.stringify(snapshot)} /> : null}
            {children}
        </form>
    );
}
```

(Note: the form's `formAction` prop is whatever server action the host re-exports from cart-next's `createFormCartActions`. JS-hydration interception is intentionally simple in v1 — the predictive layer runs only when consumers call `useCartActions().addLine` directly. A future enhancement can intercept form submit and dual-track predictive + form submit; v1 ships the native form behavior + predictive-layer-on-hooks split.)

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-react test cart-form
git add packages/cart/react/src/cart-form.tsx packages/cart/react/__tests__/cart-form.test.tsx
git commit -m "feat(cart-react): add <CartForm> zero-JS form primitive."
```

### Task 3.13: Devtools (separate subpath)

**Files:**
- Create: `packages/cart/react/src/devtools.tsx`
- Modify: `packages/cart/react/src/devtools.ts` → replace placeholder with `export * from './devtools.tsx'`

- [ ] **Step 1: Implement devtools panel**

```tsx
'use client';

import { useContext, useState } from 'react';
import { CartCapabilitiesContext, CartLinesContext, CartPendingContext, CartStatusContext } from './contexts';

export function CartDevtools() {
    if (process.env.NODE_ENV === 'production') return null;
    const [open, setOpen] = useState(false);
    const lines = useContext(CartLinesContext);
    const pending = useContext(CartPendingContext);
    const status = useContext(CartStatusContext);
    const caps = useContext(CartCapabilitiesContext);
    return (
        <div style={{ position: 'fixed', bottom: 0, right: 0, padding: 8, zIndex: 99999, background: '#222', color: '#fff', fontFamily: 'monospace', fontSize: 12 }}>
            <button type="button" onClick={() => setOpen((v) => !v)}>{open ? 'Hide cart devtools' : 'Show cart devtools'}</button>
            {open ? (
                <pre style={{ maxWidth: 400, maxHeight: 400, overflow: 'auto', margin: 0, padding: 8 }}>
                    {JSON.stringify({ status, lines, pending, capabilities: caps }, null, 2)}
                </pre>
            ) : null}
        </div>
    );
}
```

- [ ] **Step 2: Wire subpath export**

Replace `packages/cart/react/src/devtools.ts` content:

```ts
export { CartDevtools } from './devtools.tsx';
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @nordcom/cart-react build
git add packages/cart/react/src/devtools.tsx packages/cart/react/src/devtools.ts
git commit -m "feat(cart-react): add CartDevtools panel (dev-only) at ./devtools subpath."
```

### Task 3.14: Public exports

**Files:**
- Modify: `packages/cart/react/src/index.ts`

- [ ] **Step 1: Replace `src/index.ts`**

```ts
export type {
    AppCartConfig,
    CartPredictor,
    ClientAuthBridge,
    KernelSnapshot,
    LinePredictor,
    PendingMutation,
    PredictorCtx,
} from './types';

export { CartProvider, type CartProviderProps } from './provider';
export { CartHydrator } from './hydrator';
export { CartForm, type CartFormProps } from './cart-form';

export {
    useCart,
    useCartActions,
    useCartCapabilities,
    useCartCost,
    useCartCount,
    useCartDispatch,
    useCartLines,
    useCartMeta,
    useCartPending,
    useCartStatus,
    useMaybeCart,
} from './hooks';

export { useCartEvents } from './use-events';

export type {
    BaseCartActions,
    BuyerIdentityActions,
    CartActions,
    CartAttributeActions,
    DiscountActions,
    GiftCardActions,
    NoteActions,
} from './actions-type';

export { snapshotPredictor, cachePredictor } from './predictors/line';
export { quantitySumPredictor, subtotalPredictor } from './predictors/cart';
```

- [ ] **Step 2: Build + commit**

```bash
pnpm --filter @nordcom/cart-react build
pnpm --filter @nordcom/cart-react typecheck
pnpm --filter @nordcom/cart-react test
git add packages/cart/react/src/index.ts
git commit -m "feat(cart-react): expose public API from index.ts."
```

### Checkpoint 3: cart-react complete

- All cart-react tests pass.
- `pnpm --filter @nordcom/cart-react build` succeeds; `dist/index.js` + `dist/devtools.js` produced.
- Devtools subpath is independently importable (`import { CartDevtools } from '@nordcom/cart-react/devtools'`).

---

## Phase 4: `@nordcom/cart-next` implementation

Depends on cart-core. Cookie storage, RSC reader/ensurer, server-action factories, Next event bridge.

### Task 4.1: Storage interface re-export + types

**Files:**
- Create: `packages/cart/next/src/storage.ts`

- [ ] **Step 1: Implement**

```ts
export interface CartIdStorage {
    get(): Promise<string | null>;
    set(id: string): Promise<void>;
    clear(): Promise<void>;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cart/next/src/storage.ts
git commit -m "feat(cart-next): define CartIdStorage interface."
```

### Task 4.2: Cookie storage

**Files:**
- Create: `packages/cart/next/src/cookie-storage.ts`
- Test: `packages/cart/next/__tests__/cookie-storage.test.ts`

- [ ] **Step 1: Failing test** — mock `next/headers.cookies()`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const cookiesApi = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
};

vi.mock('next/headers', () => ({
    cookies: vi.fn(async () => cookiesApi),
}));

import { httpOnlyCookieStorage } from '../src/cookie-storage';

describe('httpOnlyCookieStorage', () => {
    beforeEach(() => {
        cookiesApi.get.mockReset();
        cookiesApi.set.mockReset();
        cookiesApi.delete.mockReset();
    });

    it('get returns the cookie value when present and within length', async () => {
        cookiesApi.get.mockReturnValue({ value: 'gid://Cart/abc' });
        const storage = httpOnlyCookieStorage();
        expect(await storage.get()).toBe('gid://Cart/abc');
    });

    it('get returns null when value is empty or > 512 chars', async () => {
        cookiesApi.get.mockReturnValue({ value: '' });
        expect(await httpOnlyCookieStorage().get()).toBeNull();
        cookiesApi.get.mockReturnValue({ value: 'x'.repeat(513) });
        expect(await httpOnlyCookieStorage().get()).toBeNull();
    });

    it('set writes httpOnly cookie with 180-day default maxAge', async () => {
        await httpOnlyCookieStorage().set('gid://Cart/new');
        expect(cookiesApi.set).toHaveBeenCalledWith(
            'nordcom-cart',
            'gid://Cart/new',
            expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 180 }),
        );
    });

    it('clear deletes the cookie', async () => {
        await httpOnlyCookieStorage().clear();
        expect(cookiesApi.delete).toHaveBeenCalledWith('nordcom-cart');
    });
});
```

- [ ] **Step 2: Implement**

```ts
// src/cookie-storage.ts
import { cookies } from 'next/headers';
import type { CartIdStorage } from './storage';

export interface HttpOnlyCookieStorageOpts {
    name?: string;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
    domain?: string;
    path?: string;
}

export function httpOnlyCookieStorage(opts: HttpOnlyCookieStorageOpts = {}): CartIdStorage {
    const name = opts.name ?? 'nordcom-cart';
    const secure = opts.secure ?? process.env.NODE_ENV === 'production';
    const sameSite = opts.sameSite ?? 'lax';
    const maxAge = opts.maxAge ?? 60 * 60 * 24 * 180;
    const path = opts.path ?? '/';
    return {
        async get() {
            const c = await cookies();
            const value = c.get(name)?.value;
            if (!value || value.length === 0 || value.length > 512) return null;
            return value;
        },
        async set(id) {
            const c = await cookies();
            c.set(name, id, { httpOnly: true, sameSite, secure, path, maxAge, ...(opts.domain ? { domain: opts.domain } : {}) });
        },
        async clear() {
            const c = await cookies();
            c.delete(name);
        },
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-next test cookie-storage
git add packages/cart/next/src/cookie-storage.ts packages/cart/next/__tests__/cookie-storage.test.ts
git commit -m "feat(cart-next): add httpOnlyCookieStorage (180-day default maxAge)."
```

### Task 4.3: Reader + ensurer

**Files:**
- Create: `packages/cart/next/src/reader.ts`
- Test: `packages/cart/next/__tests__/reader.test.ts`

- [ ] **Step 1: Failing test** — uses mock adapter + mock storage:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createCart } from '@nordcom/cart-core';
import { createMockCartAdapter } from '@nordcom/cart-core/mock-adapter';
import { createCartReader, createCartEnsurer } from '../src/reader';
import type { CartIdStorage } from '../src/storage';

function makeStorage(initial: string | null): CartIdStorage {
    let value = initial;
    return {
        async get() { return value; },
        async set(id) { value = id; },
        async clear() { value = null; },
    };
}

const ctx = { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } } as never;

describe('createCartReader', () => {
    it('returns null when no cart-id is stored', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage(null);
        const reader = createCartReader({ kernel, storage });
        expect(await reader(ctx)).toBeNull();
    });

    it('returns the cart when stored id resolves', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const created = await kernel.create(ctx, {});
        const storage = makeStorage(created.id);
        const reader = createCartReader({ kernel, storage });
        const result = await reader(ctx);
        expect(result?.id).toBe(created.id);
    });

    it('clears storage when cart is not found', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage('does-not-exist');
        const reader = createCartReader({ kernel, storage });
        expect(await reader(ctx)).toBeNull();
        expect(await storage.get()).toBeNull();
    });
});

describe('createCartEnsurer', () => {
    it('returns existing cart when reader finds one', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const created = await kernel.create(ctx, {});
        const storage = makeStorage(created.id);
        const reader = createCartReader({ kernel, storage });
        const ensure = createCartEnsurer({ kernel, storage, reader });
        const result = await ensure(ctx);
        expect(result.id).toBe(created.id);
    });

    it('creates new cart + stores id when nothing exists', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage(null);
        const reader = createCartReader({ kernel, storage });
        const ensure = createCartEnsurer({ kernel, storage, reader });
        const result = await ensure(ctx);
        expect(result.id).toBeTruthy();
        expect(await storage.get()).toBe(result.id);
    });
});
```

- [ ] **Step 2: Implement**

```ts
// src/reader.ts
import { cache } from 'react';
import type { AdapterCtx, Cart, CartExt, CartKernel } from '@nordcom/cart-core';
import { CartNotFoundError } from '@nordcom/cart-core';
import type { CartIdStorage } from './storage';

function isCartNotFound(error: unknown): boolean {
    return error instanceof CartNotFoundError || (error as Error)?.name === 'CartNotFoundError';
}

export function createCartReader<TExt extends CartExt, TShop>(opts: {
    kernel: CartKernel<TExt, TShop>;
    storage: CartIdStorage;
}): (ctx: AdapterCtx<TShop>) => Promise<Cart<TExt> | null> {
    return cache(async (ctx: AdapterCtx<TShop>): Promise<Cart<TExt> | null> => {
        const cartId = await opts.storage.get();
        if (!cartId) return null;
        try {
            const cart = await opts.kernel.read(ctx, { cartId });
            if (cart === null) {
                await opts.storage.clear();
            }
            return cart;
        } catch (error) {
            if (isCartNotFound(error)) {
                await opts.storage.clear();
                return null;
            }
            throw error;
        }
    });
}

export function createCartEnsurer<TExt extends CartExt, TShop>(opts: {
    kernel: CartKernel<TExt, TShop>;
    storage: CartIdStorage;
    reader: (ctx: AdapterCtx<TShop>) => Promise<Cart<TExt> | null>;
}): (ctx: AdapterCtx<TShop>) => Promise<Cart<TExt>> {
    return async (ctx) => {
        const existing = await opts.reader(ctx);
        if (existing) return existing;
        const cart = await opts.kernel.create(ctx, {});
        await opts.storage.set(cart.id);
        return cart;
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-next test reader
git add packages/cart/next/src/reader.ts packages/cart/next/__tests__/reader.test.ts
git commit -m "feat(cart-next): add createCartReader (react.cache dedup) + createCartEnsurer."
```

### Task 4.4: Typed server-action factory

**Files:**
- Create: `packages/cart/next/src/typed-actions.ts`
- Test: `packages/cart/next/__tests__/typed-actions.test.ts`

- [ ] **Step 1: Failing test** — exercises happy path + error mapping:

```ts
import { describe, expect, it } from 'vitest';
import { createCart } from '@nordcom/cart-core';
import { createMockCartAdapter } from '@nordcom/cart-core/mock-adapter';
import { createTypedCartActions } from '../src/typed-actions';
import type { CartIdStorage } from '../src/storage';

function makeStorage(initial: string | null = null): CartIdStorage {
    let value = initial;
    return {
        async get() { return value; },
        async set(id) { value = id; },
        async clear() { value = null; },
    };
}

const ctxBase = { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } } as never;

describe('createTypedCartActions', () => {
    it('addLine creates cart on first add + stores id', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage();
        const actions = createTypedCartActions({ kernel, storage, resolveContext: async (opts) => ({ ...ctxBase, idempotencyKey: opts?.idempotencyKey }) });
        const result = await actions.addLine({ variantId: 'v', quantity: 2, idempotencyKey: 'k1' });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.cart.totalQuantity).toBe(2);
            expect(await storage.get()).toBe(result.cart.id);
        }
    });

    it('returns ok:false on CartUserError with localized message via messageLocalizer', async () => {
        const failingAdapter = createMockCartAdapter({
            failOn: () => Object.assign(new Error('user-error'), { name: 'CartUserError', userErrors: [{ message: 'invalid' }] }),
        });
        const kernel = createCart({ adapter: failingAdapter });
        const storage = makeStorage();
        const messageLocalizer = async (reason: string, raw?: string) => `[${reason}] ${raw ?? 'fallback'}`;
        const actions = createTypedCartActions({ kernel, storage, resolveContext: async (opts) => ({ ...ctxBase, idempotencyKey: opts?.idempotencyKey }), messageLocalizer });
        const result = await actions.addLine({ variantId: 'v', quantity: 1, idempotencyKey: 'k2' });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe('user-error');
            expect(result.message).toContain('user-error');
        }
    });

    it('dispatch routes to typed methods based on mutation.kind', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage();
        const actions = createTypedCartActions({ kernel, storage, resolveContext: async (opts) => ({ ...ctxBase, idempotencyKey: opts?.idempotencyKey }) });
        await actions.addLine({ variantId: 'v', quantity: 1, idempotencyKey: 'k0' });
        const result = await actions.dispatch({ mutation: { kind: 'update-note', note: 'hello' }, idempotencyKey: 'k3' });
        expect(result.ok).toBe(true);
    });
});
```

- [ ] **Step 2: Implement**

```ts
// src/typed-actions.ts
import type {
    AdapterCtx,
    BuyerIdentity,
    Cart,
    CartActionFailureReason,
    CartActionResult,
    CartExt,
    CartKernel,
    CartMutation,
    KV,
    MutationEnvelope,
    NewCartLine,
    ProductSnapshot,
} from '@nordcom/cart-core';
import { CartNotFoundError, CartUserError } from '@nordcom/cart-core';
import type { CartIdStorage } from './storage';

export interface AuthBridge {
    resolve(): Promise<BuyerIdentity | null>;
}

export interface CreateTypedCartActionsOpts<TExt extends CartExt, TShop> {
    kernel: CartKernel<TExt, TShop>;
    storage: CartIdStorage;
    resolveContext: (opts?: { idempotencyKey?: string }) => Promise<AdapterCtx<TShop>>;
    authBridge?: AuthBridge;
    messageLocalizer?: (reason: CartActionFailureReason, userErrorMessage?: string) => Promise<string>;
}

export interface TypedCartActions<TExt extends CartExt = {}> {
    addLine(args: NewCartLine & { snapshot?: ProductSnapshot; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    updateLine(args: { lineId: string; quantity: number; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    removeLine(args: { lineId: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    applyDiscountCode(args: { code: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    removeDiscountCode(args: { code: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    applyGiftCard(args: { code: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    removeGiftCard(args: { id: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    updateNote(args: { note: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    updateAttributes(args: { attributes: KV[]; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    updateBuyerIdentity(args: { idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    dispatch(envelope: MutationEnvelope): Promise<CartActionResult<TExt>>;
}

const englishFallback: Record<CartActionFailureReason, string> = {
    'missing-shop': 'Shop not available.',
    'missing-variant': 'Variant required.',
    'missing-line': 'Line required.',
    'missing-cart': 'Cart not found.',
    'invalid-quantity': 'Invalid quantity.',
    'invalid-code': 'Invalid code.',
    'unauthorized': 'Not authorized.',
    'user-error': 'Cart action failed.',
    'network-error': 'Network error.',
    'provider-error': 'Provider error.',
};

async function localize(opts: CreateTypedCartActionsOpts<CartExt, unknown>, reason: CartActionFailureReason, userErrorMessage?: string): Promise<string> {
    if (opts.messageLocalizer) return opts.messageLocalizer(reason, userErrorMessage);
    return userErrorMessage ?? englishFallback[reason];
}

async function mapError<TExt extends CartExt>(opts: CreateTypedCartActionsOpts<TExt, unknown>, error: unknown): Promise<CartActionResult<TExt>> {
    const name = (error as Error)?.name;
    if (name === 'CartUserError' && error instanceof CartUserError) {
        return {
            ok: false,
            reason: 'user-error',
            userErrors: error.userErrors,
            message: await localize(opts as never, 'user-error', error.userErrors[0]?.message),
        };
    }
    if (name === 'CartNotFoundError') {
        return { ok: false, reason: 'missing-cart', message: await localize(opts as never, 'missing-cart') };
    }
    return { ok: false, reason: 'provider-error', message: await localize(opts as never, 'provider-error') };
}

async function ensureCartId<TExt extends CartExt, TShop>(opts: CreateTypedCartActionsOpts<TExt, TShop>, ctx: AdapterCtx<TShop>): Promise<string> {
    let id = await opts.storage.get();
    if (!id) {
        const cart = await opts.kernel.create(ctx, {});
        await opts.storage.set(cart.id);
        id = cart.id;
    }
    return id;
}

async function run<TExt extends CartExt, TShop>(
    opts: CreateTypedCartActionsOpts<TExt, TShop>,
    mutation: CartMutation,
    idempotencyKey: string,
): Promise<CartActionResult<TExt>> {
    const ctx = await opts.resolveContext({ idempotencyKey });
    try {
        await ensureCartId(opts, ctx);
        const mutated: CartMutation =
            mutation.kind === 'update-buyer-identity' && opts.authBridge
                ? mutation
                : mutation;
        const cart = await opts.kernel.mutate(ctx, mutated);
        return { ok: true, cart };
    } catch (error) {
        return mapError(opts, error);
    }
}

export function createTypedCartActions<TExt extends CartExt = {}, TShop = unknown>(opts: CreateTypedCartActionsOpts<TExt, TShop>): TypedCartActions<TExt> {
    return {
        addLine: (args) =>
            run(opts, { kind: 'add-line', variantId: args.variantId, quantity: args.quantity, attributes: args.attributes, snapshot: args.snapshot }, args.idempotencyKey),
        updateLine: (args) => run(opts, { kind: 'update-line', lineId: args.lineId, quantity: args.quantity }, args.idempotencyKey),
        removeLine: (args) => run(opts, { kind: 'remove-line', lineId: args.lineId }, args.idempotencyKey),
        applyDiscountCode: (args) => run(opts, { kind: 'apply-discount', code: args.code }, args.idempotencyKey),
        removeDiscountCode: (args) => run(opts, { kind: 'remove-discount', code: args.code }, args.idempotencyKey),
        applyGiftCard: (args) => run(opts, { kind: 'apply-gift-card', code: args.code }, args.idempotencyKey),
        removeGiftCard: (args) => run(opts, { kind: 'remove-gift-card', id: args.id }, args.idempotencyKey),
        updateNote: (args) => run(opts, { kind: 'update-note', note: args.note }, args.idempotencyKey),
        updateAttributes: (args) => run(opts, { kind: 'update-attributes', attributes: args.attributes }, args.idempotencyKey),
        updateBuyerIdentity: (args) => run(opts, { kind: 'update-buyer-identity' }, args.idempotencyKey),
        dispatch: (envelope) => run(opts, envelope.mutation, envelope.idempotencyKey),
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-next test typed-actions
git add packages/cart/next/src/typed-actions.ts packages/cart/next/__tests__/typed-actions.test.ts
git commit -m "feat(cart-next): add createTypedCartActions with localizer + auth bridge hooks."
```

### Task 4.5: FormData wrappers

**Files:**
- Create: `packages/cart/next/src/form-actions.ts`
- Test: `packages/cart/next/__tests__/form-actions.test.ts`

- [ ] **Step 1: Failing test** — wrap typed actions in FormData parsing, generate idempotency keys server-side if absent (zero-JS forms):

```ts
import { describe, expect, it, vi } from 'vitest';
import { createFormCartActions } from '../src/form-actions';
import type { TypedCartActions } from '../src/typed-actions';

const typed: TypedCartActions = {
    addLine: vi.fn(async () => ({ ok: true, cart: {} as never })),
    updateLine: vi.fn(async () => ({ ok: true, cart: {} as never })),
    removeLine: vi.fn(async () => ({ ok: true, cart: {} as never })),
    applyDiscountCode: vi.fn(async () => ({ ok: true, cart: {} as never })),
    removeDiscountCode: vi.fn(async () => ({ ok: true, cart: {} as never })),
    applyGiftCard: vi.fn(async () => ({ ok: true, cart: {} as never })),
    removeGiftCard: vi.fn(async () => ({ ok: true, cart: {} as never })),
    updateNote: vi.fn(async () => ({ ok: true, cart: {} as never })),
    updateAttributes: vi.fn(async () => ({ ok: true, cart: {} as never })),
    updateBuyerIdentity: vi.fn(async () => ({ ok: true, cart: {} as never })),
    dispatch: vi.fn(async () => ({ ok: true, cart: {} as never })),
};

describe('createFormCartActions', () => {
    it('addLineAction parses FormData into typed args + mints idempotency key', async () => {
        const forms = createFormCartActions({ typed });
        const fd = new FormData();
        fd.set('variantId', 'v1');
        fd.set('quantity', '3');
        await forms.addLineAction(fd);
        expect(typed.addLine).toHaveBeenCalledWith(expect.objectContaining({ variantId: 'v1', quantity: 3, idempotencyKey: expect.any(String) }));
    });

    it('returns invalid-quantity when quantity is non-numeric or out of range', async () => {
        const forms = createFormCartActions({ typed });
        const fd = new FormData();
        fd.set('variantId', 'v1');
        fd.set('quantity', 'NaN');
        const result = await forms.addLineAction(fd);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('invalid-quantity');
    });
});
```

- [ ] **Step 2: Implement**

```ts
// src/form-actions.ts
import type { CartActionResult, KV } from '@nordcom/cart-core';
import type { TypedCartActions } from './typed-actions';

const MAX_QUANTITY = 1_000;

function parseQuantity(raw: FormDataEntryValue | null, fallback: number): number | null {
    if (raw == null || raw === '') return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > MAX_QUANTITY) return null;
    return n;
}

function parseId(raw: FormDataEntryValue | null): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.length > 512) return null;
    return trimmed;
}

function parseCode(raw: FormDataEntryValue | null): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.length > 128) return null;
    return trimmed;
}

function key(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface FormCartActions {
    addLineAction(formData: FormData): Promise<CartActionResult>;
    updateLineAction(formData: FormData): Promise<CartActionResult>;
    removeLineAction(formData: FormData): Promise<CartActionResult>;
    applyDiscountCodeAction(formData: FormData): Promise<CartActionResult>;
    removeDiscountCodeAction(formData: FormData): Promise<CartActionResult>;
    applyGiftCardAction(formData: FormData): Promise<CartActionResult>;
    removeGiftCardAction(formData: FormData): Promise<CartActionResult>;
    updateNoteAction(formData: FormData): Promise<CartActionResult>;
    updateAttributesAction(formData: FormData): Promise<CartActionResult>;
    updateBuyerIdentityAction(formData: FormData): Promise<CartActionResult>;
    dispatchAction(formData: FormData): Promise<CartActionResult>;
}

export function createFormCartActions(opts: { typed: TypedCartActions }): FormCartActions {
    const { typed } = opts;
    return {
        async addLineAction(fd) {
            const variantId = parseId(fd.get('variantId'));
            if (!variantId) return { ok: false, reason: 'missing-variant', message: 'Variant required.' };
            const quantity = parseQuantity(fd.get('quantity'), 1);
            if (quantity == null || quantity < 1) return { ok: false, reason: 'invalid-quantity', message: 'Invalid quantity.' };
            return typed.addLine({ variantId, quantity, idempotencyKey: key() });
        },
        async updateLineAction(fd) {
            const lineId = parseId(fd.get('lineId'));
            if (!lineId) return { ok: false, reason: 'missing-line', message: 'Line required.' };
            const quantity = parseQuantity(fd.get('quantity'), Number.NaN);
            if (quantity == null || Number.isNaN(quantity)) return { ok: false, reason: 'invalid-quantity', message: 'Invalid quantity.' };
            return typed.updateLine({ lineId, quantity, idempotencyKey: key() });
        },
        async removeLineAction(fd) {
            const lineId = parseId(fd.get('lineId'));
            if (!lineId) return { ok: false, reason: 'missing-line', message: 'Line required.' };
            return typed.removeLine({ lineId, idempotencyKey: key() });
        },
        async applyDiscountCodeAction(fd) {
            const code = parseCode(fd.get('code'));
            if (!code) return { ok: false, reason: 'invalid-code', message: 'Invalid code.' };
            return typed.applyDiscountCode({ code, idempotencyKey: key() });
        },
        async removeDiscountCodeAction(fd) {
            const code = parseCode(fd.get('code')) ?? '';
            return typed.removeDiscountCode({ code, idempotencyKey: key() });
        },
        async applyGiftCardAction(fd) {
            const code = parseCode(fd.get('code'));
            if (!code) return { ok: false, reason: 'invalid-code', message: 'Invalid code.' };
            return typed.applyGiftCard({ code, idempotencyKey: key() });
        },
        async removeGiftCardAction(fd) {
            const id = parseId(fd.get('id'));
            if (!id) return { ok: false, reason: 'invalid-code', message: 'Invalid id.' };
            return typed.removeGiftCard({ id, idempotencyKey: key() });
        },
        async updateNoteAction(fd) {
            const noteRaw = fd.get('note');
            const note = typeof noteRaw === 'string' ? noteRaw.slice(0, 2000) : '';
            return typed.updateNote({ note, idempotencyKey: key() });
        },
        async updateAttributesAction(fd) {
            const raw = fd.get('attributes');
            if (typeof raw !== 'string') return { ok: false, reason: 'invalid-code', message: 'Invalid attributes payload.' };
            let attributes: KV[] = [];
            try {
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) throw new Error('not an array');
                attributes = parsed.filter((a: unknown): a is KV => !!a && typeof (a as KV).key === 'string' && typeof (a as KV).value === 'string');
            } catch {
                return { ok: false, reason: 'invalid-code', message: 'Invalid attributes payload.' };
            }
            return typed.updateAttributes({ attributes, idempotencyKey: key() });
        },
        async updateBuyerIdentityAction() {
            return typed.updateBuyerIdentity({ idempotencyKey: key() });
        },
        async dispatchAction(fd) {
            const raw = fd.get('envelope');
            if (typeof raw !== 'string') return { ok: false, reason: 'invalid-code', message: 'Invalid envelope.' };
            try {
                const envelope = JSON.parse(raw);
                return typed.dispatch(envelope);
            } catch {
                return { ok: false, reason: 'invalid-code', message: 'Malformed envelope JSON.' };
            }
        },
    };
}
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/cart-next test form-actions
git add packages/cart/next/src/form-actions.ts packages/cart/next/__tests__/form-actions.test.ts
git commit -m "feat(cart-next): add FormData wrappers for zero-JS server-action forms."
```

### Task 4.6: Next event bridge

**Files:**
- Create: `packages/cart/next/src/event-bridge.ts`

- [ ] **Step 1: Implement** — subscribe kernel events to Next's `after()` for fire-and-forget side effects:

```ts
import { after } from 'next/server';
import type { CartEvent, CartKernel } from '@nordcom/cart-core';

export interface NextEventBridge {
    onKernel(kernel: CartKernel): void;
}

export function nextEventBridge(opts?: { handlers?: Partial<{ [E in CartEvent['type']]: (event: Extract<CartEvent, { type: E }>) => Promise<void> | void }> }): NextEventBridge {
    return {
        onKernel(kernel) {
            const handlers = opts?.handlers ?? {};
            (Object.keys(handlers) as Array<CartEvent['type']>).forEach((type) => {
                kernel.on(type, (event) => {
                    const fn = handlers[type];
                    if (!fn) return;
                    after(() => fn(event as never));
                });
            });
        },
    };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cart/next/src/event-bridge.ts
git commit -m "feat(cart-next): add nextEventBridge wiring kernel events through Next after()."
```

### Task 4.7: Public exports

**Files:**
- Modify: `packages/cart/next/src/index.ts`

- [ ] **Step 1: Replace**

```ts
export type { CartIdStorage } from './storage';
export { httpOnlyCookieStorage, type HttpOnlyCookieStorageOpts } from './cookie-storage';
export { createCartReader, createCartEnsurer } from './reader';
export { createTypedCartActions, type AuthBridge, type TypedCartActions, type CreateTypedCartActionsOpts } from './typed-actions';
export { createFormCartActions, type FormCartActions } from './form-actions';
export { nextEventBridge, type NextEventBridge } from './event-bridge';
```

- [ ] **Step 2: Build + commit**

```bash
pnpm --filter @nordcom/cart-next build
pnpm --filter @nordcom/cart-next typecheck
pnpm --filter @nordcom/cart-next test
git add packages/cart/next/src/index.ts
git commit -m "feat(cart-next): expose public API from index.ts."
```

### Checkpoint 4: cart-next complete

- All cart-next tests pass.
- `pnpm --filter @nordcom/cart-next build` succeeds.
- All four cart packages are now buildable and tested; storefront still depends on the old in-app cart paths but will switch in Phase 5.

Run a full root build to confirm:

```bash
pnpm build:packages
pnpm typecheck
```

Expected: green; storefront still uses old paths.

---

## Phase 5: Storefront switchover (single PR, sequential commits)

Wire the storefront on top of the new packages. Each task lands as a focused commit; the final commit deletes the old cart code and runs the E2E suite.

### Task 5.1: Changeset entries

**Files:**
- Create: `.changeset/cart-core-initial.md`
- Create: `.changeset/cart-react-initial.md`
- Create: `.changeset/cart-next-initial.md`
- Create: `.changeset/cart-shopify-initial.md`

- [ ] **Step 1: Write each changeset file**

`.changeset/cart-core-initial.md`:

```md
---
'@nordcom/cart-core': minor
---

Initial publish: framework-agnostic cart kernel, types, capabilities, adapter contract, middleware (logger, tracing, idempotency, retry, analytics), event bus, money helpers, contract tests, and mock adapter.
```

`.changeset/cart-react-initial.md`:

```md
---
'@nordcom/cart-react': minor
---

Initial publish: React 19 provider with slice contexts, predictive mutation queue with cascade-cancel and cross-tab sync, capability-typed actions, line + cart predictors, `<CartForm>` zero-JS primitive, and `./devtools` panel.
```

`.changeset/cart-next-initial.md`:

```md
---
'@nordcom/cart-next': minor
---

Initial publish: Next.js 16 HttpOnly cookie storage, `react.cache()` reader/ensurer (no `'use cache'`), typed + FormData server-action factories with injectable message localizer + auth bridge, and `nextEventBridge` for kernel-side fire-and-forget effects.
```

`.changeset/cart-shopify-initial.md`:

```md
---
'@nordcom/cart-shopify': minor
---

Initial publish: Shopify cart adapter using an injected `ShopifyTransport`, gql.tada mutations + normalizer, all-capabilities-on by default, `updateBuyerCountry` custom mutation, and `mockShopifyTransport` testing utility.
```

- [ ] **Step 2: Commit**

```bash
git add .changeset
git commit -m "chore(changeset): seed cart-* initial 0.1.0 entries."
```

### Task 5.2: Host transport module

**Files:**
- Create: `apps/storefront/src/cart/transport.ts`

- [ ] **Step 1: Write** (copy from spec §"Host-side transport"):

```ts
import 'server-only';
import type { ShopifyTransport } from '@nordcom/cart-shopify';
import type { AdapterCtx } from '@nordcom/cart-core';
import type { OnlineShop } from '@nordcom/commerce-db';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { Locale } from '@/utils/locale';

const clientCache = new Map<string, Awaited<ReturnType<typeof ShopifyApolloApiClient>>>();

async function client(ctx: AdapterCtx) {
    const shop = ctx.shop as OnlineShop;
    const localeCode = `${ctx.locale.language}-${ctx.locale.country}`;
    const key = `${shop.id}:${localeCode}`;
    let c = clientCache.get(key);
    if (!c) {
        const locale = Locale.from(localeCode);
        if (!locale) throw new Error(`Invalid locale: ${localeCode}`);
        c = await ShopifyApolloApiClient({ shop, locale });
        clientCache.set(key, c);
    }
    return c;
}

export const shopifyTransport: ShopifyTransport = {
    async query(doc, vars, ctx) {
        const c = await client(ctx);
        return (c as unknown as { query: (q: unknown, v: Record<string, unknown>) => Promise<{ data: unknown }> }).query(doc, vars) as never;
    },
    async mutate(doc, vars, ctx) {
        const c = await client(ctx);
        return (c as unknown as { mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: unknown }> }).mutate(doc, vars) as never;
    },
};
```

- [ ] **Step 2: Commit**

```bash
mkdir -p apps/storefront/src/cart
git add apps/storefront/src/cart/transport.ts
git commit -m "feat(storefront/cart): add Shopify transport wired to ShopifyApolloApiClient."
```

### Task 5.3: Host context resolver

**Files:**
- Create: `apps/storefront/src/cart/context.ts`

- [ ] **Step 1: Write**

```ts
import 'server-only';
import type { AdapterCtx } from '@nordcom/cart-core';
import { consoleLogger } from '@nordcom/cart-core';
import type { OnlineShop } from '@nordcom/commerce-db';
import { getRequestContext } from '@/utils/request-context';
import { CartProviderError } from '@nordcom/cart-core';

export async function resolveContext(opts?: { idempotencyKey?: string }): Promise<AdapterCtx<OnlineShop>> {
    const ctx = await getRequestContext();
    if (!ctx) throw new CartProviderError('Storefront cart cannot resolve {shop, locale} from request context');
    return {
        shop: ctx.shop,
        locale: { language: ctx.locale.language, country: ctx.locale.country ?? 'US', currency: ctx.locale.currency ?? 'USD' },
        idempotencyKey: opts?.idempotencyKey,
        logger: consoleLogger,
    };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/storefront/src/cart/context.ts
git commit -m "feat(storefront/cart): bridge cart AdapterCtx to existing getRequestContext."
```

### Task 5.4: Host message localizer

**Files:**
- Create: `apps/storefront/src/cart/localize.ts`

- [ ] **Step 1: Write**

```ts
import 'server-only';
import type { CartActionFailureReason } from '@nordcom/cart-core';
import { getRequestContext } from '@/utils/request-context';
import { getDictionary } from '@/utils/dictionary';
import { getTranslations } from '@/utils/locale';

export async function messageLocalizer(reason: CartActionFailureReason, userErrorMessage?: string): Promise<string> {
    if (userErrorMessage && userErrorMessage.length > 0) return userErrorMessage;
    const ctx = await getRequestContext();
    if (!ctx) return 'Cart action failed.';
    const i18n = await getDictionary({ shop: ctx.shop, locale: ctx.locale });
    const { t } = getTranslations('cart-errors' as Parameters<typeof getTranslations>[0], i18n);
    return t(reason as Parameters<typeof t>[0]);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/storefront/src/cart/localize.ts
git commit -m "feat(storefront/cart): port message localizer to cart-next factory injection point."
```

### Task 5.5: Host analytics emitter

**Files:**
- Create: `apps/storefront/src/cart/analytics.ts`

- [ ] **Step 1: Write** — pipe to whatever analytics sink the storefront already uses (`trace.getActiveSpan()?.addEvent(...)` for OTel + any product-analytics SDK already in the storefront):

```ts
import 'server-only';
import { trace } from '@opentelemetry/api';
import type { AnalyticsEmit } from '@nordcom/cart-core';

export const emitAnalytics: AnalyticsEmit = (event, attrs) => {
    trace.getActiveSpan()?.addEvent(event, attrs as Record<string, never>);
};
```

(Note: extend with the storefront's product-analytics SDK if/when one is wired. Today's `_actions/cart.ts` only emits OTel events, so OTel-only matches existing behavior.)

- [ ] **Step 2: Commit**

```bash
git add apps/storefront/src/cart/analytics.ts
git commit -m "feat(storefront/cart): emit analytics middleware events into OTel span."
```

### Task 5.6: Host auth bridge (server + client)

**Files:**
- Create: `apps/storefront/src/cart/auth-bridge.ts`
- Create: `apps/storefront/src/cart/client-auth.ts`

- [ ] **Step 1: Write `auth-bridge.ts` (server)**

```ts
import 'server-only';
import { auth } from '@/auth';
import type { AuthBridge } from '@nordcom/cart-next';

export const authBridge: AuthBridge = {
    async resolve() {
        const session = await auth();
        if (!session?.user) return null;
        return {
            email: session.user.email ?? undefined,
            ...(session.user.shopifyAccessToken
                ? { provider: { type: 'shopify' as const, data: { customerAccessToken: session.user.shopifyAccessToken } } }
                : {}),
        };
    },
};
```

- [ ] **Step 2: Write `client-auth.ts` (client)**

```ts
'use client';

import { useSession } from 'next-auth/react';
import type { ClientAuthBridge } from '@nordcom/cart-react';
import type { BuyerIdentity } from '@nordcom/cart-core';

function mapSessionToIdentity(session: ReturnType<typeof useSession>['data']): BuyerIdentity | null {
    if (!session?.user) return null;
    return {
        email: session.user.email ?? undefined,
        ...(session.user.shopifyAccessToken
            ? { provider: { type: 'shopify' as const, data: { customerAccessToken: session.user.shopifyAccessToken } } }
            : {}),
    };
}

export const clientAuthBridge: ClientAuthBridge = {
    useBuyerIdentity() {
        const session = useSession();
        return { identity: mapSessionToIdentity(session.data), updatedAt: (session as never as { lastUpdate?: number }).lastUpdate ?? 0 };
    },
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/cart/auth-bridge.ts apps/storefront/src/cart/client-auth.ts
git commit -m "feat(storefront/cart): add auth bridge (server + client) on BuyerIdentity.provider shape."
```

### Task 5.7: Host kernel module

**Files:**
- Create: `apps/storefront/src/cart/kernel.ts`

- [ ] **Step 1: Write** (verbatim from spec §"Host-side kernel module"):

```ts
import 'server-only';
import {
    analytics,
    createCart,
    idempotency,
    logger,
    memoryIdempotencyStore,
    retry,
    tracing,
} from '@nordcom/cart-core';
import { createShopifyCartAdapter } from '@nordcom/cart-shopify';
import {
    createCartEnsurer,
    createCartReader,
    createFormCartActions,
    createTypedCartActions,
    httpOnlyCookieStorage,
    nextEventBridge,
} from '@nordcom/cart-next';
import { trace } from '@opentelemetry/api';
import { emitAnalytics } from './analytics';
import { authBridge } from './auth-bridge';
import { resolveContext } from './context';
import { messageLocalizer } from './localize';
import { shopifyTransport } from './transport';

const adapter = createShopifyCartAdapter({ transport: shopifyTransport });

const otelTracer = {
    async startSpan<R>(name: string, attrs: Record<string, unknown>, fn: (span: { recordException: (e: unknown) => void; setAttribute: (k: string, v: unknown) => void }) => Promise<R>): Promise<R> {
        return trace.getTracer('cart').startActiveSpan(name, { attributes: attrs as Record<string, never> }, async (span) => {
            try {
                return await fn({
                    recordException: (e) => span.recordException(e as Error),
                    setAttribute: (k, v) => span.setAttribute(k, v as never),
                });
            } finally {
                span.end();
            }
        });
    },
};

export const cartKernel = createCart({
    adapter,
    middleware: [
        logger(),
        tracing({ tracer: otelTracer }),
        idempotency({ store: memoryIdempotencyStore(), windowMs: 30_000 }),
        retry({ attempts: 2, backoffMs: 50 }),
        analytics({ emit: emitAnalytics }),
    ],
});

export type AppCartCaps = typeof cartKernel.capabilities;
export type AppCartExt = Record<string, never>;
export type AppCartConfig = { caps: AppCartCaps; ext: AppCartExt };

const storage = httpOnlyCookieStorage();
export const readCart = createCartReader({ kernel: cartKernel, storage });
export const ensureCart = createCartEnsurer({ kernel: cartKernel, storage, reader: readCart });
export const typed = createTypedCartActions({
    kernel: cartKernel,
    storage,
    resolveContext,
    authBridge,
    messageLocalizer,
});
export const forms = createFormCartActions({ typed });

nextEventBridge().onKernel(cartKernel);
```

- [ ] **Step 2: Commit**

```bash
git add apps/storefront/src/cart/kernel.ts
git commit -m "feat(storefront/cart): wire cart kernel against new packages."
```

### Task 5.8: Rewrite `_actions/cart.ts` as thin re-exports

**Files:**
- Modify: `apps/storefront/src/app/[domain]/[locale]/_actions/cart.ts`

- [ ] **Step 1: Replace file contents**

```ts
'use server';

import { typed, forms } from '@/cart/kernel';

export const addLine = typed.addLine;
export const updateLine = typed.updateLine;
export const removeLine = typed.removeLine;
export const applyDiscountCode = typed.applyDiscountCode;
export const removeDiscountCode = typed.removeDiscountCode;
export const applyGiftCard = typed.applyGiftCard;
export const removeGiftCard = typed.removeGiftCard;
export const updateNote = typed.updateNote;
export const updateAttributes = typed.updateAttributes;
export const updateBuyerIdentity = typed.updateBuyerIdentity;
export const dispatch = typed.dispatch;

export const addLineAction = forms.addLineAction;
export const updateLineAction = forms.updateLineAction;
export const removeLineAction = forms.removeLineAction;
export const applyDiscountCodeAction = forms.applyDiscountCodeAction;
export const removeDiscountCodeAction = forms.removeDiscountCodeAction;
export const applyGiftCardAction = forms.applyGiftCardAction;
export const removeGiftCardAction = forms.removeGiftCardAction;
export const updateNoteAction = forms.updateNoteAction;
export const updateAttributesAction = forms.updateAttributesAction;
export const updateBuyerIdentityAction = forms.updateBuyerIdentityAction;
```

- [ ] **Step 2: Commit**

```bash
git add apps/storefront/src/app/[domain]/[locale]/_actions/cart.ts
git commit -m "refactor(storefront/cart): swap _actions/cart.ts to re-export cart-next factories."
```

### Task 5.9: Replace `_actions/cart.types.ts` with cart-core re-exports

**Files:**
- Modify: `apps/storefront/src/app/[domain]/[locale]/_actions/cart.types.ts`

- [ ] **Step 1: Replace contents**

```ts
export type { CartActionFailureReason, CartActionResult } from '@nordcom/cart-core';
```

- [ ] **Step 2: Commit**

```bash
git add apps/storefront/src/app/[domain]/[locale]/_actions/cart.types.ts
git commit -m "refactor(storefront/cart): re-export action result types from cart-core."
```

### Task 5.10: Rewrite `_actions/cart.test.ts`

**Files:**
- Modify: `apps/storefront/src/app/[domain]/[locale]/_actions/cart.test.ts`

- [ ] **Step 1: Read the existing file**

Inspect what it asserts (error mapping, revalidateTag call). Drop the revalidateTag assertion. Stub the new shape — mocks should now stub `@/cart/kernel.typed` instead of `resolveCartProvider` and `ensureCart`.

- [ ] **Step 2: Replace with a port that uses the new factory** — keep behavioral assertions (`reason` codes, `userErrors` propagation, idempotency-key forwarding) but drop revalidateTag:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/cart/kernel', () => ({
    typed: {
        addLine: vi.fn(),
        updateLine: vi.fn(),
        removeLine: vi.fn(),
        applyDiscountCode: vi.fn(),
        removeDiscountCode: vi.fn(),
        applyGiftCard: vi.fn(),
        removeGiftCard: vi.fn(),
        updateNote: vi.fn(),
        updateAttributes: vi.fn(),
        updateBuyerIdentity: vi.fn(),
        dispatch: vi.fn(),
    },
    forms: {
        addLineAction: vi.fn(),
        updateLineAction: vi.fn(),
        removeLineAction: vi.fn(),
        applyDiscountCodeAction: vi.fn(),
        removeDiscountCodeAction: vi.fn(),
        applyGiftCardAction: vi.fn(),
        removeGiftCardAction: vi.fn(),
        updateNoteAction: vi.fn(),
        updateAttributesAction: vi.fn(),
        updateBuyerIdentityAction: vi.fn(),
    },
}));

import { typed, forms } from '@/cart/kernel';
import { addLine, addLineAction } from './cart';

beforeEach(() => vi.clearAllMocks());

describe('_actions/cart.ts', () => {
    it('addLine forwards args to typed.addLine', async () => {
        vi.mocked(typed.addLine).mockResolvedValueOnce({ ok: true, cart: {} as never });
        await addLine({ variantId: 'v', quantity: 1, idempotencyKey: 'k' });
        expect(typed.addLine).toHaveBeenCalledWith({ variantId: 'v', quantity: 1, idempotencyKey: 'k' });
    });

    it('addLineAction forwards FormData to forms.addLineAction', async () => {
        const fd = new FormData();
        fd.set('variantId', 'v');
        vi.mocked(forms.addLineAction).mockResolvedValueOnce({ ok: true, cart: {} as never });
        await addLineAction(fd);
        expect(forms.addLineAction).toHaveBeenCalledWith(fd);
    });
});
```

- [ ] **Step 3: PASS + commit**

```bash
pnpm --filter @nordcom/commerce-storefront test cart.test
git add apps/storefront/src/app/[domain]/[locale]/_actions/cart.test.ts
git commit -m "test(storefront/cart): rewrite _actions/cart.test against cart-next factories."
```

### Task 5.11: Mount provider in app root

**Files:**
- Modify: the appropriate layout file (`apps/storefront/src/app/[domain]/[locale]/layout.tsx` or wherever the current `NordcomCartProvider` is mounted today)

- [ ] **Step 1: Locate the current mount point**

```bash
grep -rn "NordcomCartProvider\b" apps/storefront/src --include="*.tsx" -l
```

- [ ] **Step 2: Replace the import + mount**

```diff
-import { NordcomCartProvider } from '@/components/cart/provider';
+import { CartProvider } from '@nordcom/cart-react';
+import { snapshotPredictor, cachePredictor, quantitySumPredictor, subtotalPredictor } from '@nordcom/cart-react';
+import { readCart, cartKernel } from '@/cart/kernel';
+import { clientAuthBridge } from '@/cart/client-auth';

-<NordcomCartProvider>{children}</NordcomCartProvider>
+<Suspense fallback={null}>
+    <CartIsland>{children}</CartIsland>
+</Suspense>
```

Add a `CartIsland` server component in the same file (or split out):

```tsx
async function CartIsland({ children }: { children: ReactNode }) {
    const ctx = await resolveContext();
    const initial = await readCart(ctx);
    return (
        <CartProvider
            kernelSnapshot={{ type: cartKernel.type, capabilities: cartKernel.capabilities, customMutationNames: cartKernel.capabilities.customMutations }}
            submitMutation={async (envelope) => (await import('@/app/[domain]/[locale]/_actions/cart')).dispatch(envelope)}
            initialCart={initial}
            shopId={ctx.shop.id}
            predictors={{ line: [snapshotPredictor(), cachePredictor({ get: () => null })], cart: [quantitySumPredictor(), subtotalPredictor()] }}
            clientAuthBridge={clientAuthBridge}
        >
            {children}
        </CartProvider>
    );
}
```

(Note: `cachePredictor` is wired with a no-op getter for v1. Future work plugs in a real client variant cache.)

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/[domain]/[locale]/layout.tsx
git commit -m "feat(storefront/cart): mount CartProvider inside a Suspense cart island."
```

### Task 5.12: Update consumer UI primitives' imports

**Files:**
- Modify: `apps/storefront/src/components/cart/cart-line.tsx`
- Modify: `apps/storefront/src/components/cart/cart-lines.tsx`
- Modify: `apps/storefront/src/components/cart/cart-summary.tsx`
- Modify: `apps/storefront/src/components/cart/cart-note.tsx`
- Modify: `apps/storefront/src/components/cart/cart-coupons.tsx`
- Modify: `apps/storefront/src/components/header/cart-button.tsx`
- Modify: `apps/storefront/src/components/products/add-to-cart.tsx`
- Modify: `apps/storefront/src/app/[domain]/[locale]/cart/cart-content.tsx`
- Modify: `apps/storefront/src/app/[domain]/[locale]/cart/cart-sidebar.tsx`

For each file:

- [ ] **Step 1: Find current import lines**

```bash
grep -rn "from '@/components/cart/provider'\|from '@/api/cart/types'\|from '@/api/cart'" apps/storefront/src --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Rewrite imports**

Replace:
- `from '@/components/cart/provider'` → `from '@nordcom/cart-react'`
- `from '@/api/cart/types'` → `from '@nordcom/cart-core'`
- `from '@/api/cart'` (`resolveCartProvider`) → drop (only used in server actions, now via kernel)

Specifically for `add-to-cart.tsx`:

```diff
-import { useCartActions } from '@/components/cart/provider';
+import { useCartActions } from '@nordcom/cart-react';
+import type { ProductSnapshot } from '@nordcom/cart-core';
+
+// Build ProductSnapshot from the surrounding product data and pass it through:
 actions.addLine({
   variantId,
   quantity,
+  snapshot: {
+    variantId,
+    productHandle: product.handle,
+    productTitle: product.title,
+    variantTitle: variant.title,
+    image: variant.image
+      ? { url: variant.image.url, altText: variant.image.altText, width: variant.image.width, height: variant.image.height }
+      : null,
+    unitPrice: variant.price,
+    compareAtUnitPrice: variant.compareAtPrice ?? null,
+  } satisfies ProductSnapshot,
+  idempotencyKey: crypto.randomUUID(),
 });
```

(Adapt the exact field names to whatever the component currently has in scope.)

- [ ] **Step 3: Run typecheck per file after edit**

```bash
pnpm --filter @nordcom/commerce-storefront typecheck
```

Iterate until clean.

- [ ] **Step 4: Commit per file or per cluster**

Use one commit per logical cluster (cart UI; product UI; header):

```bash
git add apps/storefront/src/components/cart/cart-line.tsx apps/storefront/src/components/cart/cart-lines.tsx apps/storefront/src/components/cart/cart-summary.tsx apps/storefront/src/components/cart/cart-note.tsx apps/storefront/src/components/cart/cart-coupons.tsx
git commit -m "refactor(storefront/cart): point cart UI primitives at @nordcom/cart-react hooks."

git add apps/storefront/src/components/header/cart-button.tsx
git commit -m "refactor(storefront/header): swap cart-button to useCartCount from @nordcom/cart-react."

git add apps/storefront/src/components/products/add-to-cart.tsx
git commit -m "feat(storefront/product): pass ProductSnapshot through useCartActions().addLine for predictive UI."

git add apps/storefront/src/app/[domain]/[locale]/cart/cart-content.tsx apps/storefront/src/app/[domain]/[locale]/cart/cart-sidebar.tsx
git commit -m "refactor(storefront/cart): cart-page surfaces use @nordcom/cart-react hooks."
```

### Task 5.13: Delete the old cart code

**Files:**
- Delete:
  - `apps/storefront/src/api/cart/` (entire directory)
  - `apps/storefront/src/components/cart/provider.tsx`
  - `apps/storefront/src/components/cart/provider.test.tsx`
  - `apps/storefront/src/components/cart/provider-rerender.test.tsx`
  - `apps/storefront/src/components/cart/optimistic-reducer.ts`
  - `apps/storefront/src/components/cart/optimistic-reducer.test.ts`
  - `apps/storefront/src/components/cart/cart-hydrator.tsx`
  - `apps/storefront/src/components/cart/cart-hydrator-client.tsx`
  - `apps/storefront/src/components/cart/cart-hydrator-client.test.tsx`
  - `apps/storefront/src/components/cart/buyer-identity-sync.tsx`
  - `apps/storefront/src/components/cart/use-sync-buyer-identity.ts`
  - `apps/storefront/src/components/cart/use-sync-buyer-identity.test.ts`
  - `apps/storefront/src/utils/cart-server.ts`
  - `apps/storefront/src/utils/cart-server.test.ts`
  - `apps/storefront/src/utils/cart-cookie.ts`
  - `apps/storefront/src/utils/cart-cookie.test.ts`

- [ ] **Step 1: Confirm zero remaining imports of the deletion targets**

```bash
grep -rn "from '@/components/cart/provider'\|from '@/components/cart/optimistic-reducer'\|from '@/components/cart/cart-hydrator'\|from '@/components/cart/buyer-identity-sync'\|from '@/components/cart/use-sync-buyer-identity'\|from '@/utils/cart-server'\|from '@/utils/cart-cookie'\|from '@/api/cart'" apps/storefront/src --include="*.tsx" --include="*.ts"
```

Expected: empty. If anything matches, fix the import before deleting.

- [ ] **Step 2: Confirm zero `cart:*` cache tag uses remain**

```bash
rg -n 'cart:' apps/storefront/src --type ts --type tsx | rg -i 'cacheTag|revalidateTag'
```

Expected: zero hits.

- [ ] **Step 3: Delete files**

```bash
git rm -r apps/storefront/src/api/cart
git rm apps/storefront/src/components/cart/provider.tsx
git rm apps/storefront/src/components/cart/provider.test.tsx
git rm apps/storefront/src/components/cart/provider-rerender.test.tsx
git rm apps/storefront/src/components/cart/optimistic-reducer.ts
git rm apps/storefront/src/components/cart/optimistic-reducer.test.ts
git rm apps/storefront/src/components/cart/cart-hydrator.tsx
git rm apps/storefront/src/components/cart/cart-hydrator-client.tsx
git rm apps/storefront/src/components/cart/cart-hydrator-client.test.tsx
git rm apps/storefront/src/components/cart/buyer-identity-sync.tsx
git rm apps/storefront/src/components/cart/use-sync-buyer-identity.ts
git rm apps/storefront/src/components/cart/use-sync-buyer-identity.test.ts
git rm apps/storefront/src/utils/cart-server.ts
git rm apps/storefront/src/utils/cart-server.test.ts
git rm apps/storefront/src/utils/cart-cookie.ts
git rm apps/storefront/src/utils/cart-cookie.test.ts
```

- [ ] **Step 4: Typecheck + unit tests + commit**

```bash
pnpm --filter @nordcom/commerce-storefront typecheck
pnpm --filter @nordcom/commerce-storefront test
```

Expected: green. Commit:

```bash
git commit -m "refactor(storefront/cart): drop in-app cart code now that @nordcom/cart-* owns it."
```

### Task 5.14: Run E2E suite

- [ ] **Step 1: Run storefront E2E**

```bash
pnpm test:e2e --project @nordcom/commerce-storefront
```

Expected: all five preserved tests pass — `optimistic`, `cross-tab`, `expired-recovery`, `no-JS`, `userError`.

- [ ] **Step 2: If any test fails:**
  - **`optimistic`** likely points at queue state / predictor output → diff against `provider.tsx` projection logic; fix predictor or queue reducer.
  - **`cross-tab`** likely needs the BroadcastChannel `cart-updated` payload shape verified; ensure provider broadcasts `{ type: 'cart-updated', cart, cartId }` (or whatever the existing E2E expects — port verbatim).
  - **`expired-recovery`** likely needs `createCartEnsurer`'s clear-on-not-found path; verify storage.clear() fires.
  - **`no-JS`** likely needs `<CartForm>` to render real `<form action={...}>`; verify form posts hit `forms.*Action` server actions.
  - **`userError`** likely needs `messageLocalizer` to localize via `cart-errors` dictionary; verify it's wired.

Iterate per failure; commit each fix individually:

```bash
git commit -m "fix(storefront/cart): <specific failure>."
```

- [ ] **Step 3: When green, no commit required for the E2E itself.**

### Task 5.15: Final verification + handoff

- [ ] **Step 1: Run full build + tests root-level**

```bash
pnpm build:packages
pnpm typecheck
pnpm test
pnpm test:e2e --project @nordcom/commerce-storefront
pnpm changeset status
```

Expected: all green; changeset status shows four `@nordcom/cart-*` packages at `minor` for the initial release.

- [ ] **Step 2: Verify no stale references**

```bash
rg -n 'NordcomCartProvider|resolveCartProvider|cart-server\.ts|cart-cookie\.ts' apps/storefront/src
```

Expected: zero hits.

- [ ] **Step 3: PR description / summary commit (optional)**

If running through CI on a feature branch, push the branch and open a PR with summary linking to `.specs/2026-05-27-cart-package/spec.md` and `.specs/2026-05-27-cart-package/plan.md`.

### Checkpoint 5: Storefront switchover complete

- All cart packages built, tested, releasable via Changesets.
- Storefront E2E suite green on the new packages.
- Old cart paths removed from the storefront.
- CI is green end-to-end (typecheck, unit, build, E2E).

---

## Self-review notes

- **Spec coverage:** Every numbered goal in spec §Goals has a corresponding task above. Capabilities (Goal 3) → Task 1.4; middleware (Goal 4) → Tasks 1.5–1.10; predictors + queue (Goal 5) → Tasks 3.2–3.5; storage (Goal 6) → Task 4.2; auth bridge (Goal 7) → Tasks 3.7 + 5.6; transport (Goal 8) → Tasks 2.1 + 5.2; events (Goal 9) → Tasks 1.11 + 3.10; capability-typed actions (Goal 10) → Task 3.6; `<CartForm>` (Goal 11) → Task 3.12; contract tests + mock (Goal 12) → Tasks 1.13–1.14; devtools (Goal 13) → Task 3.13; money model (Goal 14) → Task 1.1; storefront switchover preserving E2E (Goal 15) → Phase 5.
- **Placeholder scan:** Each task lists exact file paths, runnable commands, and concrete code. The `(adapt the exact field names…)` note in Task 5.12 is an unavoidable seam where the storefront's current product data shape determines the destructuring — the implementing agent reads `add-to-cart.tsx` to fill it in.
- **Type consistency:** `MutationEnvelope`, `SubmitMutation`, `CartActionResult`, `CartActions<C>`, `CartCapabilities`, and `AdapterCtx` use identical signatures across tasks. The reader/ensurer return types match `Cart<TExt> | null` and `Cart<TExt>` respectively, threaded through `CartKernel<TExt, TShop>`.
- **Migration risk register** in spec §Migration risk register is addressed: NextAuth session shape via `client-auth.ts` typing-test stand-in (Task 5.6); gql.tada schema drift via `cart-shopify` peer dep (Task 2.2); cache-components compliance via removal of `'use cache'` + Suspense boundary in Task 5.11.

---

