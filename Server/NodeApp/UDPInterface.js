const IPAddr = require('ip6addr');
const database = require('./Include/SQL.js');

module.exports = (SendReply) => {
	return async function (UserInfo, Type, Payload) {
		console.log("Handling", Type, UserInfo);
		console.log(Payload);
		if (Type == 'AUTH' && UserInfo.Username) {
			var ClientIP = IPAddr.parse(UserInfo.IP);
			var ClientPort = Buffer.alloc(2);
			ClientPort.writeUInt16BE(UserInfo.Port, 0);
			var Response  = Buffer.concat([Buffer.from('OK'), ClientIP.toBuffer(), ClientPort]);
			return SendReply(UserInfo, "AUTH", Response);
		}
		if (Type == 'LIST' && UserInfo.Username) {
			const PageSize = 10;
			var Start = Payload.readUInt32BE();
			var Networks = await database.query("SELECT DISTINCT Networks.VLANID, CASE WHEN Networks.Type = 'Private' THEN 'Private' WHEN Networks.Type = 'Public' AND Networks.CryptoKey IS NULL THEN 'Public' ELSE 'Password' END As Type, NetworkUsers.UserID, NetworkUsers.Type AS Access FROM Networks LEFT JOIN(SELECT * FROM NetworkUsers WHERE UserID = ?) AS NetworkUsers ON Networks.VLANID = NetworkUsers.VLANID WHERE Networks.Type = 'Public' OR NetworkUsers.UserID = ? ORDER BY(CASE Access WHEN 'Admin' THEN 1 WHEN 'Member' THEN 2 ELSE 9 END), Type DESC, Name LIMIT ?, ?; ", [UserInfo.UserID, UserInfo.UserID, Start, PageSize]);
			var Response = Buffer.alloc(1);
			Response.writeUInt8(Networks.length);
			for (var x in Networks) {
				console.log(Networks[x].VLANID);
				Response = Buffer.concat([Response, Buffer.from(Networks[x].VLANID, 'hex')]);
			}
			var EndPos = Buffer.alloc(4);
			EndPos.writeInt32BE(Start + Networks.length);
			Response = Buffer.concat([Response, EndPos]);
			console.log("LIST", Start, Start + Networks.length, Response);
			return SendReply(UserInfo, "LIST", Response);
		}
		if (Type == 'INFO' && UserInfo.Username) {
			var Network = await database.query("SELECT VLANID, Name, Type, CryptoKey FROM Networks WHERE VLANID = ?; ", [Payload.toString('hex')]);
			if (Network.length) {
				Network = Network[0];
				var AccessType = Buffer.alloc(1);
				AccessType.writeInt8(0);
				if (Network.CryptoKey)
					AccessType.writeInt8(1);
				if (Network.Type == 'Private') {
					var Access = await database.query("SELECT Type FROM NetworkUsers WHERE VLANID = ? AND UserID = ?; ", [Payload.toString('hex'), UserInfo.UserID]);
					if (!Access.length)
						return SendReply(UserInfo, "EROR", "Access Denied\0");
					AccessType.writeInt8(2);
				}
				console.log("INFO", Payload.toString('hex'), Network);
				var VLANInfo = Buffer.concat([Payload, AccessType, Buffer.from(Network.Name + "\0")]);
				return SendReply(UserInfo, "INFO", VLANInfo);
			}
			return SendReply(UserInfo, "EROR", "Unknown VLAN\0");
		}
		return SendReply(UserInfo, "EROR", "Unknown Command\0");
	}
};