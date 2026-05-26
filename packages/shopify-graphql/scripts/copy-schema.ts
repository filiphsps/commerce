#!/usr/bin/env tsx
import { copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const source = require.resolve('@shopify/hydrogen-react/storefront.schema.json');
const target = resolve(__dirname, '..', 'storefront.schema.json');

copyFileSync(source, target);
