#!/usr/bin/nodejs
const promisify = require("promisify-node");
const dgram = require('dgram');
const IPAddr = require('ip6addr');
const database = require('./Include/SQL.js');
const crypto = require('crypto');

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
//	database.query("DELETE FROM VLAN_Membership WHERE Time < ?", [Math.floor(new Date() / 1000) - 600]);
//	database.query("DELETE FROM IP_Allocations WHERE Time < ?", [Math.floor(new Date() / 1000) - 3600 * 24]);
}, 60000);

server.on('message', RecvPacket);
server.bind(54321);
console.log("Node UDP Server UP at " + ServerName);

const HandleRequest = require('./UDPInterface.js')(SendReply);

async function RecvPacket(msg, rinfo) {
	try {
		var Buff = Buffer.from(msg);
		var UserID = Buff.slice(0, 20);
		var IV = Buff.slice(20, 36);
		var Payload = Buff.slice(36);
		var User = await database.query("SELECT Username, PasswordSHA256 FROM Accounts WHERE UserID = ?", [UserID.toString('hex')]);
		var AuthKey;
		if (User.length == 0 || UserID == '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0') {
			AuthKey = '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0';
		} else if (User.length) {
			AuthKey = Buffer.from(User[0].PasswordSHA256, 'hex');
		}
		var ClientInfo = {
			IP: rinfo.address,
			Port: rinfo.port,
			UserID: UserID.toString('hex'),
			AuthKey: AuthKey,
		};
		console.log("UDP Packet", ClientInfo);
		try {
			var decipher = crypto.createDecipheriv('aes-256-cbc', AuthKey, IV);
			Payload = decipher.update(Payload);
			Payload = Buffer.concat([Payload, decipher.final()]);
			ClientInfo.Username = User[0].Username;
		} catch (e) {
			ClientInfo.AuthKey = '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0';
			if (User.length)
				console.log("Authentication failed ", User[0].Username, rinfo.address + ":" + rinfo.port);
			else
				console.log("Unknown User ", UserID.toString('hex'), rinfo.address + ":" + rinfo.port);
			return SendReply(ClientInfo, "EROR", "Invalid username/password\0");
		}

		var Type = Payload.slice(0, 4).toString();
		return HandleRequest(ClientInfo, Type, Payload.slice(4));
	} catch (e) {
		return console.log("Error handling packet", e);
	}
}
function SendReply(ClientInfo, Type, Payload) {
	console.log("Sending " + Type + " packet", ClientInfo);

	var IV = crypto.randomBytes(16);
	var Response = IV;
	var cipher = crypto.createCipheriv('aes-256-cbc', ClientInfo.AuthKey, IV);
	var Encrypted = cipher.update(Type, 'utf8', 'hex');
	Encrypted += cipher.update(Buffer.from(Payload).toString('hex'), 'hex', 'hex');
	Encrypted += cipher.final('hex');
	server.send(Buffer.concat([IV, Buffer.from(Encrypted, 'hex')]), ClientInfo.Port, ClientInfo.IP);
}
