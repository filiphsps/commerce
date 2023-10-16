const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

module.exports = createJestConfig({
    moduleDirectories: ['node_modules', './src/'],
    collectCoverage: true,
    collectCoverageFrom: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "!**/node_modules/**",
        "!**/vendor/**"
    ]
});
