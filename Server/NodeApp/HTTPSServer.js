#!/usr/bin/nodejs
const promisify = require("promisify-node");
const IPAddr = require('ip6addr');
const https = require('https');
const http = require('http');
const acme = require('./Include/ACME.js');
const fs = promisify('fs');
const mime = require('mime-types');
const zlib = promisify('zlib');
const path = require('path');

// Command Line Args
const args = process.argv.slice(2);
const ServerName = args[0].toLowerCase();
const DomainName = global.DomainName = args[1].toLowerCase();
const IPv4 = IPAddr.parse(args[2]);
const IPv6 = IPAddr.parse(args[3]);

const HTM_Template = fs.readFileSync("template.html", {encoding: 'utf8'}); // Load Template on startup.

// Function for sending static content
async function SendFile(Filename, FileStats, Headers, Response) {
    if (Headers['if-modified-since'] == FileStats.mtime || Headers['if-none-match'] == FileStats.mtimeMs) { // 304 Not Modified
        Response.writeHead(304, { Server: ServerName + "." + DomainName }).end();
    }

    var FileExtension = path.extname(Filename);
    var FileContent = await fs.readFile(Filename);
    if (FileExtension == '.html') { // Wrap HTML files in template.
        FileContent = HTM_Template.replace("$$CONTENT$$", FileContent);
    }

    if (Headers['accept-encoding'] && Headers['accept-encoding'].indexOf('gzip') != -1) { // Send static file deflate compressed
        Response.writeHead(200, { Server: ServerName + "." + DomainName, 'Content-Type': mime.contentType(FileExtension), 'Last-Modified': FileStats.mtime, 'Etag': FileStats.mtimeMs, 'Content-Encoding': 'gzip' });
        var GzippedContent = await zlib.gzip(FileContent);
        return Response.end(GzippedContent);
    }
    if (Headers['accept-encoding'] && Headers['accept-encoding'].indexOf('deflate') != -1) { // Send static file deflate compressed
        Response.writeHead(200, { Server: ServerName + "." + DomainName, 'Content-Type': mime.contentType(FileExtension), 'Last-Modified': FileStats.mtime, 'Etag': FileStats.mtimeMs, 'Content-Encoding': 'deflate' });
        var DeflatedContent = await zlib.deflate(FileContent);
        return Response.end(DeflatedContent);
    }
    // Send static file uncompressed
    Response.writeHead(200, { Server: ServerName + "." + DomainName, 'Content-Type': mime.contentType(FileExtension), 'Last-Modified': FileStats.mtime, 'Etag': FileStats.mtimeMs });
    return Response.end(FileContent);
}

