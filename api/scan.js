const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) return res.status(500).json({ error: 'No API key' });

  try {
    const messages = (req.body || {}).messages || [];

    const payload = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000
      },
      messages: messages
    });

    const result = await new Promise((resolve, reject) => {
      const r = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'interleaved-thinking-2025-05-14'
        }
      }, (apiRes) => {
        let d = '';
        apiRes.on('data', c => d += c);
        apiRes.on('end', () => resolve({ status: apiRes.statusCode, body: d }));
      });
      r.on('error', reject);
      r.write(payload);
      r.end();
    });

    let parsed;
    try {
      parsed = JSON.parse(result.body);
    } catch (e) {
      return res.status(500).json({ error: 'Non-JSON from Anthropic', raw: result.body.slice(0, 500) });
    }

    return res.status(result.status).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
