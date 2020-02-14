module.exports = {
	args: async function (Args, Data) {
		var Response = JSON.stringify(Args);
		return {
			Status: 200,
			Body: Response,
		};
	},
	body: async function (Args, Data) {
		var Response = Data;
		return {
			Status: 200,
			Headers: { 'Content-Type': "text/plain" },
			Body: Response,
		};
	},
	count: async function (Args, Data) {
		console.log(Args);
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
