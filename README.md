# Stock-Watcher

Stock Watcher uses real time stock data to alert users via e-mail when a stock in their portfolio reaches a desired price. Stock data provided by [Alpha Vantage](www.alphavantage.co) and makes use of [zackurben's wrapper](https://github.com/zackurben/alphavantage).

For some reason, on some stocks Alpha Vantage doesn't return current data and instead returns data from the previous day. I think it has to do with whether the stock is in the NYSE or NASDAQ (IBM works but TSLA doesn't).

TODO
 - Code needs to be cleaned up, it's poorly written and hard to read
 - fix NaN error when loading from portfolio.json
 - Clean up script tags in index.ejs. Maybe put them in their own file
 - Change curOpenPrices to curClosePrices
 - Your Portfolio doesn't space columns correctly if stock symbol is less than 4 characters (try hovering over F)
 - The whole thing is kinda slow
 - Hide API keys & pws in another file
