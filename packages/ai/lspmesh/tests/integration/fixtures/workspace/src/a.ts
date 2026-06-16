export const widgetName = 'lspmesh';

export interface Greeter {
    greet(): string;
}

export class FriendlyGreeter implements Greeter {
    greet(): string {
        return `hello from ${widgetName}`;
    }
}
