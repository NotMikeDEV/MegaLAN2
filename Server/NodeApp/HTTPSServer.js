#!/usr/bin/nodejs
const IPAddr = require('ip6addr');
const https = require('https');
const http = require('http');
const util = require('util');
var database = require('./Include/SQL.js');
const acme = require('./Include/ACME.js');
const fs = require('fs');
const mime = require('mime-types');
const zlib = require('zlib');

// Command Line Args
const args = process.argv.slice(2);
const ServerName = args[0].toLowerCase();
const DomainName = args[1].toLowerCase();
const IPv4 = IPAddr.parse(args[2]);
const IPv6 = IPAddr.parse(args[3]);

// Start Service
async function Init() {
    // HTTP server on port 80, simply redirects to HTTPS
    http.createServer((req, res) => {
        console.log("HTTP", req.headers['host'], req.url);
        var Host = req.headers['host'];
        if (!Host) Host = DomainName;
        res.writeHead(301, { Location: "https://" + Host + req.url });
        res.end();
    }).on('clientError', (err, socket) => {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        console.log(err);
    }).listen(80);

    // TLS for HTTPS server
    var TLS = await acme(DomainName);
    var Options = { key: TLS.private, cert: TLS.certificate, minVersion: 'TLSv1.1' };
    // HTTPS Server on port 443
    https.createServer(Options, function (req, res) {
        var Path = req.url.split("/");
        if (Path[0] != "" || req.url.indexOf("..") != -1) { // Invalid URL
            var Host = req.headers['host'];
            if (!Host) Host = DomainName;
            res.writeHead(302, { Location: "https://" + Host + "/" });
            return res.end(JSON.stringify(Path));
        }

        var Filename = "www" + req.url;
        if (Filename == "www/") // Home page is in index.html
            Filename = "www/index.html";
        fs.stat(Filename, (err, stats) => { // Get file status
            if (!err) { // File exists
                if (req.headers['if-modified-since'] == stats.mtime || req.headers['if-none-match'] == stats.mtimeMs) { // 304 Not Modified
                    res.writeHead(304).end();
                }
                if (req.headers['accept-encoding'] && req.headers['accept-encoding'].indexOf('deflate') != -1) { // Send static file gzip compressed
                    res.writeHead(200, { 'Content-Type': mime.contentType(require('path').extname(Filename)), 'Last-Modified': stats.mtime, 'Etag': stats.mtimeMs, 'Content-Encoding': 'deflate' });
                    var f = fs.createReadStream(Filename);
                    return f.pipe(zlib.createDeflate()).pipe(res);
                } else { // Send static file uncompressed
                    res.writeHead(200, { 'Content-Type': mime.contentType(require('path').extname(Filename)), 'Last-Modified': stats.mtime, 'Etag': stats.mtimeMs });
                    var f = fs.createReadStream(Filename);
                    return f.pipe(res);
                }
            } else { // 404 File not found
                res.writeHead(404, { 'Content-Type': 'text/html', Refresh: '3;url=/' });
                return res.end("<h1>404 Not Found</h1>" + JSON.stringify(Path));
            }
        });
    }).on('clientError', (err, socket) => {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        console.log(err);
    }).listen(443);
}
Init();
