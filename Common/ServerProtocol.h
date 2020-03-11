#pragma once
#include "Crypto.h"

class ServerRequest
{
private:
	BYTE* UserID = NULL;
	BYTE* IV = NULL;
	BYTE* TypePTR = NULL;
	BYTE* Payload = NULL;
	UINT16 PayloadLength = 0;

public:
	BYTE* Packet = NULL;
	int TotalPacketLength = 0;
	String Type;
	ServerRequest(const ServerRequest& Object) {
		TotalPacketLength = Object.TotalPacketLength;
		if (Object.Packet && Object.TotalPacketLength)
		{
			Packet = new BYTE[TotalPacketLength];
			memcpy(Packet, Object.Packet, TotalPacketLength);
			this->UserID = Packet;
			this->IV = Packet + 20;
			this->TypePTR = Packet + 20 + 16;
			this->Type = Object.Type;
			this->Payload = Packet + 20 + 16 + 4;
			this->PayloadLength = Object.PayloadLength;
		}
	}
	ServerRequest(const BYTE UserID[20], const char Type[5], const BYTE* Payload, size_t PayloadLength) {
		this->TotalPacketLength = PayloadLength + 20 + 16 + 4;
		Packet = new BYTE[this->TotalPacketLength];
		this->UserID = Packet;
		memcpy(this->UserID, UserID, 20);
		this->IV = Packet + 20;
		this->TypePTR = Packet + 20 + 16;
		memcpy(this->TypePTR, Type, 4);
		this->Type = Type;
		this->PayloadLength = PayloadLength;
		this->Payload = Packet + 20 + 16 + 4;
		if (Payload && PayloadLength)
			memcpy(this->Payload, Payload, PayloadLength);
	};
	bool Encrypt(Crypto* Encryption) {
		BYTE* Encrypted = new BYTE[TotalPacketLength + 16];
		// UserID (Not Encrypted)
		memcpy(Encrypted, this->UserID, 20);
		// IV (Random Data)
		Crypto::Rand(Encrypted + 20, 16);
		// Packet Type (Encrypted)
		memcpy(Encrypted + 20 + 16, (LPSTR)this->Type, 4);
		// Payload (Encrypted)
		if (this->PayloadLength)
			memcpy(Encrypted + 20 + 16 + 4, this->Payload, this->PayloadLength);
		size_t EncryptedLength = Encryption->AES256_Encrypt(Encrypted + 20, this->PayloadLength + 16 + 4);
		if (EncryptedLength)
		{
			delete Packet;
			Packet = Encrypted;
			TotalPacketLength = EncryptedLength + 20;
			UserID = Encrypted;
			IV = Encrypted + 20;
			TypePTR = NULL;
			Payload = NULL;
			PayloadLength = 0;
			return true;
		}
		else
		{
			delete Encrypted;
			return false;
		}
	}
	virtual ~ServerRequest() {
		if (Packet)
			delete Packet;
	};
};

class ServerResponse
{
private:
	BYTE* IV = NULL;
	BYTE* TypePTR = NULL;
	int TotalPacketLength = 0;
	BYTE* Packet = NULL;

public:
	BYTE* Payload = NULL;
	UINT16 PayloadLength = 0;
	String Type = NULL;
	ServerResponse(const ServerResponse& Object) {
		TotalPacketLength = Object.TotalPacketLength;
		if (Object.Packet && Object.TotalPacketLength)
		{
			Packet = new BYTE[TotalPacketLength + 16];
			memcpy(Packet, Object.Packet, TotalPacketLength);
			this->IV = Packet;
			this->TypePTR = Packet + 16;
			this->Type = Object.Type;
			this->Payload = Packet + 16 + 4;
			this->PayloadLength = Object.PayloadLength;
			memset(this->Payload + this->PayloadLength, 0, 16);
		}
	}
	ServerResponse(Crypto* Encryption, const BYTE* Buffer, int BufferLength) {
		TotalPacketLength = BufferLength;
		Packet = new BYTE[TotalPacketLength + 16];
		memcpy(Packet, Buffer, BufferLength);
		this->IV = Packet;
		size_t EncryptedLength = Encryption->AES256_Decrypt(Packet, BufferLength);
		if (EncryptedLength >= 20)
		{
			this->TypePTR = Packet + 16;
			char TypeBuff[5] = { 0 };
			memcpy(TypeBuff, TypePTR, 4);
			Type = TypeBuff;
			this->Payload = Packet + 16 + 4;
			this->PayloadLength = EncryptedLength - 20;
			memset(this->Payload + this->PayloadLength, 0, 16);
		}
	}
	~ServerResponse()
	{
		if (Packet)
			delete Packet;
	}
};