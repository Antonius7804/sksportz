const https = require('https');

exports.handler = async (event) => {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Antonius7804/sksportz';

  // Get commit history to find previous version
  const getCommits = () => new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/commits?path=index.html&per_page=5`,
      headers: { 'Authorization': `token ${token}`, 'User-Agent': 'sksportz' }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  // Get file at specific commit
  const getFileAtCommit = (sha) => new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/index.html?ref=${sha}`,
      headers: { 'Authorization': `token ${token}`, 'User-Agent': 'sksportz' }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  // Get current file SHA
  const getCurrentFile = () => new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/index.html`,
      headers: { 'Authorization': `token ${token}`, 'User-Agent': 'sksportz' }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  // Get commits
  const commits = await getCommits();
  
  // Find the commit before "Fix all article card images"
  let previousCommitSha = null;
  for (let i = 0; i < commits.length; i++) {
    const msg = commits[i].commit.message;
    if (msg.includes('Fix all article card images')) {
      // Use the next commit (older one)
      if (commits[i + 1]) {
        previousCommitSha = commits[i + 1].sha;
      }
      break;
    }
  }

  if (!previousCommitSha) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Could not find previous commit', commits: commits.map(c => c.commit.message) }) };
  }

  // Get the good version
  const goodFile = await getFileAtCommit(previousCommitSha);
  const currentFile = await getCurrentFile();

  // Restore it
  const putData = JSON.stringify({
    message: 'Revert index.html to working version',
    content: goodFile.content.replace(/\n/g, ''),
    sha: currentFile.sha
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

  return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Reverted to previous version!', restoredFrom: previousCommitSha }) };
};
