import { register } from 'node:module';

register('./server-only-loader.mjs', import.meta.url);
