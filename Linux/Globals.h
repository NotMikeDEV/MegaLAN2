#pragma once
#include <openssl/bio.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <openssl/sha.h>
#include <openssl/rand.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <sys/ioctl.h>
#include <sys/wait.h>
#include <linux/if.h>
#include <linux/if_tun.h>
#include <netdb.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <string>
#include <vector>
#include <list>
#include <algorithm>

using namespace std;
#define BYTE unsigned char
#define CHAR char
#define UINT16 uint16_t
#define UINT32 uint32_t
#define DWORD uint32_t
#define LPCSTR const LPSTR

#define MAX(a,b) \
   ({ __typeof__ (a) _a = (a); \
       __typeof__ (b) _b = (b); \
     _a > _b ? _a : _b; })

#include "String.h"
#include "Debug.h"
#include "../Common/Crypto.h"
#include "../Common/ServerProtocol.h"
#include "Connection.h"
