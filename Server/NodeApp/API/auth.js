const promisify = require("promisify-node");
const crypto = promisify('crypto');
const database = require("./../Include/SQL.js");

module.exports = {
	login: async function (Session, Args, Data) {
		var Data = JSON.parse(Data);
		var UserID = crypto.createHash('sha1').update(Data.Username.toLowerCase()).digest('hex');
		var PasswordHashSHA256 = crypto.createHash('sha256').update(Data.Username.toLowerCase() + Data.Password).digest('hex');
		var User = await database.query("SELECT UserID FROM Accounts WHERE UserID = ? AND PasswordSHA256 = ?", [UserID, PasswordHashSHA256]);
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
		var Now = new Date() / 1000;
		var User = await database.query("SELECT Accounts.UserID, Username, FullName, Expire FROM Accounts JOIN Sessions WHERE SID = ? AND Expire >= ?", [Token, Now]);
		if (!User.length)
			return false;
		if (User[0].Expire <= (Now + 520)) // Rate-Limit updating of expire time
			database.query("UPDATE Sessions SET Expire = ? WHERE SID = ?", [Now + 600, Token]);
		return User[0];
	},
};

async function GarbageCollect() {
	var Now = new Date() / 1000;
	await database.query("DELETE FROM Sessions WHERE Expire < ?", [Now]);
	setTimeout(GarbageCollect, (300 * 1000) + Math.floor(Math.random() * 60000));
}
GarbageCollect();