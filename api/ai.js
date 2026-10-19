export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let key = process.env.CODE_API_KEY;
  if (!key) return res.status(500).json({ error: 'CODE_API_KEY is not configured on the server.' });
  key = String(key).trim().replace(/^['"]|['"]$/g, '').trim();
  if (!key) return res.status(500).json({ error: 'CODE_API_KEY is empty on the server.' });

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array.' });
  }

  try {
    const model = 'gemini-3.8-flash';
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify({
        model,
        input: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          content: String(m.content || '')
        })),
        generation_config: {
          thinking_level: 'medium',
          max_output_tokens: 2048
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
    }

    const text = data?.output_text || data?.output?.map(x => x?.text || x?.content?.map?.(p => p?.text || '').join('') || '').join('') || '';
    if (!text) throw new Error('Gemini returned an empty response.');
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(502).json({ error: err?.message || 'Gemini request failed.' });
  }
}
