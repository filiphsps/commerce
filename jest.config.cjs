const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

module.exports = createJestConfig({
    moduleDirectories: ['node_modules', './src/'],
    collectCoverage: process.env.CI ? true : false,
    collectCoverageFrom: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "!**/node_modules/**",
        "!**/vendor/**"
    ]
});
