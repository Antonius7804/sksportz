const https = require('https');
const FIXES = [
  ['https://images.unsplash.com/photo-1516803411520-55b95f5b0c0a?w=600&q=80', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/KMJvUFiPDfaVCyKl.jpg'],
  ['https://images.unsplash.com/photo-1546519638405-a1a9e9a6c9c9?w=600&q=80', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/BQrxeIoisXdTsGnh.jpg'],
  ['https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=600&q=80', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/jSDtFmvttAmKlhpv.jpg'],
  ['https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=600&q=80', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/jxPvFIEwiPKfCtOO.jpg'],
  ['https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&q=80', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/ZybAOJKfmBGJOhsJ.jpg'],
  ['https://images.unsplash.com/photo-1593779291327-4e7a9f4da1d8?w=600&q=80', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/CwZcMxYzzbDbkVDj.jpg'],
  ['https://images.unsplash.com/photo-1495563381401-ecffb4a4b0d9?w=600&q=80', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/UidNDbSCrdNKcONS.jpg'],
  ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/caAUeYpmFJzOKBzb.jpg'],
  ['https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?w=600&q=80', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/tilRJildyJMdpZKx.jpg'],
  ['https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/hlDKCtfhoKyNwVAB.jpg'],
];
exports.handler = async (event) => {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Antonius7804/sksportz';
  const file = await new Promise((resolve, reject) => {
    https.get({ hostname: 'api.github.com', path: `/repos/${repo}/contents/index.html`, headers: { 'Authorization': `token ${token}`, 'User-Agent': 'sksportz' } }, res => {
      let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
  let content = Buffer.from(file.content, 'base64').toString('utf8');
  let changes = 0;
  for (const [oldUrl, newUrl] of FIXES) {
    if (content.includes(oldUrl)) { content = content.split(oldUrl).join(newUrl); changes++; }
  }
  const putData = JSON.stringify({ message: `Fix ${changes} images`, content: Buffer.from(content).toString('base64'), sha: file.sha });
  await new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.github.com', path: `/repos/${repo}/contents/index.html`, method: 'PUT', headers: { 'Authorization': `token ${token}`, 'User-Agent': 'sksportz', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(putData) } }, res => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', reject); req.write(putData); req.end();
  });
  return { statusCode: 200, body: JSON.stringify({ success: true, changes }) };
};
