module.exports = {
	args: async function (Session, Args, Data) {
		var Response = JSON.stringify({
			Session: Session,
			Args: Args,
			Data: Data,
		});
		return {
			Status: 200,
			Body: Response,
		};
	},
	body: async function (Session, Args, Data) {
		var Response = Data;
		return {
			Status: 200,
			Headers: { 'Content-Type': "text/plain" },
			Body: Response,
		};
	},
	count: async function (Session, Args, Data) {
		var NextCount = parseInt(Args[0]);
		if (isNaN(NextCount))
			NextCount = 0;
		NextCount = NextCount + 1;
		return {
			Status: 302,
			Headers: { Location: "/API/test/count/" + NextCount },
			Body: Data,
		};
	},
};
