#pragma once
class Crypto
{
private:
	unsigned char NetworkKey[32];
	static BYTE* Temp;
public:
	static void Rand(BYTE* Buffer, size_t Length);
	Crypto(const BYTE NetworkKey[32]);
	static void SHA1(const BYTE* Buffer, int Length, BYTE Output[32]);
	static void SHA1(String Text, BYTE Output[32]);
	static void SHA256(const BYTE* Buffer, int Length, BYTE Output[32]);
	static void SHA256(String Text, BYTE Output[32]);
	int AES256_Decrypt(BYTE* Buffer, size_t Length);
	int AES256_Encrypt(BYTE* Buffer, size_t Length);
};