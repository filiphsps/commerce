import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import React, { FunctionComponent, memo, useState } from 'react';

import { Config } from '../../../../util/Config';
import Slices from '../../Slices';
import TextBlock from '../../../TextBlock';

interface CollapseProps {
    store?: any;
    data?: any;
    prefetch?: any;
}
const Collapse: FunctionComponent<CollapseProps> = (props) => {
    const language = Config.i18n.locales[0];
    const [open, setOpen] = useState(false);
    const { store, data, prefetch } = props;

    return (
        <div className="Slice Slice-Collapse">
            <div
                className="Slice-Collapse-Title"
                onClick={() => setOpen(!open)}
            >
                {(open && <FiChevronDown className="Icon" />) || (
                    <FiChevronUp className="Icon" />
                )}{' '}
                {data?.title?.[language] ||
                    data?.title?.['en_US'] ||
                    data?.title}
            </div>
            {open && (
                <div className="Slice-Collapse-Body">
                    {(data?.slices && (
                        <Slices
                            store={store}
                            data={data?.slices}
                            prefetch={prefetch}
                        />
                    )) || (
                        <TextBlock
                            body={
                                data?.body?.[language] ||
                                data?.body?.['en_US'] ||
                                data?.body
                            }
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default memo(Collapse);
