#pragma once
class Connection
{
private:
	int Socket;
	Crypto* UserCrypto = NULL;
	Crypto* NULLCrypto = NULL;
	unsigned char UserID[20];
	vector<sockaddr_in6> Servers;
	sockaddr_in6 PreferredServer = { 0 };
	vector<sockaddr_in6> Addresses;
	bool AUTHED = false;
	bool GotEROR = false;
public:
	Connection(String ServerName, const BYTE UserID[20], const BYTE UserKey[32]);
	~Connection();
	void SendPacket(sockaddr_in6& Destination, ServerRequest& Packet);
	void HandleServerResponse(ServerResponse& Packet, sockaddr_in6& from);
	void HandleUnauthenticated(ServerResponse &Packet, sockaddr_in6 &from);
	bool RecvLoop();
	bool AUTH();
};
