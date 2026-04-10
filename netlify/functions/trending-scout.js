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
      console.log('Password mismatch. Received:', body.password);
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.log('ERROR: ANTHROPIC_API_KEY is not set');
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'API key not configured. Add ANTHROPIC_API_KEY to Netlify environment variables.' }) };
    }

    console.log('API key found, length:', apiKey.length);

    const sport = body.sport || 'all';
    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const sportLabel = sport === 'all' ? 'NFL, NBA, MLB and NHL' : sport.toUpperCase();

    const prompt = `Search Amazon and sports news to find the top 6 trending and bestselling ${sportLabel} fan merchandise and collectibles right now in ${month}. Look for Funko Pops, jerseys, trading cards, memorabilia. Focus on products trending due to current sports events, playoffs, player news. Return ONLY a valid JSON array, no markdown: [{"name":"product name","category":"nfl","estimatedPrice":19.99,"reason":"why trending in one sentence","searchTerms":"amazon search terms"}]`;

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
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    console.log('Claude API status:', claudeResponse.status);

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.log('Claude API error:', errText);
      throw new Error('Claude API error: ' + claudeResponse.status + ' ' + errText.substring(0, 200));
    }

    const claudeData = await claudeResponse.json();
    const text = claudeData.content.filter(b => b.type === 'text').map(b => b.text).join('');
    console.log('Claude response text length:', text.length);

    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) throw new Error('Could not parse product data from AI response');

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
    console.log('ERROR:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
