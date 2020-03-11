SET AUTOCOMMIT = 0;
START TRANSACTION;
USE MegaLAN;

REPLACE INTO `Accounts` VALUES ('05617e37835fbd611d57f3c6e50dfff58e654aec','NotMike','3dc9eb3eeb98ea1b207ec1c4ff35539aa7c2744bb7bc4beff45b606fa3c4614f','Mike Test Account','NotMike@NotMike.co.uk','000000');
REPLACE INTO `Accounts` VALUES ('b444ac06613fc8d63795be9ad0beaf55011936ac','Test1','2a6049f5ace825c77b483c6bcee7dfab9439d7ce5053f3814ce2e23408f1b280','Test Account 1','test@megalan.app','000001');
REPLACE INTO `Accounts` VALUES ('109f4b3c50d7b0df729d299bc6f8e9ef9066971f','Test2','b6e2ae8da7f2f4529703f141406df89ae7ed49809e49b150f49406d4de165309','Test Account 2','test@megalan.app','000002');

DELETE FROM DNS;
REPLACE INTO DNS (Hostname, Type, Value, Expire) VALUES ('link.megalan.app', 0, 'sendgrid.net', 0);
REPLACE INTO DNS (Hostname, Type, Value, Expire) VALUES ('4477715.megalan.app', 0, 'sendgrid.net', 0);
REPLACE INTO DNS (Hostname, Type, Value, Expire) VALUES ('return.megalan.app', 0, 'u4477715.wl216.sendgrid.net', 0);
REPLACE INTO DNS (Hostname, Type, Value, Expire) VALUES ('s1._domainkey.megalan.app', 0, 'sg.domainkey.u4477715.wl216.sendgrid.net', 0);
REPLACE INTO DNS (Hostname, Type, Value, Expire) VALUES ('s2._domainkey.megalan.app', 0, 'sg2.domainkey.u4477715.wl216.sendgrid.net', 0);

DELETE FROM Networks;
DELETE FROM NetworkUsers;
REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000000', 'Test00 - Public Admin', 'Public', '10.0.0.0/24', NULL);
REPLACE INTO NetworkUsers (VLANID, UserID, Type) VALUES('00000000000000000000', '05617e37835fbd611d57f3c6e50dfff58e654aec', 'Admin');
REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000001', 'Test01 - Public Member', 'Public', '10.0.0.0/24', NULL);
REPLACE INTO NetworkUsers (VLANID, UserID, Type) VALUES('00000000000000000001', '05617e37835fbd611d57f3c6e50dfff58e654aec', 'Member');
REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000002', 'Test02 - Public', 'Public', '10.0.0.0/24', NULL);

REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000010', 'Test10 - Private Admin', 'Private', '10.0.0.0/24', NULL);
REPLACE INTO NetworkUsers (VLANID, UserID, Type) VALUES('00000000000000000010', '05617e37835fbd611d57f3c6e50dfff58e654aec', 'Admin');
REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000011', 'Test11 - Private Member', 'Private', '10.0.0.0/24', NULL);
REPLACE INTO NetworkUsers (VLANID, UserID, Type) VALUES('00000000000000000011', '05617e37835fbd611d57f3c6e50dfff58e654aec', 'Member');
REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000012', 'Test12 - Private', 'Private', '10.0.0.0/24', NULL);

REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000020', 'Test20 - Public Admin Passworded', 'Public', '10.0.0.0/24', '1234567890123456789012345678901234567890123456789012345678901234');
REPLACE INTO NetworkUsers (VLANID, UserID, Type) VALUES('00000000000000000020', '05617e37835fbd611d57f3c6e50dfff58e654aec', 'Admin');
REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000021', 'Test21 - Public Member Passworded', 'Public', '10.0.0.0/24', '1234567890123456789012345678901234567890123456789012345678901234');
REPLACE INTO NetworkUsers (VLANID, UserID, Type) VALUES('00000000000000000021', '05617e37835fbd611d57f3c6e50dfff58e654aec', 'Member');
REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000022', 'Test22 - Public Passworded', 'Public', '10.0.0.0/24', '1234567890123456789012345678901234567890123456789012345678901234');

REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000030', 'Test30 - Private Admin Passworded', 'Private', '10.0.0.0/24', '1234567890123456789012345678901234567890123456789012345678901234');
REPLACE INTO NetworkUsers (VLANID, UserID, Type) VALUES('00000000000000000030', '05617e37835fbd611d57f3c6e50dfff58e654aec', 'Admin');
REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000031', 'Test31 - Private Member Passworded', 'Private', '10.0.0.0/24', '1234567890123456789012345678901234567890123456789012345678901234');
REPLACE INTO NetworkUsers (VLANID, UserID, Type) VALUES('00000000000000000031', '05617e37835fbd611d57f3c6e50dfff58e654aec', 'Member');
REPLACE INTO Networks (VLANID, Name, Type, IPv4, CryptoKey) VALUES('00000000000000000032', 'Test32 - Private Passworded', 'Private', '10.0.0.0/24', '1234567890123456789012345678901234567890123456789012345678901234');

COMMIT;