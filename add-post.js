const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  
  const { title, body, sport, date } = JSON.parse(event.body);
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Antonius7804/sksportz';
  
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
  
  current.posts.push({ title, sport: sport || 'nba', date, readTime: '5', image: 'https://images.unsplash.com/photo-1546519638405-a1a9e9a6c9c9?w=800', body });

  const updated = Buffer.from(JSON.stringify(current)).toString('base64');
  
  const putData = JSON.stringify({ message: 'Auto post: ' + title, content: updated, sha: file.sha });
  
  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/posts.json`,
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'User-Agent': 'sksportz', 'Content-Type': 'application/json', 'Content-Length': putData.length }
    }, res => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', reject);
    req.write(putData);
    req.end();
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
