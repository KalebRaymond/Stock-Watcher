# Stock-Watcher

Stock Watcher uses real time stock data to alert users via e-mail when a stock in their portfolio reaches a desired price. Stock data provided by [Alpha Vantage](www.alphavantage.co) and makes use of [zackurben's wrapper](https://github.com/zackurben/alphavantage).

For some reason, on some stocks Alpha Vantage doesn't return current data and instead returns data from the previous day. I think it has to do with whether the stock is in the NYSE or NASDAQ (IBM works but TSLA doesn't).

Next level stuff - React? Draw a graph? Make a website?
Code needs to be cleaned up, it's poorly written
