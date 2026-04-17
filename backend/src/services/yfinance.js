const NSE_TICKERS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'SBIN.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'LT.NS', 'WIPRO.NS'
];

const EXTRA_TICKERS = ['BTC-USD', 'ETH-USD', 'GOLDBEES.NS'];

/**
 * Fetch market data directly from Yahoo chart API.
 * Returns an array of { ticker, current_price, ma50, ma200, signal }
 */
function average(values) {
  if (!values.length) return null;
  const sum = values.reduce((acc, n) => acc + n, 0);
  return sum / values.length;
}

function computeSignal(current, ma50, ma200) {
  if (!current || !ma50 || !ma200) return 'hold';
  if (ma50 > ma200 && current > ma50) return 'buy';
  if (ma50 < ma200 && current < ma50) return 'sell';
  return 'hold';
}

async function fetchTickerData(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Yahoo chart failed (${response.status})`);

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const closesRaw = result?.indicators?.quote?.[0]?.close || [];
  const closes = closesRaw.filter((n) => typeof n === 'number');

  if (!closes.length) throw new Error('No close prices');

  const current = closes[closes.length - 1];
  const ma50 = average(closes.slice(-50));
  const ma200 = average(closes.slice(-200));

  return {
    ticker,
    current_price: Number(current.toFixed(2)),
    ma50: ma50 ? Number(ma50.toFixed(2)) : null,
    ma200: ma200 ? Number(ma200.toFixed(2)) : null,
    signal: computeSignal(current, ma50, ma200),
  };
}

async function fetchMarketData(tickers = NSE_TICKERS) {
  const allTickers = Array.from(new Set([...(tickers || []), ...EXTRA_TICKERS]));
  const settled = await Promise.allSettled(allTickers.map((t) => fetchTickerData(t)));

  const successful = settled
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  if (!successful.length) {
    throw new Error('Failed to fetch market data from Yahoo');
  }

  return successful;
}

module.exports = { fetchMarketData, NSE_TICKERS };
