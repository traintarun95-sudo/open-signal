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
    const { responses, groupName, groupSize, language } = JSON.parse(event.body);

    if (!responses || responses.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No responses provided' }) };
    }

    const responseRate = Math.round((responses.length / groupSize) * 100);

    const formattedResponses = responses.map((r) => {
      const answers = r.answers || [];
      return answers.map(a => 'Q: ' + a.q + '\nA: ' + a.a).join('\n');
    }).join('\n\n---\n\n');

    const systemPrompt = 'You are a thoughtful educational analyst helping teachers understand their classroom. You read anonymous student feedback and synthesise it into three distinct observations. Write in clear, warm, professional prose. Never identify individual students. Always write in ' + (language || 'English') + '. Respond ONLY with valid JSON — no preamble, no markdown backticks, no explanation outside the JSON.';

    const userPrompt = 'You have ' + responses.length + ' anonymous responses from a group of ' + groupSize + ' students in "' + groupName + '" (' + responseRate + '% response rate).\n\nHere are their responses:\n\n' + formattedResponses + '\n\nSynthesise these into exactly three observations. Return ONLY this JSON:\n{\n  "working": "2-3 sentences on what is genuinely working in this classroom",\n  "friction": "2-3 sentences on what is creating difficulty or confusion",\n  "signal": "2-4 sentences on the emotional and motivational state of the group right now",\n  "register": "one of: tentative | moderate | strong"\n}';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const text = message.content[0].text.trim().replace(/```json|```/g, '').trim();
    const synthesis = JSON.parse(text);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        working: synthesis.working,
        friction: synthesis.friction,
        signal: synthesis.signal,
        register: synthesis.register || 'moderate',
        responseCount: responses.length,
        responseRate,
        generatedAt: new Date().toISOString()
      })
    };
  } catch (e) {
    console.error('generate-synthesis error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
