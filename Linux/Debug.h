#pragma once

extern BYTE DebugEnabled;

void Debug(int DebugLevel, String File, unsigned long Line, String Format, ...);

#define __FILENAME__ (strrchr(__FILE__, '\\') ? strrchr(__FILE__, '\\') + 1 : __FILE__)
#define DEBUG(DebugLevel, ...) Debug(DebugLevel, __FILENAME__, __LINE__, __VA_ARGS__)
