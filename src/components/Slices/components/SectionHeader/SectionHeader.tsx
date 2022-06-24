import React, { FunctionComponent, memo } from 'react';

import { Config } from '../../../../util/Config';

interface SectionHeaderProps {
    data?: {
        title?: any;
        subtitle?: any;
    };
}
const SectionHeader: FunctionComponent<SectionHeaderProps> = (props) => {
    const language = Config.i18n.locales[0];
    const { data } = props;

    return (
        <div className="Slice Slice-SectionHeader">
            <div className="Slice-SectionHeader-Title">
                {data?.title?.[language] ||
                    data?.title?.['en-US'] ||
                    data?.title}
            </div>
            {data?.subtitle && (
                <div className="Slice-SectionHeader-Subtitle">
                    {data?.subtitle?.[language] ||
                        data?.subtitle?.['en-US'] ||
                        data?.subtitle}
                </div>
            )}
        </div>
    );
};

export default memo(SectionHeader);
