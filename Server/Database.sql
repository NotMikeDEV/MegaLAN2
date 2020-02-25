SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
CREATE DATABASE IF NOT EXISTS MegaLAN;
GRANT ALL PRIVILEGES ON MegaLAN.* TO 'MegaLAN'@'%' IDENTIFIED BY 'MegaLAN';
FLUSH PRIVILEGES;
USE MegaLAN;

CREATE TABLE IF NOT EXISTS `Servers` (
  `ServerName` text COLLATE utf8_bin NOT NULL,
  `IP` text COLLATE utf8_bin NOT NULL,
  `Up` tinyint(1) NOT NULL,
  `HeartBeatTime` bigint(20) NOT NULL,
  UNIQUE KEY `ServerName` (`ServerName`(100),`IP`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

CREATE TABLE IF NOT EXISTS `Settings` (
  `Name` VARCHAR(30) COLLATE utf8_bin NOT NULL,
  `Value` text COLLATE utf8_bin NOT NULL,
  PRIMARY KEY (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

CREATE TABLE IF NOT EXISTS `DNS` (
  `Hostname` text COLLATE utf8_bin NOT NULL,
  `Type` int(11) NOT NULL,
  `Value` text COLLATE utf8_bin NOT NULL,
  `Expire` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
CREATE UNIQUE INDEX IF NOT EXISTS DNSEntries ON DNS (Hostname, Type, Value);

CREATE TABLE IF NOT EXISTS `Accounts` (
  `UserID` VARCHAR(40) COLLATE utf8_bin NOT NULL,
  `Username` VARCHAR(33) COLLATE utf8_bin NOT NULL,
  `PasswordSHA256` VARCHAR(64) COLLATE utf8_bin,
  `FullName` text COLLATE utf8_bin NOT NULL,
  `Email` text COLLATE utf8_bin NOT NULL,
  `Token` text COLLATE utf8_bin,
  PRIMARY KEY (`UserID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

CREATE INDEX IF NOT EXISTS Usernames ON Accounts (Username);
CREATE INDEX IF NOT EXISTS Passwords ON Accounts (PasswordSHA1, PasswordSHA256);
CREATE INDEX IF NOT EXISTS Token ON Accounts (Token);

CREATE TABLE IF NOT EXISTS `Sessions` (
  `SID` VARCHAR(40) COLLATE utf8_bin NOT NULL,
  `UserID` VARCHAR(40) COLLATE utf8_bin NOT NULL,
  `Expire` BIGINT(11) NOT NULL,
  PRIMARY KEY (`SID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

INSERT IGNORE INTO Settings (Name, Value) VALUES ("SENDGRID_API_KEY", 'INSERT API KEY HERE');
REPLACE INTO DNS (Hostname, Type, Value, Expire) VALUES ('sendgrid.megalan.app', 0, 'sendgrid.net', 0);
REPLACE INTO DNS (Hostname, Type, Value, Expire) VALUES ('4477715.megalan.app', 0, 'sendgrid.net', 0);
REPLACE INTO DNS (Hostname, Type, Value, Expire) VALUES ('grid.megalan.app', 0, 'u4477715.wl216.sendgrid.net', 0);
REPLACE INTO DNS (Hostname, Type, Value, Expire) VALUES ('sg._domainkey.megalan.app', 0, 'sg.domainkey.u4477715.wl216.sendgrid.net', 0);
REPLACE INTO DNS (Hostname, Type, Value, Expire) VALUES ('sg2._domainkey.megalan.app', 0, 'sg2.domainkey.u4477715.wl216.sendgrid.net', 0);

COMMIT;
