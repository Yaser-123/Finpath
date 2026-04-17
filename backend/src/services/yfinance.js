const { execFile } = require('child_process');
const path = require('path');

const PYTHON_SCRIPT = path.join(__dirname, '../../scripts/fetch_market_data.py');

const NSE_TICKERS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'SBIN.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'LT.NS', 'WIPRO.NS'
];

/**
 * Fetch market data for tickers via Python yfinance child process.
 * Returns an array of { ticker, current_price, ma50, ma200, signal }
 */
function fetchMarketData(tickers = NSE_TICKERS) {
  return new Promise((resolve, reject) => {
    const args = [PYTHON_SCRIPT, '--tickers', tickers.join(',')];
    execFile('python3', args, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        // Try 'python' as fallback on Windows
        execFile('python', args, { timeout: 30000 }, (err2, stdout2) => {
          if (err2) return reject(new Error(`yfinance failed: ${stderr || err2.message}`));
          try { resolve(JSON.parse(stdout2)); }
          catch (e) { reject(new Error('Failed to parse yfinance output')); }
        });
        return;
      }
      try { resolve(JSON.parse(stdout)); }
      catch (e) { reject(new Error('Failed to parse yfinance output')); }
    });
  });
}

module.exports = { fetchMarketData, NSE_TICKERS };
