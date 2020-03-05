const database = require("./../Include/SQL.js");
const promisify = require("promisify-node");
const crypto = promisify('crypto');

module.exports = {
	list: async function (Session, Args, Data) {
		var Networks;
		if (Session) {
			Networks = await database.query("SELECT DISTINCT Networks.VLANID, Networks.Name, CASE WHEN Networks.Type = 'Private' THEN 'Private' WHEN Networks.Type = 'Public' AND Networks.CryptoKey IS NULL THEN 'Public' ELSE 'Password' END As Type, NetworkUsers.UserID, NetworkUsers.Type AS Access FROM Networks LEFT JOIN (SELECT * FROM NetworkUsers WHERE UserID = ?) AS NetworkUsers ON Networks.VLANID = NetworkUsers.VLANID WHERE Networks.Type = 'Public' OR NetworkUsers.UserID = ? ORDER BY (CASE Access WHEN 'Admin' THEN 1 WHEN 'Member' THEN 2 ELSE 9 END), Type DESC, Name;", [Session.UserID, Session.UserID]);
		}
		else {
			Networks = await database.query("SELECT DISTINCT Networks.VLANID, Networks.Name, CASE WHEN Networks.CryptoKey IS NULL THEN 'Public' ELSE 'Password' END As Type FROM Networks WHERE Networks.Type = 'Public' ORDER BY Name");
		}
		return {
			Status: 200,
			JSON: Networks
		};
	},
	details: async function (Session, Args, Data) {
		if (!Session)
			return {
				Status: 403,
			};

		var VLANID = Args[0];
		var Access = await database.query("SELECT Type FROM NetworkUsers WHERE VLANID = ? AND UserID = ?", [VLANID, Session.UserID]);
		if (!Access.length)
			return {
				Status: 403,
			};

		var VLAN = (await database.query("SELECT VLANID, Name, Type, IPv4, CryptoKey FROM Networks WHERE VLANID = ?", [VLANID]))[0];
		VLAN.MyAccess = Access[0].Type;
		VLAN.Key = VLAN.CryptoKey != null ? '********' : null;
		delete VLAN.CryptoKey;
		VLAN.Members = await database.query("SELECT NetworkUsers.UserID, NetworkUsers.Type, Username FROM NetworkUsers JOIN Accounts ON NetworkUsers.UserID = Accounts.UserID WHERE VLANID = ?", [VLANID]);
		return {
			Status: 200,
			JSON: VLAN
		};
	},
	save: async function (Session, Args, Data) {
		if (!Session)
			return {
				Status: 403,
			};

		Data = JSON.parse(Data);
		try {
			if (Data.IPv4)
				Data.IPv4 = require('ip6addr').createCIDR(Data.IPv4);
			else
				Data.IPv4 = require('ip6addr').createCIDR("10.0.0.0/24");
		} catch (e) {
			console.log(e);
			return {
				Status: 200,
				JSON: { Error: 'Invalid subnet mask' },
			};
		}
		if (!Data.VLANID)
		{
			if (!Data.Name) {
				return {
					Status: 200,
					JSON: { Error: 'Name not specified' },
				};
			}
			var Existing = (await database.query("SELECT VLANID FROM Networks WHERE Name = ? ", [Data.Name]));
			if (Existing.length) {
				return {
					Status: 200,
					JSON: { Error: 'Name in use' },
				};
			}
			Data.VLANID = (await crypto.randomBytes(20)).toString('hex');
			await database.query("INSERT INTO Networks (VLANID, Name) VALUES (?,?)", [Data.VLANID, Data.Name]);
			await database.query("INSERT INTO NetworkUsers (VLANID, UserID, Type) VALUES (?,?,?)", [Data.VLANID, Session.UserID, 'Admin']);
		}
		if ((await database.query("SELECT Type FROM NetworkUsers WHERE UserID = ? AND VLANID = ?", [Session.UserID, Data.VLANID]))[0].Type != 'Admin') {
			return {
				Status: 200,
				JSON: { Error: 'Access Denied' },
			};
		}
		await database.query("UPDATE Networks SET Type = ? WHERE VLANID = ?", [Data.Type, Data.VLANID]);
		await database.query("UPDATE Networks SET IPv4 = ? WHERE VLANID = ?", [Data.IPv4.toString(), Data.VLANID]);
		if (Data.Key && Data.Key != '********') {
			var CryptoKey = crypto.createHash('sha256').update(Data.VLANID + Data.Key).digest('hex');;
			await database.query("UPDATE Networks SET CryptoKey = ? WHERE VLANID = ?", [CryptoKey, Data.VLANID]);
		}else if (Data.Key != '********') {
			await database.query("UPDATE Networks SET CryptoKey = NULL WHERE VLANID = ?", [Data.VLANID]);
		}

		await database.query("DELETE FROM NetworkUsers WHERE VLANID = ?", [Data.VLANID]);
		database.query("INSERT INTO NetworkUsers (VLANID, UserID, Type) VALUES (?,?,?)", [Data.VLANID, Session.UserID, 'Admin']);
		Data.Members.map(async (User) => {
			if (User.UserID != Session.UserID)
				await Promise.all(database.query("INSERT INTO NetworkUsers (VLANID, UserID, Type) VALUES (?,?,?)", [Data.VLANID, User.UserID, User.Type]));
		});
		return {
			Status: 200,
			JSON: { OK: true },
		};
	}
};