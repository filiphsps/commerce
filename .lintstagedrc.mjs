/*import path from 'node:path';

const buildEslintCommand = (filenames) => {
    return `npm run lint:next -w=apps/web -- --fix --file ${filenames
        .map((f) => path.relative(process.cwd(), f))
        .join(' --file ')}`;
}
const buildPrettierCommand = (filenames) => {
    return `npm run lint:prettier -w=apps/web -- --write ${filenames
        .filter((i) => ['package-lock.json'].includes(i))
        .map((f) => path.relative(process.cwd(), f))
        .join(' ')}`
};*/

export default {
    //'*.(md|json|yml)': buildPrettierCommand,
    './**/apps/**/src/**/*.(m|c)(js|ts)?(x)': 'npm run lint --',
    './**/apps/**/src/**/*.ts?(x)': () => 'npm run typecheck --',
    './**/apps/**/src/**/*.(js|ts)?(x)': () => 'npm run test --'
};
