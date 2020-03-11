#pragma once
#define LPSTR char*
class String
{
	string TempBuffer;
public:
	string Content;
	String() {};
	bool operator==(const String& Compare);
	bool operator<(const String& Compare);
	String operator+(const String& Text);
	friend String operator+(const String& Text1, const String& Text2);
	void operator+=(const String& Text);
	String(const string& Text);
	String(const char* Text);
	const String operator=(const char* Text);
	operator string();
	operator LPSTR();
	operator LPCSTR();
	operator BYTE*();
	static String toDec(int Integer);
	DWORD toDec();
	static String toHex(DWORD Integer);
	static String toHex(const BYTE* Buffer, size_t Size);
	String(in6_addr Address);
	String(sockaddr_in6 Address);
	String(in_addr Address);
	String(sockaddr_in Address);
	size_t length();
	String toLower();
};
