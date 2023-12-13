import type { ImageLoader as ImageLoaderType } from 'next/image';

const normalizeSrc = (src: string) => {
    return src.startsWith('/') ? src.slice(1) : src;
};

// See https://developers.cloudflare.com/images/image-resizing/integration-with-frameworks/#nextjs
export const CloudflareImageLoader: ImageLoaderType = ({ src, width, quality }) => {
    const params = [`width=${width}`];
    if (quality) {
        params.push(`quality=${quality}`);
    }
    const paramsString = params.join(',');
    return `/cdn-cgi/image/${paramsString}/${normalizeSrc(src)}`;
};

export const LegacyLoader: ImageLoaderType = ({ src, width, quality }) => {
    const params = [];
    if (src.includes('images.prismic.io')) {
        if (width) {
            params.push(`w=${width}`);
        }
        if (quality) {
            params.push(`q=${quality}`);
        }

        if (!src.includes('fm=')) {
            params.push(`fm=avif`);
        }
    } else {
        if (width) {
            params.push(`width=${width}`);
        }
        if (quality) {
            params.push(`quality=${quality}`);
        }
    }

    const div = src.includes('?') ? '&' : '?';
    return `${src}${params.length > 0 ? div : ''}${params.join('&')}`;
};

const imageLoader: ImageLoaderType = (props) => {
    if (process.env.NODE_ENV === 'production' &&
        !props.src.includes('shopify') &&
        !props.src.includes('.svg') &&
        !props.src.includes('gravatar')) {
        return CloudflareImageLoader(props);
    }

    // Legacy. Doesn't need to be this complicated anymore
    // since it'll only be used during development.
    return LegacyLoader(props);
};

export default imageLoader;
