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
