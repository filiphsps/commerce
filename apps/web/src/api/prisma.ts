import 'server-only';

import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasourceUrl: process.env.POSTGRES_PRISMA_ACCELERATE_URL
    }).$extends(withAccelerate());
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();
export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
