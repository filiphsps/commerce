export default async function handler(req, res) {
    const body = JSON.parse(req.body);
    if (!body?.email)
        return res.status(400).json({
            error: 'Invalid or missing email'
        });

    /*if (!Config.brevo)
        return res.status(500).json({
            error: 'The newsletter service is currently unavailable'
        });*/

    const response = await fetch('https://api.sendinblue.com/v3/contacts', {
        method: 'post',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'api-key':
                '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' // FIXME: Configurable
        },
        body: JSON.stringify({
            updateEnabled: false,
            email: body.email,
            listIds: [4] // FIXME: Configurable
        })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
}
