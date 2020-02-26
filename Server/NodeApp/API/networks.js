const database = require("./../Include/SQL.js");
const promisify = require("promisify-node");
const crypto = promisify('crypto');

module.exports = {
	list: async function (Session, Args, Data) {
		var Networks;
		if (Session) {
			Networks = await database.query("SELECT DISTINCT Networks.VLANID, Networks.Name, CASE WHEN Networks.Type = 'Private' THEN 'Private' WHEN Networks.Type = 'Public' AND Networks.CryptoKey IS NULL THEN 'Public' ELSE 'Password' END As Type, NetworkUsers.UserID, NetworkUsers.Type AS Access FROM Networks LEFT JOIN NetworkUsers ON Networks.VLANID = NetworkUsers.VLANID WHERE Networks.Type = 'Public' OR NetworkUsers.UserID = ? ORDER BY (CASE Access WHEN 'Admin' THEN 1 WHEN 'Member' THEN 2 ELSE 9 END), Type DESC, Name;", [Session.UserID]);
		}
		else {
			Networks = await database.query("SELECT DISTINCT Networks.VLANID, Networks.Name, CASE WHEN Networks.CryptoKey IS NULL THEN 'Public' ELSE 'Password' END As Type FROM Networks WHERE Networks.Type = 'Public' ORDER BY Name");
		}
		return {
			Status: 200,
			JSON: Networks
		};
	},
};