# Stock-Watcher

Stock Watcher uses real time stock data to alert users via e-mail when a stock in their portfolio reaches a desired price. Stock data provided by [Alpha Vantage](www.alphavantage.co) and makes use of [zackurben's wrapper](https://github.com/zackurben/alphavantage).

For some reason, on some stocks, Alpha Vantage doesn't return current data and instead returns data from the previous day. Alpha Vantage apparently doesn't update NASDAQ stocks in real time, but for NYSE stocks it does (TSLA doesn't work but IBM does).
