import { CacheHandler } from '@neshca/cache-handler';
import createLruHandler from '@neshca/cache-handler/local-lru';
import createRedisHandler from '@neshca/cache-handler/redis-stack';
import { createClient } from 'redis';

if (!process.env.DATA_CACHE_REDIS_URL) {
    console.error('DATA_CACHE_REDIS_URL is not set!');
}

CacheHandler.onCreation(async () => {
    let client;

    try {
        // Create a Redis client.
        client = createClient({
            url: process.env.DATA_CACHE_REDIS_URL
        });

        // Redis won't work without error handling. https://github.com/redis/node-redis?tab=readme-ov-file#events
        client.on('error', (error) => {
            if (typeof process.env.NEXT_PRIVATE_DEBUG_CACHE !== 'undefined') {
                // Use logging with caution in production. Redis will flood your logs. Hide it behind a flag.
                console.error('Redis client error:', error);
            }
        });
    } catch (error) {
        console.warn('Failed to create Redis client:', error);
    }

    if (client) {
        try {
            // Wait for the client to connect.
            // Caveat: This will block the server from starting until the client is connected.
            // And there is no timeout. Make your own timeout if needed.
            await client.connect();
        } catch (error) {
            console.warn('Failed to connect Redis client:', error);

            // Try to disconnect the client to stop it from reconnecting.
            client
                .disconnect()
                .then(() => {})
                .catch(() => {
                    console.warn('Failed to exit the Redis client after failing to connect.');
                });
        }
    }

    /** @type {import("@neshca/cache-handler").Handler | null} */
    let handler;

    if (client?.isReady) {
        // Create the `redis-stack` Handler if the client is available and connected.
        handler = await createRedisHandler({
            client,
            keyPrefix: '',
            timeoutMs: 1000
        });
    } else {
        // Fallback to LRU handler if Redis client is not available.
        // The application will still work, but the cache will be in memory only and not shared.
        handler = createLruHandler();
        console.warn('Falling back to LRU handler because Redis client is not available.');
    }

    return {
        handlers: [handler]
    };
});

export default CacheHandler;
