import type { ImageLoader as ImageLoaderType } from 'next/image';
import { BuildConfig } from '@/utils/build-config';

const normalizeSrc = (src: string = '') => {
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
    const params: string[] = [];
    if (width) {
        params.push(`width=${width}`);
    }
    if (quality) {
        params.push(`quality=${quality}`);
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
