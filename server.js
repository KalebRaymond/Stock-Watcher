const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql');
const db = require('dotenv').config();

const con = mysql.createConnection({
	  host: 'localhost',
	  user: 'root',
	  password: process.env.DB_PW,
	  database: 'perfectfitdb'
});

con.connect(function(err) 
{
	if (err)
	{
	  throw err;
	}
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(3000, function ()
{
	console.log('Example app listening on port 3000!');
	
	var sql = 'CREATE TABLE IF NOT EXISTS myclothes (article VARCHAR(255), color VARCHAR(255), material VARCHAR(255))';
	con.query(sql, function (err, result, fields) {
		if (err) throw err;
		console.log('Table exists');
	});
})

app.use(function(req, res, next) 
{
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	next();
});

app.post('/api/addClothes', function (req, res) 
{
	console.log(req.body);
	
	var article = req.body.article.toUpperCase();
	var color = req.body.color.toUpperCase();
	var material = req.body.material.toUpperCase();
	
	sql = 'INSERT INTO myclothes (article, color, material) VALUES (?, ?, ?)';
	con.query(	sql, 	
				[ 	
					article,
					color,
					material
				],						
				function (err, result, fields) 
				{
					if (err) throw err;
					console.log(req.body.article + ' added');
				});
	
	res.send({'data': 'test'});
	return;
});

app.get('/api/getClothes', function(req, res)
{
	sql = "SELECT * FROM myclothes";
	
	con.query(sql, function (err, result, fields) {
		if (err) throw err;
		res.send(result);
	});
	
	return;
});