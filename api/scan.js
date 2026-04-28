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
    const payload = JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 4000, messages });

    const result = await new Promise((resolve, reject) => {
      const r = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      }, (resp) => {
        let d = '';
        resp.on('data', c => d += c);
        resp.on('end', () => resolve({ status: resp.statusCode, body: d }));
      });
      r.on('error', reject);
      r.write(payload);
      r.end();
    });

    return res.status(result.status).json(JSON.parse(result.body));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
