import 'server-only';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import mongoose from 'mongoose';

import type { Mongoose } from 'mongoose';

class Singleton {
    private static _instance: Singleton;
    private client: Mongoose;
    private clientPromise: Promise<Mongoose>;

    private constructor() {
        const uri = process.env.MONGODB_URI as string;
        if (!uri) throw new MissingEnvironmentVariableError('MONGODB_URI');

        this.client = mongoose;
        this.client.set('strictQuery', true);
        this.clientPromise = this.client.connect(uri, { bufferCommands: false });

        if (process.env.NODE_ENV === 'development') globalThis._mongoClientPromise = this.clientPromise;
    }

    public static get instance() {
        if (!this._instance) this._instance = new Singleton();
        return this._instance.clientPromise;
    }
}

export default async () => await Singleton.instance;
