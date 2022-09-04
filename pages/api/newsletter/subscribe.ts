export default async function handler(req, res) {
    const body = JSON.parse(req.body);
    if (!body?.email)
        return res.status(400).json({
            error: 'Email missing!'
        });

    const response = await fetch('https://api.sendinblue.com/v3/contacts', {
        method: 'post',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'api-key':
                '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'
        },
        body: JSON.stringify({
            updateEnabled: false,
            email: body.email,
            listIds: [8]
        })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
}
