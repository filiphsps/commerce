import styles from '@/components/layout/tabs.module.scss';

import { Fragment } from 'react';

import { Label } from '@/components/typography/label';

import type { ElementType, HTMLProps, ReactNode } from 'react';

export type TabProps = {
    as?: ElementType;
    children: ReactNode;
} & HTMLProps<HTMLDivElement>;
const Tab = ({ as: Tag = 'div', children, className, ...props }: TabProps) => {
    return (
        <Tag {...props} className={`${styles.tab}${className ? ` ${className}` : ''}`}>
            {children}
        </Tag>
    );
};
Tab.displayName = 'Nordcom.Layout.Tab';

export type TabsProps = {
    as?: ElementType;
    data: Array<{
        id: string;
        label: string;
        children: ReactNode;
    }>;
} & Omit<HTMLProps<HTMLDivElement>, 'children' | 'data'>;
const Tabs = ({ as: Tag = 'div', data = [], className, ...props }: TabsProps) => {
    if (data.length <= 0) {
        return null;
    }

    return (
        <Tag {...props} className={`${styles.tabs}${className ? ` ${className}` : ''}`}>
            <style>{`${data.map(({ id }) => `#${id}:checked ~ #content-${id}`).join(',')} { display: flex; }`}</style>

            {data.map(({ id, label }, index) => (
                <Fragment key={id}>
                    <input id={id} type="radio" name="tabs" title={label} defaultChecked={index === 0} />
                    <Label as="label" htmlFor={id} title={label} className={styles.label}>
                        {label}
                    </Label>
                </Fragment>
            ))}

            {data.map(({ id, children }) => (
                <Tab key={id} id={`content-${id}`}>
                    {children}
                </Tab>
            ))}
        </Tag>
    );
};
Tabs.displayName = 'Nordcom.Layout.Tabs';

export { Tab, Tabs };
