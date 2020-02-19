# MegaLAN Server cluster.

Deployment can be based on the commands in deploy.js

Server-side components use the [Linux Container Building System](https://github.com/NotMikeDEV/container) for deployment. This must be installed on servers to launch the containers, which are packaged inside the .lua scripts.

A launch.sh script is provided, which will register the platform as a systemd service and auto-start the required containers on boot. This script assumes that the server files are located in /MegaLAN/ and running on a debian server.

## MariaDB Cluster
The MariaDB cluster requires manual configuration and initialisation/bootstrapping.

Edit the mariadb.lua file to place all server node IPs at the top of the script.

To bootstrap a new cluster or restart a dead cluster you need to run this command on a single node.

```/MegaLAN/mariadb.lua shell "mysqld --wsrep-new-cluster"```

Once the cluster is up, you must import the database schema, this can be done with the following command. This must only be run only once during initial deployment.

```/MegaLAN/mariadb.lua shell "cat /MegaLAN/Database.sql | mysql"```

## SendGrid Email
To configure sendgrid for sending email, the API key needs to be provided along with the relevant DNS entries.

The API key is configured with the following command:

```/MegaLAN/mariadb.lua shell "echo \"UPDATE MegaLAN.Settings SET Value='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' WHERE Name='SENDGRID_API_KEY'\"|mysql"```

DNS Entries can be added with commands similar to the following: (Change to match the configuration given by SendGrid)

```/MegaLAN/mariadb.lua shell "echo \"INSERT INTO DNS (Hostname, Type, Value, Expire) VALUES ('sendgrid.megalan.app', 0, 'sendgrid.net', 0);\"|mysql"
/MegaLAN/mariadb.lua shell "echo \"INSERT INTO DNS (Hostname, Type, Value, Expire) VALUES ('4477715.megalan.app', 0, 'sendgrid.net', 0);\"|mysql"
/MegaLAN/mariadb.lua shell "echo \"INSERT INTO DNS (Hostname, Type, Value, Expire) VALUES ('grid.megalan.app', 0, 'u4477715.wl216.sendgrid.net', 0);\"|mysql"
/MegaLAN/mariadb.lua shell "echo \"INSERT INTO DNS (Hostname, Type, Value, Expire) VALUES ('sg._domainkey.megalan.app', 0, 'sg.domainkey.u4477715.wl216.sendgrid.net', 0);\"|mysql"
/MegaLAN/mariadb.lua shell "echo \"INSERT INTO DNS (Hostname, Type, Value, Expire) VALUES ('sg2._domainkey.megalan.app', 0, 'sg2.domainkey.u4477715.wl216.sendgrid.net', 0);\"|mysql"```
