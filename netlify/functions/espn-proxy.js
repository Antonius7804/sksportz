exports.handler = async (event) => {
  const sport = event.queryStringParameters?.sport || 'nfl';
  const type = event.queryStringParameters?.type || 'standings';

  const urls = {
    'nfl-standings': 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings',
    'nba-standings': 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings',
    'mlb-standings': 'https://site.api.espn.com/apis/v2/sports/baseball/mlb/standings',
    'nhl-standings': 'https://site.api.espn.com/apis/v2/sports/hockey/nhl/standings',
    'nfl-scores': 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    'nba-scores': 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    'mlb-scores': 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
    'nhl-scores': 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
    'ufc-scores': 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard',
    'cfb-scores': 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
    'cbb-scores': 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',
    'mls-scores': 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
    'epl-scores': 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
    'tennis-scores': 'https://site.api.espn.com/apis/site/v2/sports/tennis/scoreboard'
  };

  const key = `${sport}-${type}`;
  const url = urls[key];

  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid sport/type' }) };
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://sksportz.com'
      }
    });
    const data = await res.json();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify(data)
    };
  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
