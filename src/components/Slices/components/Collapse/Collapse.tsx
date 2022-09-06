import * as PrismicDOM from '@prismicio/helpers';

import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import React, { FunctionComponent, memo, useState } from 'react';

import ContentBlock from '../../../ContentBlock/ContentBlock';
import PageContent from '../../../PageContent';
import TextBlock from '../../../TextBlock';

interface CollapseProps {
    data?: {
        primary: {
            title: string;
            body: any;
        };
    };
}
const Collapse: FunctionComponent<CollapseProps> = (props) => {
    const [open, setOpen] = useState(false);
    const { data } = props;

    return (
        <div className="Slice Slice-Collapse">
            <ContentBlock>
                <PageContent>
                    <div
                        className={`Slice-Collapse-Title ${open ? 'Open' : ''}`}
                        onClick={() => setOpen(!open)}
                    >
                        <FiChevronUp className="Icon" /> {data?.primary?.title}
                    </div>
                    <div
                        className={`Slice-Collapse-Body ${open ? 'Open' : ''}`}
                    >
                        {
                            <TextBlock
                                body={PrismicDOM.asHTML(data?.primary?.body)}
                            />
                        }
                    </div>
                </PageContent>
            </ContentBlock>
        </div>
    );
};

export default memo(Collapse);
