//import bodyParser from 'body-parser';
//import express from 'express'; 
const bodyParser = require('body-parser');
const express = require('express');
const alpha = require('alphavantage')({ key: '****' });
const nodeMailer = require('nodeMailer'); 
const fs = require('fs'); 
const app = express();

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
//This function should probably throw/catch an error because asynchronicity makes funny things happen
var curOpenPrices = {};
async function notify()
{
	curOpenPrices = {};
	var emailFlag = 0;
	var emailSubject = '';
	var emailBody = 'Automated response.\n';
	var openPrice;
	
	for(var s in curPortfolio)
	{
		await alpha.data.intraday(s).then(data => 
		{
			var openPrice = Number(get_open(data));
			curOpenPrices[s] = openPrice;
		});
	}
	
	for(var s in curOpenPrices)
	{
		console.log('open ' + s + " " + curOpenPrices[s] + " " + curPortfolio[s]);
		if(curOpenPrices[s] > curPortfolio[s])
		{
			var emailFlag = 1;
			var emailSubject = emailBody + s + ', ';
			var emailBody = emailBody + s + ' ' + openPrice + '\n';
		}
		else { emailFlag = 3;} //debugging...
	}
	
	console.log(emailFlag);
	 //Make this a function?
	if(emailFlag)
	{
		console.log('Made it to email block');
		emailSubject = emailSubject.substring(0, emailSubject.length - 2) + ' alert!'
		
		/*var mailOptions = {
			from: 'StockWatcherNotification@gmail',
			to: 'k.raymond.form@gmail.com',
			subject: emailSubject,
			text: emailBody,
		};

		transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				console.log(error);
			} else {
				console.log('Email sent: ' + info.response);
			}
		});*/
	}
	
	console.log('----');
}

setInterval(notify, 1 * 60 * 1000);

/* Portfolio.JSON parsing */
var curPortfolio = {}; //stringify this and put it in json when program finishes/user exports portfolio/whatever

function initialize_portfolio() //CAREFUL This function is asynchronous
{
	fs.readFile('portfolio.json', function(err, data) 
	{
		if(err)
		{
			console.log('Error opening file. Continuing without initial portfolio.');
		}
		else
		{
			console.log('portfolio.json successfully opened.');
			curPorfolio = JSON.parse(data);
			//console.log(data + ' ' + curPorfolio['MSFT']);
		}
	})
}

/* Localhost interactivity */
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res)
{
	res.render('index');
})

function get_open(stockData)
{
    var dataString = JSON.stringify(stockData);
    var objectValue = JSON.parse(dataString);
	
	/* Access most recent open price from JSON data */
	for (var i in objectValue['Time Series (1min)'])
	{
		for(var j in objectValue['Time Series (1min)'][i])
		{
			return objectValue['Time Series (1min)'][i][j]; //Most recent price ('open price')
			//break;
		}
		//break;
	}
}

function add_to_portfolio(stock, price)
{
	curPortfolio[stock] = price;
}

function remove_from_portfolio(stock)
{
	delete curPortfolio[stock];
}

function render_portfolio(res)
{
	var portfolioText = ''
	for(var s in curPortfolio)
	{
		portfolioText += s + '\t$' + curPortfolio[s] + '\n';
	}
	res.render('index', {portfolio: portfolioText, error: null});
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

			alpha.data.intraday(symbol).then(data => 
			{
				var openPrice = get_open(data);
				console.log(symbol + ' Open: ' + openPrice + ' Input: ' + flDesiredPrice);

				add_to_portfolio(symbol, flDesiredPrice);
				render_portfolio(res);

				//Send e-mail if current open price is greater than desired price
				if(openPrice > flDesiredPrice)
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
				}
			});
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
			remove_from_portfolio(req.body.removedSymbol.toUpperCase());
			render_portfolio(res);
		}
		else
		{
			next();
		}
	},
	/* Function for importing portfolio from json file, accessed via root path with query ?name=formImport */
	function(req, res, next)
	{
		if (req.query.name === 'formImport')
		{
			initialize_portfolio();
			render_portfolio(res);
			console.log(curPortfolio + ' ' + curPortfolio['MSFT']);
		}
		else
		{
			next();
		}
	},
	/* Function for exporting portfolio as json file, accessed via root path with query ?name=formExport */
	function()
	{
		var portfolioJSON = JSON.stringify(curPortfolio);
		fs.writeFile('portfolio.json', portfolioJSON, function (err){if (err) throw err;} );
	})

app.listen(8080, function (res) 
{
	console.log('Example app listening on port 8080!')
})