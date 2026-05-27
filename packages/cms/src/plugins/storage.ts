import { s3Storage } from '@payloadcms/storage-s3';
import type { Plugin } from 'payload';

/**
 * Options for {@link buildStoragePlugin}. Maps directly to the S3 credentials
 * and bucket config consumed by `@payloadcms/storage-s3`.
 *
 * @example
 * buildStoragePlugin({ bucket: 'my-bucket', endpoint: 'https://...', region: 'auto', accessKeyId: 'key', secretAccessKey: 'secret' });
 */
export type StoragePluginOptions = {
    bucket: string;
    endpoint: string;
    publicEndpoint?: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean;
};

/**
 * Builds a Payload S3-storage plugin for the `media` collection. Disables
 * Payload's built-in access control on media (files are served directly from
 * the public CDN endpoint) and uses the `publicEndpoint` for public URLs.
 *
 * @param opts - {@link StoragePluginOptions} with bucket, endpoint, and credentials.
 * @returns A configured Payload plugin.
 *
 * @example
 * buildStoragePlugin({ bucket: 'media', endpoint: 'https://s3.example.com', region: 'us-east-1', accessKeyId: 'key', secretAccessKey: 'secret' });
 */
export const buildStoragePlugin = (opts: StoragePluginOptions): Plugin =>
    s3Storage({
        enabled: true,
        collections: {
            media: {
                disablePayloadAccessControl: true,
                generateFileURL: ({ filename, prefix }) => {
                    const key = prefix ? `${prefix}/${filename}` : filename;
                    return `${opts.publicEndpoint}/${key}`;
                },
            },
        },
        bucket: opts.bucket || '',
        config: {
            credentials: {
                accessKeyId: opts.accessKeyId || '',
                secretAccessKey: opts.secretAccessKey || '',
            },
            region: opts.region || 'auto',
            endpoint: opts.endpoint || '',
            forcePathStyle: opts.forcePathStyle ?? true,
        },
        disableLocalStorage: true,
    });

/**
 * Reads S3 credentials from environment variables and returns a configured
 * storage plugin, or `null` when any required variable is absent. Designed
 * for use in `buildPayloadConfig` where storage is opt-in per deployment.
 *
 * @returns A Payload storage plugin, or `null` when the env is incomplete.
 *
 * @example
 * const storage = storagePluginFromEnv();
 * buildPayloadConfig({ plugins: storage ? [storage] : [] });
 */
export const storagePluginFromEnv = (): Plugin | null => {
    const bucket = process.env.S3_BUCKET;
    const endpoint = process.env.S3_ENDPOINT;
    const publicEndpoint = process.env.R2_PUBLIC_ENDPOINT;
    const region = process.env.S3_REGION || 'auto';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    if (!bucket || !endpoint || !region || !accessKeyId || !secretAccessKey) return null;
    return buildStoragePlugin({ bucket, endpoint, publicEndpoint, region, accessKeyId, secretAccessKey });
};
