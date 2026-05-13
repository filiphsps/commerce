import { describe, expect, it, expectTypeOf } from 'vitest';
import { str, num, type ParamTypeShape, type EntityDecl, type Brand } from '../src/types';

describe('types', () => {
    it('str is a Brand<string> sentinel', () => {
        // `str` is a runtime sentinel used as a placeholder in entity declarations.
        // The brand carries the string type at the type level.
        expectTypeOf(str).toEqualTypeOf<Brand<string>>();
    });

    it('num is a Brand<number> sentinel', () => {
        expectTypeOf(num).toEqualTypeOf<Brand<number>>();
    });

    it('ParamTypeShape extracts the runtime type from a ParamType', () => {
        type S = ParamTypeShape<typeof str>;
        type N = ParamTypeShape<typeof num>;
        expectTypeOf<S>().toEqualTypeOf<string>();
        expectTypeOf<N>().toEqualTypeOf<number>();
    });

    it('EntityDecl<{handle: str}> exposes a params record', () => {
        const decl: EntityDecl<{ handle: typeof str }, 'products'[]> = {
            params: { handle: str },
            parents: ['products'],
        };
        expect(decl.params.handle).toBe(str);
        expect(decl.parents).toEqual(['products']);
    });

    it('EntityDecl with no params is valid', () => {
        const decl: EntityDecl<undefined, never[]> = {};
        expect(decl.params).toBeUndefined();
    });
});
