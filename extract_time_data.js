const fs = require('fs'); 
var data = fs.readFileSync('time_series_data.json');
var obj = JSON.parse(data);

var timesStack = [];
var pricesStack = [];

for(var i in obj['Time Series (5min)'])
{
	timesStack.push( i.substring(11, 16) );
	pricesStack.push( obj['Time Series (5min)'][i]['4. close'] );
}

var timesArr = [];
var pricesArr = [];
//The data read from the JSON file needs to be in reverse order for the graph in the html file to be in chronological order.
//How I wish you could just read a JS object backwards...
while(timesStack.length != 0)
{
	timesArr.push( timesStack.pop() );
	pricesArr.push( pricesStack.pop() );
}

console.log(timesArr);
console.log(pricesArr);