# MegaLAN Server cluster.

Deployment can be based on the commands in deploy.js

## MariaDB Cluster
Requires manual configuration and initialisation/bootstrapping.

Edit mariadb.lua file to place node IPs at the top of the script.

Create a new cluster, or force reboot of a dead cluster. Run on a single server.
	/MegaLAN/mariadb.lua shell "mysqld --wsrep-new-cluster &"
To import the database schema, run only once.
	/MegaLAN/mariadb.lua shell "cat /MegaLAN/Database.sql | mysql"
