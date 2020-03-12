#include "Globals.h"

Connection::Connection(String ServerName, const BYTE UserID[20], const BYTE UserKey[32])
{
	// Prepare Object
	memcpy(this->UserID, UserID, sizeof(this->UserID));
	this->UserCrypto = new Crypto(UserKey);
	BYTE NullKey[32] = { 0 };
	this->NULLCrypto = new Crypto(NullKey);

	// Set up Socket
	struct sockaddr_in6 server_addr = { 0 };
	server_addr.sin6_family = AF_INET6;
	server_addr.sin6_port = htons(0);

	Socket = socket(AF_INET6, SOCK_DGRAM, 0);
	int val = 0;
	setsockopt(Socket, IPPROTO_IPV6, IPV6_V6ONLY, (char*)&val, sizeof(val));
	if (bind(Socket, (struct sockaddr*) & server_addr, sizeof(server_addr)) < 0)
	{
		perror("Error opening UDP Port");
		exit(1);
	}
	struct timeval timeout;
	timeout.tv_sec = 2;
	timeout.tv_usec = 0;
	setsockopt(Socket, SOL_SOCKET, SO_RCVTIMEO, (char*)&timeout, sizeof(timeout));

	// Resolve Server
	DEBUG(1, "Server %s", (LPCSTR)ServerName);
	string Port = "54321";
	string Hostname = ServerName;
	if (Hostname.find(":", 0) != string::npos)
	{
		Port = Hostname.substr(Hostname.find(":", 0) + 1);
		Hostname = Hostname.substr(0, Hostname.find(":", 0));
	}
	DEBUG(2, "Resolving %s port %d", Hostname.c_str(), atoi(Port.c_str()));

	addrinfo* pResult6 = NULL;
	addrinfo* pResult4 = NULL;
	addrinfo* CurrentResult;
	addrinfo hints = { 0 };
	memset(&hints, 0, sizeof(struct addrinfo));
	hints.ai_socktype = SOCK_DGRAM;
	hints.ai_family = AF_INET6;
	bool AAAA = getaddrinfo(Hostname.c_str(), Port.c_str(), &hints, &pResult6) == 0;
	hints.ai_family = AF_INET;
	bool A = getaddrinfo(Hostname.c_str(), Port.c_str(), &hints, &pResult4) == 0;

	CurrentResult = pResult6;
	while (AAAA && CurrentResult != NULL)
	{
		sockaddr_in6 Addr = *(sockaddr_in6*)CurrentResult->ai_addr;
		Servers.push_back(Addr);
		DEBUG(2, "Server Found IPv6 %s", (LPCSTR)String(Addr));
		CurrentResult = CurrentResult->ai_next;
	}
	CurrentResult = pResult4;
	while (A && CurrentResult != NULL)
	{
		sockaddr_in Addr4 = *(sockaddr_in*)CurrentResult->ai_addr;
		sockaddr_in6 Addr = {0};
		Addr.sin6_family = AF_INET6;
		Addr.sin6_port = Addr4.sin_port;
		Addr.sin6_addr.__in6_u.__u6_addr16[5] = 0xFFFF;
		Addr.sin6_addr.__in6_u.__u6_addr32[3] = Addr4.sin_addr.s_addr;
		DEBUG(2, "Server Found IPv4 %s", (LPCSTR)String(Addr));
		Servers.push_back(Addr);
		CurrentResult = CurrentResult->ai_next;
	}
	if (pResult6)
		freeaddrinfo(pResult6);
	if (pResult4)
		freeaddrinfo(pResult4);
	if (!Servers.size())
	{
		printf("Unable to find server.\n");
		exit(1);
	}
}
Connection::~Connection()
{
	if (this->UserCrypto)
		delete this->UserCrypto;
	if (this->NULLCrypto)
		delete this->NULLCrypto;
	for (auto& VLAN : ListRemaining)
	{
		DEBUG(2, "VLAN remaining: %s", (LPCSTR)String::toHex(VLAN, 10));
		delete VLAN;
	}
	ListRemaining.empty();
}
void Connection::Terminate()
{
	Terminating = true;
}

