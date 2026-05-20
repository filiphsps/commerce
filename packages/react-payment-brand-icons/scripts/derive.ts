export type DerivedDefaults = {
    componentName: string;
    title: string;
};

export function deriveDefaults(slug: string): DerivedDefaults {
    const parts = slug.split(/[_-]/).filter(Boolean);
    const titleCased = parts.map((p) => (p ? p[0]!.toUpperCase() + p.slice(1) : p));
    const pascal = titleCased.join('');
    const componentName = /^[0-9]/.test(pascal) ? `Icon${pascal}` : pascal;
    const title = titleCased.join(' ');
    return { componentName, title };
}