// Start Service
async function Init() {
    // HTTP server on port 80, simply redirects to HTTPS
    http.createServer((req, res) => {
        console.log("HTTP", req.headers['host'], req.url);
        var Host = req.headers['host'];
        if (!Host) Host = DomainName;
        res.writeHead(301, { Server: ServerName + "." + DomainName, Location: "https://" + Host + req.url });
        res.end();
    }).on('clientError', (err, socket) => {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        console.log(err);
    }).listen(80);

    // TLS for HTTPS server
    var TLS = await acme(DomainName);
    var Options = { key: TLS.private, cert: TLS.certificate, minVersion: 'TLSv1.1' };
    // HTTPS Server on port 443
    https.createServer(Options, async function (req, res) {
        console.log(req.socket.remoteAddress, "HTTP/" + req.httpVersion, req.method, req.url);
        if (req.url == "/HeartBeat") { // HeartBeat Test URL
            res.writeHead(200, { Server: ServerName + "." + DomainName, ServerIP: req.socket.localAddress });
            return res.end(req.socket.remoteAddress, req.socket.localAddress);
        }
        var Host = req.headers['host'];
        if (!Host) Host = DomainName;
        if (Host != DomainName && Host != ServerName + "." + DomainName) { // If request was not to ServerName or DomainName, redirect.
            res.writeHead(302, { Server: ServerName + "." + DomainName, Location: "https://" + DomainName + req.url });
            return res.end(JSON.stringify(Path));
        }

        var Path = req.url.split("/");
        if (Path[0] != "" || req.url.indexOf("..") != -1) { // Invalid URL
            res.writeHead(302, { Server: ServerName + "." + DomainName, Location: "https://" + Host + "/" });
            return res.end(JSON.stringify(Path));
        }

        if (Path.length > 2 && Path[1] == 'API') { // API Calls, forward to relevant JS file. URL Format: /API/Script/Function{/Param/Param/Param...}
            var RequestBody = "";
            req.on('data', (data) => { // Accepts POST/PUT/etc requests with request payload data
                if (RequestBody.length < 10 * 1024 * 1024 * 1024) { // Request data < 10MB is OK
                    RequestBody += data;
                }
                else { // Request > 10MB, wtf? some kind of attack? Tell them to go away.
                    RequestBody = "";
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    return res.end("Upload data too large");
                }
            });
            return req.on('end', async function () { // Got API request, send to script.
                try {
                    var Command = Path[3]; // Function to call is third parameter in URL
                    var API = require("./API/" + Path[2] + ".js"); // Load API Script
                    var Session = false;
                    if (req.headers['authorization']) { // If user gave an auth token, get their session.
                        Session = await require("./API/auth.js").Session(req.headers['authorization']);
                    }
                    var Response = await API[Command](Session, Path.slice(4), RequestBody); // Call relevant function, passes optional URL parameters along with raw request body.

                    if (Response === 403) { // Requested restricted resource without a valid session
                        res.writeHead(403, { Server: ServerName + "." + DomainName, 'Content-Type': 'text/plain' }); // Send a 403 to the client
                        return res.end("Authentication Required");
                    }
                    if (Response.JSON) { // Response.JSON is an object to be sent as JSON
                        if (req.headers['accept-encoding'] && req.headers['accept-encoding'].indexOf('gzip') != -1) { // Send gzipped
                            res.writeHead(Response.Status, { Server: ServerName + "." + DomainName, 'Content-Type': 'text/json', ...Response.Headers, 'Content-Encoding': 'gzip' });
                            return res.end(await zlib.gzip(JSON.stringify(Response.JSON)));
                        }
                        res.writeHead(Response.Status, { Server: ServerName + "." + DomainName, 'Content-Type': 'text/json', ...Response.Headers });
                        return res.end(JSON.stringify(Response.JSON));
                    }
                    if (Response.Page) { // Response.Page is HTML that should be wrapped in template
                        if (req.headers['accept-encoding'] && req.headers['accept-encoding'].indexOf('gzip') != -1) { // Send gzipped
                            res.writeHead(Response.Status, { Server: ServerName + "." + DomainName, 'Content-Type': 'text/html', ...Response.Headers, 'Content-Encoding': 'gzip' });
                            return res.end(await zlib.gzip(HTM_Template.replace("$$CONTENT$$", Response.Page)));
                        }
                        res.writeHead(Response.Status, { Server: ServerName + "." + DomainName, 'Content-Type': 'text/html', ...Response.Headers });
                        return res.end(HTM_Template.replace("$$CONTENT$$", Response.Page));
                    }
                     // ELSE Response.Body is raw response
                    res.writeHead(Response.Status, { Server: ServerName + "." + DomainName, ...Response.Headers }); // Send Response
                    return res.end(Response.Body);
                } catch (e) {
                    console.error(e);
                    res.writeHead(500, "API Error", { Server: ServerName + "." + DomainName, 'Content-Type': 'text/html' });
                    return res.end(HTM_Template.replace("$$CONTENT$$", "<h1 class='title is-1'>500 API Error</h1>" + JSON.stringify(Path)));
                }
            });
        }

        var Filename = "www" + req.url;
        if (Filename == "www/") // Home page is in default.html
            Filename = "www/default.html";
        try {
            var FileStats = await fs.stat(Filename);
            SendFile(Filename, FileStats, req.headers, res);
        } catch (e) { // 404 File not found
            res.writeHead(404, { Server: ServerName + "." + DomainName, 'Content-Type': 'text/html', Refresh: '3;url=/' });
            return res.end(HTM_Template.replace("$$CONTENT$$", "<h1 class='title is-1'>404 Not Found</h1>" + JSON.stringify(Path)));
        }
    }).on('clientError', (err, socket) => {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        console.error(socket.remoteAddress, err);
    }).listen(443);
}
Init().catch((e) => {
    console.log(e);
    process.exit(1);
});