void Connection::SendPacket(sockaddr_in6 &Destination, ServerRequest &Packet)
{
	sendto(Socket, Packet.Packet, Packet.TotalPacketLength, 0, (sockaddr*)&Destination, sizeof(Destination));
}

void Connection::HandleServerResponse(ServerResponse& Packet, sockaddr_in6& from)
{
	bool Preferred = (memcmp(&from, &PreferredServer, sizeof(from)) == 0);
	DEBUG(2, "Valid Packet from %s (%u) type %s length %d", (LPSTR)String(from), Preferred, (LPSTR)Packet.Type, Packet.PayloadLength);
	if (Packet.Type.operator==("EROR"))
	{
		printf("Error Received: %s\n", Packet.Payload);
		GotEROR = true;
	}
	if (Packet.Type.operator==("AUTH"))
	{
		if (memcmp(Packet.Payload, "OK", 2) == 0)
		{
			if (!AUTHED)
				DEBUG(1, "Authenticated with %s", (LPSTR)String(from));
			AUTHED = true;
			sockaddr_in6 Address = { 0 };
			Address.sin6_family = AF_INET6;
			memcpy(&Address.sin6_addr, Packet.Payload + 2, sizeof(Address.sin6_addr));
			Address.sin6_port = *(UINT16*)(Packet.Payload + 18);
			for (auto &A : Addresses)
			{
				if (memcmp(&A, &Address, sizeof(Address)) == 0)
					return;
			}
			DEBUG(1, "Learned external address %s", (LPSTR)String(Address));
			Addresses.push_back(Address);
		}
	}
	if (Packet.Type.operator==("LIST"))
	{
		if (!ListingCallback || memcmp(&from, &PreferredServer, sizeof(PreferredServer)))
		{
			DEBUG(1, "Unexpected LIST response from %s", (LPCSTR)String(from));
			return;
		}
		BYTE Count = Packet.Payload[0];
		if (Count)
		{
			for (int x = 0; x < Count; x++)
			{
				BYTE* VLANID = new BYTE[10];
				memcpy(VLANID, Packet.Payload + 1 + (x * 10), 10);
				DEBUG(2, "VLAN %s", (LPCSTR)String::toHex(VLANID, 10));
				ServerRequest Request(UserID, "INFO", VLANID, 10);
				Request.Encrypt(UserCrypto);
				SendPacket(PreferredServer, Request);
				ListRemaining.push_back(VLANID);
			}
			ListingPosition = *(UINT32*)(Packet.Payload + 1 + (Count * 10));
			DEBUG(1, "LIST From %s Count %u Mark %x", (LPCSTR)String(from), Count, ListingPosition);
			ServerRequest Request(UserID, "LIST", (BYTE*)&ListingPosition, 4);
			Request.Encrypt(UserCrypto);
			SendPacket(PreferredServer, Request);
		}
		else
		{
			ListDone = true;
			DEBUG(1, "LIST From %s END", (LPCSTR)String(from));
		}
	}
	if (Packet.Type.operator==("INFO") && Packet.PayloadLength > 11)
	{
		if (!ListRemaining.size() || memcmp(&from, &PreferredServer, sizeof(PreferredServer)))
		{
			DEBUG(1, "Unexpected INFO response from %s", (LPCSTR)String(from));
			return;
		}
		BYTE VLANID[10];
		memcpy(VLANID, Packet.Payload, 10);
		for (auto &VLAN : ListRemaining)
		{
			if (memcmp(VLANID, VLAN, 10))
				continue;
			ListRemaining.remove(VLAN);
			delete VLAN;
			String Name = (char*)Packet.Payload + 11;
			ListingCallback(VLANID, Packet.Payload[10], Name);
			return;
		}
		DEBUG(1, "Unexpected INFO response from %s for %x", (LPCSTR)String(from), (LPCSTR)String::toHex(VLANID, 10));
	}
}

