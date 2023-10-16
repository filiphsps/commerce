import path from 'node:path';

const buildEslintCommand = (filenames) =>
    `npm run lint:next -- --fix --file ${filenames.map((f) => path.relative(process.cwd(), f)).join(' --file ')}`;
const buildPrettierCommand = (filenames) =>
    `npm run lint:prettier -- --write ${filenames
        .filter((i) => ['package-lock.json'].includes(i))
        .map((f) => path.relative(process.cwd(), f))
        .join(' ')}`;

export default {
    '*.(md|json|yml)': buildPrettierCommand,
    './src/**/*.(m|c)(js|ts)?(x)': [buildPrettierCommand, buildEslintCommand],
    './src/**/*.ts?(x)': () => 'npm run lint:types --',
    './src/**/*.(js|ts)?(x)': () => 'npm run test --'
};
