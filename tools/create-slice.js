/* eslint no-console: 0 */
const fs = require('fs');
const component = process.argv[2];

if (process.argv.length < 3) {
    console.log('Usage: yarn run create-component {name}');
    process.exit(1);
}

// Content
const indexFile = `import ${component} from './${component}';

export default ${component};
`;

const componentFile = `import React, { FunctionComponent, memo } from 'react';



interface ${component}Props { }
const ${component}: FunctionComponent<${component}Props> = (props) => {
    return (
        <div className="Slice Slice-${component}"></div>
    );
};

export default memo(${component});
`;

const testFile = `import * as React from 'react';
import { render } from '@testing-library/react';
import ProviderWrapper from '../../../../../__tests__/ProviderWrapper';
import Component from './';

describe('Components', () => {
    describe('${component}', () => {
        it('should render without throwing an error', () => {
            const component = render(
                <ProviderWrapper>
                    <Component />
                </ProviderWrapper>
            );
            expect(component);
        });
    });
});
`;

const scssFile = `@import '../../../../scss/app';

.Slice-${component} { }
`;

// Make the directory
fs.mkdirSync('./src/components/Slices/components/' + component);

// Write the files
fs.writeFileSync('./src/components/Slices/components/' + component + '/index.tsx', indexFile, 'utf8');
fs.writeFileSync('./src/components/Slices/components/' + component + '/' + component + '.tsx', componentFile, 'utf8');
fs.writeFileSync('./src/components/Slices/components/' + component + '/' + component + '.test.tsx', testFile, 'utf8');

fs.writeFileSync('./src/components/Slices/components/' + component + '/' + component + '.scss', scssFile, 'utf8');

console.log('Wrote 3 files...');
