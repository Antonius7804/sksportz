exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { products } = JSON.parse(event.body);
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Token not configured' }) };
    }

    const url = 'https://api.github.com/repos/Antonius7804/sksportz/contents/products.json';

    // Get current SHA
    let sha = '';
    try {
      const getRes = await fetch(url, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
      }
    } catch(e) {}

    const content = Buffer.from(JSON.stringify(products, null, 2)).toString('base64');
    const body = { message: 'Update products', content };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (putRes.ok) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } else {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save' }) };
    }
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
