// SQL Connection (promisified)
var mysql = require('mysql');
var database = mysql.createPool({
	connectionLimit: 5,
	host: 'localhost',
	user: 'MegaLAN',
	password: 'MegaLAN',
	database: 'MegaLAN'
});
var util = require('util');
database.query = util.promisify(database.query);

module.exports = database;
