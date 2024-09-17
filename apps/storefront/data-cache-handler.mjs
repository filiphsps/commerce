import { CacheHandler } from '@neshca/cache-handler';
import { isImplicitTag } from '@neshca/cache-handler/helpers';
import createLruHandler from '@neshca/cache-handler/local-lru';

import Redis from 'ioredis';

/** @type {string | undefined} */
const DATA_CACHE_URL = process.env.DATA_CACHE_REDIS_URL || '';
if (!DATA_CACHE_URL) {
    console.warn('DATA_CACHE_URL is not set, disabling data cache.');
}

CacheHandler.onCreation(async (context) => {
    if (context.dev || !DATA_CACHE_URL) {
        return {
            handlers: [createLruHandler()]
        };
    }

    const client = new Redis(DATA_CACHE_URL, { lazyConnect: true });
    client.on('error', (error) => console.error('[data-cache-handle/ioredis]', error));
    await client.connect();

    // Define a key for shared tags.
    // You'll see how to use it later in the `revalidateTag` method
    const sharedTagsKey = '_sharedTags_';
    const revalidatedTagsKey = `__revalidated_tags__`;

    /** @type {import('@neshca/cache-handler').CacheHandler} */
    const redisHandler = {
        name: 'ioredis-strings',
        async get(key, { implicitTags }) {
            // Fetch the cached value from Redis using the provided key
            const result = await client.get(key);
            if (!result) {
                return null; // Return null if no value is found
            }

            // Parse the cached value from JSON
            /** @type {import('@neshca/cache-handler').CacheHandlerValue} */
            const cacheValue = JSON.parse(result);
            if (!cacheValue) {
                return null; // Return null if parsing fails
            }

            // Combine the tags from the cached value and the implicit tags
            const combinedTags = new Set([...cacheValue.tags, ...implicitTags]);
            if (combinedTags.size === 0) {
                return cacheValue; // Return the cached value if there are no tags to revalidate
            }

            // Fetch the revalidation times for the combined tags
            const revalidationTimes = await client.hmget(revalidatedTagsKey, ...Array.from(combinedTags));
            for (const timeString of revalidationTimes) {
                // If any tag has been revalidated after the cached value was last modified, delete the cached value
                if (timeString && Number.parseInt(timeString, 10) > cacheValue.lastModified) {
                    await client.del(key);
                    return null;
                }
            }

            return cacheValue; // Return the cached value if it is still valid
        },
        async set(key, cacheHandlerValue) {
            // Set the cached value in Redis
            const setOperation = client.set(key, JSON.stringify(cacheHandlerValue));
            // Set the expiration time if a lifespan is provided
            const expireOperation = cacheHandlerValue.lifespan
                ? client.expireat(key, cacheHandlerValue.lifespan.expireAt)
                : undefined;
            // Set the tags associated with the cached value
            const setTagsOperation = cacheHandlerValue.tags.length
                ? client.hset(sharedTagsKey, key, JSON.stringify(cacheHandlerValue.tags))
                : undefined;

            // Wait for all operations to complete
            await Promise.all([setOperation, expireOperation, setTagsOperation].filter(Boolean));
        },
        async revalidateTag(tag) {
            // If the tag is implicit, update its revalidation time
            if (isImplicitTag(tag)) {
                await client.hset(revalidatedTagsKey, tag, Date.now());
            }

            const tagsMap = new Map();
            let cursor = '0';

            // Scan through the shared tags in Redis
            do {
                const [newCursor, results] = await client.hscan(sharedTagsKey, cursor, 'COUNT', 100);
                for (let i = 0; i < results.length; i += 2) {
                    const field = results[i];
                    const value = results[i + 1];
                    tagsMap.set(field, JSON.parse(value));
                }
                cursor = newCursor;
            } while (cursor !== '0');

            const keysToDelete = [];
            const tagsToDelete = [];

            // Identify keys and tags to delete based on the revalidated tag
            for (const [key, tags] of tagsMap) {
                if (tags.includes(tag)) {
                    keysToDelete.push(key);
                    tagsToDelete.push(key);
                }
            }

            if (keysToDelete.length === 0) {
                return; // Return early if there are no keys to delete
            }

            // Delete the identified keys and update the shared tags
            const deleteKeysOperation = client.del(keysToDelete);
            const updateTagsOperation = client.hdel(sharedTagsKey, ...tagsToDelete);

            await Promise.all([deleteKeysOperation, updateTagsOperation]);
        }
    };

    return {
        handlers: [redisHandler, createLruHandler()],
        ttl: {
            defaultStaleAge: 3600,
            estimateExpireAge: (staleAge) => staleAge
        }
    };
});

export default CacheHandler;
