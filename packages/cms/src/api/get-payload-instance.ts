import 'server-only';
import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { buildPayloadConfig } from '../config';

let cached: Promise<Payload> | undefined;

export const getPayloadInstance = (): Promise<Payload> => {
    if (cached) return cached;
    cached = (async () => {
        const config = await buildPayloadConfig({
            secret: process.env.PAYLOAD_SECRET ?? '',
            mongoUrl: process.env.MONGODB_URI ?? '',
            includeAdmin: false,
            enableStorage: true,
        });
        return getPayload({ config });
    })();
    return cached;
};
