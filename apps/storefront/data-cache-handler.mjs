import { CacheHandler } from '@neshca/cache-handler';
import createLruHandler from '@neshca/cache-handler/local-lru';
import createRedisHandler from '@neshca/cache-handler/redis-strings';

import Redis from 'ioredis';

/** @type {string | undefined} */
const data_cache_url = process.env.DATA_CACHE_REDIS_URL;

const client = new Redis(data_cache_url, { lazyConnect: true });
client.on('connect', () => console.debug('Redis client connected.'));
client.on('error', (error) => console.error('Redis error', error));
client.on('reconnecting', () => console.warn('Redis client reconnecting...'));
client.on('end', () => console.debug('Redis client disconnected.'));

CacheHandler.onCreation(async () => {
    try {
        console.debug('Connecting Redis client...');
        await client.connect();
    } catch {}

    if (client.status === 'close' || client.status === 'end') {
        console.warn('Falling back to LRU handler because Redis client is not available.');
        return {
            handlers: [createLruHandler()]
        };
    }

    return {
        handlers: [
            await createRedisHandler({
                client,
                timeoutMs: 1000,
                keyExpirationStrategy: 'EXAT',
                revalidateTagQuerySize: 100
            })
        ]
    };
});

export default CacheHandler;
