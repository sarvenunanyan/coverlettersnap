export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  try {
    // Safely parse body — req.body may be undefined in some Vercel configs
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    if (!body) body = {};

    const { system, messages } = body;

    if (!system || !messages) {
      return res.status(400).json({ error: 'Missing system or messages in request body.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system,
        messages
      })
    });

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      return res.status(500).json({
        error: 'Anthropic returned invalid response: ' + rawText.slice(0, 200)
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Anthropic API error: ' + response.status
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + (err.message || String(err)) });
  }
}
