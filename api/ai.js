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

  if (!key) {
    return res.status(500).json({
      error: 'CODE_API_KEY is empty on the server.'
    });
  }

  const { messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'messages must be a non-empty array.'
    });
  }

  try {
    const model = 'gemini-3.8-flash';

    // Convert the app's chat format into Gemini Interactions steps.
    const history = messages.map((m) => ({
      type: m.role === 'assistant' ? 'model_output' : 'user_input',
      content: [
        {
          type: 'text',
          text: String(m.content || '')
        }
      ]
    }));

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({
          model,
          input: history,
          store: false,
          generation_config: {
            thinking_level: 'medium',
            max_output_tokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        `Gemini HTTP ${response.status}`
      );
    }

    const text =
      data?.output_text ||
      data?.steps
        ?.filter(step => step?.type === 'model_output')
        ?.flatMap(step => step?.content || [])
        ?.map(part => part?.text || '')
        ?.join('') ||
      '';

    if (!text.trim()) {
      throw new Error('Gemini returned an empty response.');
    }

    return res.status(200).json({
      text: text.trim()
    });

  } catch (err) {
    console.error('Gemini API error:', err);

    return res.status(502).json({
      error: err?.message || 'Gemini request failed.'
    });
  }
}
