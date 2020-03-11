#!/usr/local/sbin/container
local ServerName = exec("echo -n $(hostname -s)", true)
local DomainName = exec("echo -n $(hostname)", true):sub(ServerName:len() + 2)
local IPv4 = exec("echo -n " .. exec([[ip addr|grep "inet "|grep global|cut -d " " -f 6|cut -d "/" -f 1|head -n 1]], true), true)
local IPv6 = exec("echo -n " .. exec([[ip addr|grep "inet6 "|grep global|cut -d " " -f 6|cut -d "/" -f 1|head -n 1]], true), true)

Mount{path='/MegaLAN/', type="map", source="/MegaLAN/"}

function install_container()
	install_package("ca-certificates")
	exec_or_die("wget -O- https://deb.nodesource.com/setup_13.x | bash -")
	install_package("nodejs")
	exec_or_die("npm install promisify-node")
	exec_or_die("npm install mysql")
	exec_or_die("npm install ip6addr")
	exec_or_die("npm install native-dns")
	exec_or_die("npm install acme-client")
	exec_or_die("npm install x509.js")
	exec_or_die("npm install mime-types")
	exec_or_die("npm install @sendgrid/mail")
	return 0
end

function background()
	exec("cd /MegaLAN/NodeApp && while true; do ./DNSServer.js " .. DomainName .. " " .. IPv4 .. " " .. IPv6 ..  "; sleep 1; done&")
	exec("cd /MegaLAN/NodeApp && while true; do ./HTTPSServer.js " .. ServerName .. " " .. DomainName .. " " .. IPv4 .. " " .. IPv6 .. "; sleep 1; done&")
	exec("cd /MegaLAN/NodeApp && while true; do ./Heartbeat.js " .. ServerName .. " " .. DomainName .. " " .. IPv4 .. " " .. IPv6 .. "; sleep 1; done&")
	exec("cd /MegaLAN/NodeApp && while true; do ./UDPServer.js " .. ServerName .. " " .. DomainName .. " " .. IPv4 .. " " .. IPv6 .. "; sleep 1; done&")
	return 0
end
