//import bodyParser from "body-parser";
//import express from "express"; 
const bodyParser = require("body-parser");
const express = require("express");
const alpha = require('alphavantage')({ key: '****' });
const nodemailer = require('nodemailer'); 
const app = express();

/* Email */
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'StockWatcherNotification@gmail.com',
    pass: '****'
  }
});


/* Localhost interactivity */
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs")

app.get("/", function (req, res)
{
  res.render("index");
})

function get_open(stockData) {
    var dataString = JSON.stringify(stockData);
    var objectValue = JSON.parse(dataString);
	
	/* Access most recent open price from JSON data */
	for (var i in objectValue['Time Series (1min)'])
	{
		for(var j in objectValue['Time Series (1min)'][i])
		{
			return objectValue['Time Series (1min)'][i][j]; //Most recent price ("open price")
			//break;
		}
		//break;
	}
}

app.post('/', function (req, res) {
  res.render('index');
  var symbol = req.body.tickerSymbol.toUpperCase();
  var flDesiredPrice = parseFloat(req.body.desiredPrice);
  var openPrice;
  //console.log(req.body.tickerSymbol + " " + req.body.desiredPrice + " " + flDesiredPrice); 
  alpha.data.intraday(symbol).then(data => {
	//console.log(data);
	var openPrice = get_open(data);
    console.log(symbol + " Open: " + openPrice + " Input: " + flDesiredPrice);
	if(openPrice > flDesiredPrice)
	{
		var mailOptions = {
		  from: 'StockWatcherNotification@gmail',
		  to: 'k.raymond.form@gmail.com',
		  subject: "" + symbol + " alert!" ,
		  text: "The current price for " + symbol + " is $" + openPrice,
		};

		transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				console.log(error);
			} else {
				console.log('Email sent: ' + info.response);
			}
		});
	}
  });
})

app.listen(8080, function () 
{
  console.log("Example app listening on port 8080!")
})