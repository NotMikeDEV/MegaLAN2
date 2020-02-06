#!/usr/bin/nodejs
const IPAddr = require('ip6addr');
var database = require('./Include/SQL.js');

// Command Line Args
const args = process.argv.slice(2);
const ServerName = args[0].toLowerCase();
const DomainName = args[1].toLowerCase();
const IPv4 = IPAddr.parse(args[2]);
const IPv6 = IPAddr.parse(args[3]);

// Test HTTPS Status (every 20 seconds)
var HeartBeat = function () {
	const https = require('https');
	const options = {
		port: 443,
		host: ServerName + "." + DomainName, // Connect to this server by hostname
		method: 'GET',
		path: '/'
	};
	var Request = https.request(options)
		.on("error", (err) => { // Server is dead
			console.log("HeartBeat", err.message);
			if (IPv4) // Set IPv4 status to Up=0
				database.query("REPLACE INTO Servers (ServerName, IP, Up, HeartBeatTime) VALUES (?, ?, 0, ?)", [ServerName, IPv4.toString(), Math.floor(new Date())]);
			if (IPv6) // Set IPv6 status to Up=0
				database.query("REPLACE INTO Servers (ServerName, IP, Up, HeartBeatTime) VALUES (?, ?, 0, ?)", [ServerName, IPv6.toString(), Math.floor(new Date())]);
		})
		.on('response', (response) => { // Server is responsive
			console.log("HeartBeat OK");
			if (IPv4) // Set IPv4 status to Up=1
				database.query("REPLACE INTO Servers (ServerName, IP, Up, HeartBeatTime) VALUES (?, ?, 1, ?)", [ServerName, IPv4.toString(), Math.floor(new Date())]);
			if (IPv6) // Set IPv6 status to Up=1
				database.query("REPLACE INTO Servers (ServerName, IP, Up, HeartBeatTime) VALUES (?, ?, 1, ?)", [ServerName, IPv6.toString(), Math.floor(new Date())]);
		}).end();
};
setInterval(HeartBeat, 20*1000);

async function Init() { // On startup
	await database.query("DELETE FROM Servers WHERE ServerName = ?", [ServerName]); // Remove existing entries
	if (IPv4) // Add IPv4 in status Up=0
		await database.query("REPLACE INTO Servers (ServerName, IP, Up, HeartBeatTime) VALUES (?, ?, 0, ?)", [ServerName, IPv4.toString(), Math.floor(new Date())], function (err) { if (err) console.log(err); });
	if (IPv6) // Add IPv6 in status Up=0
		await database.query("REPLACE INTO Servers (ServerName, IP, Up, HeartBeatTime) VALUES (?, ?, 0, ?)", [ServerName, IPv6.toString(), Math.floor(new Date())], function (err) { if (err) console.log(err); });
	HeartBeat(); // Do first check
}
Init();

async function GarbageCollect() { // Runs every 30 seconds
	database.query("UPDATE Servers SET Up = 0 WHERE HeartBeatTime < ?", [Math.floor(new Date()) - 30 * 1000]); // Set servers to Up=0 if no pulse in the last 30 seconds
	database.query("DELETE FROM Servers WHERE HeartBeatTime < ?", [Math.floor(new Date()) - 60*60*1000]); // Delete servers that have been brain-dead for more than 60 minutes
	database.query("DELETE FROM DNS WHERE Expire < ?", [Math.floor(new Date() / 1000)]); // Delete expired DNS records
}
setInterval(GarbageCollect, 30000);
