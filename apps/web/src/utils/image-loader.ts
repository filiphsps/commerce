import { BuildConfig } from '@/utils/build-config';
import type { ImageLoader as ImageLoaderType } from 'next/image';

const normalizeSrc = (src: string) => {
    return src.startsWith('/') ? src.slice(1) : src;
};

// See https://developers.cloudflare.com/images/image-resizing/integration-with-frameworks/#nextjs
const cloudflareImageLoader: ImageLoaderType = ({ src, width, quality }) => {
    const params = [`width=${width}`];
    if (quality) {
        params.push(`quality=${quality}`);
    }
    const paramsString = params.join(',');
    return `/cdn-cgi/image/${paramsString}/${normalizeSrc(src)}`;
};

export const fallbackLoader: ImageLoaderType = ({ src, width, quality }) => {
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
    if (
        BuildConfig.environment !== 'development' &&
        !props.src.includes('shopify') &&
        !props.src.includes('gravatar') &&
        !props.src.includes('.svg')
    ) {
        return cloudflareImageLoader(props);
    }

    return fallbackLoader(props);
};

export default imageLoader;
