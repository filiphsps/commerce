import { describe, expect, it } from 'vitest';

import prisma from './prisma';

describe('Prisma', () => {
    it('should assign the Prisma client to the global prisma variable', () => {
        expect(globalThis.prisma).toBeDefined();
        expect(globalThis.prisma).toEqual(prisma);
    });

    it('should export the Prisma client as the default export', () => {
        expect(prisma).toBeDefined();
        expect(prisma).toEqual(globalThis.prisma);
    });
});
