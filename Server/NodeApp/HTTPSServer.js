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

const HTM_Template = fs.readFileSync("template.html", {encoding: 'utf8'});

// Function for sending static content
async function SendFile(Filename, FileStats, Headers, Response) {
    if (Headers['if-modified-since'] == FileStats.mtime || Headers['if-none-match'] == FileStats.mtimeMs) { // 304 Not Modified
        Response.writeHead(304).end();
    }

    var FileExtension = require('path').extname(Filename);
    fs.readFile(Filename, (err, FileContent) => {
        if (err) console.log(err);
        if (FileExtension == '.html') { // Wrap HTML files in template.
            FileContent = HTM_Template.replace("$$CONTENT$$", FileContent);
        }

        if (Headers['accept-encoding'] && Headers['accept-encoding'].indexOf('gzip') != -1) { // Send static file deflate compressed
            Response.writeHead(200, { 'Content-Type': mime.contentType(FileExtension), 'Last-Modified': FileStats.mtime, 'Etag': FileStats.mtimeMs, 'Content-Encoding': 'gzip' });
            zlib.gzip(FileContent, (err, GzippedContent) => {
                Response.end(GzippedContent);
            });
        } else if (Headers['accept-encoding'] && Headers['accept-encoding'].indexOf('deflate') != -1) { // Send static file deflate compressed
            Response.writeHead(200, { 'Content-Type': mime.contentType(FileExtension), 'Last-Modified': FileStats.mtime, 'Etag': FileStats.mtimeMs, 'Content-Encoding': 'deflate' });
            zlib.deflate(FileContent, (err, DeflatedContent) => {
                Response.end(DeflatedContent);
            });
        } else { // Send static file uncompressed
            Response.writeHead(200, { 'Content-Type': mime.contentType(FileExtension), 'Last-Modified': FileStats.mtime, 'Etag': FileStats.mtimeMs });
            Response.end(FileContent);
        }
    });
}

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
        var Host = req.headers['host'];
        if (!Host) Host = DomainName;
        if (Host != DomainName && Host != ServerName + "." + DomainName) { // If request was not to ServerName or DomainName, redirect.
            res.writeHead(302, { Location: "https://" + DomainName + req.url });
            return res.end(JSON.stringify(Path));
        }

        var Path = req.url.split("/");
        if (Path[0] != "" || req.url.indexOf("..") != -1) { // Invalid URL
            res.writeHead(302, { Location: "https://" + Host + "/" });
            return res.end(JSON.stringify(Path));
        }

        var Filename = "www" + req.url;
        if (Filename == "www/") // Home page is in index.html
            Filename = "www/default.html";
        fs.stat(Filename, (err, stats) => { // Get file status
            if (!err) { // File exists
                SendFile(Filename, stats, req.headers, res);
            } else { // 404 File not found
                res.writeHead(404, { 'Content-Type': 'text/html', Refresh: '3;url=/' });
                return res.end(HTM_Template.replace("$$CONTENT$$", "<h1 class='title is-1'>404 Not Found</h1>" + JSON.stringify(Path)));
            }
        });
    }).on('clientError', (err, socket) => {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        console.log(err);
    }).listen(443);
}
Init();
