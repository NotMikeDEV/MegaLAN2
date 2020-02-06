var database = require('./SQL.js');
const acme = require('acme-client');

//const Directory = acme.directory.letsencrypt.staging;
const Directory = acme.directory.letsencrypt.production;

// Retrieve account from DB, create new one if required.
async function ACMEClient(DomainName) {
    var Account = await database.query("SELECT Value FROM ACME WHERE Name = 'account'");
    if (!Account.length) { // New ACME Account
        Account = {
            directoryUrl: Directory,
            accountKey: (await acme.forge.createPrivateKey()).toString()
        };
        var client = new acme.Client(Account);
        var Response = await client.createAccount({
            termsOfServiceAgreed: true,
            contact: ['mailto:acme@' + DomainName]
        });
        Account.accountUrl = client.api.accountUrl;
        await database.query("REPLACE INTO ACME (Name, Value) VALUES ('account', ?);", [JSON.stringify(Account)]);
        console.log("Created ACME account", Account);
    } else {
        Account = JSON.parse(Account[0].Value);
    }

    var client = new acme.Client(Account);
    return client;
}

// Provision a new TLS certificate
async function Provision(DomainName) {
    var CA = await ACMEClient(DomainName);
    var order = await CA.createOrder({
        identifiers: [
            { type: 'dns', value: DomainName },
            { type: 'dns', value: '*.' + DomainName }
        ]
    });
    // Fulfill DNS Challenges
    var auths = await CA.getAuthorizations(order);
    for (x in auths)
    {
        var auth = auths[x];
        console.log("Requesting TLS for", auth.identifier.value);
        for (y in auth.challenges)
        {
            var challenge = auth.challenges[y];
            if (challenge.type == "dns-01") {
                const keyAuthorization = await CA.getChallengeKeyAuthorization(challenge);
                console.log("DNS Auth Key", auth.identifier.value, keyAuthorization);
                var Expire = Math.floor(new Date() / 1000) + 60;
                await database.query("INSERT INTO DNS (Hostname, Type, Value, Expire) VALUES (?, 16, ?, ?);", ["_acme-challenge." + auth.identifier.value.toLowerCase(), keyAuthorization, Expire]);
                await CA.verifyChallenge(auth, challenge);
                await CA.completeChallenge(challenge);
                console.log("ACME Validation Response", await CA.waitForValidStatus(challenge));
                await database.query("DELETE FROM DNS WHERE Hostname = ? AND Type = 16 AND Value = ?;", ["_acme-challenge." + auth.identifier.value.toLowerCase(), keyAuthorization]);
            }
        };
    };

    // Provision Certificate
    const [key, csr] = await acme.forge.createCsr({
        commonName: DomainName,
        altNames: ['*.' + DomainName]
    });
    await CA.finalizeOrder(order, csr);
    const cert = await CA.getCertificate(order);

    // Save Certificate
    await database.query("REPLACE INTO ACME (Name, Value) VALUES ('private', ?);", [key.toString()]);
    console.log("Private Key", key.toString());
    await database.query("REPLACE INTO ACME (Name, Value) VALUES ('cert', ?);", [cert.toString()]);
    console.log("Certificate", cert.toString());
    // Return Certificate
    return { private: key.toString(), certificate: cert.toString() };
}

// Exported function for getting TLS cert
module.exports = async function (DomainName) {
    var Keys = {};
    var PrivateKey = await database.query("SELECT Value FROM ACME WHERE Name = 'private';");
    var Certificate = await database.query("SELECT Value FROM ACME WHERE Name = 'cert';");
    if (PrivateKey.length && Certificate.length)
        Keys = { private: PrivateKey[0].Value, certificate: Certificate[0].Value };
    else
        Keys = await Provision(DomainName);
    return Keys;
}
