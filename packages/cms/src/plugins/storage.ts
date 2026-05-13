import { s3Storage } from '@payloadcms/storage-s3';
import type { Plugin } from 'payload';

export type StoragePluginOptions = {
    bucket: string;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean;
};

export const buildStoragePlugin = (opts: StoragePluginOptions): Plugin =>
    s3Storage({
        collections: { media: true },
        bucket: opts.bucket,
        config: {
            endpoint: opts.endpoint,
            region: opts.region,
            credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
            forcePathStyle: opts.forcePathStyle ?? true,
        },
    });

export const storagePluginFromEnv = (): Plugin | null => {
    const bucket = process.env.S3_BUCKET;
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!bucket || !endpoint || !region || !accessKeyId || !secretAccessKey) return null;
    return buildStoragePlugin({ bucket, endpoint, region, accessKeyId, secretAccessKey });
};