void Connection::HandleUnauthenticated(ServerResponse& Packet, sockaddr_in6& from)
{
	DEBUG(2, "NULL Packet from %s type %s length %d", (LPSTR)String(from), (LPSTR)Packet.Type, Packet.PayloadLength);
	if (Packet.Type.operator==("EROR"))
	{
		printf("Error Received: %s\n", Packet.Payload);
		GotEROR = true;
	}
}

bool Connection::RecvLoop()
{
	unsigned char Buffer[4096];
	memset(Buffer, 0, sizeof(Buffer));
	sockaddr_in6 from;
	socklen_t fromlen = sizeof(from);
	int ret = recvfrom(Socket, Buffer, sizeof(Buffer), 0, (sockaddr*)&from, &fromlen);
	if (ret > 0)
	{
		for (auto S : Servers)
		{
			if (memcmp(&from, &S, sizeof(from)) == 0)
			{
				DEBUG(2, "Receive from server %s (length %u)", (LPSTR)String(from), ret);
				if (!PreferredServer.sin6_port)
				{
					PreferredServer = from;
					DEBUG(2, "Set preferred server %s", (LPSTR)String(PreferredServer));
				}
				ServerResponse Packet(UserCrypto, Buffer, ret);
				if (Packet.PayloadLength)
				{
					HandleServerResponse(Packet, from);
					return true;
				}
				else
				{
					ServerResponse NULLPacket(NULLCrypto, Buffer, ret);
					if (NULLPacket.PayloadLength)
					{
						HandleUnauthenticated(NULLPacket, from);
						return true;
					}
				}
			}
		}
		DEBUG(2, "Unknown Packet from %s", (LPSTR)String(from));
		return true;
	}
	DEBUG(2, "RECV Timeout");
	return false;
}

bool Connection::AUTH()
{
	// Clear Status
	memset(&PreferredServer, 0, sizeof(PreferredServer));
	AUTHED = false;

	// Send AUTH to servers.
	ServerRequest Request(UserID, "AUTH", NULL, 0);
	Request.Encrypt(UserCrypto);
	for (auto& S : Servers)
	{
		DEBUG(1, "Sending AUTH to %s", (LPSTR)String(S));
		SendPacket(S, Request);
	}
	bool Response = RecvLoop();
	while (!Terminating && Response && !AUTHED && !GotEROR)
	{
		Response = RecvLoop();
	}
	return AUTHED;
}

bool Connection::LIST(LISTING_CALLBACK* ListingCallback)
{
	this->ListingCallback = ListingCallback;
	ListingPosition = 0;
	ServerRequest Request(UserID, "LIST", (BYTE*)&ListingPosition, 4);
	Request.Encrypt(UserCrypto);
	DEBUG(1, "Sending LIST to %s", (LPSTR)String(PreferredServer));
	SendPacket(PreferredServer, Request);
	GotEROR = false;
	bool Response = true;
	while (!Terminating && Response && !GotEROR && (!ListDone || ListRemaining.size()))
	{
		Response = RecvLoop();
		if (!Response && ListRemaining.size())
		{
			for (auto& VLANID : ListRemaining) {
				DEBUG(2, "Re-requesting VLAN %s", (LPCSTR)String::toHex(VLANID, 10));
				ServerRequest Request(UserID, "INFO", VLANID, 10);
				Request.Encrypt(UserCrypto);
				SendPacket(PreferredServer, Request);
			}
			Response = true;
		}
		if (!Response && !ListDone)
		{
			ServerRequest Request(UserID, "LIST", (BYTE*)&ListingPosition, 4);
			Request.Encrypt(UserCrypto);
			DEBUG(1, "Re-sending LIST to %s", (LPSTR)String(PreferredServer));
			SendPacket(PreferredServer, Request);
			Response = true;
		}
	}
	if (!ListDone)
	{
		printf("LIST failed\n");
		this->ListingCallback = NULL;
		return false;
	}
	return true;
}