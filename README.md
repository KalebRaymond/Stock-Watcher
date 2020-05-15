# Stock-Watcher

Stock Watcher uses real time stock data to alert users via e-mail when a stock in their portfolio reaches a desired price. Stock data provided by [Alpha Vantage](www.alphavantage.co) and makes use of [zackurben's wrapper](https://github.com/zackurben/alphavantage).  

![adding](https://i.imgur.com/PWra2pZ.gif)  
![hovering](https://i.imgur.com/scS5Lx0.gif)  

For some reason, on some stocks, Alpha Vantage doesn't return current data and instead returns data from the previous day. Alpha Vantage apparently doesn't update NASDAQ stocks in real time, but for NYSE stocks it does (TSLA doesn't work but IBM does).

## Installation

Download this repo. Run npm install in the project root to install the necessary modules. Create a file named .env in the root folder. You will need to create four variables in it:  
 - TO_EMAIL - the email address you want updates sent to
 - FROM_EMAIL - the email address you will use to send updates from  
 - NODEMAIL_PW - the password to FROM_EMAIL  
 - AV_KEY - your alpha vantage API key  

The file should look like this:  
![env variables](https://i.imgur.com/6l0sH0r.png)
