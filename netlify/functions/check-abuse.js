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
    const { text } = JSON.parse(event.body);

    if (!text || text.length < 10) {
      return { statusCode: 200, headers, body: JSON.stringify({ abusive: false }) };
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      system: 'You are a content classifier. Detect if student feedback contains unambiguously threatening or personally abusive language directed at a specific individual. Frustrated language about a subject ("this is killing me", "I hate this topic") is NOT abuse. Only flag clear personal threats or malice toward a named or implied individual. Respond with only YES or NO.',
      messages: [{ role: 'user', content: 'Student feedback: "' + text + '"' }]
    });

    const answer = (message.content[0].text || '').trim().toUpperCase();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ abusive: answer === 'YES' })
    };
  } catch (e) {
    console.error('check-abuse error:', e);
    // Fail open — let the response through if API fails
    return { statusCode: 200, headers, body: JSON.stringify({ abusive: false }) };
  }
};
