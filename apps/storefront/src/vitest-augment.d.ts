// Re-augment vitest's Assertion with @testing-library/jest-dom matchers so
// `pnpm typecheck` (tsc -noEmit) sees them. The runtime augmentation happens
// in vitest.setup.ts via `import '@testing-library/jest-dom/vitest'`, but
// static typecheck doesn't follow runtime imports for module augmentation.
//
// This file ships in the tsconfig include glob (src/**/*.ts) and contains
// zero runtime code — just type-side imports that pull in the matcher
// signatures.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import 'vitest';

declare module 'vitest' {
    interface Assertion<T = unknown> extends TestingLibraryMatchers<unknown, T> {}
    interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
