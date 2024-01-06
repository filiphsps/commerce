export const spacer = {
    render: 'Spacer',
    selfClosing: true,
    attributes: {
        h: {
            type: Number,
            default: 1,
            errorLevel: 'warning' as const
        }
    }
};

export const card = {
    render: 'Card',
    selfClosing: false,
    attributes: {}
};
