const https = require('https');

const FIXES = [
  ['alt="Super Bowl"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/KMJvUFiPDfaVCyKl.jpg'],
  ['alt="NFL Draft 2026"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/GBsEOGorByIoEvBu.jpg'],
  ['alt="Lakers"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/BQrxeIoisXdTsGnh.jpg'],
  ['alt="LeBron Luka"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/BQrxeIoisXdTsGnh.jpg'],
  ['alt="MVP Race"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/abZizqPiquhsblwR.jpg'],
  ['alt="NBA Playoffs 2026"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/iNgMeiaJatYKnyoE.jpg'],
  ['alt="Robot Umpire"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/jSDtFmvttAmKlhpv.jpg'],
  ['alt="WBC Venezuela"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/letyGgJuzOGXZxbK.jpg'],
  ['alt="Dodgers"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/FUsnyuVtvzhGMlHw.jpg'],
  ['alt="MLB Lockout"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/OEcjgGUkXusBeDTo.jpg'],
  ['alt="Dodgers Three-Peat"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/gwBPIIghiRkCECUs.jpg'],
  ['alt="NHL Sorokin"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/jxPvFIEwiPKfCtOO.jpg'],
  ['alt="Arch Manning"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/UidNDbSCrdNKcONS.jpg'],
  ['alt="March Madness"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/ykUMaJYydCGTxVrl.jpg'],
  ['alt="UFC 327"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/ZybAOJKfmBGJOhsJ.jpg'],
  ['alt="Adesanya"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/uMWnEEBdWxwuPAgF.jpg'],
  ['alt="Mayweather Pacquiao"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/CwZcMxYzzbDbkVDj.jpg'],
  ['alt="American Sports"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/hlDKCtfhoKyNwVAB.jpg'],
  ['alt="Analytics"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/caAUeYpmFJzOKBzb.jpg'],
  ['alt="Sports Betting"', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663491167634/tilRJildyJMdpZKx.jpg'],
];

exports.handler = async (event) => {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Antonius7804/sksportz';

  const file = await new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/index.html`,
      headers: { 'Authorization': `token ${token}`, 'User-Agent': 'sksportz' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  let content = Buffer.from(file.content, 'base64').toString('utf8');
  let changes = 0;

  for (const [altText, newUrl] of FIXES) {
    const regex = new RegExp(`(<img\\s+src=")[^"]*("\\s+${altText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
    const newContent = content.replace(regex, `$1${newUrl}$2`);
    if (newContent !== content) { changes++; content = newContent; }
  }

  const putData = JSON.stringify({
    message: `Fix ${changes} article images`,
    content: Buffer.from(content).toString('base64'),
    sha: file.sha
  });

  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/index.html`,
      method: 'PUT',
      headers: {
        'Authorization': `tok
