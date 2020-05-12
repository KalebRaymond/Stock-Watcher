const bodyParser = require('body-parser');
const express = require('express');
const alpha = require('alphavantage')({ key: '****' });
const nodeMailer = require('nodeMailer'); 
const fs = require('fs'); 
const parser = require('node-html-parser').parse;
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);


/* Email */
var transporter = nodeMailer.createTransport({
	service: 'gmail',
	auth: 
	{
		user: 'StockWatcherNotification@gmail.com',
		pass: '****'
	}
});

//Checks current market price of every stock in user's portfolio. When a stock's price is above the desired price, an e-mail with all stocks above desired price will be sent to user
var curPortfolio = {};
var curOpenPrices = {};
var dailyStockAlertFlags = {};
async function notify()
{
	curOpenPrices = {};
	var emailFlag = 0;
	var emailSubject = '';
	var emailBody = 'Automated response. ';
	var openPrice = 0;
	
	for(var s in curPortfolio)
	{
		//Only check stocks that haven't already been in an e-mail in the last hour (or since last e-mail refresh)
		if(dailyStockAlertFlags[s] === undefined)
		{
			await alpha.data.intraday(s, 'compact', 'json', '5min').then(data => 
			{
				var openPrice = Number(get_open(data));
				curOpenPrices[s] = openPrice;
			});
		}
	}
	
	for(var s in curOpenPrices)
	{
		//console.log('open ' + s + " " + curOpenPrices[s] + " " + curPortfolio[s]);
		if(curOpenPrices[s] > curPortfolio[s])
		{
			var emailFlag = 1;
			var emailSubject = emailSubject + s + ', ';
			var emailBody = "<br>" + emailBody + s + ' is now at $' + curOpenPrices[s] + '! ';
			dailyStockAlertFlags[s] = 1;
		}
	}
	
	//console.log(emailFlag);
	if(emailFlag)
	{
		emailSubject = emailSubject.substring(0, emailSubject.length - 2) + ' alert!'
		
		var mailOptions = {
			from: 'StockWatcherNotification@gmail',
			to: 'k.raymond.form@gmail.com',
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
		console.log("No new stock price alerts.")
	}
}

function clear_alert_flags()
{
	dailyStockAlertFlags = {};
}

//setInterval(notify, 5 * 60 * 1000);
//setInterval(clear_alert_flags, 60 * 60 * 1000);

/* Localhost interactivity */
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res)
{
	notify(); //Retrieving stock data is slow, if you await notify the page wont load for a few seconds
	render_portfolio(req, res);
})

function get_open(stockData)
{
    var dataString = JSON.stringify(stockData);
    var objectValue = JSON.parse(dataString);
	
	/* Access most recent open price from JSON data */
	for (var i in objectValue['Time Series (5min)'])
	{
		for(var j in objectValue['Time Series (5min)'][i])
		{
			return objectValue['Time Series (5min)'][i][j]; //Most recent price ('open price') (should actually be 'closed price'...)
			//break;
		}
		//break;
	}
}

function add_to_portfolio(stock, desiredPrice, curOpen)
{
	curPortfolio[stock] = desiredPrice;
	curOpenPrices[stock] = curOpen;
}

function remove_from_portfolio(stock)
{
	delete curPortfolio[stock];
	delete curOpenPrices[stock]
}

function render_portfolio(req, res)
{
	var html = fs.readFileSync('views/index.ejs');
	const root = parser(html, {script: true});
	const body = root.querySelector('table');
	
	var portfolioText = '';
	for(var s in curPortfolio)
	{
		var openPrice = '$' + curOpenPrices[s];
		if(curOpenPrices[s] == undefined) openPrice = "Awaiting data...";
		
		portfolioText += '\n\t\t\t\t\t\t<tr class="stock" id="' + s + '" onmouseover="hover_event(\'' + s + '\')"><td>' + s + '</td><td>Last price: ' + openPrice + '</td><td>Watching for: $' + curPortfolio[s] + '</td><td><button form="tableForm" class="deleteButton" type="submit" onclick="sendSymbol(\'' + s + '\')">DELETE</button></td></tr>';
	}
	portfolioText += '\n\t\t\t\t\t';
	body.set_content(portfolioText);
	
	fs.writeFileSync('views/index.ejs', root.toString());
	res.render('index', {});
}

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
					fs.writeFileSync('time_series_data.json', JSON.stringify(data)); //Make this async?
					
					var openPrice = get_open(data);
					add_to_portfolio(symbol, flDesiredPrice, openPrice);
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
					console.log('Alpha Vantage error: stock ' + symbol + ' not found.');
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
			//console.log('Attempting to remove ' + req.body.removedSymbol.toUpperCase() + ' from portfolio');
			//console.log('Arrived at second function');
			console.log(req.body);
			remove_from_portfolio(req.body.removedSymbol.toUpperCase());
			render_portfolio(req, res);
		}
		else
		{
			next();
		}
	},
	/* Function for exporting portfolio as json file, accessed via root path with query ?name=formExport */
	function(req, res, next)
	{
		if (req.query.name === 'formExport')
		{
			var portfolioJSON = JSON.stringify(curPortfolio);
			fs.writeFile('portfolio.json', portfolioJSON, function (err){if (err) throw err;} );
		}
		else
		{
			next();
		}
	},
	/* Function for rendering line chart for a stock, accessed via root path with query ?name=graph */
	function(req, res, next)
	{
		if( req.query.name === 'graph')
		{
			console.log(req.body.removedSymbol); //Should change the name of removedSymbol in html...
		}
		else
		{
			next();
		}
	});


/* Socket IO */
http.listen(8080, function (req) 
{
	console.log('Example app listening on port 8080!')
	fs.readFile('portfolio.json', function(err, data) 
	{
		if(err)
		{
			console.log('Error opening file. Continuing without initial portfolio.');
		}
		else
		{
			console.log('portfolio.json successfully opened.');
			curPortfolio = JSON.parse(data); 
		}
	});
})

io.on('connection', (socket) => {
	console.log('Socket works');
	socket.on('clicked', function()
	{
		console.log("Test button clicked");
	});
	
	socket.on('hover', (symbol) =>
	{
		console.log('Hovering over ' + symbol);
		//Ok ok ok. Get arrays in this function right here. Emit them back to index.ejs and call draw_graph()
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


