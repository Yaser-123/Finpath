#!/usr/bin/env python3
"""
fetch_market_data.py
Fetches OHLCV data for a list of tickers using yfinance,
computes 50-day and 200-day moving averages, and outputs
a buy/hold/sell signal per ticker as JSON to stdout.

Usage: python fetch_market_data.py --tickers RELIANCE.NS,TCS.NS,BTC-USD
"""

import sys
import json
import argparse

try:
    import yfinance as yf
except ImportError:
    print(json.dumps({"error": "yfinance not installed. Run: pip install yfinance"}))
    sys.exit(1)

GOLD_TICKER    = "GC=F"   # Gold futures (USD)
GOLD_INR_TICKER = "GOLDBEES.NS"  # Gold ETF on NSE


def compute_signal(history):
    """Return buy/hold/sell based on 50/200 MA crossover."""
    if history is None or len(history) < 50:
        return "hold"
    closes = history["Close"].dropna()
    if len(closes) < 50:
        return "hold"
    ma50  = closes.iloc[-50:].mean()
    ma200 = closes.iloc[-200:].mean() if len(closes) >= 200 else closes.mean()
    current = closes.iloc[-1]
    if ma50 > ma200 and current > ma50:
        return "buy"
    elif ma50 < ma200 and current < ma50:
        return "sell"
    return "hold"


def fetch_ticker(ticker):
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period="1y")
        if hist.empty:
            return None
        current_price = float(hist["Close"].iloc[-1])
        ma50  = float(hist["Close"].iloc[-50:].mean())  if len(hist) >= 50  else None
        ma200 = float(hist["Close"].iloc[-200:].mean()) if len(hist) >= 200 else None
        signal = compute_signal(hist)
        return {
            "ticker":        ticker,
            "current_price": round(current_price, 2),
            "ma50":          round(ma50, 2)  if ma50  else None,
            "ma200":         round(ma200, 2) if ma200 else None,
            "signal":        signal,
        }
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tickers", default="RELIANCE.NS,TCS.NS,HDFCBANK.NS,GC=F,BTC-USD")
    args = parser.parse_args()

    tickers = [t.strip() for t in args.tickers.split(",") if t.strip()]
    results = [r for t in tickers if (r := fetch_ticker(t)) is not None]
    print(json.dumps(results))


if __name__ == "__main__":
    main()
