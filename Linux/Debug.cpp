#include "Globals.h"

BYTE DebugEnabled = 0;

void Debug(int DebugLevel, String File, unsigned long Line, String Format, ...)
{
	if (DebugLevel > DebugEnabled)
		return;
	time_t now = time(NULL);
	tm* ptm = localtime(&now);
	char TimeString[64];
	strftime(TimeString, sizeof(TimeString), "%H:%M:%S", ptm);
	printf("%s [%u:%s:%u] ", (LPCSTR)String(TimeString), DebugLevel, (LPCSTR)File, Line);

	va_list args;
	va_start(args, Format);
	vprintf(Format + "\n", args);
	va_end(args);
}
