const db = require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const alpha = require('alphavantage')({ key: process.env.AV_KEY });
const nodeMailer = require('nodeMailer'); 
const fs = require('fs'); 
const parser = require('node-html-parser').parse;
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const user =
{
	curPortfolio: {},
	curClosePrices: {},
	dailyStockAlertFlags: {}
};

/* Node Mailer */
const transporter = nodeMailer.createTransport({
	service: 'gmail',
	auth: 
	{
		user: process.env.FROM_EMAIL,
		pass: process.env.NODEMAIL_PW
	}
});

/* 	
/	Checks current market price of every stock in user's portfolio. When a 
/	stock's price is above the user's desired price, it is added to a string
/	that is then emailed to the user. 
*/
async function notify()
{
	user.curClosePrices = {};
	var sendEmailFlag = 0;
	var emailSubject = '';
	var emailBody = 'Automated response. ';
	var closePrice = 0;
	
	for(var s in user.curPortfolio)
	{
		//Only check stocks that haven't already been in an e-mail in the since last e-mail refresh
		//to avoid spamming the user with multiple emails
		if(user.dailyStockAlertFlags[s] === undefined)
		{
			await alpha.data.intraday(s, 'compact', 'json', '5min').then(data => 
			{
				var closePrice = Number(get_close_price(data));
				user.curClosePrices[s] = closePrice;
			});
		}
	}
	
	for(var s in user.curClosePrices)
	{
		if(user.curClosePrices[s] > user.curPortfolio[s])
		{
			var sendEmailFlag = 1;
			var emailSubject = emailSubject + s + ', ';
			var emailBody = '\n' + emailBody + s + ' is now at $' + user.curClosePrices[s] + '! ';
			user.dailyStockAlertFlags[s] = 1;
		}
	}
	
	if(sendEmailFlag)
	{
		emailSubject = emailSubject.substring(0, emailSubject.length - 2) + ' alert!'
		
		var mailOptions = {
			from: 'StockWatcherNotification@gmail',
			to: process.env.TO_EMAIL,
			subject: emailSubject,
			text: '',
			html: emailBody
		};

		transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				console.log(error);
			} else {
				console.log('Email sent: ' + info.response);
			}
		});
	}
	else
	{
		console.log('No new stock price alerts.')
	}
}

/*
/	Resets all values in user.dailyStockAlertFlags to false. This allows stocks that
/	have already been in an email since the last refresh to be in another email.
/	Otherwise, if a stock hits the desired price and stays above it, then the user would 
/	get an email about that stock every five minutes. 
*/
function clear_alert_flags()
{
	user.dailyStockAlertFlags = {};
}

setInterval(notify, 5 * 60 * 1000);
setInterval(clear_alert_flags, 60 * 60 * 1000);

/*
/	Returns the most recent close price for a stock from a given alpha vantage 
/	JSON object. Technically it's called a closing price but I already wrote
/	'close' so many times replacing it would be a pain.
*/
function get_close_price(stockData)
{
	for (var i in stockData['Time Series (5min)'])
	{
		//Return the first JSON entry in 'Time Series (5min)'
		return stockData['Time Series (5min)'][i]['4. close']; 
	}
}

function add_to_portfolio(stock, desiredPrice, curClose)
{
	user.curPortfolio[stock] = desiredPrice;
	user.curClosePrices[stock] = curClose;
}

function remove_from_portfolio(stock)
{
	delete user.curPortfolio[stock];
	delete user.curClosePrices[stock]
}

/*
/	Updates and renders the 'Your Portfolio' section of index.ejs by
/	overwriting the table tag contents
*/
function render_portfolio(req, res)
{
	var html = fs.readFileSync('public/views/index.ejs');
	const root = parser(html, {script: true});
	const body = root.querySelector('table');
	
	var portfolioText = '';
	for(var s in user.curPortfolio)
	{
		var openPrice = '$' + user.curClosePrices[s];
		if(user.curClosePrices[s] == undefined) openPrice = 'Awaiting data...';
		
		portfolioText += '\n\t\t\t\t\t\t\t<tr class="stock" id="' + s + '" onmouseover="hover_event(\'' + s + '\')">'
			+ '<td id="symbol">' + s + '</td>'
			+ '<td id="close">Last price: ' + openPrice + '</td>'
			+ '<td id="watch">Watching for: $' + user.curPortfolio[s] + '</td>'
			+ '<td id="delete"><button form="tableForm" class="deleteButton" type="submit" onclick="send_symbol(\'' + s + '\')">DELETE</button></td></tr>';
	}
	portfolioText += '\n\t\t\t\t\t\t';
	body.set_content(portfolioText);
	
	fs.writeFileSync('public/views/index.ejs', root.toString());
	res.render('index', {});
}


