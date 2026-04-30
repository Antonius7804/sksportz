/**
 * SKSportz AI Scout - Auto Product Discovery & Publishing
 *
 * What it does:
 * 1. Uses Claude with web search to find real, trending sports products on Amazon
 * 2. Extracts real product names, prices, and Amazon CDN image URLs
 * 3. Optionally auto-publishes products to products.json on GitHub
 *
 * Modes:
 * - Manual scout (called from admin.html with password): returns products to review
 * - Auto-publish: commits found products straight to products.json
 *
 * Required env vars in Netlify:
 *   ANTHROPIC_API_KEY      (from console.anthropic.com)
 *   GITHUB_TOKEN           (existing, used by Make.com pipeline)
 *   ADMIN_PASSWORD         (defaults to 'Sportz2026!')
 *   AMAZON_AFFILIATE_TAG   (defaults to 'piekonlinesto-20')
 *
 * Cron trigger (set in netlify.toml):
 *   [[scheduled-functions]]
 *   path = "/.netlify/functions/trending-scout"
 *   schedule = "0 9 * * 1"   # every Monday 9am UTC
 */

const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || 'piekonlinesto-20';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sportz2026!';
const GITHUB_REPO = 'Antonius7804/sksportz';
const PRODUCT_LIMIT = 200;
const FRESHNESS_DAYS = 90;

const PRODUCT_SUBCATEGORIES = [
  'jerseys', 'apparel', 'drinkware', 'tailgating', 'decor',
  'electronics', 'cards', 'collectibles', 'kids', 'auto',
  'stickers', 'office', 'gifts', 'world-cup-2026'
];
const SPORT_CATEGORIES = ['nfl', 'nba', 'mlb', 'nhl', 'college', 'soccer', 'general'];

/* -------------------------------------------------------------- */
/*  Find trending products via Claude + web search                */
/* -------------------------------------------------------------- */
async function findTrendingProducts(apiKey, sport, subcategory, count) {
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const sportLabel = sport === 'all' ? 'NFL, NBA, MLB, NHL, College and Soccer' : sport.toUpperCase();

  const categoryGuidance = subcategory === 'mixed'
    ? `Mix products across: jerseys, apparel, drinkware (YETI/Stanley/tumblers), tailgating (cornhole/coolers/seats), decor (wall art/neon signs/blankets), electronics, trading cards, collectibles, kids gear, auto accessories, stickers, gifts, World Cup 2026 gear.\n\nCRITICAL: Do NOT recommend only Funko Pops, jerseys, and trading cards. Vary product types substantially. Aim for at least 5 distinct subcategories.`
    : `Focus on: ${subcategory}`;

  const prompt = `You are a sports merchandising expert with web search access. Find ${count} REAL ${sportLabel} fan products people are actively buying on Amazon RIGHT NOW (${month}).

Use web_search to find current Amazon Best Sellers in the Sports Fan Shop category. Focus on items with:
- 1000+ reviews
- 4.3+ stars
- Top 1000 in Best Sellers Rank
- Price between $10 and $300

${categoryGuidance}

For each product, find:
- Real product name (as listed on Amazon)
- Real Amazon ASIN if findable (the 10-character product ID like B0CX4HH4HB)
- Real Amazon CDN image URL (m.media-amazon.com/images/I/...)
- Real current price
- Why it is trending (current event, season, player news, holiday)

Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "name": "exact product name",
    "category": "nfl|nba|mlb|nhl|college|soccer|general",
    "subcategory": "jerseys|apparel|drinkware|tailgating|decor|electronics|cards|collectibles|kids|auto|stickers|office|gifts|world-cup-2026",
    "asin": "B0XXXXXXXX or null if unknown",
    "imageUrl": "https://m.media-amazon.com/images/... or empty string",
    "estimatedPrice": 29.99,
    "reason": "why trending right now",
    "searchTerms": "fallback amazon search keywords"
  }
]`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error('Claude API: ' + (data.error?.message || response.status));
  }

  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Could not parse JSON from Claude: ' + text.substring(0, 300));

  const found = JSON.parse(match[0]);

  return found
    .filter(p => p.name && p.category && p.estimatedPrice)
    .map((p, i) => {
      const affiliateUrl = p.asin
        ? `https://www.amazon.com/dp/${p.asin}?tag=${AFFILIATE_TAG}`
        : `https://www.amazon.com/s?k=${encodeURIComponent(p.searchTerms || p.name)}&tag=${AFFILIATE_TAG}`;

      return {
        id: `scout-${Date.now()}-${i}`,
        name: p.name,
        category: SPORT_CATEGORIES.includes(p.category) ? p.category : 'general',
        subcategory: PRODUCT_SUBCATEGORIES.includes(p.subcategory) ? p.subcategory : 'collectibles',
        price: parseFloat(p.estimatedPrice) || 19.99,
        image: p.imageUrl || '',
        affiliateUrl,
        amazonSearchUrl: affiliateUrl,
        reason: p.reason || '',
        addedDate: new Date().toISOString().split('T')[0]
      };
    });
}

