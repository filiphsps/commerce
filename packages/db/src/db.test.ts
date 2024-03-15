import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterEach } from 'node:test';
import db from './db';

let mongod: MongoMemoryServer;

describe('api', () => {
    vi.mock('mongoose', async (importActual) => {
        const { Schema, ConnectionStates }: any = await importActual();
        return {
            default: {
                connect: vi.fn().mockResolvedValue({
                    model: vi.fn().mockReturnValue({}),
                    connection: {
                        readyState: ConnectionStates.connected
                    }
                }),
                set: vi.fn()
            },
            ConnectionStates,
            Schema
        };
    });

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
    });

    beforeEach(async () => {
        globalThis._mongoClientPromise = undefined;
        vi.stubEnv('MONGODB_URI', mongod.getUri());
    });

    afterEach(async () => {
        (await db()).connection.close();
    });

    it('should throw an error if MONGODB_URI environment variable is missing', async () => {
        vi.stubEnv('MONGODB_URI', '');

        await expect(db).rejects.toThrow(new MissingEnvironmentVariableError());
    });

    it('should connect to MongoDB using the provided URI', async () => {
        const connectSpy = vi.spyOn(mongoose, 'connect');

        const uri = mongod.getUri();
        vi.stubEnv('MONGODB_URI', uri);

        await db();

        expect(connectSpy).toHaveBeenCalledWith(uri, { bufferCommands: false });
    });

    it.skip('should set "strictQuery" option to true', async () => {
        const setSpy = vi.spyOn(mongoose, 'set');

        await db();

        expect(setSpy).toHaveBeenCalledWith('strictQuery', true);
    });
});
