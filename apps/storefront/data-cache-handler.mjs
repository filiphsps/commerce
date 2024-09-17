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
            handlers: null
        };
    }

    const client = new Redis(data_cache_url, { lazyConnect: true });
    client.on('error', (error) => console.error('[data-cache-handle/ioredis]', error));
    await client.connect();

    // Define a key for shared tags.
    // You'll see how to use it later in the `revalidateTag` method
    const sharedTagsKey = '_sharedTags_';
    const revalidatedTagsKey = `__revalidated_tags__`;

    /** @type {import('@neshca/cache-handler').CacheHandler} */
    const redisHandler = {
        // Give the handler a name.
        // It is useful for logging in debug mode.
        name: 'ioredis-strings',
        // We do not use try/catch blocks in the Handler methods.
        // CacheHandler will handle errors and use the next available Handler.
        async get(
            key,
            {
                /** @type {string[]} */
                implicitTags
            }
        ) {
            // Get the value from Redis.
            // We use the key prefix to avoid key collisions with other data in Redis.
            const result = await client.get(key);

            // If the key does not exist, return null.
            if (!result) {
                return null;
            }

            // Redis stores strings, so we need to parse the JSON.
            /** @type {import('@neshca/cache-handler').CacheHandlerValue} */
            const cacheValue = JSON.parse(result);

            // If the cache value has no tags, return it early.
            if (!cacheValue) {
                return null;
            }

            // Get the set of explicit and implicit tags.
            // implicitTags are available only on the `get` method.
            const combinedTags = new Set([...cacheValue.tags, ...implicitTags]);

            // If there are no tags, return the cache value early.
            if (combinedTags.size === 0) {
                return cacheValue;
            }

            // Get the revalidation times for the tags.
            const revalidationTimes = await client.hmget(revalidatedTagsKey, Array.from(combinedTags));

            // Iterate over all revalidation times.
            for (const timeString of revalidationTimes) {
                // If the revalidation time is greater than the last modified time of the cache value,
                if (timeString && Number.parseInt(timeString, 10) > cacheValue.lastModified) {
                    // Delete the key from Redis.
                    await client.unlink(key);

                    // Return null to indicate cache miss.
                    return null;
                }
            }

            // Return the cache value.
            return cacheValue;
        },
        async set(key, cacheHandlerValue) {
            // Redis stores strings, so we need to stringify the JSON.
            const setOperation = client.set(key, JSON.stringify(cacheHandlerValue));

            // If the cacheHandlerValue has a lifespan, set the automatic expiration.
            // cacheHandlerValue.lifespan can be null if the value is the page from the Pages Router without getStaticPaths or with `fallback: false`
            // so, we need to check if it exists before using it
            const expireOperation = cacheHandlerValue.lifespan
                ? client.expireat(key, cacheHandlerValue.lifespan.expireAt)
                : undefined;

            // If the cache handler value has tags, set the tags.
            // We store them separately to save time to retrieve them in the `revalidateTag` method.
            const setTagsOperation = cacheHandlerValue.tags.length
                ? client.hset(sharedTagsKey, key, JSON.stringify(cacheHandlerValue.tags))
                : undefined;

            // Wait for all operations to complete.
            await Promise.all([setOperation, expireOperation, setTagsOperation]);
        },
        async revalidateTag(tag) {
            // Check if the tag is implicit.
            // Implicit tags are not stored in the cached values.
            if (isImplicitTag(tag)) {
                // Mark the tag as revalidated at the current time.
                await client.hset(revalidatedTagsKey, tag, Date.now());
            }

            // Create a map to store the tags for each key.
            const tagsMap = new Map();

            // Cursor for the hScan operation.
            let cursor = 0;

            // Iterate over all keys in the shared tags.
            do {
                const remoteTagsPortion = await client.hscan(sharedTagsKey, cursor, 'COUNT', 100);

                // Iterate over all keys in the portion.
                for (const { field, value } of remoteTagsPortion.tuples) {
                    // Parse the tags from the value.
                    tagsMap.set(field, JSON.parse(value));
                }

                // Update the cursor for the next iteration.
                cursor = remoteTagsPortion.cursor;

                // If the cursor is 0, we have reached the end.
            } while (cursor !== 0);

            // Create an array of keys to delete.
            const keysToDelete = [];

            // Create an array of tags to delete from the hash map.
            const tagsToDelete = [];

            // Iterate over all keys and tags.
            for (const [key, tags] of tagsMap) {
                // If the tags include the specified tag, add the key to the delete list.
                if (tags.includes(tag)) {
                    // Key must be prefixed because we use the key prefix in the set method.
                    keysToDelete.push(key);
                    // Set an empty string as the value for the revalidated tag.
                    tagsToDelete.push(key);
                }
            }

            // If there are no keys to delete, return early.
            if (keysToDelete.length === 0) {
                return;
            }

            // Delete the keys from Redis.
            const deleteKeysOperation = client.unlink(keysToDelete);

            // Update the tags in Redis by deleting the revalidated tags.
            const updateTagsOperation = client.hdel(sharedTagsKey, tagsToDelete);

            // Wait for all operations to complete.
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
