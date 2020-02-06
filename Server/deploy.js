'use strict';
/*
 * Deploy script
 *
 * Used for deploying code to multiple servers.
 *
 * Visual Studio project runs this script to push changes to servers ;)
 */
var child_process_1 = require("child_process");
var SSHKEY = "c:\\users\\notmi\\desktop\\ssh";
function ExecRemote(server, cmd) {
    try {
        console.log("Exec", server, cmd);
        var Output = child_process_1.execSync('ssh -i ' + SSHKEY + ' root@' + server + ' \"' + cmd + '\"');
        console.log(Output.toString());
    }
    catch (E) {
        console.log("Exec error", cmd);
    }
}
function PushRemote(server, local, remote) {
    try {
        console.log("Push", server, local, remote);
        var Command = 'scp -i ' + SSHKEY + ' -r ' + local + ' root@' + server + ':' + remote;
        console.log(Command);
        var Output = child_process_1.execSync(Command);
        console.log(Output.toString());
    }
    catch (E) {
        console.log("Push error", local, remote);
    }
}
function CleanServer(server) {
    ExecRemote(server, '/MegaLAN/mariadb.lua clean');
    ExecRemote(server, '/MegaLAN/nodeapp.lua clean');
}

function DoServer(server) {
//    CleanServer(server);
    ExecRemote(server, 'mkdir -p /MegaLAN/');

    PushRemote(server, "mariadb.lua Database.sql", "/MegaLAN/"); ExecRemote(server, 'chmod +x /MegaLAN/mariadb.lua');

    PushRemote(server, "nodeapp.lua NodeApp", "/MegaLAN/"); ExecRemote(server, 'chmod +x /MegaLAN/nodeapp.lua /MegaLAN/NodeApp/*.js && /MegaLAN/nodeapp.lua stop');

    PushRemote(server, "launch.sh", "/MegaLAN/"); ExecRemote(server, 'chmod +x /MegaLAN/launch.sh && /MegaLAN/launch.sh &');
}
DoServer("81.2.248.24");
DoServer("80.211.145.237");
DoServer("217.61.17.75");
