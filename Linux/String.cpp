#include "Globals.h"

bool String::operator==(const String& Compare)
{
	if (Content.compare(Compare.Content) == 0)
		return true;
	return false;
}
bool String::operator<(const String& Compare)
{
	if (Content.compare(Compare.Content) < 0)
		return true;
	return false;
}

// Concatination
String String::operator+(const String& Text)
{
	string Return = Content + Text.Content;
	return Return;
}
String operator+(const String& Text1, const String& Text2)
{
	string Return = Text1.Content + Text2.Content;
	return Return;
}
void String::operator+=(const String& Text)
{
	Content += Text.Content;
}

// To/From string
String::String(const string& Text)
{
	Content = Text;
}
String::String(const char* Text)
{
	if (Text)
		Content = Text;
	else
		Content = "";
}
const String String::operator=(const char* Text)
{
	Content = Text;
	return String(Text);
}
String::operator string()
{
	return Content;
}
// To buffers
String::operator LPSTR()
{
	return (LPSTR)Content.c_str();
}
String::operator LPCSTR()
{
	return (LPCSTR)Content.c_str();
}
String::operator BYTE*()
{
	return (BYTE*)Content.c_str();
}

// Numeric Conversion
String String::toDec(int Integer)
{
	char Buffer[100];
	sprintf(Buffer, "%d", Integer);
	return Buffer;
}
DWORD String::toDec()
{
	DWORD Result = -1;
	sscanf((LPSTR)String(Content), "%u", &Result);
	return Result;
}
String String::toHex(DWORD Integer)
{
	char Buffer[100];
	sprintf(Buffer, "%X", Integer);
	return Buffer;
}
String String::toHex(const BYTE* Buffer, size_t Size)
{
	String Result;
	char Buff[3];
	for (int x = 0; x < Size; x++)
	{
		sprintf(Buff, "%02X", Buffer[x]);
		Result += Buff;
	}
	return Result;
}
String::String(in6_addr Address)
{
	char Buffer[128];
	inet_ntop(AF_INET6, &Address, Buffer, sizeof(Buffer));
	Content = (LPSTR)String(Buffer);
}
String::String(sockaddr_in6 Address)
{
	char Buffer[128];
	inet_ntop(AF_INET6, &Address.sin6_addr, Buffer, sizeof(Buffer));
	Content = (LPSTR)("[" + String(Buffer) + "]:" + toDec(htons(Address.sin6_port)));
}
String::String(in_addr Address)
{
	char Buffer[128];
	inet_ntop(AF_INET, &Address, Buffer, sizeof(Buffer));
	Content = (LPSTR)String(Buffer);
}
String::String(sockaddr_in Address)
{
	char Buffer[128];
	inet_ntop(AF_INET, &Address.sin_addr, Buffer, sizeof(Buffer));
	Content = (LPSTR)("" + String(Buffer) + ":" + toDec(htons(Address.sin_port)));
}

// Utilities
size_t String::length()
{
	return Content.length();
}
String String::toLower()
{
	string Lower = Content;
	std::transform(Lower.begin(), Lower.end(), Lower.begin(), [](unsigned char c) { return std::tolower(c); });
	return Lower;
}