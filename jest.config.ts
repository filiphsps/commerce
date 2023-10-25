import nextJest from 'next/jest';

const createJestConfig = nextJest({
    dir: './'
});

export default createJestConfig({
    testEnvironment: 'jsdom',
    moduleDirectories: ['node_modules', './src/'],
    collectCoverageFrom: ['./src/**/*.{js,ts,jsx,tsx}', '!**/node_modules/**'],
    setupFilesAfterEnv: ['./jest-setup.ts']
});
