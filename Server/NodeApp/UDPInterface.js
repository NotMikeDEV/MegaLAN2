const IPAddr = require('ip6addr');

module.exports = (SendReply) => {
	return function (UserInfo, Type, Payload) {
		console.log("Handling", Type, UserInfo);
		console.log(Payload);
		if (Type == 'AUTH' && UserInfo.Username) {
			var ClientIP = IPAddr.parse(UserInfo.IP);
			var ClientPort = Buffer.alloc(2);
			ClientPort.writeUInt16BE(UserInfo.Port, 0);
			var Response = Buffer.concat([Buffer.from('OK'), ClientIP.toBuffer(), ClientPort]);
			return SendReply(UserInfo, "AUTH", Response);
		}
		return SendReply(UserInfo, "EROR", "Unknown Command\0");
	}
};