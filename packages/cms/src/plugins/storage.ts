import { s3Storage } from '@payloadcms/storage-s3';
import type { Plugin } from 'payload';

export type StoragePluginOptions = {
    bucket: string;
    endpoint: string;
    publicEndpoint?: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean;
};

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
