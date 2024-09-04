import { CacheHandler } from '@neshca/cache-handler';
import createLruHandler from '@neshca/cache-handler/local-lru';
import createRedisHandler from '@neshca/cache-handler/redis-strings';

import { createClient } from 'redis';

/** @type {string | undefined} */
const data_cache_url = process.env.DATA_CACHE_REDIS_URL;
/** @type {string} */
const vercel_env = process.env.VERCEL_ENV || 'development';

/** @type {import("redis").RedisClientType | null} */
const client = createClient({ url: data_cache_url });
client.on('connect', () => console.info('Redis client connected.'));
client.on('error', (error) => console.error('Redis error', error));
client.on('reconnecting', () => console.warn('Redis client reconnecting...'));
client.on('end', () => console.info('Redis client disconnected.'));

try {
    console.info('Connecting Redis client...');
    await client.connect();
} catch (error) {
    console.error('redis', error);
    try {
        client.disconnect();
    } catch {}
}

CacheHandler.onCreation(async () => {
    if (!client?.isReady) {
        console.warn('Falling back to LRU handler because Redis client is not available.');
        return {
            handlers: [createLruHandler()]
        };
    }

    return {
        handlers: [
            await createRedisHandler({
                client,
                keyPrefix: `${vercel_env.slice(0, 2)}:`,
                timeoutMs: 1000,
                keyExpirationStrategy: 'EXAT',
                sharedTagsKey: '__sharedTags__',
                revalidateTagQuerySize: 250
            })
        ]
    };
});

export default CacheHandler;
