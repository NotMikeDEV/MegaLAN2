#include "Globals.h"

void Crypto::SHA1(const BYTE* Buffer, int Length, BYTE Output[32])
{
	::SHA1(Buffer, Length, Output);
}
void Crypto::SHA1(String Text, BYTE Output[32])
{
	SHA1((const BYTE*)Text, Text.length(), Output);
}
void Crypto::SHA256(const BYTE* Buffer, int Length, BYTE Output[32])
{
	::SHA256(Buffer, Length, Output);
}
void Crypto::SHA256(String Text, BYTE Output[32])
{
	SHA256((const BYTE*)Text, Text.length(), Output);
}

void Crypto::Rand(BYTE* Buffer, size_t Length)
{
	RAND_bytes(Buffer, Length);
}

int Crypto::AES256_Encrypt(BYTE* Buffer, size_t Length)
{
	BYTE* CipherText = new BYTE[Length + 16];
	EVP_CIPHER_CTX* ctx;

	int len = 0;

	int CipherTextLen = 0;

	if (!(ctx = EVP_CIPHER_CTX_new()))
		ERR_print_errors_fp(stderr);

	BYTE iv[16] = { 0 };
	if (1 != EVP_EncryptInit_ex(ctx, EVP_aes_256_cbc(), NULL, NetworkKey, iv))
		ERR_print_errors_fp(stderr);

	if (!EVP_EncryptUpdate(ctx, CipherText, &len, Buffer, Length))
		ERR_print_errors_fp(stderr);
	CipherTextLen = len;

	if (1 != EVP_EncryptFinal_ex(ctx, CipherText + CipherTextLen, &len))
		ERR_print_errors_fp(stderr);

	CipherTextLen += len;

	EVP_CIPHER_CTX_free(ctx);
	memcpy(Buffer, CipherText, CipherTextLen);
	delete CipherText;

	return CipherTextLen;
}

int Crypto::AES256_Decrypt(BYTE* Buffer, size_t Length)
{
	BYTE* PlainText = new BYTE[Length];
	EVP_CIPHER_CTX* ctx;

	int len = 0;

	int PlainTextLen = 0;

	if (!(ctx = EVP_CIPHER_CTX_new()))
		return 0;

	BYTE iv[16] = { 0 };
	if (1 != EVP_DecryptInit_ex(ctx, EVP_aes_256_cbc(), NULL, NetworkKey, iv))
		return 0;

	if (1 != EVP_DecryptUpdate(ctx, PlainText, &len, Buffer, Length))
		return 0;
	PlainTextLen = len;

	/* Finalise the decryption. Further plaintext bytes may be written at
	 * this stage.
	 */
	if (1 != EVP_DecryptFinal_ex(ctx, PlainText + len, &len))
	{
		return 0;
	}

	PlainTextLen += len;

	/* Clean up */
	EVP_CIPHER_CTX_free(ctx);
	memcpy(Buffer, PlainText, PlainTextLen);
	delete PlainText;

	return PlainTextLen;
}

Crypto::Crypto(const BYTE NetworkKey[32])
{
	SSL_load_error_strings();
	ERR_load_BIO_strings();
	OpenSSL_add_all_algorithms();
	memcpy(&this->NetworkKey, NetworkKey, sizeof(this->NetworkKey));
}