// Workaround for pnpm#11701: pnpm 11 probes `.pnpmfile.mjs` during `pnpm run`
// and errors on Linux CI when the file is missing. Keep this file empty until
// the upstream fix lands. https://github.com/pnpm/pnpm/issues/11701
export const hooks = {};
