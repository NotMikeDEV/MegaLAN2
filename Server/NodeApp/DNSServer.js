#!/usr/bin/nodejs
const IPAddr = require('ip6addr');
var database = require('./Include/SQL.js');
const dns = require('native-dns');

// Command Line Args
const args = process.argv.slice(2);
const DomainName = args[0].toLowerCase();
const IPv4 = IPAddr.parse(args[1]);
const IPv6 = IPAddr.parse(args[2]);

// Handler for DNS queries
var DNSHandler = async function (request, response) {
	var question = request.question[0];
	var hostname = question.name.toLowerCase();
	var Host = hostname.split(".");
	console.log("DNS Request", Host, question.type, request.address.address);
	response.header.aa = true;

	if (question.type == 255) { // ANY request
		response.answer.push(dns.TXT({ // Non-cachable TXT record with human-readable explanation
			name: DomainName,
			ttl: 0,
			data: [ "RFC8482", "I know it recommends HINFO, but this TTL 0 record is still compliant." ]
		}));
		return response.send(); // Send response without additional processing
	}
	var GotAnswer = false;
	if (question.type == 6 && hostname == DomainName) { // SOA request
		response.answer.push(dns.SOA({
			name: DomainName,
			ttl: 300,
			primary: DomainName,
			admin: 'MegaLAN',
			serial: 1,
			refresh: 600,
			retry: 600,
			expiration: 3600,
			minimum: 60,
		}));
		GotAnswer = true;
	}
	if (question.type == 2 && hostname == DomainName) { // NS lookup for domain
		var Servers = await database.query("SELECT DISTINCT ServerName FROM Servers ORDER BY ServerName");
		for (x in Servers) {
			response.answer.push(dns.NS({
				name: hostname,
				data: Servers[x].ServerName + "." + DomainName,
				ttl: 300,
			}));
			// Send Response as-is.
			// Don't add the authority/additional sections, it's technically fine to duplicate records but some resolvers give valid-but-unusual looking answers.
			return response.send();
		}
	}
	if (question.type == 16) { // TXT request
		var Server = await database.query("SELECT ServerName, IP FROM Servers WHERE ServerName = ? ORDER BY IP", [Host[0]]);
		if (Server.length > 0) // Matches server, generate SPF record with server IPs listed
		{
			var SPF = "";
			for (x in Server) {
				var IP = IPAddr.parse(Server[x].IP);
				if (IP.kind() == 'ipv4')
					SPF += "ip4:" + IP.toString() + " ";
				if (IP.kind() == 'ipv6')
					SPF += "ip6:" + IP.toString() + " ";
			}
			// Add SPF record to response
			response.answer.push(dns.TXT({
				name: hostname,
				data: ["v=spf1 " + SPF + "-all"],
				ttl: 30,
			}));
			GotAnswer = true;
		}
		else // Not a server hostname
		{
			if (Host[0] == '_acme-challenge') { // Dynamic ACME records
				var DynamicRecords = await database.query("SELECT Value, Expire FROM DNS WHERE Hostname = ? AND TYPE = ?", [hostname, question.type]);
				for (x in DynamicRecords) {
					response.answer.push(dns.TXT({
						name: hostname,
						data: [DynamicRecords[x].Value],
						ttl: 5,
					}));
					GotAnswer = true;
				}
			}
			else { // All other TXT records - generate SPF record including all servers
				var Servers = await database.query("SELECT DISTINCT ServerName FROM Servers ORDER BY ServerName", [Host[0]]);
				var SPF = "";
				for (x in Servers) {
					SPF += "include:" + Servers[x].ServerName + "." + DomainName + " ";
				}
				// Add SPF record to response
				response.answer.push(dns.TXT({
					name: hostname,
					data: ["v=spf1 " + SPF + "-all"],
					ttl: 30,
				}));
				GotAnswer = true;
			}
		}
	}

	if (question.type == 1) { // A Lookup (IPv4)
		var Server = await database.query("SELECT ServerName, IP FROM Servers WHERE ServerName = ? ORDER BY IP", [Host[0]]);
		if (Server.length) { // Matches specific server
			for (x in Server) {
				var IP = IPAddr.parse(Server[x].IP);
				if (IP.kind() == 'ipv4') {
					response.answer.push(dns.A({
						name: hostname,
						address: IP.toString(),
						ttl: 300,
					}));
					GotAnswer = true;
				}
			}
		} else {
			var Servers = await database.query("SELECT ServerName, IP FROM Servers WHERE Up = 1 ORDER BY RAND()");
			for (x in Servers) {
				var IP = IPAddr.parse(Servers[x].IP);
				if (IP.kind() == 'ipv4') {
					response.answer.push(dns.A({
						name: hostname,
						address: IP.toString(),
						ttl: 30,
					}));
					GotAnswer = true;
				}
			}
		}
	}
	if (question.type == 28) { // AAAA Lookup (IPv6)
		var Server = await database.query("SELECT ServerName, IP FROM Servers WHERE ServerName = ? ORDER BY IP", [Host[0]]);
		if (Server.length) { // Matches specific server
			for (x in Server) {
				var IP = IPAddr.parse(Server[x].IP);
				if (IP.kind() == 'ipv6') {
					response.answer.push(dns.AAAA({
						name: hostname,
						address: IP.toString(),
						ttl: 300,
					}));
					GotAnswer = true;
				}
			}
		} else {
			var Servers = await database.query("SELECT ServerName, IP FROM Servers WHERE Up = 1 ORDER BY RAND()");
			for (x in Servers) {
				var IP = IPAddr.parse(Servers[x].IP);
				if (IP.kind() == 'ipv6') {
					response.answer.push(dns.AAAA({
						name: hostname,
						address: IP.toString(),
						ttl: 30,
					}));
					GotAnswer = true;
				}
			}
		}
	}

	if (GotAnswer) { // Add authority/additional sections.
		var Servers = await database.query("SELECT ServerName, IP FROM Servers ORDER BY RAND()", [Host[0]]);
		if (Servers.length) {
			var DoneNS = {};
			for (var x in Servers) {
				if (!DoneNS[Servers[x].ServerName]) {
					DoneNS[Servers[x].ServerName] = true;
					response.authority.push(dns.NS({
						name: DomainName,
						data: Servers[x].ServerName + "." + DomainName,
						ttl: 300,
					}));
				}
				var IP = IPAddr.parse(Servers[x].IP);
				if (IP.kind() == 'ipv4')
					response.additional.push(dns.A({
						name: Servers[x].ServerName + "." + DomainName,
						address: IP.toString(),
						ttl: 300,
					}));
				if (IP.kind() == 'ipv6')
					response.additional.push(dns.AAAA({
						name: Servers[x].ServerName + "." + DomainName,
						address: IP.toString(),
						ttl: 300,
					}));
			}
		}
	}
	// Send Response
	return response.send();
};
// Error handler
var ErrorHandler = function (err, buff, req, res) {
	console.log(err.stack);
};

// Create UDP and TCP listeners
var UDP4 = dns.createServer({ dgram_type: 'udp4' }).on('request', DNSHandler).on('error', ErrorHandler);
var TCP4 = dns.createTCPServer({ dgram_type: 'tcp4' }).on('request', DNSHandler).on('error', ErrorHandler);
var UDP6 = dns.createServer({ dgram_type: 'udp6' }).on('request', DNSHandler).on('error', ErrorHandler);
var TCP6 = dns.createTCPServer({ dgram_type: 'tcp6' }).on('request', DNSHandler).on('error', ErrorHandler);
console.log("DNS Server UDP", IPv4.toString(), UDP4.serve(53, IPv4.toString()));
console.log("DNS Server TCP", IPv4.toString(), TCP4.serve(53, IPv4.toString()));
console.log("DNS Server UDP6", IPv6.toString(), UDP6.serve(53, IPv6.toString()));
console.log("DNS Server TCP6", IPv6.toString(), TCP6.serve(53, IPv6.toString()));
