const promisify = require("promisify-node");
const crypto = promisify('crypto');
const database = require("./../Include/SQL.js");

module.exports = {
	login: async function (Session, Args, Data) {
		var Data = JSON.parse(Data);
		var UserID = crypto.createHash('sha1').update(Data.Username.toLowerCase()).digest('hex');
		var PasswordHashSHA1 = crypto.createHash('sha1').update(Data.Username.toLowerCase() + Data.Password).digest('hex');
		var User = await database.query("SELECT UserID FROM Accounts WHERE UserID = ? AND PasswordSHA1 = ?", [UserID, PasswordHashSHA1]);
		if (User.length) {
			var SessionID = (await crypto.randomBytes(20)).toString('hex');
			await database.query("INSERT INTO Sessions (SID, UserID, Expire) VALUES (?, ?, ?)", [SessionID, User[0].UserID, (new Date()/1000) + 900]);
			return {
				Status: 200,
				JSON: { OK: true, SessionID: SessionID },
			};
		}
		else {
			return {
				Status: 200,
				JSON: { Error: 'Invalid Username/Password' },
			};
		}
	},
	Session: async function (Token) {
		var User = await database.query("SELECT Accounts.UserID, Username, FullName FROM Accounts JOIN Sessions WHERE SID = ?", [Token]);
		if (User.length)
			return User[0];
		else
			return false;
	},
};
