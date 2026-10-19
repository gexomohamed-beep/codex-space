export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let key = process.env.CODE_API_KEY;

  if (!key) {
    return res.status(500).json({
      error: 'CODE_API_KEY is not configured on the server.'
    });
  }

  key = String(key).trim().replace(/^['"]|['"]$/g, '').trim();

  const { messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'messages must be a non-empty array.'
    });
  }

  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://codex-space-command.vercel.app',
          'X-Title': 'CODEX SPACE COMMAND'
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || '')
          })),
          max_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        `OpenRouter HTTP ${response.status}`
      );
    }

    const text = data?.choices?.[0]?.message?.content || '';

    if (!text.trim()) {
      throw new Error('OpenRouter returned an empty response.');
    }

    return res.status(200).json({
      text: text.trim()
    });

  } catch (err) {
    console.error('OpenRouter error:', err);

    return res.status(502).json({
      error: err?.message || 'OpenRouter request failed.'
    });
  }
}
