import styles from '@/components/layout/tabs.module.scss';
import { Label } from '@/components/typography/label';
import type { As } from '@nordcom/nordstar';
import { Fragment, type HTMLProps, type ReactNode } from 'react';

export type TabProps = {
    as?: As;
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
    as?: As;
    data: Array<{
        id: string;
        label: string;
        children: ReactNode;
    }>;
} & Omit<HTMLProps<HTMLDivElement>, 'children' | 'data'>;
const Tabs = ({ as: Tag = 'div', data, className, ...props }: TabsProps) => {
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
