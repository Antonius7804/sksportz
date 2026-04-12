const https = require('https');

// Map of article alt text / identifiers to working Pexels images
const IMAGE_MAP = {
  'super_bowl_lx_chaos': 'https://images.pexels.com/photos/1618200/pexels-photo-1618200.jpeg?w=600',
  'nfl_draft_2026': 'https://images.pexels.com/photos/1618200/pexels-photo-1618200.jpeg?w=600',
  'lakers_lebron_luka': 'https://images.pexels.com/photos/945471/pexels-photo-945471.jpeg?w=600',
  'nba_65_game_rule': 'https://images.pexels.com/photos/1752757/pexels-photo-1752757.jpeg?w=600',
  'nba_playoffs_2026': 'https://images.pexels.com/photos/2891884/pexels-photo-2891884.jpeg?w=600',
  'justin_pippen_ohio_state': 'https://images.pexels.com/photos/945471/pexels-photo-945471.jpeg?w=600',
  'mlb_robot_umpire': 'https://images.pexels.com/photos/1586296/pexels-photo-1586296.jpeg?w=600',
  'wbc_venezuela_usa': 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg?w=600',
  'dodgers_three_peat': 'https://images.pexels.com/photos/1152346/pexels-photo-1152346.jpeg?w=600',
  'mlb_lockout': 'https://images.pexels.com/photos/1584389/pexels-photo-1584389.jpeg?w=600',
  'shohei_ohtani_dodgers': 'https://images.pexels.com/photos/1586296/pexels-photo-1586296.jpeg?w=600',
  'ilya_sorokin_goalie': 'https://images.pexels.com/photos/3764011/pexels-photo-3764011.jpeg?w=600',
  'arch_manning_texas': 'https://images.pexels.com/photos/1884574/pexels-photo-1884574.jpeg?w=600',
  'march_madness_arizona': 'https://images.pexels.com/photos/2346271/pexels-photo-2346271.jpeg?w=600',
  'ufc_327_fight': 'https://images.pexels.com/photos/4804074/pexels-photo-4804074.jpeg?w=600',
  'israel_adesanya_ufc': 'https://images.pexels.com/photos/8612383/pexels-photo-8612383.jpeg?w=600',
  'mayweather_pacquiao_boxing': 'https://images.pexels.com/photos/4752861/pexels-photo-4752861.jpeg?w=600',
  'golden_age_sports_2026': 'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?w=600',
  'sports_analytics': 'https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg?w=600',
  'sports_betting': 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?w=600',
};

// Unsplash photo IDs to Pexels replacements
const UNSPLASH_FIXES = [
  ['photo-1516803411520-55b95f5b0c0a', 'https://images.pexels.com/photos/1618200/pexels-photo-1618200.jpeg'],
  ['photo-1546519638405-a1a9e9a6c9c9', 'https://images.pexels.com/photos/945471/pexels-photo-945471.jpeg'],
  ['photo-1546519638-68e109498ffc', 'https://images.pexels.com/photos/945471/pexels-photo-945471.jpeg'],
  ['photo-1471295253337-3ceaaedca402', 'https://images.pexels.com/photos/1586296/pexels-photo-1586296.jpeg'],
  ['photo-1515703407324-5f753afd8be8', 'https://images.pexels.com/photos/3764011/pexels-photo-3764011.jpeg'],
  ['photo-1549719386-74dfcbf7dbed', 'https://images.pexels.com/photos/4804074/pexels-photo-4804074.jpeg'],
  ['photo-1593779291327-4e7a9f4da1d8', 'https://images.pexels.com/photos/4752861/pexels-photo-4752861.jpeg'],
  ['photo-1495563381401-ecffb4a4b0d9', 'https://images.pexels.com/photos/1884574/pexels-photo-1884574.jpeg'],
  ['photo-1574629810360-7efbbe195018', 'https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg'],
  ['photo-1525648199074-cee30ba79a4a', 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg'],
];

exports.handler = async (event) => {
  // Get the current posts.json from GitHub
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Antonius7804/sksportz';

  // Read the index.html from GitHub
  const getFile = (path) => new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/${path}`,
      headers: { 'Authorization': `token ${token}`, 'User-Agent': 'sksportz' }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const file = await getFile('index.html');
  let content = Buffer.from(file.content, 'base64').toString('utf8');

  // Apply all image fixes
  for (const [oldId, newUrl] of UNSPLASH_FIXES) {
    // Replace the full unsplash URL pattern
    const regex = new RegExp(`https://images\\.unsplash\\.com/${oldId}[^"']*`, 'g');
    content = content.replace(regex, newUrl + '?w=600&q=80');
  }

  // Write back to GitHub
  const updated = Buffer.from(content).toString('base64');
  const putData = JSON.stringify({
    message: 'Fix all article card images',
    content: updated,
    sha: file.sha
  });

  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/index.html`,
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'sksportz',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(putData)
      }
    }, res => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', reject);
    req.write(putData);
    req.end();
  });

  return { statusCode: 200, body: JSON.stringify({ success: true, message: 'All images fixed!' }) };
};
