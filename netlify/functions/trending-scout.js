const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || 'piekonlinesto-20';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sportz2026!';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    if (body.password !== ADMIN_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'API key not configured' }) };
    }

    const sport = body.sport || 'all';
    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const sportLabel = sport === 'all' ? 'NFL, NBA, MLB and NHL' : sport.toUpperCase();

    const prompt = `Find the top 6 trending ${sportLabel} fan merchandise and collectibles on Amazon in ${month}. Focus on Funko Pops, jerseys, trading cards trending due to playoffs or player news. Return ONLY a JSON array, no markdown, no explanation: [{"name":"product name","category":"nfl","estimatedPrice":19.99,"reason":"why trending","searchTerms":"amazon search terms"}]`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const claudeData = await claudeResponse.json();

    if (!claudeResponse.ok) {
      throw new Error('Claude API error: ' + (claudeData.error?.message || claudeResponse.status));
    }

    if (!claudeData.content || !claudeData.content.length) {
      throw new Error('Empty response from Claude: ' + JSON.stringify(claudeData));
    }

    const text = claudeData.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Could not parse product list from: ' + text.substring(0, 200));

    const products = JSON.parse(jsonMatch[0]);
    const enriched = products.map((p, i) => ({
      ...p,
      id: `scout-${Date.now()}-${i}`,
      amazonSearchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(p.searchTerms)}&tag=${AFFILIATE_TAG}`,
      scoutedAt: new Date().toISOString()
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, products: enriched }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
