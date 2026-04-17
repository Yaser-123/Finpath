const SERPER_ENDPOINT = 'https://google.serper.dev/search';

async function searchSerper(query, num = 5) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(SERPER_ENDPOINT, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!response.ok) {
    throw new Error(`Serper request failed with ${response.status}`);
  }

  const payload = await response.json();
  const organic = Array.isArray(payload.organic) ? payload.organic : [];

  return organic.slice(0, num).map((item) => ({
    title: item.title || '',
    link: item.link || '',
    snippet: item.snippet || '',
  }));
}

module.exports = { searchSerper };
