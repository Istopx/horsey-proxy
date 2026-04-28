export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Check API key first
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured on server' });
    }

    // Parse body — handle both pre-parsed and raw string cases
    let parsed;
    if (req.body && typeof req.body === 'object') {
      parsed = req.body;
    } else if (req.body && typeof req.body === 'string') {
      parsed = JSON.parse(req.body);
    } else {
      // Read raw stream as fallback
      const raw = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk.toString(); });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      parsed = JSON.parse(raw);
    }

    // Build Anthropic request — model is hardcoded here on the server
    const anthropicBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      messages: parsed.messages
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicBody)
    });

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({ error: 'Non-JSON from Anthropic', raw: responseText.slice(0, 500) });
    }

    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
