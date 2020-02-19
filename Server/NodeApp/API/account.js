const Auth = require("./auth.js");
const database = require("./../Include/SQL.js");
const sgMail = require('@sendgrid/mail');
const promisify = require("promisify-node");
const crypto = promisify('crypto');

var SMTP_READY = database.query("SELECT Value FROM Settings WHERE Name = 'SENDGRID_API_KEY'").then((Result) => {
	console.log(Result);
	if (Result.length)
		sgMail.setApiKey(Result[0].Value);
});

module.exports = {
	profile: async function (Session, Args, Data) {
		if (!Session) return 403;
		var User = (await database.query("SELECT UserID, Username, FullName, Email FROM Accounts WHERE UserID = ?", [Session.UserID]))[0];

		if (Args == "newpassword") {
			var AccountToken = (await crypto.randomBytes(16)).toString('hex');
			await database.query("UPDATE Accounts SET Token = ? WHERE UserID = ?", [AccountToken, User.UserID]);
			console.log("Password Request", User.UserID);
			const msg = {
				to: User.Email,
				from: 'accounts@' + global.DomainName,
				subject: 'MegaLAN Password Change',
				text: 'Hi ' + User.FullName + ',\r\n'
					+ 'You have requested a new password.\r\n'
					+ 'To set your new password please click the link below, if it is not clickable then copy/paste it in to your browsers address bar.\r\n\r\n'
					+ 'https://' + global.DomainName + '/API/account/validate/' + AccountToken,
				html: '<h3>Hi ' + User.FullName + ',</h3>'
					+ '<p>You have requested a new password.</p>'
					+ '<p>To set your new password please click the link below.</p>'
					+ '<p><a style="display:inline-block; background-color: #55F; border:1px solid #555; color:#FF5; border-radius:3px; padding:5px;" href="https://' + global.DomainName + '/API/account/validate/' + AccountToken + '">Click here to set a new password.</a></p>',
			};
			console.log("Send Email", "Account/Profile/NewPassword", msg);
			await SMTP_READY;
			sgMail.send(msg);
		}
		return {
			Status: 200,
			JSON: User,
		}
	},
	validate: async function (Session, Args, Data) {
		var Token = Args[0];
		var User = await database.query("SELECT UserID, Username, FullName FROM Accounts WHERE Token = ?", [Token]);
		console.log(Token, User);
		if (User.length) {
			if (Args.length == 1) {
				return {
					Status: 302,
					Headers: { Location: '/account/password.html#' + Token },
					JSON: true,
				}
			} else if (Args[1] == "info") {
				return {
					Status: 200,
					JSON: User[0],
				}
			}
		}
		return {
			Status: 500,
			Page: "<h1>Token has expired.</h1>Please request a password reset if you are unable to log in to your account.",
		}
	},
	password: async function (Session, Args, Data) {
		Data = JSON.parse(Data);
		if (Data.Password.length < 8) {
			return {
				Status: 200,
				JSON: {Error: 'Password must be at least 8 characters.'},
			}
		}
		var User = await database.query("SELECT UserID, Username, FullName FROM Accounts WHERE Token = ?", [Data.Token]);
		console.log(Data, User);
		if (User.length) {
			var PasswordHashSHA256 = crypto.createHash('sha256').update(User[0].Username.toLowerCase() + Data.Password).digest('hex');
			await database.query("UPDATE Accounts SET PasswordSHA256=?, Token=NULL WHERE Token = ?", [PasswordHashSHA256, Data.Token]);
			return await Auth.login(Session, {}, JSON.stringify({Username: User[0].Username, Password: Data.Password}));
		}
		return {
			Status: 200,
			JSON: {Error: 'Invalid Token'},
		}
	},
	register: async function (Session, Args, Data) {
		Data = JSON.parse(Data);
		console.log(Data);
		if (!Data.FullName || Data.FullName.length < 6) {
			return {
				Status: 200,
				JSON: {
					Field: "FullName",
					Error: "Please enter your full name."
				}
			};
		}
		if (!Data.Username || Data.Username.length < 4) {
			return {
				Status: 200,
				JSON: {
					Field: "Username",
					Error: "Username must be at least 4 characters long."
				}
			};
		}
		if (Data.Username.length > 32) {
			return {
				Status: 200,
				JSON: {
					Field: "Username",
					Error: "Username can not be more than 32 characters long."
				}
			};
		}
		var UserID = crypto.createHash('sha1').update(Data.Username.toLowerCase()).digest('hex');
		var User = await database.query("SELECT UserID FROM Accounts WHERE UserID = ?", [UserID]);
		if (User.length) {
			return {
				Status: 200,
				JSON: {
					Field: "Username",
					Error: "Username is already in use."
				}
			};
		}
		if (!Data.Email || Data.Email.length < 3 || Data.Email.indexOf('@') < 1) {
			return {
				Status: 200,
				JSON: {
					Field: "Email",
					Error: "Email address is invalid."
				}
			};
		}
		var AccountToken = (await crypto.randomBytes(16)).toString('hex');
		var Added = await database.query("INSERT INTO Accounts(UserID, Username, FullName, Email, Token) VALUES (?,?,?,?,?)", [UserID, Data.Username, Data.FullName, Data.Email, AccountToken]);
		console.log("Added", Added);
		const msg = {
			to: Data.Email,
			from: 'accounts@' + global.DomainName,
			subject: 'Welcome to MegaLAN ' + Data.Username,
			text: 'Hi ' + Data.FullName + ',\r\n'
				+ 'Welcome to MegaLAN!\r\n'
				+ 'Before you can begin you will need to verify your email address.\r\n\r\n'
				+ 'To validate your email address please click the link below, if it is not clickable then copy/paste it in to your browsers address bar.\r\n\r\n'
				+ 'https://' + global.DomainName + '/API/account/validate/' + AccountToken + '\r\n\r\n'
				+ 'If you did not request this account, please ignore this message.',
			html: '<h3>Hi ' + Data.FullName + ',</h3>'
				+ '<p>Welcome to MegaLAN!</p>'
				+ '<p>Before you can begin you will need to verify your email address.</p>'
				+ '<p><a style="display:inline-block; background-color: #55F; border:1px solid #555; color:#FF5; border-radius:3px; padding:5px;" href="https://' + global.DomainName + '/API/account/validate/' + AccountToken + '">Click here to activate your account.</a></p>'
				+ '<i>If you did not request this account, please ignore this message.</i>'
		};
		console.log("Send Email", "Account/Register", msg);
		await SMTP_READY;
//		sgMail.send(msg);

		return {
			Status: 200,
			JSON: {
				Created: true,
			},
		}
	},
};
