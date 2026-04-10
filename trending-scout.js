const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || 'piekonlinesto-20';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sksportz2026';

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

    const sport = body.sport || 'all';
    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const sportLabel = sport === 'all' ? 'NFL, NBA, MLB and NHL' : sport.toUpperCase();

    const prompt = `Search Amazon and sports news to find the top 6 trending and bestselling ${sportLabel} fan merchandise and collectibles right now in ${month}. Look for Funko Pops, jerseys, trading cards, memorabilia. Focus on products trending due to current sports events, playoffs, player news. Return ONLY a valid JSON array, no markdown: [{"name":"product name","category":"nfl","estimatedPrice":19.99,"reason":"why trending in one sentence","searchTerms":"amazon search terms","imageHint":"what it looks like"}]`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const claudeData = await claudeResponse.json();
    const text = claudeData.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) throw new Error('Could not parse product data');

    const products = JSON.parse(jsonMatch[0]);
    const enriched = products.map((p, i) => ({
      ...p,
      id: `scout-${Date.now()}-${i}`,
      amazonSearchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(p.searchTerms)}&tag=${AFFILIATE_TAG}`,
      status: 'pending',
      scoutedAt: new Date().toISOString()
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, products: enriched }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
