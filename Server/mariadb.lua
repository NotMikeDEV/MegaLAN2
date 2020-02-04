#!/usr/local/sbin/container

local ClusterNodes = { "81.2.248.24", "80.211.145.237", "217.61.17.75" }

Mount{path='/MegaLAN/', type="map", source="/MegaLAN/"}
Mount{path='/var/lib/mysql', type="map", source="SQL/lib"}
Mount{path='/var/log/mysql', type="map", source="SQL/log"}
Mount{path='/var/run', type="map", source="/var/run"}

function install_container()
	install_package("software-properties-common dirmngr")
	exec_or_die("apt-key adv --fetch-keys 'https://mariadb.org/mariadb_release_signing_key.asc'")
	write_file("etc/apt/sources.list.d/mariadb.list", "deb http://mirror.terrahost.no/mariadb/repo/10.4/debian buster main")
	exec_or_die("apt update")
	install_package("mariadb-server galera-4")
	return 0
end

function apply_config()
	exec("mkdir -p var/run/mysqld && chown mysql:mysql var/run/mysqld")
	local ClusterString = ""
	for x, Node in pairs(ClusterNodes) do
		ClusterString = ClusterString .. "," .. Node
	end
	ClusterString = ClusterString:sub(2)

	write_file("etc/mysql/mariadb.cnf", [[
[mysqld]
# Mandatory settings
wsrep_on=ON
wsrep_provider=/usr/lib/libgalera_smm.so
wsrep_sst_method=rsync
wsrep_cluster_name=MegaLAN
wsrep_cluster_address=gcomm://]] .. ClusterString  .. [[

binlog_format=ROW
default_storage_engine=InnoDB
innodb_autoinc_lock_mode=2
]])
	write_file("etc/mysql/my.cnf", [[
[mysqld]
bind-address    = 0.0.0.0
[client]
port            = 3306
socket          = /var/run/mysqld/mysqld.sock
[mysqld_safe]
socket          = /var/run/mysqld/mysqld.sock
nice            = 0
[mysqld]
user            = mysql
pid-file        = /var/run/mysqld/mysqld.pid
socket          = /var/run/mysqld/mysqld.sock
port            = 3306
basedir         = /usr
datadir         = /var/lib/mysql
tmpdir          = /tmp
lc_messages_dir = /usr/share/mysql
lc_messages     = en_US
skip-external-locking
max_connections         = 100
connect_timeout         = 5
wait_timeout            = 600
max_allowed_packet      = 16M
thread_cache_size       = 128
sort_buffer_size        = 4M
bulk_insert_buffer_size = 16M
tmp_table_size          = 32M
max_heap_table_size     = 32M
myisam_recover_options = BACKUP
key_buffer_size         = 128M
table_open_cache        = 400
myisam_sort_buffer_size = 512M
concurrent_insert       = 2
read_buffer_size        = 2M
read_rnd_buffer_size    = 1M
query_cache_limit               = 128K
query_cache_size                = 64M
log_warnings            = 2
slow_query_log_file     = /var/log/mysql/mariadb-slow.log
long_query_time = 10
log_slow_verbosity      = query_plan
log_bin                 = /var/log/mysql/mariadb-bin
log_bin_index           = /var/log/mysql/mariadb-bin.index
expire_logs_days        = 10
max_binlog_size         = 100M
default_storage_engine  = InnoDB
innodb_buffer_pool_size = 256M
innodb_log_buffer_size  = 8M
innodb_file_per_table   = 1
innodb_open_files       = 400
innodb_io_capacity      = 400
innodb_flush_method     = O_DIRECT
[mysqldump]
quick
quote-names
max_allowed_packet      = 16M
[mysql]
[isamchk]
key_buffer              = 16M
!include /etc/mysql/mariadb.cnf
!includedir /etc/mysql/conf.d/
]])
	return 0
end

function run()
	exec_or_die([[iptables-save |grep -v "SQL"|iptables-restore]])
	exec_or_die("iptables -t filter -N SQL")
	exec_or_die("iptables -t filter -A INPUT -p tcp -m tcp --dport 4567 -j SQL")
	exec_or_die("iptables -t filter -A INPUT -p tcp -m tcp --dport 4568 -j SQL")
	exec_or_die("iptables -t filter -A INPUT -p tcp -m tcp --dport 4444 -j SQL")
	exec_or_die("iptables -t filter -A INPUT -p tcp -m tcp --dport 3306 -j SQL")

	exec_or_die("iptables -t filter -A SQL -j DROP")
	exec_or_die("iptables -t filter -I SQL -s 127.0.0.1 -j ACCEPT")
	for x, Node in pairs(ClusterNodes) do
		exec_or_die("iptables -t filter -I SQL -s " .. Node .. " -j ACCEPT")
	end
	return 0
end

function background()
	exec("mysqld")
	return 0
end
