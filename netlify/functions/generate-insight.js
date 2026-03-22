const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { working, friction, signal, groupName, language } = JSON.parse(event.body);

    const systemPrompt = 'You are a thoughtful educational coach giving a teacher one specific, actionable suggestion based on their classroom signal. Be warm, concrete and practical. Write in ' + (language || 'English') + '. Respond ONLY with valid JSON.';

    const userPrompt = 'A teacher has received this signal from their group "' + groupName + '":\n\nWorking: ' + working + '\n\nFriction: ' + friction + '\n\nSignal: ' + signal + '\n\nGive them ONE specific, actionable thing they could do in their next session to address what you see. Return ONLY this JSON:\n{\n  "insight": "2-3 sentences — one concrete suggestion the teacher can act on immediately"\n}';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const text = message.content[0].text.trim().replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ insight: result.insight })
    };
  } catch (e) {
    console.error('generate-insight error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