/* -------------------------------------------------------------- */
/*  Publish to GitHub products.json                               */
/* -------------------------------------------------------------- */
async function publishToGitHub(token, newProducts) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/products.json`;

  let existing = [];
  let sha = '';

  const getRes = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'sksportz-scout',
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
    try {
      existing = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    } catch (e) {
      existing = [];
    }
  }

  // Drop stale auto-added products, keep all hand-curated
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - FRESHNESS_DAYS);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const kept = existing.filter(p => {
    const isAuto = String(p.id || '').startsWith('scout-');
    if (!isAuto) return true;
    if (!p.addedDate) return true;
    return p.addedDate >= cutoffStr;
  });

  const merged = [...kept];
  for (const np of newProducts) {
    const dupe = merged.find(e => e.name.toLowerCase() === np.name.toLowerCase());
    if (!dupe) merged.push(np);
  }

  const final = merged.slice(0, PRODUCT_LIMIT);

  const content = Buffer.from(JSON.stringify(final, null, 2)).toString('base64');
  const body = {
    message: `Auto-update: +${newProducts.length} trending products (${final.length} total)`,
    content
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'sksportz-scout'
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error('GitHub PUT failed: ' + putRes.status + ' ' + err.substring(0, 200));
  }

  return {
    added: newProducts.length,
    total: final.length,
    removed: existing.length - kept.length
  };
}

/* -------------------------------------------------------------- */
/*  Handler                                                       */
/* -------------------------------------------------------------- */
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({
        success: false,
        error: 'ANTHROPIC_API_KEY not set in Netlify env vars'
      })};
    }

    // Scheduled invocation has no body (it's just a cron trigger)
    const isScheduled = !event.body;
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (e) {}

    // Manual mode requires password
    if (!isScheduled && body.password !== ADMIN_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' })};
    }

    const sport = body.sport || 'all';
    const subcategory = body.subcategory || 'mixed';
    const count = parseInt(body.count) || 8;
    const autoPublish = isScheduled || body.autoPublish === true;

    const products = await findTrendingProducts(apiKey, sport, subcategory, count);

    if (products.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({
        success: true,
        products: [],
        message: 'No products found this run'
      })};
    }

    if (autoPublish) {
      const ghToken = process.env.GITHUB_TOKEN;
      if (!ghToken) {
        return { statusCode: 500, headers, body: JSON.stringify({
          success: false,
          error: 'GITHUB_TOKEN not set - cannot auto-publish',
          products
        })};
      }

      const result = await publishToGitHub(ghToken, products);
      return { statusCode: 200, headers, body: JSON.stringify({
        success: true,
        autoPublished: true,
        ...result,
        products
      })};
    }

    return { statusCode: 200, headers, body: JSON.stringify({
      success: true,
      products
    })};

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({
      success: false,
      error: error.message
    })};
  }
};
