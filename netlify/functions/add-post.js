const https = require('https');

const SPORTS_IMAGES = {
  nba: [
    'https://images.unsplash.com/photo-1546519638405-a1a9e9a6c9c9?w=800&q=80',
    'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&q=80',
    'https://images.unsplash.com/photo-1518407613690-d9fc990e795f?w=800&q=80'
  ],
  nfl: [
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80',
    'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'
  ],
  mlb: [
    'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80',
    'https://images.unsplash.com/photo-1529768167801-9173d94c2a42?w=800&q=80',
    'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&q=80'
  ],
  nhl: [
    'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=800&q=80',
    'https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=800&q=80',
    'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=800&q=80'
  ],
  general: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80'
  ]
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  
  const { title, body, sport, date } = JSON.parse(event.body);
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Antonius7804/sksportz';
  
  const images = SPORTS_IMAGES[sport] || SPORTS_IMAGES.general;
  const image = images[Math.floor(Math.random() * images.length)];

  const getFile = () => new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/posts.json`,
      headers: { 'Authorization': `token ${token}`, 'User-Agent': 'sksportz' }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const file = await getFile();
  const current = JSON.parse(Buffer.from(file.content, 'base64').toString());
  
  current.posts.push({ title, sport: sport || 'nba', date, readTime: '5', image, body });

  const updated = Buffer.from(JSON.stringify(current)).toString('base64');
  const putData = JSON.stringify({ message: 'Auto post: ' + title, content: updated, sha: file.sha });
  
  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/posts.json`,
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'User-Agent': 'sksportz', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(putData) }
    }, res => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', reject);
    req.write(putData);
    req.end();
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
