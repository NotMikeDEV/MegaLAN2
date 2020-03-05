#!/usr/bin/nodejs
const promisify = require("promisify-node");
const dgram = require('dgram');
const IPAddr = require('ip6addr');
const database = require('./Include/SQL.js');

// Command Line Args
const args = process.argv.slice(2);
const ServerName = args[0].toLowerCase();
const DomainName = global.DomainName = args[1].toLowerCase();
const IPv4 = IPAddr.parse(args[2]);
const IPv6 = IPAddr.parse(args[3]);

const server = dgram.createSocket('udp6');
server.on('error', (err) => {
	console.log(`server error:\n${err.stack}`);
	server.close();
});
setInterval(function () {
	database.query("DELETE FROM VLAN_Membership WHERE Time < ?", [Math.floor(new Date() / 1000) - 600]);
	database.query("DELETE FROM IP_Allocations WHERE Time < ?", [Math.floor(new Date() / 1000) - 3600 * 24]);
}, 60000);
server.on('message', (msg, rinfo) => {
	var Buff = Buffer.from(msg);
	var UserHash = Buff.slice(0, 20);
	console.log("Server request", UserHash.toString('hex'), rinfo.address + ":" + rinfo.port);
	var IV = Buff.slice(20, 36);
	var Payload = Buff.slice(36);
	database.query("SELECT Username, PasswordSHA256 FROM Accounts WHERE UserHash = ?", [UserHash.toString('hex')], (err, User) => {
		if (err) {
			return console.error(err.message);
		}
		var AuthKey;
		if (UserHash == '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0') {
			AuthKey = '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0';
			console.log("NULL Key");
		} else if (User.length) {
			AuthKey = User.PasswordSHA256;
			console.log("User Key");
		} else {
			return console.log("Unknown User");
		}
		try {
			var decipher = crypto.createDecipheriv('aes-256-cbc', AuthKey, IV);
			Payload = decipher.update(Payload);
			Payload = Buffer.concat([Request, decipher.final()]);
		} catch (e) {
			return console.log("Decrypt Error", e);
		}
		console.log("Type", Payload.slice(0, 4));
	});
});
server.bind(54321);
console.log("Node UDP Server UP at " + ServerName);