/* Express middleware */
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views','public/views');

app.get('/', async function (req, res)
{
	await notify();
	render_portfolio(req, res);
})

app.post('/', 
	/* Function for adding stock to portfolio, accessed via root path with query ?name=formRemove  */
	function (req, res, next)
	{	
		if (req.query.name === 'formAdd')
		{
			var symbol = req.body.addedSymbol.toUpperCase();
			var flDesiredPrice = parseFloat(req.body.desiredPrice);
			var openPrice;

			if(isNaN(flDesiredPrice))
			{
				console.log('Error: input price is not a number. Addition to portfolio failed.');
				render_portfolio(req, res);
			}
			else
			{
				alpha.data.intraday(symbol, 'compact', 'json', '5min').then(data => 
				{
					fs.writeFileSync('lib/time_series_data.json', JSON.stringify(data)); //Make this async?
					
					var closePrice = get_close_price(data);
					add_to_portfolio(symbol, flDesiredPrice, closePrice);
					render_portfolio(req, res);

					//Send e-mail if current open price is greater than desired price
					/*if(openPrice > flDesiredPrice)
					{
						var mailOptions = 
						{
							from: 'StockWatcherNotification@gmail',
							to: 'k.raymond.form@gmail.com',
							subject: '' + symbol + ' alert!' ,
							text: 'The current price for ' + symbol + ' is $' + openPrice,
						};
						transporter.sendMail(mailOptions, function(error, info)
						{
							if (error) {
								console.log(error);
							} else {
								console.log('Email sent: ' + info.response);
							}
						});
					}*/
				}).catch(function(err)
				{
					//Error occurs if user enters a stock symbol that the API doesn't recognize
					//but also if the API's call limit is exceeded (5/min, 500/day)
					console.log('Alpha Vantage error: stock ' + symbol + ' not found or call limit exceeded.');
					render_portfolio(req, res);
				});
			}
		} 
		else
		{
			next();
		}
	},
	/* Function for removing stock from portfolio, accessed via root path with query ?name=formRemove */
	function (req, res, next)
	{
		if (req.query.name === 'formRemove')
		{
			remove_from_portfolio(req.body.removedSymbol.toUpperCase());
			render_portfolio(req, res);
		}
		else
		{
			next();
		}
	},
	/* Function for exporting portfolio as JSON file, accessed via root path with query ?name=formExport */
	function(req, res, next)
	{
		if (req.query.name === 'formExport')
		{
			var portfolioJSON = JSON.stringify(user.curPortfolio);
			fs.writeFile('lib/portfolio.json', portfolioJSON, function (err){if (err) throw err;} );
			render_portfolio(req, res);
		}
		else
		{
			next();
		}
	});

/* Socket IO */
http.listen(8080, function (req) 
{
	console.log('Stock Watcher listening on port 8080')
	fs.readFile('lib/portfolio.json', function(err, data) 
	{
		if(err)
		{
			console.log('Error opening file. Continuing without initial portfolio.');
		}
		else
		{
			console.log('portfolio.json successfully opened.');
			user.curPortfolio = JSON.parse(data); 
		}
	});
})

/*
/	Socket io handles 'hover' event when user hovers over a table row in
/	the portfolio. io emits a 'draw' signal back telling the client to render
/	a line chart for the corresponding stock. 
/	Drawing the graph relies on a call to the alpha vantage API, which means if 
/	the call limit is exceeded nothing will be drawn. I tried circumventing this 
/	call by storing the stock data in a JSON file but all the added file system
/	overhead made just about everything else really slow (especially loading the page).
*/
io.on('connection', (socket) => {
	socket.on('hover', (symbol) =>
	{
		alpha.data.intraday(symbol, 'compact', 'json', '5min').then(data =>
		{
			var timesStack = [];
			var pricesStack = [];

			for(var i in data['Time Series (5min)'])
			{
				timesStack.push( i.substring(11, 16) );
				pricesStack.push( data['Time Series (5min)'][i]['4. close'] );
			}

			var timesArr = [];
			var pricesArr = [];
			//The data read from the object needs to be in reverse order for the graph in the html file to be in chronological order.
			//How I wish you could just read a JS object backwards...
			while(timesStack.length != 0)
			{
				timesArr.push( timesStack.pop() );
				pricesArr.push( pricesStack.pop() );
			}
			
			var draw_params = 
			{
				symbol: symbol,
				times: timesArr,
				prices: pricesArr,
			};
			
			io.emit('draw', draw_params);
		});
	});
});